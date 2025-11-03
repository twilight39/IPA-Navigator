import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.d.ts";
import { getUserIdFromContext } from "../models/users.ts";

export const getClassrooms = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all public, non-archived classrooms
    const classrooms = await ctx.db
      .query("classroom")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .filter((q) => q.eq(q.field("archived_at"), undefined))
      .collect();

    return await Promise.all(
      classrooms.map(async (classroom) => {
        // Get member count
        const members = await ctx.db
          .query("classroom_enrollment")
          .withIndex("by_classroom", (q) => q.eq("classroomId", classroom._id))
          .filter((q) => q.eq(q.field("removed_at"), undefined))
          .collect();

        // Get teacher info
        const teacher = await ctx.db.get(classroom.teacherId);

        // Get user's enrollment status
        const userEnrollment = members.find(
          (m) => m.userId.toString() === user._id.toString(),
        );

        let imageUrl = null;
        if (classroom.imageId) {
          imageUrl = await ctx.storage.getUrl(classroom.imageId);
        }

        return {
          ...classroom,
          memberCount: members.length,
          teacherName: teacher?.name || "Unknown",
          teacherPicture: teacher?.picture_url,
          userRole: userEnrollment?.role || null,
          isCreator: classroom.teacherId.toString() === user._id.toString(),
          imageUrl,
        };
      }),
    );
  },
});

export const getUserClassrooms = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get classrooms user is enrolled in
    const enrollments = await ctx.db
      .query("classroom_enrollment")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("removed_at"), undefined))
      .collect();

    // Get classrooms user created
    const createdClassrooms = await ctx.db
      .query("classroom")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .filter((q) => q.eq(q.field("archived_at"), undefined))
      .collect();

    const classroomIds = new Set([
      ...enrollments.map((e) => e.classroomId.toString()),
      ...createdClassrooms.map((c) => c._id.toString()),
    ]);

    return await Promise.all(
      Array.from(classroomIds).map(async (id) => {
        const classroom = await ctx.db.get(id as Id<"classroom">);
        if (!classroom) return null;

        // Get member count
        const members = await ctx.db
          .query("classroom_enrollment")
          .withIndex("by_classroom", (q) => q.eq("classroomId", classroom._id))
          .filter((q) => q.eq(q.field("removed_at"), undefined))
          .collect();

        // Get teacher info
        const teacher = await ctx.db.get(classroom.teacherId);

        // Get user's role
        const userEnrollment = enrollments.find(
          (e) => e.classroomId.toString() === classroom._id.toString(),
        );

        let imageUrl = null;
        if (classroom.imageId) {
          imageUrl = await ctx.storage.getUrl(classroom.imageId);
        }

        return {
          ...classroom,
          memberCount: members.length,
          teacherName: teacher?.name || "Unknown",
          teacherPicture: teacher?.picture_url,
          userRole: userEnrollment?.role || "teacher",
          imageUrl,
          isCreator: classroom.teacherId.toString() === user._id.toString(),
        };
      }),
    );
  },
});

export const createClassroom = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const classroomId = await ctx.db.insert("classroom", {
      name: args.name,
      description: args.description,
      teacherId: user._id,
      visibility: args.visibility,
      created_at: now,
      updated_at: now,
    });

    // Enroll teacher as creator
    await ctx.db.insert("classroom_enrollment", {
      classroomId,
      userId: user._id,
      role: "teacher",
      enrolled_at: now,
    });

    return {
      success: true,
      message: "Classroom created successfully",
      classroomId,
    };
  },
});

export const getClassroom = query({
  args: { classroomId: v.id("classroom") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get teacher info
    const teacher = await ctx.db.get(classroom.teacherId);

    // Get user's enrollment
    const enrollment = await ctx.db
      .query("classroom_enrollment")
      .withIndex(
        "unique_enrollment",
        (q) => q.eq("classroomId", args.classroomId),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .filter((q) => q.eq(q.field("removed_at"), undefined))
      .first();

    if (!enrollment) {
      throw new Error(
        "You are not enrolled in this classroom",
      );
    }

    // Get all members
    const members = await ctx.db
      .query("classroom_enrollment")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .filter((q) => q.eq(q.field("removed_at"), undefined))
      .collect();

    let imageUrl = null;
    if (classroom.imageId) {
      imageUrl = await ctx.storage.getUrl(classroom.imageId);
    }

    return {
      ...classroom,
      teacherName: teacher?.name || "Unknown",
      teacherPicture: teacher?.picture_url,
      memberCount: members.length,
      userRole: enrollment.role,
      imageUrl,
    };
  },
});

export const getClassroomChapters = query({
  args: { classroomId: v.id("classroom") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get assigned chapters
    const assignments = await ctx.db
      .query("classroom_assignment")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .order("asc")
      .collect();

    const user = await getUserIdFromContext(ctx);

    const chapter_categories = await ctx.db.query("chapter_category").collect();

    return await Promise.all(
      assignments.map(async (assignment) => {
        const chapter = await ctx.db.get(assignment.chapterId);
        if (!chapter) {
          return null;
        }
        const creator = await ctx.db.get(chapter?.created_by);
        if (!creator) {
          return null;
        }

        // Get user's progress on this chapter
        const progress = await ctx.db
          .query("user_chapter_progress")
          .withIndex("by_user_chapter", (q) => q.eq("userId", user))
          .filter((q) => q.eq(q.field("chapterId"), assignment.chapterId))
          .first();

        // Get chapter categories to extract difficulty
        const categories = chapter_categories.filter(
          (cc) => cc.chapterId.toString() === chapter._id.toString(),
        );

        const categoryDocs = await Promise.all(
          categories.map((cc) => ctx.db.get(cc.categoryId)),
        );

        const difficulty = categoryDocs
          .filter((cat) => cat?.type === "difficulty")
          .map((cat) => cat?.name)[0] || "N/A";

        const totalExcerpts = await ctx.db
          .query("chapter_excerpt")
          .withIndex(
            "by_chapter",
            (q) => q.eq("chapterId", assignment.chapterId),
          )
          .filter((q) => q.eq(q.field("revoked_at"), undefined))
          .collect();

        return {
          assignmentId: assignment._id,
          chapterId: assignment.chapterId,
          order: assignment.order,
          dueDate: assignment.due_date,
          ...chapter,
          creatorName: creator?.name || "Unknown",
          difficulty,
          totalExcerpts: totalExcerpts.length,
          progress: progress
            ? {
              completedCount: progress.completed_excerpts_count,
              totalCount: progress.total_excerpts_in_chapter,
              accuracy: progress.overall_accuracy,
              completed: progress.completed,
            }
            : null,
        };
      }),
    );
  },
});

export const getClassroomLeaderboard = query({
  args: { classroomId: v.id("classroom") },
  handler: async (ctx, args) => {
    // Get all enrolled students
    const members = await ctx.db
      .query("classroom_enrollment")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .filter((q) => q.eq(q.field("removed_at"), undefined))
      .collect();

    const leaderboard = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);

        // Get all assigned chapters
        const assignments = await ctx.db
          .query("classroom_assignment")
          .withIndex(
            "by_classroom",
            (q) => q.eq("classroomId", args.classroomId),
          )
          .collect();

        // Get user's progress on all chapters in this classroom
        const progress = await Promise.all(
          assignments.map((assignment) =>
            ctx.db
              .query("user_chapter_progress")
              .withIndex(
                "by_user_chapter",
                (q) => q.eq("userId", member.userId),
              )
              .filter((q) => q.eq(q.field("chapterId"), assignment.chapterId))
              .first()
          ),
        );

        // Calculate average accuracy and total attempts
        const validProgress = progress.filter((p) => p !== null);
        const averageAccuracy = validProgress.length > 0
          ? validProgress.reduce(
            (sum, p) => sum + (p?.overall_accuracy || 0),
            0,
          ) /
            validProgress.length
          : 0;
        const totalAttempts = validProgress.reduce(
          (sum, p) => sum + (p?.completed_excerpts_count || 0),
          0,
        );

        return {
          userId: member.userId,
          userName: user?.name || "Unknown",
          userPicture: user?.picture_url,
          accuracy: averageAccuracy,
          totalAttempts,
          role: member.role,
        };
      }),
    );

    // Sort by accuracy descending
    return leaderboard
      .sort((a, b) => b.accuracy - a.accuracy)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  },
});

export const getAvailableChapters = query({
  args: { classroomId: v.id("classroom") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = getUserIdFromContext(ctx);

    if (!user) {
      throw new Error("User not found");
    }

    // Get all non-revoked chapters
    const allChapters = await ctx.db
      .query("chapter")
      .withIndex("by_name")
      .filter((q) => q.eq(q.field("revoked_at"), undefined))
      .collect();

    // Get already assigned chapters
    const assignments = await ctx.db
      .query("classroom_assignment")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    const assignedChapterIds = new Set(
      assignments.map((a) => a.chapterId.toString()),
    );

    // Filter out already assigned chapters
    const availableChapters = allChapters.filter(
      (ch) => !assignedChapterIds.has(ch._id.toString()),
    );

    // Enrich with creator info and categories
    return await Promise.all(
      availableChapters.map(async (chapter) => {
        const creator = await ctx.db.get(chapter.created_by);

        const categories = await ctx.db
          .query("chapter_category")
          .withIndex("by_chapter")
          .filter((q) => q.eq(q.field("chapterId"), chapter._id))
          .collect();

        const categoryDocs = await Promise.all(
          categories.map((cc) => ctx.db.get(cc.categoryId)),
        );

        const difficulty = categoryDocs
          .filter((cat) => cat?.type === "difficulty")
          .map((cat) => cat?.name)[0] || "N/A";

        return {
          ...chapter,
          creatorName: creator?.name || "Unknown",
          difficulty,
        };
      }),
    );
  },
});

export const addChapterToClassroom = mutation({
  args: {
    classroomId: v.id("classroom"),
    chapterId: v.id("chapter"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user is teacher of this classroom
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.teacherId.toString() !== user._id.toString()) {
      throw new Error(
        "You do not have permission to manage this classroom",
      );
    }

    // Check if chapter is already assigned
    const existing = await ctx.db
      .query("classroom_assignment")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .filter((q) => q.eq(q.field("chapterId"), args.chapterId))
      .first();

    if (existing) {
      throw new Error("Chapter is already assigned to this classroom");
    }

    // Get the highest order number
    const assignments = await ctx.db
      .query("classroom_assignment")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    const nextOrder = assignments.length > 0
      ? Math.max(...assignments.map((a) => a.order)) + 1
      : 0;

    const assignmentId = await ctx.db.insert("classroom_assignment", {
      classroomId: args.classroomId,
      chapterId: args.chapterId,
      assignedBy: user._id,
      order: nextOrder,
      assigned_at: Date.now(),
    });

    return {
      success: true,
      message: "Chapter added successfully",
      assignmentId,
    };
  },
});

export const removeChapterFromClassroom = mutation({
  args: {
    classroomId: v.id("classroom"),
    assignmentId: v.id("classroom_assignment"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user is teacher
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.teacherId.toString() !== user._id.toString()) {
      throw new Error(
        "You do not have permission to manage this classroom",
      );
    }

    // Delete assignment
    await ctx.db.delete(args.assignmentId);

    return {
      success: true,
      message: "Chapter removed successfully",
    };
  },
});

export const reorderChapters = mutation({
  args: {
    classroomId: v.id("classroom"),
    assignments: v.array(
      v.object({
        assignmentId: v.id("classroom_assignment"),
        order: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user is teacher
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.teacherId.toString() !== user._id.toString()) {
      throw new Error(
        "You do not have permission to manage this classroom",
      );
    }

    // Update all orders
    await Promise.all(
      args.assignments.map((assignment) =>
        ctx.db.patch(assignment.assignmentId, {
          order: assignment.order,
        })
      ),
    );

    return {
      success: true,
      message: "Chapters reordered successfully",
    };
  },
});

export const updateClassroom = mutation({
  args: {
    classroomId: v.id("classroom"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(
      v.union(v.literal("public"), v.literal("private")),
    ),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.teacherId.toString() !== user._id.toString()) {
      throw new Error(
        "You do not have permission to manage this classroom",
      );
    }

    await ctx.db.patch(args.classroomId, {
      name: args.name ?? classroom.name,
      description: args.description !== undefined
        ? args.description
        : classroom.description,
      visibility: args.visibility ?? classroom.visibility,
      imageId: args.imageId !== undefined ? args.imageId : classroom.imageId,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

export const generateInviteCode = mutation({
  args: { classroomId: v.id("classroom") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.teacherId.toString() !== user._id.toString()) {
      throw new Error(
        "You do not have permission to manage this classroom",
      );
    }

    // Generate a random 6-character code
    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    await ctx.db.patch(args.classroomId, {
      inviteCode: code,
    });

    return { success: true, inviteCode: code };
  },
});

export const removeClassroomMember = mutation({
  args: {
    classroomId: v.id("classroom"),
    enrollmentId: v.id("classroom_enrollment"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.teacherId.toString() !== user._id.toString()) {
      throw new Error(
        "You do not have permission to manage this classroom",
      );
    }

    // Soft delete enrollment
    await ctx.db.patch(args.enrollmentId, {
      removed_at: Date.now(),
    });

    return { success: true };
  },
});

export const archiveClassroom = mutation({
  args: { classroomId: v.id("classroom") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.teacherId.toString() !== user._id.toString()) {
      throw new Error(
        "You do not have permission to manage this classroom",
      );
    }

    await ctx.db.patch(args.classroomId, {
      archived_at: Date.now(),
    });

    return { success: true };
  },
});

export const getClassroomMembers = query({
  args: { classroomId: v.id("classroom") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to this classroom
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const enrollment = await ctx.db
      .query("classroom_enrollment")
      .withIndex(
        "unique_enrollment",
        (q) => q.eq("classroomId", args.classroomId),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .filter((q) => q.eq(q.field("removed_at"), undefined))
      .first();

    if (!enrollment) {
      throw new Error(
        "You are not enrolled in this classroom",
      );
    }

    // Get all members
    const members = await ctx.db
      .query("classroom_enrollment")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .filter((q) => q.eq(q.field("removed_at"), undefined))
      .collect();

    return await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        return {
          enrollmentId: member._id,
          userId: member.userId,
          name: memberUser?.name || "Unknown",
          picture: memberUser?.picture_url,
          role: member.role,
          enrolledAt: member.enrolled_at,
        };
      }),
    );
  },
});

export const joinClassroom = mutation({
  args: {
    classroomId: v.id("classroom"),
    inviteCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check if already enrolled
    const existingEnrollment = await ctx.db
      .query("classroom_enrollment")
      .withIndex(
        "unique_enrollment",
        (q) => q.eq("classroomId", args.classroomId),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingEnrollment && !existingEnrollment.removed_at) {
      throw new Error("You are already enrolled in this classroom");
    }

    // Check visibility and invite code
    if (classroom.visibility === "private") {
      if (!args.inviteCode) {
        throw new Error("Invite code required for private classrooms");
      }

      if (args.inviteCode !== classroom.inviteCode) {
        throw new Error("Invalid invite code");
      }
    }

    // If previously enrolled but removed, reactivate
    if (existingEnrollment && existingEnrollment.removed_at) {
      await ctx.db.patch(existingEnrollment._id, {
        removed_at: undefined,
        enrolled_at: Date.now(),
      });
    } else {
      // Create new enrollment
      await ctx.db.insert("classroom_enrollment", {
        classroomId: args.classroomId,
        userId: user._id,
        role: "student",
        enrolled_at: Date.now(),
      });
    }

    return {
      success: true,
      message: "Successfully joined classroom",
    };
  },
});

export const joinClassroomWithCode = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Find classroom by invite code
    const classrooms = await ctx.db
      .query("classroom")
      .collect();

    const classroom = classrooms.find(
      (c) => c.inviteCode === args.inviteCode && !c.archived_at,
    );

    if (!classroom) {
      throw new Error("Invalid invite code");
    }

    // Check if already enrolled
    const existingEnrollment = await ctx.db
      .query("classroom_enrollment")
      .withIndex(
        "unique_enrollment",
        (q) => q.eq("classroomId", classroom._id),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingEnrollment && !existingEnrollment.removed_at) {
      throw new Error("You are already enrolled in this classroom");
    }

    // If previously enrolled but removed, reactivate
    if (existingEnrollment && existingEnrollment.removed_at) {
      await ctx.db.patch(existingEnrollment._id, {
        removed_at: undefined,
        enrolled_at: Date.now(),
      });
    } else {
      // Create new enrollment
      await ctx.db.insert("classroom_enrollment", {
        classroomId: classroom._id,
        userId: user._id,
        role: "student",
        enrolled_at: Date.now(),
      });
    }

    return {
      success: true,
      classroomId: classroom._id,
      message: "Successfully joined classroom",
    };
  },
});

export const leaveClassroom = mutation({
  args: { classroomId: v.id("classroom") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get user's enrollment
    const enrollment = await ctx.db
      .query("classroom_enrollment")
      .withIndex(
        "unique_enrollment",
        (q) => q.eq("classroomId", args.classroomId),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .filter((q) => q.eq(q.field("removed_at"), undefined))
      .first();

    if (!enrollment) {
      throw new Error("You are not enrolled in this classroom");
    }

    // Can't leave if you're the teacher
    if (enrollment.role === "teacher") {
      throw new Error(
        "Teachers cannot leave their own classroom. Delete it instead.",
      );
    }

    // Soft delete enrollment
    await ctx.db.patch(enrollment._id, {
      removed_at: Date.now(),
    });

    return { success: true };
  },
});
