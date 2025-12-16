import { TableDefinition } from '../../types/evaluation';

interface DynamicInputPanelProps {
  tables: TableDefinition[];
  inputs: Record<string, string>;
  onInputChange: (tableId: string, value: string) => void;
}

export const DynamicInputPanel = ({
  tables,
  inputs,
  onInputChange,
}: DynamicInputPanelProps) => {
  // Sort tables by order
  const sortedTables = [...tables].sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-2 gap-3">
      {sortedTables.map((table) => (
        <div key={table.id} className="bg-gray-800 rounded-lg overflow-hidden">
          <div className={`${table.color} px-3 py-1.5 text-sm font-medium`}>
            {table.name}
          </div>
          <textarea
            value={inputs[table.id] || ''}
            onChange={(e) => onInputChange(table.id, e.target.value)}
            className="w-full h-44 bg-gray-900 font-mono text-xs p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200"
            placeholder={`Paste ${table.name} YAML...`}
          />
        </div>
      ))}
    </div>
  );
};
