import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  testRecords: defineTable({
    userId: v.string(),
    testName: v.string(),
    createdAt: v.number(),
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
  }).index("by_userId", ["userId"]),
});
