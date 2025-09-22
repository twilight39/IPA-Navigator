import { mutation } from "../_generated/server.js";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called getUsers without authentication present");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const generateUploadUrls = mutation({
  args: {
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called getUsers without authentication present");
    }

    if (args.count <= 0) {
      throw new Error("Count must be greater than zero");
    }
    const urls = [];
    for (let i = 0; i < args.count; i++) {
      const url = await ctx.storage.generateUploadUrl();
      urls.push(url);
    }

    return urls;
  },
});

export const deleteStorageIds = mutation({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called deleteStorageIds without authentication present");
    }

    for (const storageId of args.storageIds) {
      await ctx.storage.delete(storageId);
    }

    return { success: true, message: "Storage IDs deleted successfully." };
  },
});
