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
  }).index("by_name", ["revoked_at", "name"])
    .index("by_created_by", [
      "created_by",
      "revoked_at",
      "created_at",
    ]),
  excerpt: defineTable({
    text: v.string(),
  }).index("by_text", ["text"]),
  chapter_excerpt: defineTable({
    chapterId: v.id("chapter"),
    excerptId: v.id("excerpt"),
    order: v.number(),
    created_at: v.number(),
    revoked_at: v.optional(v.number()),
  }).index("by_chapter", ["chapterId", "revoked_at", "order"])
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
  }).index("by_type", ["type", "sort_order"]).index("by_type_and_parent", [
    "type",
    "parentId",
    "sort_order",
  ]),
  chapter_category: defineTable({
    chapterId: v.id("chapter"),
    categoryId: v.id("category"),
    auto_assigned: v.boolean(), // True if assigned by algorithm, False if manually assigned
  })
    .index("by_chapter", ["chapterId"]) // Get all categories for a given chapter
    .index("by_category", ["categoryId"]), // Get all chapters for a given category
};

const performanceSchema = {
  excerpt_practice: defineTable({
    userId: v.id("users"),
    excerptId: v.id("excerpt"),
    chapterId: v.id("chapter"), // Denormalized for queries
    overall_accuracy: v.number(),
    overall_confidence: v.number(),
    total_words: v.number(),
    created_at: v.number(),
  })
    .index("by_user_excerpt", ["userId", "excerptId", "created_at"])
    .index("by_user_chapter", ["userId", "chapterId", "created_at"])
    .index("by_excerpt", ["excerptId", "created_at"])
    .index("by_user_and_time", ["userId", "created_at"]),

  word_result: defineTable({
    practiceId: v.id("excerpt_practice"),
    word: v.string(),
    expected_index: v.number(),
    transcribed_as: v.optional(v.string()),
    word_accuracy: v.number(),
    word_confidence: v.number(),
    time_start: v.optional(v.number()),
    time_end: v.optional(v.number()),
  }).index("by_practice", ["practiceId", "expected_index"]),

  phoneme_result: defineTable({
    wordResultId: v.id("word_result"),
    position: v.optional(v.number()), // Position of the phoneme within the word
    target_phoneme: v.optional(v.string()), // The IPA symbol expected, e.g., "l", "ð", "ɪ"
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

  /* Aggregate Tables */
  user_excerpt_progress: defineTable({
    userId: v.id("users"),
    /* chapter_excerpt has a revoked_at field */
    excerptId: v.id("excerpt"),
    chapterId: v.id("chapter"),
    best_accuracy: v.number(),
    best_practice_id: v.id("excerpt_practice"),
    total_attempts: v.number(),
  })
    .index("by_user_chapter", ["userId", "chapterId"])
    .index("by_user_excerpt", ["userId", "excerptId"]),
  user_chapter_progress: defineTable({
    userId: v.id("users"),
    /* chapter_excerpt has a revoked_at field */
    chapterId: v.id("chapter"),
    completed_excerpts_count: v.number(),
    total_excerpts_in_chapter: v.number(),
    overall_accuracy: v.number(),
    completed: v.boolean(),
    created_at: v.number(),
    updated_at: v.number(),
    revoked_at: v.optional(v.number()),
  }).index("by_user", ["userId", "revoked_at"])
    .index("by_user_chapter", ["userId", "chapterId", "revoked_at"])
    .index(
      "by_user_completed",
      ["userId", "completed", "revoked_at"],
    ),
};

const activitySchema = {
  activity_log: defineTable({
    userId: v.id("users"),
    action_type: v.union(
      v.literal("practice_completed"),
      v.literal("chapter_created"),
      v.literal("chapter_liked"),
      v.literal("chapter_unliked"),
      v.literal("chapter_bookmarked"),
      v.literal("chapter_unbookmarked"),
      v.literal("user_followed"),
      v.literal("classroom_joined"),
      v.literal("achievement_earned"),
    ),
    metadata: v.optional(
      v.object({
        excerptId: v.optional(v.id("excerpt")),
        chapterId: v.optional(v.id("chapter")),
        practiceId: v.optional(v.id("excerpt_practice")),
        classroomId: v.optional(v.id("classroom")),
        targetUserId: v.optional(v.id("users")),
        accuracy: v.optional(v.number()),
        // Add other relevant fields
      }),
    ),
    created_at: v.number(),
  })
    .index("by_user", ["userId", "created_at"])
    .index("by_type", ["action_type", "created_at"]),
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

const classroomSchema = {
  classroom: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    teacherId: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
    archived_at: v.optional(v.number()),
  }).index("by_teacher", ["teacherId", "archived_at"]),

  classroom_enrollment: defineTable({
    classroomId: v.id("classroom"),
    userId: v.id("users"),
    role: v.union(v.literal("teacher"), v.literal("student")),
    enrolled_at: v.number(),
    removed_at: v.optional(v.number()),
  })
    .index("by_classroom", ["classroomId", "removed_at"])
    .index("by_user", ["userId", "removed_at"])
    .index("unique_enrollment", ["classroomId", "userId"]),

  classroom_assignment: defineTable({
    classroomId: v.id("classroom"),
    chapterId: v.id("chapter"),
    assignedBy: v.id("users"),
    due_date: v.optional(v.number()),
    assigned_at: v.number(),
  })
    .index("by_classroom", ["classroomId", "due_date"])
    .index("by_chapter", ["chapterId"]),
};

const mlSchema = {
  // Track excerpt effectiveness per phoneme
  excerpt_phoneme_effectiveness: defineTable({
    excerptId: v.id("excerpt"),
    phoneme: v.string(),
    total_practices: v.number(),
    avg_improvement: v.number(), // Accuracy delta after practicing
    users_improved: v.number(),
    users_practiced: v.number(),
    last_updated: v.number(),
  })
    .index("by_phoneme", ["phoneme", "avg_improvement"])
    .index("by_excerpt", ["excerptId"]),

  // Track user improvement after practicing specific excerpts
  user_phoneme_improvement: defineTable({
    userId: v.id("users"),
    phoneme: v.string(),
    excerptId: v.id("excerpt"),
    accuracy_before: v.number(),
    accuracy_after: v.number(),
    improvement: v.number(), // after - before
    practiced_at: v.number(),
  })
    .index("by_user_phoneme", ["userId", "phoneme", "practiced_at"])
    .index("by_excerpt_phoneme", ["excerptId", "phoneme"]),

  // Track when user last practiced each excerpt (for diversity)
  user_excerpt_recency: defineTable({
    userId: v.id("users"),
    excerptId: v.id("excerpt"),
    last_practiced_at: v.number(),
  })
    .index("by_user", ["userId", "last_practiced_at"])
    .index("by_user_excerpt", ["userId", "excerptId"]),
};

export default defineSchema({
  ...userSchema,
  ...chapterSchema,
  ...performanceSchema,
  ...activitySchema,
  ...feedbackSchema,
  ...socialSchema,
  ...classroomSchema,
});
