import { mutation, query } from "../_generated/server.js";
import { getUserIdFromContext } from "../models/users.ts";
import { v } from "convex/values";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_token",
        (q) => q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (user !== null) {
      // If we've seen this identity before but the name has changed, patch the value.
      if (user.name !== identity.name) {
        await ctx.db.patch(user._id, { name: identity.name });
      }

      if (user.picture_url !== identity.pictureUrl) {
        await ctx.db.patch(user._id, { picture_url: identity.pictureUrl });
      }

      return user._id;
    }

    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      tokenIdentifier: identity.tokenIdentifier,
      picture_url: identity.pictureUrl,
    });
  },
});

export const setPreferredTTSVoice = mutation({
  args: {
    voice: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "Called setPreferredTTSVoice without authentication present",
      );
    }

    const user = await getUserIdFromContext(ctx);

    await ctx.db.patch(user, {
      preferred_tts_voice: args.voice,
    });
  },
});

export const getPreferredTTSVoice = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "Called getPreferredTTSVoice without authentication present",
      );
    }

    const user = await getUserIdFromContext(ctx);

    const userRecord = await ctx.db.get(user);
    return userRecord?.preferred_tts_voice
      ? userRecord?.preferred_tts_voice
      : null;
  },
});
