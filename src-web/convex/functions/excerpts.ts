import { v } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "../_generated/server.js";
import { analyzePhonemesFromPython } from "../models/api.ts";
import { api, internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.d.ts";

export const getExcerptsForChapter = query({
  args: { chapterId: v.id("chapter") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const chapterExcerpts = await ctx.db.query("chapter_excerpt")
      .withIndex("by_chapter")
      .filter((q) =>
        q.eq(q.field("chapterId"), args.chapterId) &&
        q.eq(q.field("revoked_at"), undefined)
      )
      .order("asc")
      .collect();

    const excerptIds = chapterExcerpts.map((ce) => ce.excerptId);
    const excerpts = await Promise.all(
      excerptIds.map((id) => ctx.db.get(id)),
    );

    return chapterExcerpts.map((ce, index) => ({
      id: ce._id,
      excerptId: excerpts[index]?._id || null,
      text: excerpts[index]?.text || "",
      order: ce.order,
    }));
  },
});

export const addExcerpt = action({
  args: {
    chapterId: v.id("chapter"),
    text: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    {
      success: boolean;
      excerptId: Id<"excerpt">;
      order: number;
      id: Id<"chapter_excerpt">;
    }
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    try {
      // Call Python API
      const phonemeData = await analyzePhonemesFromPython(args.text, "us");

      // Call internal mutation
      const result = await ctx.runMutation(
        internal.functions.excerpts.addExcerptMutation,
        {
          chapterId: args.chapterId,
          text: args.text,
          phonemes: phonemeData.phonemes,
          phoneme_counts: phonemeData.counts,
        },
      );

      return result;
    } catch (error) {
      console.error("Failed to analyze and add excerpt:", error);
      throw error;
    }
  },
});

export const addExcerptMutation = internalMutation({
  args: {
    chapterId: v.id("chapter"),
    text: v.string(),
    phonemes: v.array(v.string()),
    phoneme_counts: v.object({
      vowels: v.number(),
      consonants: v.number(),
      diphthongs: v.number(),
      difficult: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const excerptId = await ctx.db.query(
      "excerpt",
    ).withIndex("by_text").filter((q) => q.eq(q.field("text"), args.text))
      .collect()
      .then((excerpts) => {
        if (excerpts.length > 0) {
          return excerpts[0]._id;
        } else {
          return ctx.db.insert("excerpt", {
            text: args.text,
            phonemes: args.phonemes,
            phoneme_counts: args.phoneme_counts,
          });
        }
      });

    const chapterExcerpts = await ctx.db.query("chapter_excerpt")
      .withIndex("by_chapter")
      .filter((q) => q.eq(q.field("chapterId"), args.chapterId))
      .order("desc")
      .collect();

    const order = chapterExcerpts.length > 0 ? chapterExcerpts[0].order + 1 : 0;

    const id = await ctx.db.insert("chapter_excerpt", {
      chapterId: args.chapterId,
      excerptId,
      created_at: Date.now(),
      order,
    });

    return { success: true, excerptId, order, id };
  },
});

export const updateExcerpt = action({
  args: {
    chapterExcerptId: v.id("chapter_excerpt"),
    text: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    {
      success: boolean;
    }
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    try {
      // Call Python API
      const phonemeData = await analyzePhonemesFromPython(args.text, "us");

      // Call internal mutation
      const result = await ctx.runMutation(
        internal.functions.excerpts.updateExcerptMutation,
        {
          chapterExcerptId: args.chapterExcerptId,
          text: args.text,
          phonemes: phonemeData.phonemes,
          phoneme_counts: phonemeData.counts,
        },
      );

      return result;
    } catch (error) {
      console.error("Failed to analyze and update excerpt:", error);
      throw error;
    }
  },
});

export const updateExcerptMutation = internalMutation({
  args: {
    chapterExcerptId: v.id("chapter_excerpt"),
    text: v.string(),
    phonemes: v.array(v.string()),
    phoneme_counts: v.object({
      vowels: v.number(),
      consonants: v.number(),
      diphthongs: v.number(),
      difficult: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const chapterExcerpt = await ctx.db.get(args.chapterExcerptId);
    if (!chapterExcerpt) {
      throw new Error("Chapter excerpt not found");
    }

    const existingExcerpts = await ctx.db.query(
      "excerpt",
    ).withIndex("by_text").filter((q) => q.eq(q.field("text"), args.text))
      .collect();

    let excerptId;
    if (existingExcerpts.length > 0) {
      excerptId = existingExcerpts[0]._id;
    } else {
      excerptId = await ctx.db.insert("excerpt", {
        text: args.text,
        phonemes: args.phonemes,
        phoneme_counts: args.phoneme_counts,
      });
    }

    await ctx.db.patch(args.chapterExcerptId, { excerptId });
    return { success: true };
  },
});

export const reorderExcerpts = mutation({
  args: {
    chapterId: v.id("chapter"),
    chapterExcerptId1: v.id("chapter_excerpt"),
    chapterExcerptId2: v.id("chapter_excerpt"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const chapterExcerpts = await ctx.db.query("chapter_excerpt")
      .withIndex("by_chapter")
      .filter((q) => q.eq(q.field("chapterId"), args.chapterId))
      .order("asc")
      .collect();

    const index1 = chapterExcerpts.findIndex(
      (ce) => ce._id.toString() === args.chapterExcerptId1.toString(),
    );
    const index2 = chapterExcerpts.findIndex(
      (ce) => ce._id.toString() === args.chapterExcerptId2.toString(),
    );

    if (index1 === -1 || index2 === -1) {
      throw new Error("One or both chapter excerpts not found in the chapter");
    }

    // Swap orders
    const order1 = chapterExcerpts[index1].order;
    const order2 = chapterExcerpts[index2].order;

    await ctx.db.patch(args.chapterExcerptId1, { order: order2 });
    await ctx.db.patch(args.chapterExcerptId2, { order: order1 });

    return { success: true };
  },
});

export const deleteExcerpt = mutation({
  args: {
    chapterExcerptId: v.id("chapter_excerpt"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const chapterExcerpt = await ctx.db.get(args.chapterExcerptId);
    if (!chapterExcerpt) {
      throw new Error("Chapter excerpt not found");
    }

    await ctx.db.patch(
      args.chapterExcerptId,
      { revoked_at: Date.now() },
    );

    // Optionally, delete the excerpt if it's not used in any other chapter
    const otherReferences = await ctx.db.query("chapter_excerpt")
      .withIndex("by_excerpt")
      .filter((q) => q.eq(q.field("excerptId"), chapterExcerpt.excerptId))
      .collect();

    if (otherReferences.length === 0) {
      await ctx.db.delete(chapterExcerpt.excerptId);
    }

    return { success: true };
  },
});
