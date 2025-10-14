import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import { getUserIdFromContext } from "../models/users.ts";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { QueryCtx } from "../_generated/server.d.ts";

export const getUserActivitiyLog = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = args.userId || (await getUserIdFromContext(ctx));

    const activities = await ctx.db
      .query("activity_log")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc") // Get the most recent first
      .take(100);

    const groupedActivities: Map<string, FormattedActivityLogEntry> = new Map();
    const chapterIdsToFetch: Set<Id<"chapter">> = new Set();

    for (const entry of activities) {
      if (
        entry.action_type === "practice_completed" && entry.metadata?.chapterId
      ) {
        const chapterId = entry.metadata.chapterId;
        chapterIdsToFetch.add(chapterId);

        const existingKey = `practice_completed_${chapterId}`;
        if (!groupedActivities.has(existingKey)) {
          groupedActivities.set(existingKey, {
            _id: entry._id,
            userId: entry.userId,
            chapterId: chapterId,
            action_type: "chapter_practice_summary",
            description: "Practiced a chapter.",
            created_at: entry.created_at,
            relatedChapterName: undefined,
          });
        }
      } else {
        const description = formatActionType(entry.action_type, entry.metadata);
        const uniqueKey = `${entry.action_type}_${entry._id}`;

        const chapterId = entry.metadata?.chapterId;
        if (chapterId) {
          chapterIdsToFetch.add(chapterId);
        }

        groupedActivities.set(uniqueKey, {
          _id: entry._id,
          userId: entry.userId,
          chapterId: chapterId || null,
          action_type: entry.action_type,
          description: description,
          created_at: entry.created_at,
          relatedChapterName: undefined,
        });
      }
    }

    const chapters: Record<Id<"chapter">, Doc<"chapter">> = {};
    if (chapterIdsToFetch.size > 0) {
      const fetchedChapters = await ctx.db
        .query("chapter")
        .collect();
      const filteredChapters = fetchedChapters.filter((chapter) =>
        chapterIdsToFetch.has(chapter._id)
      );
      for (const chapter of filteredChapters) {
        chapters[chapter._id] = chapter;
      }
    }

    const finalActivityLog: FormattedActivityLogEntry[] = [];
    for (const activity of groupedActivities.values()) {
      if (
        activity.action_type === "chapter_practice_summary" &&
        activity.relatedChapterName === undefined
      ) {
        const chapter = activity.chapterId
          ? chapters[activity.chapterId]
          : null;

        if (chapter) {
          activity.relatedChapterName = chapter.name;
          activity.description = `Practiced the chapter "${chapter.name}"`;
        } else {
          activity.relatedChapterName = "Unknown Chapter";
          activity.description = `Practiced a chapter.`;
        }
      } else if (
        activity.chapterId &&
        activity.relatedChapterName === undefined
      ) {
        const chapter = chapters[activity.chapterId];
        if (chapter) {
          activity.relatedChapterName = chapter.name;
          activity.description += `"${chapter.name}"`;
        } else {
          activity.relatedChapterName = "Unknown Chapter";
          activity.description += `"Unknown"`;
        }
      }

      finalActivityLog.push(activity);
    }

    return finalActivityLog;
  },
});

export const getUserCommunityStats = query({
  handler: async (ctx) => {
    const userId = await getUserIdFromContext(ctx);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // 1. Chapters created by a user
    const chaptersCreated = await ctx.db
      .query("chapter")
      .withIndex(
        "by_created_by",
        (q) => q.eq("created_by", userId).eq("revoked_at", undefined),
      )
      .collect();

    const chaptersCreatedLastWeek = chaptersCreated.filter(
      (chapter) => chapter.created_at >= oneWeekAgo,
    );

    // 2. Chapters liked by a user
    const chaptersLiked = await ctx.db
      .query("chapter_like")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const chaptersLikedLastWeek = chaptersLiked.filter(
      (like) => like.created_at >= oneWeekAgo,
    );

    // 3. Chapters bookmarked by a user
    const chaptersBookmarked = await ctx.db
      .query("chapter_bookmark")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const chaptersBookmarkedLastWeek = chaptersBookmarked.filter(
      (bookmark) => bookmark.created_at >= oneWeekAgo,
    );

    return {
      chaptersCreated: chaptersCreated.length,
      chaptersLiked: chaptersLiked.length,
      chaptersBookmarked: chaptersBookmarked.length,
      chaptersCreatedLastWeek: chaptersCreatedLastWeek.length,
      chaptersLikedLastWeek: chaptersLikedLastWeek.length,
      chaptersBookmarkedLastWeek: chaptersBookmarkedLastWeek.length,
    };
  },
});

export const getUserProgressMeterData = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = args.userId || (await getUserIdFromContext(ctx));

    const chapterProgresses = await ctx.db
      .query("user_chapter_progress")
      .withIndex(
        "by_user",
        (q) => q.eq("userId", userId).eq("revoked_at", undefined),
      )
      .collect();

    const categories = await ctx.db
      .query("category")
      .collect();

    const categoryMap: Map<Id<"category">, Doc<"category">> = new Map();
    for (const cat of categories) {
      categoryMap.set(cat._id, cat);
    }

    const chapterProgressMap: Map<Id<"chapter">, Doc<"user_chapter_progress">> =
      new Map();
    for (const progress of chapterProgresses) {
      chapterProgressMap.set(progress.chapterId, progress);
    }

    const categoryIdToChapterIdsMap = await buildCategoryIdToChapterIdsMap(ctx);

    const meterData: MeterData = {
      totalChapters: 0,
      completedChapters: 0,
      attemptingChapters: 0,
      categories: {
        difficulty: {},
      },
    };

    let totalChaptersWithProgress = 0;
    let completedChaptersCount = 0;

    for (const progress of chapterProgresses) {
      totalChaptersWithProgress++;
      if (progress.completed) {
        completedChaptersCount++;
      }
    }
    meterData.totalChapters = chapterProgresses.length;
    meterData.completedChapters = completedChaptersCount;
    meterData.attemptingChapters = totalChaptersWithProgress -
      completedChaptersCount;

    const difficultyCategories = categories.filter((cat) =>
      cat.type === "difficulty"
    );

    for (const difficultyCat of difficultyCategories) {
      const chaptersLinkedToDifficulty =
        categoryIdToChapterIdsMap.get(difficultyCat._id) || [];
      const totalCountForCat = chaptersLinkedToDifficulty.length;
      let solvedCountForCat = 0;

      for (const chapterId of chaptersLinkedToDifficulty) {
        const progress = chapterProgressMap.get(chapterId);
        if (progress && progress.completed) {
          solvedCountForCat++;
        }
      }

      meterData.categories.difficulty[difficultyCat.name] = {
        solved: solvedCountForCat,
        total: totalCountForCat,
      };
    }

    return meterData;
  },
});

export const getUserSkills = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = args.userId || (await getUserIdFromContext(ctx));

    const chapterProgresses = await ctx.db
      .query("user_chapter_progress")
      .withIndex(
        "by_user",
        (q) => q.eq("userId", userId).eq("revoked_at", undefined),
      )
      .collect();

    const categories = await ctx.db
      .query("category")
      .collect();

    // Map categoryId to the full category document
    const categoryMap: Map<Id<"category">, Doc<"category">> = new Map();
    for (const cat of categories) {
      categoryMap.set(cat._id, cat);
    }

    // Separate categories into top-level and sub-level
    const topLevelCategories: Array<Doc<"category">> = [];
    const subCategoriesMap: Map<Id<"category">, Array<Doc<"category">>> =
      new Map();

    for (const cat of categories) {
      if (!cat.parentId && cat.type === "phoneme_type") {
        topLevelCategories.push(cat);
      } else if (cat.parentId && cat.type === "phoneme_type") {
        if (!subCategoriesMap.has(cat.parentId)) {
          subCategoriesMap.set(cat.parentId, []);
        }
        subCategoriesMap.get(cat.parentId)!.push(cat);
      }
    }

    const categoryIdToChapterIdsMap = await buildCategoryIdToChapterIdsMap(ctx);

    const chapterProgressMap: Map<Id<"chapter">, Doc<"user_chapter_progress">> =
      new Map();
    for (const progress of chapterProgresses) {
      chapterProgressMap.set(progress.chapterId, progress);
    }

    const structuredSkillsData: Record<
      string,
      Record<string, {
        name: string; // Sub-category name
        categoryType: Doc<"category">["type"];
        completedCount: number;
        totalCount: number;
      }>
    > = {};

    for (const topCategory of topLevelCategories) {
      const subCategories = subCategoriesMap.get(topCategory._id) || [];
      const subCategorySkills: Record<string, {
        name: string;
        categoryType: Doc<"category">["type"];
        completedCount: number;
        totalCount: number;
      }> = {};

      for (const subCategory of subCategories) {
        const chaptersLinkedToSubCategory =
          categoryIdToChapterIdsMap.get(subCategory._id) || [];
        const totalCount = chaptersLinkedToSubCategory.length;
        let completedCount = 0;

        for (const chapterId of chaptersLinkedToSubCategory) {
          const progress = chapterProgressMap.get(chapterId);
          // Check if user has progress and the chapter is marked as completed
          if (progress && progress.completed) {
            completedCount++;
          }
        }

        subCategorySkills[subCategory.name] = { // Use sub-category name as the key for the inner object
          name: subCategory.name,
          categoryType: subCategory.type,
          completedCount,
          totalCount,
        };
      }

      // Add the processed sub-categories under the top-level category name
      structuredSkillsData[topCategory.name] = subCategorySkills;
    }

    return structuredSkillsData;
  },
});

interface FormattedActivityLogEntry {
  _id: Id<"activity_log">;
  userId: Id<"users">;
  chapterId: Id<"chapter"> | undefined | null;
  action_type: string;
  description: string;
  created_at: number;
  relatedChapterName?: string;
}

interface MeterData {
  totalChapters: number;
  completedChapters: number;
  attemptingChapters: number;
  categories: {
    [categoryType: string]: {
      [categoryName: string]: {
        solved: number;
        total: number;
      };
    };
  };
}

function formatActionType(actionType: string, metadata: any): string {
  switch (actionType) {
    case "practice_completed": // This case should ideally not be hit if aggregated
      return "Completed a practice.";
    case "chapter_created":
      return "Created a chapter.";
    case "chapter_liked":
      return "Liked the chapter ";
    case "chapter_unliked":
      return "Unliked the chapter ";
    case "chapter_bookmarked":
      return "Bookmarked the chapter ";
    case "chapter_unbookmarked":
      return "Removed bookmark from the chapter ";
    case "user_followed":
      return "Followed a user.";
    case "classroom_joined":
      return "Joined a classroom.";
    case "achievement_earned":
      return "Earned an achievement.";
    default:
      return `Performed action: ${actionType}`;
  }
}

async function buildCategoryIdToChapterIdsMap(
  ctx: QueryCtx,
): Promise<Map<Id<"category">, Id<"chapter">[]>> {
  const chapters = await ctx.db
    .query("chapter")
    .withIndex("by_name", (q) => q.eq("revoked_at", undefined))
    .collect();
  const nonRevokedChapterIds = new Set(chapters.map((ch) => ch._id));

  const chapterCategories = await ctx.db
    .query("chapter_category")
    .collect();

  const map = new Map<Id<"category">, Id<"chapter">[]>();
  for (const cc of chapterCategories) {
    if (!nonRevokedChapterIds.has(cc.chapterId)) continue;
    if (!map.has(cc.categoryId)) {
      map.set(cc.categoryId, []);
    }
    map.get(cc.categoryId)!.push(cc.chapterId);
  }
  return map;
}
