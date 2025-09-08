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
    difficulty: v.union(
      v.literal("Beginner"),
      v.literal("Intermediate"),
      v.literal("Advanced"),
    ),
    imageId: v.optional(v.id("_storage")),
    created_at: v.number(),
    created_by: v.id("users"),
    updated_at: v.number(),
    revoked_at: v.optional(v.number()),
  }).index("by_name", ["revoked_at", "name"]),
  excerpt: defineTable({
    text: v.string(),
  }),
  chapter_excerpt: defineTable({
    chapterId: v.id("chapter"),
    excerptId: v.id("excerpt"),
    order: v.number(),
  }).index("by_chapter", ["chapterId", "order"])
    .index("by_excerpt", ["excerptId"]),
};

export default defineSchema({
  ...userSchema,
  ...chapterSchema,
});
