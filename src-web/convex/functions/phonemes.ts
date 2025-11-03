import { query } from "../_generated/server.js";

export const getAllPhonemeFeedbacks = query({
  args: {},
  handler: async (ctx) => {
    const feedbacks = await ctx.db
      .query("phoneme_feedback")
      .collect();
    return feedbacks;
  },
});
