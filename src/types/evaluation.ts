import { Id } from "../../convex/_generated/dataModel";

export interface FieldValue {
  field: string;
  value: string;
}

export interface TableDefinition {
  id: string;
  name: string;
  color: string;  // Tailwind class like "bg-blue-600"
  order: number;
}

export interface Evaluation {
  _id: Id<"evaluations">;
  _creationTime: number;
  userId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  tables: TableDefinition[];
}

export interface TestRecord {
  _id: Id<"testRecords">;
  _creationTime: number;
  userId: string;
  evaluationId: Id<"evaluations">;
  testName: string;
  createdAt: number;
  data: Record<string, FieldValue[]>;  // tableId -> parsed fields
}

// Color options for table headers
export const TABLE_COLORS = [
  { name: "Blue", class: "bg-blue-600" },
  { name: "Green", class: "bg-green-600" },
  { name: "Orange", class: "bg-orange-500" },
  { name: "Purple", class: "bg-purple-600" },
  { name: "Red", class: "bg-red-600" },
  { name: "Cyan", class: "bg-cyan-600" },
  { name: "Pink", class: "bg-pink-600" },
  { name: "Amber", class: "bg-amber-600" },
];

// Default tables for new evaluations (can be modified before save)
export const DEFAULT_TABLES: Omit<TableDefinition, "id">[] = [
  { name: "Orchestrator OUT", color: "bg-blue-600", order: 0 },
  { name: "Search IN", color: "bg-green-600", order: 1 },
  { name: "Search OUT", color: "bg-orange-500", order: 2 },
  { name: "Screening IN", color: "bg-purple-600", order: 3 },
];

// Helper to create a table with unique ID
export const createTableDefinition = (
  name: string,
  color: string,
  order: number
): TableDefinition => ({
  id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name,
  color,
  order,
});

// Helper to create default tables with IDs
export const createDefaultTables = (): TableDefinition[] =>
  DEFAULT_TABLES.map((t, i) => createTableDefinition(t.name, t.color, i));
