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

const performanceSchema = {
  practice_session: defineTable({
    userId: v.id("users"),
    chapterId: v.id("chapter"),
    overall_accuracy: v.number(),
    overall_confidence: v.number(),
    total_words: v.number(),
    duration_seconds: v.optional(v.number()),
    created_at: v.number(),
  })
    .index("by_user", ["userId", "created_at"])
    .index("by_chapter", ["chapterId", "created_at"])
    .index("by_user_chapter", ["userId", "chapterId", "created_at"]),
  user_chapter_progress: defineTable({
    userId: v.id("users"),
    chapterId: v.id("chapter"),
    is_completed: v.boolean(),
    last_practice_session_id: v.optional(v.id("practice_session")),
    last_practiced_at: v.number(),
    total_practice_sessions: v.number(),
    cumulative_overall_accuracy: v.number(),
    total_words_practiced: v.number(),
  })
    .index("by_user_chapter", ["userId", "chapterId"])
    .index("by_user_completed", ["userId", "is_completed"])
    .index("by_user_last_practiced", ["userId", "last_practiced_at"]),
  word_result: defineTable({
    sessionId: v.id("practice_session"),
    word: v.string(),
    expected_index: v.number(),
    transcribed_as: v.optional(v.string()),
    word_accuracy: v.number(),
    word_confidence: v.number(),
    time_start: v.optional(v.number()),
    time_end: v.optional(v.number()),
  }).index("by_session", ["sessionId", "expected_index"]),
  phoneme_result: defineTable({
    wordResultId: v.id("word_result"),
    position: v.number(), // Position of the phoneme within the word
    target_phoneme: v.string(), // The IPA symbol expected, e.g., "l", "ð", "ɪ"
    detected_phoneme: v.optional(v.string()),
    accuracy: v.number(),
    confidence: v.optional(v.number()),
    similarity_score: v.optional(v.number()),
    status: v.union(
      v.literal("correct"),
      v.literal("substitution"),
      v.literal("deletion"),
      v.literal("insertion"),
    ),
    time_start: v.optional(v.number()),
    time_end: v.optional(v.number()),
  })
    .index("by_word_result", ["wordResultId", "position"])
    .index("by_target_phoneme", ["target_phoneme"]),
  user_phoneme_stats: defineTable({
    userId: v.id("users"),
    phoneme: v.string(),
    total_attempts: v.number(),
    total_correct: v.number(),
    avg_accuracy: v.number(),
    avg_confidence: v.number(),
    last_practiced: v.number(),
    updated_at: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_phoneme", ["userId", "phoneme"]),
  user_daily_stats: defineTable({
    userId: v.id("users"),
    date: v.string(),
    sessions_count: v.number(),
    total_words: v.number(),
    avg_accuracy: v.number(),
    practice_time_seconds: v.number(),
  }).index("by_user_date", ["userId", "date"]),
  user_daily_phoneme_stats: defineTable({
    userId: v.id("users"),
    date: v.string(),
    phoneme: v.string(),
    total_attempts_daily: v.number(),
    total_correct_daily: v.number(),
    avg_accuracy_daily: v.number(),
  })
    .index("by_user_date_phoneme", ["userId", "date", "phoneme"])
    .index("by_user_phoneme_date", ["userId", "phoneme", "date"]),
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

  chapter_bookmark: defineTable({
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
  ...performanceSchema,
  ...feedbackSchema,
  ...socialSchema,
});
