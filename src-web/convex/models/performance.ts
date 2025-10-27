import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server.js";
import { getUserIdFromContext } from "./users.ts";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { QueryCtx } from "../_generated/server.d.ts";

export const updateUserChapterProgress = mutation({
  args: {
    userId: v.id("users"),
    chapterId: v.id("chapter"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // 1. Get all active excerpts for this chapter
    const activeChapterExcerpts = await ctx.db
      .query("chapter_excerpt")
      .withIndex(
        "by_chapter",
        (q) => q.eq("chapterId", args.chapterId).eq("revoked_at", undefined),
      )
      .collect();
    const currentExcerptIds = new Set(
      activeChapterExcerpts.map((ce) => ce.excerptId),
    );

    const userExcerptProgresses = await ctx.db
      .query("user_excerpt_progress")
      .withIndex(
        "by_user_chapter",
        (q) => q.eq("userId", args.userId).eq("chapterId", args.chapterId),
      )
      .collect();

    const relevantUserExcerptProgresses = userExcerptProgresses.filter(
      (uep) => currentExcerptIds.has(uep.excerptId),
    );

    const cumulativeAccuracy = relevantUserExcerptProgresses.reduce(
          (sum, uep) => sum + uep.best_accuracy,
          0,
        ) / relevantUserExcerptProgresses.length || 0;

    const existingProgress = await ctx.db
      .query("user_chapter_progress")
      .withIndex(
        "by_user_chapter",
        (q) => q.eq("userId", args.userId).eq("chapterId", args.chapterId),
      )
      .first();

    if (existingProgress) {
      await ctx.db.patch(existingProgress._id, {
        completed_excerpts_count: relevantUserExcerptProgresses.length,
        total_excerpts_in_chapter: activeChapterExcerpts.length,
        overall_accuracy: cumulativeAccuracy,
        completed:
          relevantUserExcerptProgresses.length === activeChapterExcerpts.length,
        updated_at: Date.now(),
      });
    } else {
      await ctx.db.insert("user_chapter_progress", {
        userId: args.userId,
        chapterId: args.chapterId,
        completed_excerpts_count: relevantUserExcerptProgresses.length,
        total_excerpts_in_chapter: activeChapterExcerpts.length,
        overall_accuracy: cumulativeAccuracy,
        completed:
          relevantUserExcerptProgresses.length === activeChapterExcerpts.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  },
});

export async function getUserBestAccuracyFromTopAttempts(
  ctx: QueryCtx,
  userId: Id<"users">,
  maxAttempts: number = 3,
): Promise<number> {
  const practices = await ctx.db
    .query("excerpt_practice")
    .withIndex("by_user_excerpt", (q) => q.eq("userId", userId))
    .collect();

  // Group practices by excerpt
  const excerptMap = new Map<Id<"excerpt">, Doc<"excerpt_practice">[]>();
  for (const practice of practices) {
    if (!excerptMap.has(practice.excerptId)) {
      excerptMap.set(practice.excerptId, []);
    }
    excerptMap.get(practice.excerptId)!.push(practice);
  }

  // Get best accuracy from top maxAttempts for each excerpt
  const excerptBestAccuracies: number[] = [];

  for (const attempts of excerptMap.values()) {
    // Sort by creation time (oldest first)
    attempts.sort((a, b) => a.created_at - b.created_at);

    // Take only first maxAttempts
    const topAttempts = attempts.slice(0, maxAttempts);

    // Get the best accuracy from these attempts
    const bestAccuracy = Math.max(
      ...topAttempts.map((a) => a.overall_accuracy),
    );
    excerptBestAccuracies.push(bestAccuracy);
  }

  return excerptBestAccuracies.length > 0
    ? excerptBestAccuracies.reduce((a, b) => a + b, 0) /
      excerptBestAccuracies.length
    : 0;
}
