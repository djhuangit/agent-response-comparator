import { TableDefinition, TABLE_COLORS, createTableDefinition } from '../../types/evaluation';
import { ColorPicker } from '../shared/ColorPicker';

interface TableDefinitionEditorProps {
  tables: TableDefinition[];
  onChange: (tables: TableDefinition[]) => void;
}

export const TableDefinitionEditor = ({ tables, onChange }: TableDefinitionEditorProps) => {
  const addTable = () => {
    const nextOrder = tables.length;
    const nextColor = TABLE_COLORS[nextOrder % TABLE_COLORS.length].class;
    const newTable = createTableDefinition(`Table ${nextOrder + 1}`, nextColor, nextOrder);
    onChange([...tables, newTable]);
  };

  const removeTable = (id: string) => {
    onChange(tables.filter(t => t.id !== id));
  };

  const updateTable = (id: string, updates: Partial<TableDefinition>) => {
    onChange(tables.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-300">Tables</div>

      <div className="space-y-2">
        {tables.map((table, index) => (
          <div
            key={table.id}
            className="flex items-center gap-2 bg-gray-700 p-2 rounded"
          >
            <span className="text-gray-400 text-sm w-6">{index + 1}.</span>

            <div className={`w-4 h-4 rounded ${table.color}`} />

            <input
              type="text"
              value={table.name}
              onChange={(e) => updateTable(table.id, { name: e.target.value })}
              className="flex-1 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
              placeholder="Table name"
            />

            <div className="relative group">
              <button
                type="button"
                className={`w-6 h-6 rounded ${table.color} border border-gray-500`}
                title="Change color"
              />
              <div className="absolute right-0 top-8 bg-gray-800 p-2 rounded shadow-lg hidden group-hover:block z-10">
                <ColorPicker
                  value={table.color}
                  onChange={(color) => updateTable(table.id, { color })}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeTable(table.id)}
              className="text-red-400 hover:text-red-300 px-2"
              title="Remove table"
              disabled={tables.length <= 1}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addTable}
        className="w-full py-2 border border-dashed border-gray-500 rounded text-gray-400 hover:text-white hover:border-gray-400 text-sm"
      >
        + Add Table
      </button>
    </div>
  );
};
