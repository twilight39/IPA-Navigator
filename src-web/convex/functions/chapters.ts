import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import { buildCategoryTree, stripCategoryFields } from "../models/chapters.ts";
import { getUserIdFromContext } from "../models/users.ts";

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

    // Get Difficulty
    const categoryIds = await ctx.db.query("chapter_category")
      .withIndex(
        "by_chapter",
      )
      .filter((q) => q.eq(q.field("chapterId"), args.chapterId))
      .collect();

    if (!categoryIds) {
      throw new Error("Chapter category not found");
    }

    const chapterCategories = await Promise.all(
      categoryIds.map((cc) => ctx.db.get(cc.categoryId)),
    );

    const difficulty = chapterCategories.filter((cat) =>
      cat?.type === "difficulty"
    );

    const categories = chapterCategories.filter((cat) =>
      cat?.type !== "difficulty"
    );

    return {
      ...chapter,
      creator_name: user?.name || "Unknown User",
      creator_picture_url: user?.picture_url || undefined,
      imageUrl,
      difficulty,
      categories,
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

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    const userIds = [...new Set(chapters.map((chapter) => chapter.created_by))];

    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));

    const userMap = new Map();
    users.forEach((user) => {
      if (user) {
        userMap.set(user._id.toString(), [user.name, user.picture_url]);
      }
    });

    const chapterCategories = await ctx.db.query("chapter_category")
      .withIndex("by_chapter")
      .collect();

    const categoryTypes = await ctx.db.query("category").withIndex("by_type")
      .collect();

    return await Promise.all(chapters.map(async (chapter) => {
      let imageUrl = null;
      if (chapter.imageId) {
        imageUrl = await ctx.storage.getUrl(chapter.imageId);
      }

      const relatedCategories = chapterCategories.filter((cc) =>
        cc.chapterId.toString() === chapter._id.toString()
      );

      // console.log(relatedCategories);

      const categories = relatedCategories.map((rc) =>
        categoryTypes.find((cat) =>
          cat._id.toString() === rc.categoryId.toString()
        )
      );

      const difficulty = categories.filter((cat) =>
        cat?.type === "difficulty"
      ).map((cat) => cat?.name)[0] || "N/A";

      if (user?._id) {
        // Fetch all chapter_like records for the current user
        const userLikes = await ctx.db
          .query("chapter_like")
          .withIndex("by_user", (q) =>
            q.eq("userId", user._id))
          .collect();
        // Create a Set for quick O(1) lookup of liked chapter IDs
        const likedChapterIds = new Set(
          userLikes.map((like) => like.chapterId),
        );

        // Fetch all chapter_save records for the current user
        const userSaves = await ctx.db
          .query("chapter_bookmark")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        // Create a Set for quick O(1) lookup of saved chapter IDs
        const savedChapterIds = new Set(
          userSaves.map((save) => save.chapterId),
        );

        // 4. Augment each chapter with its user-specific status
        const chaptersWithStatus = {
          ...chapter,
          isLiked: likedChapterIds.has(chapter._id),
          isBookmarked: savedChapterIds.has(chapter._id),
          creator_name: userMap.get(chapter.created_by.toString())[0] ||
            "Unknown User",
          creator_picture_url: userMap.get(chapter.created_by.toString())[1] ||
            undefined,
          imageUrl,
          difficulty,
          categories: categories.filter((cat) => cat?.type !== "difficulty"),
        };

        return chaptersWithStatus;
      } else {
        // If the user is not authenticated, return chapters with false for status
        // This ensures the client always receives a consistent shape.
        return {
          ...chapter,
          isLiked: false,
          isBookmarked: false,
          creator_name: userMap.get(chapter.created_by.toString())[0] ||
            "Unknown User",
          creator_picture_url: userMap.get(chapter.created_by.toString())[1] ||
            undefined,
          imageUrl,
          difficulty,
          categories: categories.filter((cat) => cat?.type !== "difficulty"),
        };
      }
    }));
  },
});

export const revokeChapter = mutation({
  args: { chapterId: v.id("chapter") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called revokeChapter without authentication present");
    }

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

    const chapter = await ctx.db.get(args.chapterId);

    if (!chapter) {
      throw new Error("Chapter not found");
    }

    if (chapter.created_by.toString() !== user._id.toString()) {
      throw new Error("You do not have permission to revoke this chapter");
    }

    await ctx.db.patch(args.chapterId, {
      revoked_at: Date.now(),
      updated_at: Date.now(),
    });

    return { success: true, message: "Chapter revoked successfully." };
  },
});

export const createChapter = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
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
      created_at: now,
      updated_at: now,
      revoked_at: undefined,
      created_by: user._id,
      imageId: args.imageId,
    });

    // Assign default difficulty category (Beginner)
    const difficultyCategory = await ctx.db
      .query("category")
      .withIndex("by_type")
      .filter((q) => q.eq(q.field("type"), "difficulty"))
      .order("asc")
      .first();

    if (!difficultyCategory) {
      throw new Error("No difficulty categories found in database");
    }

    await ctx.db.insert("chapter_category", {
      chapterId,
      categoryId: difficultyCategory._id,
      auto_assigned: false,
    });

    return {
      success: true,
      message: "Chapter created successfully.",
      chapterId,
    };
  },
});

export const updateChapter = mutation({
  args: {
    chapterId: v.id("chapter"),
    name: v.string(),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    categoryIds: v.optional(v.array(v.id("category"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called updateChapter without authentication present");
    }

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // Verify this user is the creator of the chapter
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

    if (chapter.created_by.toString() !== user._id.toString()) {
      throw new Error("You do not have permission to update this chapter");
    }

    await ctx.db.patch(args.chapterId, {
      name: args.name,
      description: args.description,
      imageId: args.imageId,
      updated_at: Date.now(),
    });

    if (args.categoryIds) {
      // Check all existing categories for this chapter
      const existingCategories = await ctx.db.query("chapter_category")
        .withIndex("by_chapter")
        .filter((q) => q.eq(q.field("chapterId"), args.chapterId))
        .collect();

      const existingCategoryIds = existingCategories.map((ec) =>
        ec.categoryId.toString()
      );

      const newCategoryIds = args.categoryIds.map((id) => id.toString());

      // Categories to remove
      const categoriesToRemove = existingCategories.filter((ec) =>
        !newCategoryIds.includes(ec.categoryId.toString())
      );

      // Categories to add
      const categoriesToAdd = args.categoryIds.filter((id) =>
        !existingCategoryIds.includes(id)
      );

      // Remove old categories
      await Promise.all(
        categoriesToRemove.map((cat) => ctx.db.delete(cat._id)),
      );

      // Add new categories
      await Promise.all(
        categoriesToAdd.map((catId) =>
          ctx.db.insert("chapter_category", {
            chapterId: args.chapterId,
            categoryId: catId,
            auto_assigned: false,
          })
        ),
      );
    }

    return { success: true, message: "Chapter updated successfully." };
  },
});

export const getDifficulties = query({
  args: {},
  handler: async (ctx) => {
    const difficulties = await ctx.db.query("category")
      .withIndex("by_type", (q) => q.eq("type", "difficulty"))
      .collect();
    return difficulties;
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("category")
      .order("asc")
      .collect();

    const filteredCategories = categories.filter((cat) =>
      cat.type !== "difficulty"
    );
    return stripCategoryFields(buildCategoryTree(filteredCategories));
  },
});

export const getChaptersWithProgress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await getUserIdFromContext(ctx);

    // Get all chapters
    const chapters = await ctx.db.query("chapter")
      .withIndex("by_name")
      .filter((q) => q.eq(q.field("revoked_at"), undefined))
      .order("asc")
      .collect();

    // Get user's progress for all chapters
    const userProgress = await ctx.db
      .query("user_chapter_progress")
      .withIndex("by_user", (q) => q.eq("userId", user))
      .collect();

    const progressMap = new Map();
    userProgress.forEach((p) => {
      progressMap.set(p.chapterId.toString(), p);
    });

    // Get creator info
    const userIds = [
      ...new Set(chapters.map((chapter) => chapter.created_by)),
    ];
    const users = await Promise.all(
      userIds.map((id) => ctx.db.get(id)),
    );

    const userMap = new Map();
    users.forEach((u) => {
      if (u) {
        userMap.set(u._id.toString(), [u.name, u.picture_url]);
      }
    });

    // Get chapter categories
    const chapterCategories = await ctx.db.query("chapter_category")
      .withIndex("by_chapter")
      .collect();

    const categoryTypes = await ctx.db.query("category")
      .withIndex("by_type")
      .collect();

    // Get user likes and bookmarks
    const userLikes = await ctx.db
      .query("chapter_like")
      .withIndex("by_user", (q) => q.eq("userId", user))
      .collect();
    const likedChapterIds = new Set(
      userLikes.map((like) => like.chapterId),
    );

    const userSaves = await ctx.db
      .query("chapter_bookmark")
      .withIndex("by_user", (q) => q.eq("userId", user))
      .collect();
    const savedChapterIds = new Set(
      userSaves.map((save) => save.chapterId),
    );

    return await Promise.all(chapters.map(async (chapter) => {
      let imageUrl = null;
      if (chapter.imageId) {
        imageUrl = await ctx.storage.getUrl(chapter.imageId);
      }

      const relatedCategories = chapterCategories.filter((cc) =>
        cc.chapterId.toString() === chapter._id.toString()
      );

      const categories = relatedCategories.map((rc) =>
        categoryTypes.find((cat) =>
          cat._id.toString() === rc.categoryId.toString()
        )
      );

      const difficulty = categories.filter((cat) =>
        cat?.type === "difficulty"
      ).map((cat) => cat?.name)[0] || "N/A";

      const progress = progressMap.get(chapter._id.toString());

      return {
        ...chapter,
        isLiked: likedChapterIds.has(chapter._id),
        isBookmarked: savedChapterIds.has(chapter._id),
        creator_name: userMap.get(chapter.created_by.toString())?.[0] ||
          "Unknown User",
        creator_picture_url: userMap.get(
          chapter.created_by.toString(),
        )?.[1] ||
          undefined,
        imageUrl,
        difficulty,
        categories: categories.filter((cat) =>
          cat?.type !== "difficulty"
        ),
        progress: progress
          ? {
            completedCount: progress.completed_excerpts_count,
            totalCount: progress.total_excerpts_in_chapter,
            accuracy: progress.overall_accuracy,
            completed: progress.completed,
            updatedAt: progress.updated_at,
          }
          : null,
      };
    }));
  },
});
