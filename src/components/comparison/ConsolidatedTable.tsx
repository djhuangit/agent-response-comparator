import { useState } from 'react';
import { TableDefinition, TestRecord, FieldValue } from '../../types/evaluation';

interface ConsolidatedTableProps {
  records: TestRecord[];
  tables: TableDefinition[];
  selectedTableId: string;
  onTableSelect: (tableId: string) => void;
}

export const ConsolidatedTable = ({
  records,
  tables,
  selectedTableId,
  onTableSelect,
  onRenameTest,
  onDeleteTest,
}: ConsolidatedTableProps & {
  onRenameTest: (recordId: string, newName: string) => void;
  onDeleteTest: (recordId: string) => void;
}) => {
  // Sort tables by order for the selector buttons
  const sortedTables = [...tables].sort((a, b) => a.order - b.order);

  // Reverse records so newer ones appear on the right (records come in desc order)
  const orderedRecords = [...records].reverse();

  // State for editing test name
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (record: TestRecord) => {
    setEditingTestId(record._id);
    setEditValue(record.testName);
  };

  const handleSaveEdit = () => {
    if (editingTestId && editValue.trim()) {
      onRenameTest(editingTestId, editValue.trim());
    }
    setEditingTestId(null);
  };

  const handleDelete = (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation(); // Prevent triggering edit mode if user clicks delete
    if (window.confirm('Are you sure you want to delete this test?')) {
      onDeleteTest(recordId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingTestId(null);
    }
  };

  if (records.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="flex gap-1 p-2 bg-gray-700">
          {sortedTables.map((table) => (
            <button
              key={table.id}
              onClick={() => onTableSelect(table.id)}
              className={`px-3 py-1 rounded text-xs font-medium ${selectedTableId === table.id ? table.color : 'bg-gray-600 hover:bg-gray-500'
                }`}
            >
              {table.name}
            </button>
          ))}
        </div>
        <div className="text-gray-400 italic p-4 text-center">
          No records added yet. Parse data and click "+ Add" to add tests.
        </div>
      </div>
    );
  }

  // Get all unique fields from all records for the selected table
  const allFields = new Set<string>();
  orderedRecords.forEach(r => {
    const tableData = r.data[selectedTableId];
    tableData?.forEach((row: FieldValue) => allFields.add(row.field));
  });
  const fields = Array.from(allFields);

  // Create lookup maps for each record
  const testLookups = orderedRecords.map(r => {
    const lookup: Record<string, string> = {};
    const tableData = r.data[selectedTableId];
    tableData?.forEach((row: FieldValue) => {
      lookup[row.field] = row.value;
    });
    return lookup;
  });

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex gap-1 p-2 bg-gray-700">
        {sortedTables.map((table) => (
          <button
            key={table.id}
            onClick={() => onTableSelect(table.id)}
            className={`px-3 py-1 rounded text-xs font-medium ${selectedTableId === table.id ? table.color : 'bg-gray-600 hover:bg-gray-500'
              }`}
          >
            {table.name}
          </button>
        ))}
      </div>

      {fields.length === 0 ? (
        <div className="text-gray-400 italic p-4 text-center">
          No data for this table yet.
        </div>
      ) : (
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-gray-700 text-white">
                <th className="text-left p-1.5 border border-gray-600 font-medium min-w-48">Field</th>
                {orderedRecords.map((r) => (
                  <th key={r._id} className="text-left p-1.5 border border-gray-600 font-medium min-w-40 group relative">
                    {editingTestId === r._id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        className="bg-gray-600 text-white px-1 py-0.5 rounded w-full outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="flex items-center justify-between group/header">
                        <div
                          onClick={() => handleStartEdit(r)}
                          className="flex items-start gap-2 cursor-pointer hover:bg-gray-600 px-1 -mx-1 rounded flex-1"
                          title="Click to rename"
                        >
                          <span>{r.testName}</span>
                          <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover/header:opacity-100 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, r._id)}
                          className="opacity-0 group-hover/header:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                          title="Delete test"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                  <td className="p-1.5 border border-gray-700 font-mono text-blue-300 align-top">{field}</td>
                  {testLookups.map((lookup, i) => (
                    <td
                      key={orderedRecords[i]._id}
                      className="p-1.5 border border-gray-700 text-gray-200 break-all align-top whitespace-pre-wrap max-w-xs"
                    >
                      {lookup[field] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
