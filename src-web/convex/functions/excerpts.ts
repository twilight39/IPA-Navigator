import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";

export const getExcerptsForChapter = query({
  args: { chapterId: v.id("chapter") },
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

export const addExcerpt = mutation({
  args: {
    chapterId: v.id("chapter"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

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
      order,
    });

    return { success: true, excerptId, order, id };
  },
});

export const updateExcerpt = mutation({
  args: {
    chapterExcerptId: v.id("chapter_excerpt"),
    text: v.string(),
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

    const existingExcerpts = await ctx.db.query(
      "excerpt",
    ).withIndex("by_text").filter((q) => q.eq(q.field("text"), args.text))
      .collect();

    let excerptId;
    if (existingExcerpts.length > 0) {
      excerptId = existingExcerpts[0]._id;
    } else {
      excerptId = await ctx.db.insert("excerpt", { text: args.text });
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

    await ctx.db.delete(args.chapterExcerptId);

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
