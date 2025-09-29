import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const userSchema = {
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    picture_url: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"])
    .index("by_name", ["name"]),
};

const chapterSchema = {
  chapter: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    created_at: v.number(),
    created_by: v.id("users"),
    updated_at: v.number(),
    revoked_at: v.optional(v.number()),
  }).index("by_name", ["revoked_at", "name"]),
  excerpt: defineTable({
    text: v.string(),
  }).index("by_text", ["text"]),
  chapter_excerpt: defineTable({
    chapterId: v.id("chapter"),
    excerptId: v.id("excerpt"),
    order: v.number(),
  }).index("by_chapter", ["chapterId", "order"])
    .index("by_excerpt", ["excerptId"]),
  category: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("difficulty"),
      v.literal("phoneme_type"),
      v.literal("tags"),
    ),
    sort_order: v.number(),
    parentId: v.optional(v.id("category")),
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_type", ["type", "sort_order"]),
  chapter_category: defineTable({
    chapterId: v.id("chapter"),
    categoryId: v.id("category"),
    auto_assigned: v.boolean(), // True if assigned by algorithm, False if manually assigned
  })
    .index("by_chapter", ["chapterId"]) // Get all categories for a given chapter
    .index("by_category", ["categoryId"]), // Get all chapters for a given category
};

const feedbackSchema = {
  phoneme_feedback: defineTable({
    phoneme: v.string(), // The IPA symbol, e.g., "l", "ð", "ɪ"
    description: v.array(v.string()),
    example_words: v.optional(v.array(v.string())), // E.g., ["light", "follow", "call"]
    audio_example_id: v.optional(v.id("_storage")),
    illustration_url: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_phoneme", ["phoneme"]),
};

const socialSchema = {
  user_follow: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
    created_at: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("unique_follow", ["followerId", "followingId"]),

  chapter_like: defineTable({
    userId: v.id("users"),
    chapterId: v.id("chapter"),
    created_at: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_chapter", ["chapterId"])
    .index("unique_like", ["userId", "chapterId"]),

  chapter_save: defineTable({
    userId: v.id("users"),
    chapterId: v.id("chapter"),
    created_at: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_chapter", ["chapterId"])
    .index("unique_save", ["userId", "chapterId"]),

  // TODO: Sus
  chapter_share: defineTable({
    userId: v.id("users"),
    chapterId: v.id("chapter"),
    platform: v.optional(v.string()),
    created_at: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_chapter", ["chapterId"]),
};

export default defineSchema({
  ...userSchema,
  ...chapterSchema,
  ...feedbackSchema,
});
