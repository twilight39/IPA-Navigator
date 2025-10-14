import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";

export const toggleLike = mutation({
  args: {
    chapterId: v.id("chapter"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
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

    // Check if the chapter exists and is not revoked
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter || chapter.revoked_at) {
      throw new Error("Chapter not found or has been revoked");
    }

    // Check if the user has already liked this chapter
    const existingLikes = await ctx.db
      .query("chapter_like")
      .withIndex("by_user", (r) => r.eq("userId", user._id))
      .collect();
    const existingLike = existingLikes.find(
      (like) => like.chapterId.toString() === args.chapterId.toString(),
    );

    if (existingLike) {
      // User has already liked this chapter, so we remove the like (unlike)
      await ctx.db.delete(existingLike._id);

      await ctx.db.insert("activity_log", {
        userId: user._id,
        action_type: "chapter_unliked",
        metadata: { chapterId: args.chapterId },
        created_at: Date.now(),
      });

      return { success: true, message: "Chapter unliked." };
    } else {
      // User has not liked this chapter yet, so we add a new like
      await ctx.db.insert("chapter_like", {
        userId: user._id,
        chapterId: args.chapterId,
        created_at: Date.now(),
      });

      await ctx.db.insert("activity_log", {
        userId: user._id,
        action_type: "chapter_liked",
        metadata: { chapterId: args.chapterId },
        created_at: Date.now(),
      });

      return { success: true, message: "Chapter liked." };
    }
  },
});

export const toggleBookmark = mutation({
  args: {
    chapterId: v.id("chapter"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
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

    // Check if the chapter exists and is not revoked
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter || chapter.revoked_at) {
      throw new Error("Chapter not found or has been revoked");
    }

    // Check if the user has already bookmarked this chapter
    const existingBookmarks = await ctx.db
      .query("chapter_bookmark")
      .withIndex("by_user", (r) => r.eq("userId", user._id))
      .collect();
    const existingBookmark = existingBookmarks.find(
      (bookmark) => bookmark.chapterId.toString() === args.chapterId.toString(),
    );

    if (existingBookmark) {
      // User has already bookmarked this chapter, so we remove the bookmark (unbookmark)
      await ctx.db.delete(existingBookmark._id);
      return { success: true, message: "Chapter unbookmarked." };
    } else {
      // User has not bookmarked this chapter yet, so we add a new bookmark
      await ctx.db.insert("chapter_bookmark", {
        userId: user._id,
        chapterId: args.chapterId,
        created_at: Date.now(),
      });
      return { success: true, message: "Chapter bookmarked." };
    }
  },
});

export const toggleFollow = mutation({
  args: {
    followingId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
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

    if (user._id.toString() === args.followingId.toString()) {
      throw new Error("You cannot follow yourself");
    }

    // Check if the user to follow exists
    const userToFollow = await ctx.db.get(args.followingId);
    if (!userToFollow) {
      throw new Error("User to follow not found");
    }

    // Check if the user is already following the target user
    const existingFollows = await ctx.db
      .query("user_follow")
      .withIndex("by_follower", (r) => r.eq("followerId", user._id))
      .collect();
    const existingFollow = existingFollows.find(
      (follow) => follow.followingId.toString() === args.followingId.toString(),
    );

    if (existingFollow) {
      // User is already following the target user, so we remove the follow (unfollow)
      await ctx.db.delete(existingFollow._id);
      return { success: true, message: "User unfollowed." };
    } else {
      // User is not following the target user yet, so we add a new follow
      await ctx.db.insert("user_follow", {
        followerId: user._id,
        followingId: args.followingId,
        created_at: Date.now(),
      });
      return { success: true, message: "User followed." };
    }
  },
});
