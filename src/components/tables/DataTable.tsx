import { FieldValue } from '../../types/evaluation';

interface DataTableProps {
  data: FieldValue[];
}

export const DataTable = ({ data }: DataTableProps) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 italic p-4 text-center">No data yet</div>;
  }

  return (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0">
          <tr className="bg-gray-700 text-white">
            <th className="text-left p-1.5 border border-gray-600 font-medium w-2/5">Field</th>
            <th className="text-left p-1.5 border border-gray-600 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
              <td className="p-1.5 border border-gray-700 font-mono text-blue-300 align-top">{row.field}</td>
              <td className="p-1.5 border border-gray-700 text-gray-200 break-all align-top whitespace-pre-wrap">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
