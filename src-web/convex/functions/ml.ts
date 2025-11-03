import { mutation, query } from "../_generated/server.js";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.d.ts";
import type { MutationCtx, QueryCtx } from "../_generated/server.d.ts";
import { getUserIdFromContext } from "../models/users.ts";

// Define the features upfront
const FEATURE_NAMES = [
  "vowel_count",
  "consonant_count",
  "difficult_phoneme_count",
  "user_avg_accuracy_on_target_phonemes",
  "user_improvement_trend",
  "time_since_last_practice_decay",
  "difficulty_level_normalized",
  "excerpt_length_normalized",
  "phonemes_user_struggles_with_count",
  "diphthong_count",
];

const INITIAL_LEARNING_RATE = 0.01;

export const updateRecommendationModel = mutation({
  args: {
    userId: v.id("users"),
    excerptId: v.id("excerpt"),
    accuracy: v.number(), // outcome (0-1)
  },
  handler: async (ctx, args) => {
    // 1. Get or create model
    let model = await ctx.db
      .query("recommendation_model")
      .first();

    if (!model) {
      const newId = await ctx.db.insert("recommendation_model", {
        version: 1,
        coefficients: FEATURE_NAMES.map(() => 0.0),
        feature_names: FEATURE_NAMES,
        learning_rate: INITIAL_LEARNING_RATE,
        updated_at: Date.now(),
        total_updates: 0,
      });
      model = await ctx.db.get(newId);
    }

    if (!model) throw new Error("Failed to create model");

    // 2. Compute features
    const features = await computeRecommendationFeatures(
      ctx,
      args.userId,
      args.excerptId,
    );

    // 3. Get prediction
    const prediction = dotProduct(features, model.coefficients);

    // 4. Calculate error
    const error = args.accuracy - prediction;

    // 5. SGD update
    const newCoefficients = model.coefficients.map(
      (weight, i) => weight + model.learning_rate * error * features[i],
    );

    // 6. Update model
    await ctx.db.patch(model._id, {
      coefficients: newCoefficients,
      updated_at: Date.now(),
      total_updates: model.total_updates + 1,
    });

    // 7. Update user phoneme stats
    await updateUserPhonemeAccuracyStats(ctx, args.userId, args.excerptId);

    console.log(
      `[Recommendation Model] Updated. Error: ${error.toFixed(3)}, Updates: ${
        model.total_updates + 1
      }`,
    );
  },
});

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function computeImprovementTrend(practices: any[]): number {
  if (practices.length < 2) return 0;

  const accuracies = practices.map((p) => p.overall_accuracy);
  const recent = accuracies.slice(0, 5);

  const slope = (recent[0] - recent[recent.length - 1]) / recent.length;
  return Math.max(-1, Math.min(1, slope));
}

async function getExcerptDifficulty(
  ctx: QueryCtx,
  excerptId: Id<"excerpt">,
): Promise<number> {
  // 1. Get all chapters this excerpt belongs to
  const chapterExcerpts = await ctx.db
    .query("chapter_excerpt")
    .withIndex("by_excerpt", (q) => q.eq("excerptId", excerptId))
    .collect();

  if (chapterExcerpts.length === 0) return 0.5;

  const difficultyMap: Record<string, number> = {
    Beginner: 0.33,
    Intermediate: 0.66,
    Advanced: 1.0,
  };

  const difficulties: number[] = [];

  // 2. For each chapter, get its difficulty
  for (const ce of chapterExcerpts) {
    const chapterCategories = await ctx.db
      .query("chapter_category")
      .withIndex("by_chapter", (q) => q.eq("chapterId", ce.chapterId))
      .collect();

    for (const cc of chapterCategories) {
      const category = await ctx.db.get(cc.categoryId);
      if (category && category.type === "difficulty") {
        difficulties.push(difficultyMap[category.name] || 0.5);
      }
    }
  }

  // 3. Return average difficulty
  return difficulties.length > 0
    ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
    : 0.5;
}

async function updateUserPhonemeAccuracyStats(
  ctx: MutationCtx,
  userId: Id<"users">,
  excerptId: Id<"excerpt">,
): Promise<void> {
  const excerptPractices = await ctx.db
    .query("excerpt_practice")
    .withIndex(
      "by_user_excerpt",
      (q) => q.eq("userId", userId).eq("excerptId", excerptId),
    )
    .collect();

  for (const practice of excerptPractices) {
    const wordResults = await ctx.db
      .query("word_result")
      .withIndex("by_practice", (q) => q.eq("practiceId", practice._id))
      .collect();

    for (const wordResult of wordResults) {
      const phonemeResults = await ctx.db
        .query("phoneme_result")
        .withIndex(
          "by_word_result",
          (q) => q.eq("wordResultId", wordResult._id),
        )
        .collect();

      for (const phonemeResult of phonemeResults) {
        if (!phonemeResult.target_phoneme) continue;

        const phoneme = phonemeResult.target_phoneme;

        const existingStat = await ctx.db
          .query("user_phoneme_accuracy_stats")
          .withIndex("by_user_phoneme", (q) =>
            q
              .eq("userId", userId)
              .eq("phoneme", phoneme))
          .first();

        if (existingStat) {
          const newCorrectCount = existingStat.correct_count +
            (phonemeResult.status === "correct" ? 1 : 0);
          const newTotalAttempts = existingStat.total_attempts + 1;
          const newAccuracy = newCorrectCount / newTotalAttempts;

          await ctx.db.patch(existingStat._id, {
            correct_count: newCorrectCount,
            total_attempts: newTotalAttempts,
            accuracy: newAccuracy,
            last_updated: Date.now(),
          });
        } else {
          await ctx.db.insert("user_phoneme_accuracy_stats", {
            userId,
            phoneme: phonemeResult.target_phoneme,
            total_attempts: 1,
            correct_count: phonemeResult.status === "correct" ? 1 : 0,
            accuracy: phonemeResult.status === "correct" ? 1.0 : 0.0,
            last_updated: Date.now(),
          });
        }
      }
    }
  }
}

async function computeRecommendationFeatures(
  ctx: QueryCtx,
  userId: Id<"users">,
  excerptId: Id<"excerpt">,
): Promise<number[]> {
  const excerpt = await ctx.db.get(excerptId);
  if (!excerpt) throw new Error("Excerpt not found");

  const userPhonemeStats = await ctx.db
    .query("user_phoneme_accuracy_stats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const userPractices = await ctx.db
    .query("excerpt_practice")
    .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
    .order("desc")
    .take(20);

  // 1. vowel_count
  const vowelCount = excerpt.phoneme_counts.vowels;

  // 2. consonant_count
  const consonantCount = excerpt.phoneme_counts.consonants;

  // 3. difficult_phoneme_count
  const difficultCount = excerpt.phoneme_counts.difficult;

  // 4. user_avg_accuracy_on_target_phonemes
  const targetPhonemes = new Set(excerpt.phonemes);
  const accuraciesOnTarget = userPhonemeStats
    .filter((stat) => targetPhonemes.has(stat.phoneme))
    .map((stat) => stat.accuracy);
  const avgAccuracyOnTarget = accuraciesOnTarget.length > 0
    ? accuraciesOnTarget.reduce((a, b) => a + b, 0) / accuraciesOnTarget.length
    : 0.5;

  // 5. user_improvement_trend
  const improvementTrend = computeImprovementTrend(userPractices);

  // 6. time_since_last_practice_decay
  const lastExcerptPractice = await ctx.db
    .query("excerpt_practice")
    .withIndex(
      "by_user_excerpt",
      (q) => q.eq("userId", userId).eq("excerptId", excerptId),
    )
    .order("desc")
    .first();

  const timeSinceLastPractice = lastExcerptPractice
    ? Date.now() - lastExcerptPractice.created_at
    : Infinity;
  const daysSinceLastPractice = timeSinceLastPractice / (1000 * 60 * 60 * 24);
  const recencyDecay = Math.min(1.0, daysSinceLastPractice / 7);

  // 7. difficulty_level_normalized
  const difficultyLevel = await getExcerptDifficulty(ctx, excerptId);

  // 8. excerpt_length_normalized
  const words = excerpt.text.split(" ");
  const excerptLength = Math.min(1.0, words.length / 20);

  // 9. phonemes_user_struggles_with_count
  const strikeThreshold = 0.6;
  const strugglingPhonemes = userPhonemeStats.filter(
    (stat) =>
      targetPhonemes.has(stat.phoneme) && stat.accuracy < strikeThreshold,
  ).length;

  // 10. diphthong_count
  const diphthongCount = excerpt.phoneme_counts.diphthongs;

  return [
    vowelCount,
    consonantCount,
    difficultCount,
    avgAccuracyOnTarget,
    improvementTrend,
    recencyDecay,
    difficultyLevel,
    excerptLength,
    strugglingPhonemes,
    diphthongCount,
  ];
}

export const suggestExcerptsForPractice = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId || (await getUserIdFromContext(ctx));
    const limit = args.limit || 5;

    // 1. Get the model
    const model = await ctx.db.query("recommendation_model").first();

    if (!model) {
      // Model not trained yet, return random excerpts with no scoring
      const excerpts = await ctx.db.query("excerpt").collect();
      return excerpts.slice(0, limit).map((e) => ({
        _id: e._id,
        text: e.text,
        phonemes: e.phonemes,
        phoneme_counts: e.phoneme_counts,
        recommendationScore: 0,
        reasoning: "Model not trained yet",
      }));
    }

    // 2. Get all active excerpts (only from non-revoked chapter_excerpts)
    const chapterExcerpts = await ctx.db
      .query("chapter_excerpt")
      .withIndex("by_chapter")
      .filter((q) => q.eq(q.field("revoked_at"), undefined))
      .collect();

    const activeExcerptIds = new Set(chapterExcerpts.map((ce) => ce.excerptId));

    const excerpts = (await ctx.db.query("excerpt").collect()).filter((e) =>
      activeExcerptIds.has(e._id)
    );

    // 3. Score each excerpt
    const scoredExcerpts: Array<{
      excerpt: any;
      score: number;
      features: number[];
    }> = [];

    for (const excerpt of excerpts) {
      try {
        const features = await computeRecommendationFeatures(
          ctx,
          userId,
          excerpt._id,
        );
        const score = dotProduct(features, model.coefficients);

        scoredExcerpts.push({
          excerpt,
          score,
          features,
        });
      } catch (error) {
        console.error(
          `Failed to score excerpt ${excerpt._id}:`,
          error,
        );
      }
    }

    // 4. Sort and return top N
    return scoredExcerpts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => ({
        _id: s.excerpt._id,
        text: s.excerpt.text,
        phonemes: s.excerpt.phonemes,
        phoneme_counts: s.excerpt.phoneme_counts,
        recommendationScore: parseFloat(s.score.toFixed(3)),
        reasoning: explainScore(s.features, model.feature_names),
      }));
  },
});

function explainScore(features: number[], featureNames: string[]): string {
  const contributions = features
    .map((f, i) => ({
      name: featureNames[i],
      value: f,
      impact: Math.abs(f),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  return contributions
    .map((c) => `${c.name}: ${c.value.toFixed(2)}`)
    .join(" | ");
}
