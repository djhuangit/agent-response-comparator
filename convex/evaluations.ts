import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============= QUERIES =============

// Get all evaluations for a user
export const getUserEvaluations = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evaluations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get a single evaluation by ID
export const getEvaluation = query({
  args: { evaluationId: v.id("evaluations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.evaluationId);
  },
});

// ============= MUTATIONS =============

// Create a new evaluation
export const createEvaluation = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    tables: v.array(v.object({
      id: v.string(),
      name: v.string(),
      color: v.string(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("evaluations", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
      tables: args.tables,
    });
  },
});

// Update evaluation (name, description, tables)
export const updateEvaluation = mutation({
  args: {
    evaluationId: v.id("evaluations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tables: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      color: v.string(),
      order: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const { evaluationId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.name !== undefined) filteredUpdates.name = updates.name;
    if (updates.description !== undefined) filteredUpdates.description = updates.description;
    if (updates.tables !== undefined) filteredUpdates.tables = updates.tables;

    await ctx.db.patch(evaluationId, filteredUpdates);
  },
});

// Delete evaluation (and all associated records)
export const deleteEvaluation = mutation({
  args: { evaluationId: v.id("evaluations") },
  handler: async (ctx, args) => {
    // Delete all records in this evaluation
    const records = await ctx.db
      .query("testRecords")
      .withIndex("by_evaluationId", (q) => q.eq("evaluationId", args.evaluationId))
      .collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    // Delete the evaluation itself
    await ctx.db.delete(args.evaluationId);
  },
});
