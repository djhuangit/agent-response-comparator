import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Evaluations - containers for test records with custom table definitions
  evaluations: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Table definitions - user defines these when creating evaluation
    tables: v.array(v.object({
      id: v.string(),          // unique identifier (e.g., "table_1")
      name: v.string(),        // display name (e.g., "Orchestrator OUT")
      color: v.string(),       // Tailwind color class (e.g., "bg-blue-600")
      order: v.number(),       // display order
    })),
  }).index("by_userId", ["userId"]),

  // Test records - now reference an evaluation and use dynamic data structure
  testRecords: defineTable({
    userId: v.string(),
    evaluationId: v.id("evaluations"),
    testName: v.string(),
    createdAt: v.number(),
    // Dynamic data storage - keyed by table id
    data: v.record(
      v.string(),  // table id (matches evaluation.tables[].id)
      v.array(v.object({
        field: v.string(),
        value: v.string(),
      }))
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_evaluationId", ["evaluationId"]),
});
