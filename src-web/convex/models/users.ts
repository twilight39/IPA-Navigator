import { v } from "convex/values";
import { internalQuery } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.d.ts";
import type { QueryCtx } from "../_generated/server.d.ts";

// Returns a single user ID
export const getUserIdByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args): Promise<Id<"users"> | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();

    return user ? user._id : null;
  },
});

export async function getUserIdFromContext(
  ctx: QueryCtx,
): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "Called getUserIdFromContext without authentication present",
    );
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

  return user._id;
}
