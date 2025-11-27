import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server.js";
import { getUserIdFromContext } from "../models/users.ts";

// Helper: Get current date in GMT+8
function getTodayGMT8(): string {
  const now = new Date();
  const gmtPlus8 = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Singapore" }),
  );
  return gmtPlus8.toISOString().split("T")[0];
}

export const getUserStreak = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserIdFromContext(ctx);

    const streak = await ctx.db
      .query("user_streak")
      .withIndex("by_user", (q) => q.eq("userId", user))
      .first();

    return streak || {
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
    };
  },
});

export const getRandomChapterForDaily = query({
  args: {},
  handler: async (ctx) => {
    const today = getTodayGMT8();

    // Check if chapter already selected for today
    const selection = await ctx.db
      .query("daily_chapter_selection")
      .withIndex("by_date", (q) => q.eq("selectedDate", today))
      .first();

    if (selection) {
      const chapter = await ctx.db.get(selection.chapterId);
      return chapter;
    }

    return null;
  },
});

export const claimDailyReward = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUserIdFromContext(ctx);
    const today = getTodayGMT8();

    // Check if already claimed today
    const existingClaim = await ctx.db
      .query("daily_practice_log")
      .withIndex("by_user_date", (q) => q.eq("userId", user))
      .filter((q) => q.eq(q.field("practicedOn"), today))
      .first();

    if (existingClaim) {
      throw new Error("Daily reward already claimed today");
    }

    // Get or create streak
    let streak = await ctx.db
      .query("user_streak")
      .withIndex("by_user", (q) => q.eq("userId", user))
      .first();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayGMT8 = yesterday.toISOString().split("T")[0];

    if (!streak) {
      // First time claiming
      const id = await ctx.db.insert("user_streak", {
        userId: user,
        currentStreak: 1,
        longestStreak: 1,
        lastPracticeDate: today,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      streak = await ctx.db.get(id);
      if (!streak) {
        throw new Error("Failed to create user streak");
      }
    } else if (streak.lastPracticeDate === yesterdayGMT8) {
      // Continue streak
      const newStreak = streak.currentStreak + 1;
      const newLongest = Math.max(newStreak, streak.longestStreak);

      await ctx.db.patch(streak._id, {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastPracticeDate: today,
        updatedAt: Date.now(),
      });

      // Check for milestone notification
      if (newStreak === 7 || newStreak === 30 || newStreak === 60) {
        await ctx.db.insert("notifications", {
          userId: user,
          type: "streak_milestone",
          title: `🔥 ${newStreak}-Day Streak!`,
          message: `You've maintained a ${newStreak}-day streak!`,
          metadata: {
            streakDays: newStreak,
          },
          read: false,
          createdAt: Date.now(),
        });
      }
    } else {
      // Streak broken, reset to 1
      await ctx.db.patch(streak._id, {
        currentStreak: 1,
        lastPracticeDate: today,
        updatedAt: Date.now(),
      });

      // Notify streak lost
      await ctx.db.insert("notifications", {
        userId: user,
        type: "streak_lost",
        title: "😢 Your streak ended",
        message: "Don't worry! Start practicing to build a new streak.",
        read: false,
        createdAt: Date.now(),
      });
    }

    // Log daily practice
    await ctx.db.insert("daily_practice_log", {
      userId: user,
      practicedOn: today,
      claimedAt: Date.now(),
    });

    // Create notification
    await ctx.db.insert("notifications", {
      userId: user,
      type: "daily_claimed",
      title: "✓ Daily practice claimed!",
      message: "+10 coins",
      read: false,
      createdAt: Date.now(),
    });

    return { success: true, streak: streak.currentStreak };
  },
});

export const getNotifications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getUserIdFromContext(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user))
      .order("desc")
      .take(args.limit || 10);

    return notifications;
  },
});

export const markAllNotificationsAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUserIdFromContext(ctx);

    // Get all unread notifications for user
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    // Mark all as read
    await Promise.all(
      unreadNotifications.map((notif) =>
        ctx.db.patch(notif._id, { read: true })
      ),
    );

    return { success: true, markedCount: unreadNotifications.length };
  },
});

export const selectDailyChapter = internalMutation({
  args: {},
  handler: async (ctx) => {
    const chapters = await ctx.db
      .query("chapter")
      .withIndex("by_name")
      .filter((q) => q.eq(q.field("revoked_at"), undefined))
      .collect();

    if (chapters.length === 0) return;

    const randomIndex = Math.floor(Math.random() * chapters.length);
    const today = getTodayGMT8();

    await ctx.db.insert("daily_chapter_selection", {
      selectedDate: today,
      chapterId: chapters[randomIndex]._id,
      selectedAt: Date.now(),
    });
  },
});

export const earnBadge = mutation({
  args: {
    badgeId: v.string(),
    badgeName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) throw new Error("User not found");

    // Check if already earned
    const existing = await ctx.db
      .query("user_badges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("badgeId"), args.badgeId))
      .first();

    if (existing) {
      throw new Error("Badge already earned");
    }

    // Add badge
    await ctx.db.insert("user_badges", {
      userId: user._id,
      badgeId: args.badgeId,
      earnedAt: Date.now(),
    });

    // Create notification
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "badge_earned",
      title: `🎉 Unlocked: ${args.badgeName}!`,
      message: `You've earned the ${args.badgeName} badge!`,
      metadata: {
        badgeName: args.badgeName,
      },
      read: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const getUserBadges = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) throw new Error("User not found");

    return await ctx.db
      .query("user_badges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
