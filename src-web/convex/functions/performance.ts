import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server.js";
import { api, internal } from "../_generated/api.js";
import { getUserIdFromContext } from "../models/users.ts";

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
  },
});
