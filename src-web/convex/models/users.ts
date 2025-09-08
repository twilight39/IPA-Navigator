import { v } from "convex/values";
import { internalQuery } from "../_generated/server.js";
import { Id } from "../_generated/dataModel.js";

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
