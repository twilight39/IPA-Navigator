import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";

const crons = cronJobs();

crons.daily(
  "Select daily practice chapter",
  { hourUTC: 16, minuteUTC: 0 },
  internal.functions.gamification.selectDailyChapter,
);

export default crons;
