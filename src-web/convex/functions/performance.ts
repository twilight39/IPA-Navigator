import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server.js";
import { api, internal } from "../_generated/api.js";
import { getUserIdFromContext } from "../models/users.ts";
import type { MutationCtx, QueryCtx } from "../_generated/server.d.ts";
import type { Id } from "../_generated/dataModel.d.ts";
import { BADGES } from "../models/badges.ts";

const results = v.object({
  overall_accuracy: v.number(),
  overall_confidence: v.number(),
  total_words: v.number(),
  word_results: v.array(
    v.object({
      word: v.string(),
      expected_index: v.number(),
      transcribed_as: v.optional(v.string()),
      word_accuracy: v.number(),
      word_confidence: v.number(),
      time_boundary: v.optional(
        v.object({
          start: v.optional(v.number()),
          end: v.optional(v.number()),
        }),
      ),
      phoneme_analysis: v.object({
        target_phonemes: v.array(v.string()),
        detected_phonemes: v.array(v.string()),
        phoneme_results: v.array(
          v.object({
            position: v.optional(v.number()),
            target: v.optional(v.string()),
            detected: v.optional(v.string()),
            accuracy: v.number(),
            confidence: v.optional(v.number()),
            similarity_score: v.optional(v.number()),
            status: v.string(),
            timing: v.optional(
              v.object({ start: v.number(), end: v.number() }),
            ),
          }),
        ),
        word_accuracy: v.number(),
      }),
    }),
  ),
});

export const savePracticeResults = mutation({
  args: {
    excerptId: v.id("excerpt"),
    chapterId: v.id("chapter"),
    results: results,
  },
  handler: async (ctx, args) => {
    const userId = await getUserIdFromContext(ctx);

    /* 1. Create practice record */
    const practiceId = await ctx.db.insert("excerpt_practice", {
      userId,
      excerptId: args.excerptId,
      chapterId: args.chapterId,
      overall_accuracy: args.results.overall_accuracy,
      overall_confidence: args.results.overall_confidence,
      total_words: args.results.total_words,
      created_at: Date.now(),
    });

    /* 2. Save word & phoneme results */
    for (const wordResult of args.results.word_results) {
      const wordId = await ctx.db.insert("word_result", {
        practiceId,
        word: wordResult.word,
        expected_index: wordResult.expected_index,
        transcribed_as: wordResult.transcribed_as,
        word_accuracy: wordResult.word_accuracy,
        word_confidence: wordResult.word_confidence,
        time_start: wordResult.time_boundary?.start,
        time_end: wordResult.time_boundary?.end,
      });

      for (const phoneme of wordResult.phoneme_analysis.phoneme_results) {
        await ctx.db.insert("phoneme_result", {
          wordResultId: wordId,
          position: phoneme.position,
          target_phoneme: phoneme.target,
          detected_phoneme: phoneme.detected,
          accuracy: phoneme.accuracy,
          confidence: phoneme.confidence,
          similarity_score: phoneme.similarity_score,
          status: phoneme.status as any,
          time_start: phoneme.timing?.start,
          time_end: phoneme.timing?.end,
        });
      }
    }

    /* 3. Update user_excerpt_progress */
    const existingProgress = await ctx.db
      .query("user_excerpt_progress")
      .withIndex(
        "by_user_excerpt",
        (q) => q.eq("userId", userId).eq("excerptId", args.excerptId),
      ).first();

    if (existingProgress) {
      // Update existing progress
      const updatedFields = {
        total_attempts: existingProgress.total_attempts + 1,
        ...(args.results.overall_accuracy > existingProgress.best_accuracy && {
          best_accuracy: args.results.overall_accuracy,
          best_practice_id: practiceId,
        }),
      };

      await ctx.db.patch(existingProgress._id, updatedFields);
    } else {
      // Create new progress record
      await ctx.db.insert("user_excerpt_progress", {
        userId,
        excerptId: args.excerptId,
        chapterId: args.chapterId,
        best_accuracy: args.results.overall_accuracy,
        best_practice_id: practiceId,
        total_attempts: 1,
      });
    }

    /* 3.5. Update recommendation model with struggle-based reward */
    const rewardAccuracy = await computeRewardAccuracy(
      ctx,
      userId,
      args.excerptId,
      args.results.overall_accuracy,
    );

    await ctx.runMutation(
      api.functions.ml.updateRecommendationModel,
      {
        userId,
        excerptId: args.excerptId,
        accuracy: rewardAccuracy,
      },
    );

    /* 4. Update user_chapter_progress */
    await ctx.runMutation(
      api.models.performance.updateUserChapterProgress,
      {
        userId,
        chapterId: args.chapterId,
      },
    );

    /* 5. Log activity */
    await ctx.db.insert("activity_log", {
      userId,
      action_type: "practice_completed",
      metadata: {
        excerptId: args.excerptId,
        chapterId: args.chapterId,
        practiceId,
        accuracy: args.results.overall_accuracy,
      },
      created_at: Date.now(),
    });

    /* 6. Claim daily reward */
    try {
      await ctx.runMutation(
        api.functions.gamification.claimDailyReward,
        {},
      );
    } catch (error) {
      // Silently fail if already claimed today or other error
      console.log("Daily reward already claimed or error:", error);
    }

    /* 7. Check and award badges */
    await checkAndAwardBadges(ctx, userId);
  },
});

export const saveFocusSessionPracticeResults = mutation({
  args: {
    excerptId: v.id("excerpt"),
    results: results,
  },
  handler: async (ctx, args) => {
    const userId = await getUserIdFromContext(ctx);

    /* 1. Create practice record (no chapter) */
    const practiceId = await ctx.db.insert("excerpt_practice", {
      userId,
      excerptId: args.excerptId,
      chapterId: undefined,
      overall_accuracy: args.results.overall_accuracy,
      overall_confidence: args.results.overall_confidence,
      total_words: args.results.total_words,
      created_at: Date.now(),
    });

    /* 2. Save word & phoneme results */
    for (const wordResult of args.results.word_results) {
      const wordId = await ctx.db.insert("word_result", {
        practiceId,
        word: wordResult.word,
        expected_index: wordResult.expected_index,
        transcribed_as: wordResult.transcribed_as,
        word_accuracy: wordResult.word_accuracy,
        word_confidence: wordResult.word_confidence,
        time_start: wordResult.time_boundary?.start,
        time_end: wordResult.time_boundary?.end,
      });

      for (const phoneme of wordResult.phoneme_analysis.phoneme_results) {
        await ctx.db.insert("phoneme_result", {
          wordResultId: wordId,
          position: phoneme.position,
          target_phoneme: phoneme.target,
          detected_phoneme: phoneme.detected,
          accuracy: phoneme.accuracy,
          confidence: phoneme.confidence,
          similarity_score: phoneme.similarity_score,
          status: phoneme.status as any,
          time_start: phoneme.timing?.start,
          time_end: phoneme.timing?.end,
        });
      }
    }

    /* 3. Update user_excerpt_progress */
    const existingProgress = await ctx.db
      .query("user_excerpt_progress")
      .withIndex(
        "by_user_excerpt",
        (q) => q.eq("userId", userId).eq("excerptId", args.excerptId),
      )
      .first();

    if (existingProgress) {
      const updatedFields = {
        total_attempts: existingProgress.total_attempts + 1,
        ...(args.results.overall_accuracy > existingProgress.best_accuracy && {
          best_accuracy: args.results.overall_accuracy,
          best_practice_id: practiceId,
        }),
      };

      await ctx.db.patch(existingProgress._id, updatedFields);
    } else {
      await ctx.db.insert("user_excerpt_progress", {
        userId,
        excerptId: args.excerptId,
        chapterId: undefined,
        best_accuracy: args.results.overall_accuracy,
        best_practice_id: practiceId,
        total_attempts: 1,
      });
    }

    /* 3.5. Update recommendation model with struggle-based reward */
    const rewardAccuracy = await computeRewardAccuracy(
      ctx,
      userId,
      args.excerptId,
      args.results.overall_accuracy,
    );

    await ctx.runMutation(
      api.functions.ml.updateRecommendationModel,
      {
        userId,
        excerptId: args.excerptId,
        accuracy: rewardAccuracy,
      },
    );

    /* 4. Log activity */
    await ctx.db.insert("activity_log", {
      userId,
      action_type: "practice_completed",
      metadata: {
        excerptId: args.excerptId,
        accuracy: args.results.overall_accuracy,
      },
      created_at: Date.now(),
    });

    /* 5. Check and award badges */
    await checkAndAwardBadges(ctx, userId);
  },
});

// Helper function to compute reward-based accuracy
async function computeRewardAccuracy(
  ctx: QueryCtx,
  userId: Id<"users">,
  excerptId: Id<"excerpt">,
  overallAccuracy: number,
): Promise<number> {
  const excerpt = await ctx.db.get(excerptId);

  if (!excerpt || !excerpt.phonemes) {
    return overallAccuracy; // Fallback if excerpt doesn't have phonemes
  }

  const userPhonemeStats = await ctx.db
    .query("user_phoneme_accuracy_stats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const targetPhonemes = new Set(excerpt.phonemes);
  const accuraciesOnTarget = userPhonemeStats
    .filter((stat) => targetPhonemes.has(stat.phoneme))
    .map((stat) => stat.accuracy);

  const avgAccuracyOnTarget = accuraciesOnTarget.length > 0
    ? accuraciesOnTarget.reduce((a, b) => a + b, 0) / accuraciesOnTarget.length
    : 0.5;

  const weakness = 1 - avgAccuracyOnTarget;
  return weakness * overallAccuracy;
}

export async function checkAndAwardBadges(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  // Get user stats
  const totalPractices = await ctx.db
    .query("excerpt_practice")
    .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
    .collect();

  const userBadges = await ctx.db
    .query("user_badges")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const earnedBadgeIds = new Set(
    userBadges.map((b) => b.badgeId),
  );

  // Check First Steps (1 practice)
  if (
    !earnedBadgeIds.has("first_steps") && totalPractices.length >= 1
  ) {
    await ctx.runMutation(api.functions.gamification.earnBadge, {
      badgeId: "first_steps",
      badgeName: "First Steps",
    });
  }

  // Check Dedicated Learner (10 practices)
  if (
    !earnedBadgeIds.has("dedicated_learner") && totalPractices.length >= 10
  ) {
    await ctx.runMutation(api.functions.gamification.earnBadge, {
      badgeId: "dedicated_learner",
      badgeName: "Dedicated Learner",
    });
  }

  // Check Century Club (100 practices)
  if (
    !earnedBadgeIds.has("century_club") && totalPractices.length >= 100
  ) {
    await ctx.runMutation(api.functions.gamification.earnBadge, {
      badgeId: "century_club",
      badgeName: "Century Club",
    });
  }

  // Check Perfectionist (100% accuracy on chapter)
  const chapterAccuracies = await ctx.db
    .query("user_chapter_progress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  if (
    !earnedBadgeIds.has("perfectionist") &&
    chapterAccuracies.some((c) => c.overall_accuracy === 1)
  ) {
    await ctx.runMutation(api.functions.gamification.earnBadge, {
      badgeId: "perfectionist",
      badgeName: "Perfectionist",
    });
  }

  // Check Streak badges
  const streak = await ctx.db
    .query("user_streak")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (streak) {
    if (
      !earnedBadgeIds.has("week_warrior") && streak.currentStreak >= 7
    ) {
      await ctx.runMutation(api.functions.gamification.earnBadge, {
        badgeId: "week_warrior",
        badgeName: "Week Warrior",
      });
    }

    if (
      !earnedBadgeIds.has("month_master") && streak.currentStreak >= 30
    ) {
      await ctx.runMutation(api.functions.gamification.earnBadge, {
        badgeId: "month_master",
        badgeName: "Month Master",
      });
    }

    if (
      !earnedBadgeIds.has("unstoppable") && streak.currentStreak >= 60
    ) {
      await ctx.runMutation(api.functions.gamification.earnBadge, {
        badgeId: "unstoppable",
        badgeName: "Unstoppable",
      });
    }
  }
}
