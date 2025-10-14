/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as functions_chapters from "../functions/chapters.js";
import type * as functions_dashboard from "../functions/dashboard.js";
import type * as functions_excerpts from "../functions/excerpts.js";
import type * as functions_files from "../functions/files.js";
import type * as functions_performance from "../functions/performance.js";
import type * as functions_phonemes from "../functions/phonemes.js";
import type * as functions_social from "../functions/social.js";
import type * as functions_users from "../functions/users.js";
import type * as models_chapters from "../models/chapters.js";
import type * as models_performance from "../models/performance.js";
import type * as models_users from "../models/users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "functions/chapters": typeof functions_chapters;
  "functions/dashboard": typeof functions_dashboard;
  "functions/excerpts": typeof functions_excerpts;
  "functions/files": typeof functions_files;
  "functions/performance": typeof functions_performance;
  "functions/phonemes": typeof functions_phonemes;
  "functions/social": typeof functions_social;
  "functions/users": typeof functions_users;
  "models/chapters": typeof models_chapters;
  "models/performance": typeof models_performance;
  "models/users": typeof models_users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
