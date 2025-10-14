import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server.js";
import { getUserIdFromContext } from "./users.ts";

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
