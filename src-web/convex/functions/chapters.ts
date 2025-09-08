import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server.js";

export const getChapters = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called getUsers without authentication present");
    }

    return await ctx.db.query("chapter")
      .withIndex("by_name")
      .filter((q) => q.eq(q.field("revoked_at"), undefined))
      .order("asc")
      .collect();
  },
});

export const createChapter = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    difficulty: v.union(
      v.literal("Beginner"),
      v.literal("Intermediate"),
      v.literal("Advanced"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called createChapter without authentication present");
    }

    const now = Date.now();
    const chapterId = await ctx.db.insert("chapter", {
      name: args.name,
      description: args.description,
      difficulty: args.difficulty,
      created_at: now,
      updated_at: now,
      revoked_at: undefined,
    });

    return {
      success: true,
      message: "Chapter created successfully.",
      chapterId,
    };
  },
});
