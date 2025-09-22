import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";

export const getChapter = query({
  args: { chapterId: v.id("chapter") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // Get creator info
    const user = await ctx.db.get(chapter.created_by);

    // Get image URL if exists
    let imageUrl = null;
    if (chapter.imageId) {
      imageUrl = await ctx.storage.getUrl(chapter.imageId);
    }

    return {
      ...chapter,
      creator_name: user?.name || "Unknown User",
      creator_picture_url: user?.picture_url || undefined,
      imageUrl,
    };
  },
});

export const getChapters = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called getUsers without authentication present");
    }

    const chapters = await ctx.db.query("chapter")
      .withIndex("by_name")
      .filter((q) => q.eq(q.field("revoked_at"), undefined))
      .order("asc")
      .collect();

    const userIds = [...new Set(chapters.map((chapter) => chapter.created_by))];

    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));

    const userMap = new Map();
    users.forEach((user) => {
      if (user) {
        userMap.set(user._id.toString(), [user.name, user.picture_url]);
      }
    });

    return await Promise.all(chapters.map(async (chapter) => {
      let imageUrl = null;
      if (chapter.imageId) {
        imageUrl = await ctx.storage.getUrl(chapter.imageId);
      }

      return {
        ...chapter,
        creator_name: userMap.get(chapter.created_by.toString())[0] ||
          "Unknown User",
        creator_picture_url: userMap.get(chapter.created_by.toString())[1] ||
          undefined,
        imageUrl,
      };
    }));
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
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called createChapter without authentication present");
    }

    // Verify this user exists in our database
    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found in database");
    }

    const now = Date.now();
    const chapterId = await ctx.db.insert("chapter", {
      name: args.name,
      description: args.description,
      difficulty: args.difficulty,
      created_at: now,
      updated_at: now,
      revoked_at: undefined,
      created_by: user._id,
      imageId: args.imageId,
    });

    return {
      success: true,
      message: "Chapter created successfully.",
      chapterId,
    };
  },
});
