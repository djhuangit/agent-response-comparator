import { TableDefinition, FieldValue } from '../../types/evaluation';
import { DataTable } from './DataTable';

interface DynamicTablesViewProps {
  tables: TableDefinition[];
  parsedData: Record<string, FieldValue[]>;
}

export const DynamicTablesView = ({
  tables,
  parsedData,
}: DynamicTablesViewProps) => {
  // Sort tables by order
  const sortedTables = [...tables].sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-2 gap-3">
      {sortedTables.map((table) => (
        <div key={table.id} className="bg-gray-800 rounded-lg overflow-hidden">
          <div className={`${table.color} px-3 py-1.5 text-sm font-medium flex justify-between`}>
            <span>{table.name}</span>
            <span className="text-xs opacity-75">
              {parsedData[table.id]?.length || 0} rows
            </span>
          </div>
          <DataTable data={parsedData[table.id] || []} />
        </div>
      ))}
    </div>
  );
};
