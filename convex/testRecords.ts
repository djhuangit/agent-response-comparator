import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserRecords = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("testRecords")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return records;
  },
});

export const addRecord = mutation({
  args: {
    userId: v.string(),
    testName: v.string(),
    data: v.object({
      orchestratorOut: v.array(v.object({
        field: v.string(),
        value: v.string(),
      })),
      searchIn: v.array(v.object({
        field: v.string(),
        value: v.string(),
      })),
      searchOut: v.array(v.object({
        field: v.string(),
        value: v.string(),
      })),
      screeningIn: v.array(v.object({
        field: v.string(),
        value: v.string(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const recordId = await ctx.db.insert("testRecords", {
      userId: args.userId,
      testName: args.testName,
      createdAt: Date.now(),
      data: args.data,
    });
    return recordId;
  },
});
