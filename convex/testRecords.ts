import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get records for a specific evaluation
export const getEvaluationRecords = query({
  args: {
    userId: v.string(),
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("testRecords")
      .withIndex("by_evaluationId", (q) => q.eq("evaluationId", args.evaluationId))
      .order("desc")
      .collect();
  },
});

// Add record to an evaluation
export const addRecord = mutation({
  args: {
    userId: v.string(),
    evaluationId: v.id("evaluations"),
    testName: v.string(),
    data: v.record(
      v.string(),
      v.array(v.object({
        field: v.string(),
        value: v.string(),
      }))
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("testRecords", {
      userId: args.userId,
      evaluationId: args.evaluationId,
      testName: args.testName,
      createdAt: Date.now(),
      data: args.data,
    });
  },
});

// Delete a single test record
export const deleteRecord = mutation({
  args: { recordId: v.id("testRecords") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.recordId);
  },
});
