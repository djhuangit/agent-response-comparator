import { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser
} from "@clerk/clerk-react";

// Type definitions
interface FieldValue {
  field: string;
  value: string;
}

interface StageData {
  orchestratorOut: FieldValue[];
  searchIn: FieldValue[];
  searchOut: FieldValue[];
  screeningIn: FieldValue[];
}

interface InputFields {
  orchestratorOut: string;
  searchIn: string;
  searchOut: string;
  screeningIn: string;
}

type StageKey = keyof StageData;

// Convex record type (includes _id and _creationTime from database)
interface ConvexTestRecord {
  _id: string;
  _creationTime: number;
  userId: string;
  testName: string;
  createdAt: number;
  data: StageData;
}

interface YamlObject {
  [key: string]: YamlValue;
}

type YamlValue = string | number | boolean | null | YamlObject | YamlValue[];

const parseYaml = (text: string): YamlObject => {
  const lines = text.split('\n');
  const result: YamlObject = {};
  const stack: Array<{ obj: YamlObject | YamlValue[]; indent: number }> = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const content = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (content.startsWith('- ')) {
      const itemContent = content.slice(2);
      if (!Array.isArray(parent)) {
        const keys = Object.keys(parent as YamlObject);
        const lastKey = keys[keys.length - 1];
        const parentObj = parent as YamlObject;
        if (parentObj[lastKey] === null || parentObj[lastKey] === undefined) {
          parentObj[lastKey] = [];
        }
        if (Array.isArray(parentObj[lastKey])) {
          const arr = parentObj[lastKey] as YamlValue[];
          if (itemContent.includes(': ')) {
            const obj: YamlObject = {};
            const [k, ...v] = itemContent.split(': ');
            obj[k] = v.join(': ');
            arr.push(obj);
            stack.push({ obj: obj, indent: indent });
          } else {
            arr.push(itemContent);
          }
        }
      }
    } else if (content.includes(': ')) {
      const colonIdx = content.indexOf(': ');
      const key = content.slice(0, colonIdx);
      const value = content.slice(colonIdx + 2);

      if (value === '' || value === '|') {
        (parent as YamlObject)[key] = {};
        stack.push({ obj: (parent as YamlObject)[key] as YamlObject, indent: indent });
      } else {
        (parent as YamlObject)[key] = value;
      }
    }
  }

  return result;
};

const flattenObject = (obj: YamlValue, prefix: string = '', maxArrayItems: number | null = null): FieldValue[] => {
  const result: FieldValue[] = [];

  if (obj === null || obj === undefined) {
    result.push({ field: prefix || 'value', value: 'null' });
    return result;
  }

  if (typeof obj !== 'object') {
    result.push({ field: prefix || 'value', value: String(obj) });
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result.push({ field: prefix, value: '[]' });
    } else if (typeof obj[0] === 'object' && obj[0] !== null) {
      result.push({ field: `${prefix} (count)`, value: `${obj.length} items` });
      const itemsToShow = maxArrayItems ? obj.slice(0, maxArrayItems) : obj;
      itemsToShow.forEach((item, idx) => {
        result.push(...flattenObject(item, `${prefix}[${idx}]`, maxArrayItems));
      });
      if (maxArrayItems && obj.length > maxArrayItems) {
        result.push({ field: `${prefix}[...]`, value: `... ${obj.length - maxArrayItems} more items` });
      }
    } else {
      result.push({ field: prefix, value: obj.join('\n') });
    }
    return result;
  }

  for (const key in obj as YamlObject) {
    const value = (obj as YamlObject)[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result.push({ field: newKey, value: 'null' });
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result.push({ field: newKey, value: '[]' });
      } else if (typeof value[0] === 'object' && value[0] !== null) {
        result.push({ field: `${newKey} (count)`, value: `${value.length} items` });
        const itemsToShow = maxArrayItems ? value.slice(0, maxArrayItems) : value;
        itemsToShow.forEach((item, idx) => {
          result.push(...flattenObject(item, `${newKey}[${idx}]`, maxArrayItems));
        });
        if (maxArrayItems && value.length > maxArrayItems) {
          result.push({ field: `${newKey}[...]`, value: `... ${value.length - maxArrayItems} more items` });
        }
      } else {
        result.push({ field: newKey, value: (value as string[]).join('\n') });
      }
    } else if (typeof value === 'object') {
      result.push(...flattenObject(value, newKey, maxArrayItems));
    } else {
      result.push({ field: newKey, value: String(value) });
    }
  }
  return result;
};

const DataTable = ({ data }: { data: FieldValue[] }) => {
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

const ConsolidatedTable = ({
  records,
  stage
}: {
  records: ConvexTestRecord[];
  stage: StageKey;
}) => {
  if (records.length === 0) {
    return <div className="text-gray-400 italic p-4 text-center">No records added yet. Parse data and click "+ Add" to add tests.</div>;
  }

  const allFields = new Set<string>();
  records.forEach(r => {
    r.data[stage]?.forEach(row => allFields.add(row.field));
  });
  const fields = Array.from(allFields);

  const testLookups = records.map(r => {
    const lookup: Record<string, string> = {};
    r.data[stage]?.forEach(row => { lookup[row.field] = row.value; });
    return lookup;
  });

  return (
    <div className="overflow-auto max-h-[600px]">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0">
          <tr className="bg-gray-700 text-white">
            <th className="text-left p-1.5 border border-gray-600 font-medium min-w-48">Field</th>
            {records.map((r) => (
              <th key={r._id} className="text-left p-1.5 border border-gray-600 font-medium min-w-40">{r.testName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((field, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
              <td className="p-1.5 border border-gray-700 font-mono text-blue-300 align-top">{field}</td>
              {testLookups.map((lookup, i) => (
                <td key={records[i]._id} className="p-1.5 border border-gray-700 text-gray-200 break-all align-top whitespace-pre-wrap max-w-xs">
                  {lookup[field] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();

  // Replace useState for records with Convex query
  const records = useQuery(
    api.testRecords.getUserRecords,
    isAuthenticated && user ? { userId: user.id } : "skip"
  ) ?? [];

  // Convex mutation for adding records
  const addRecordMutation = useMutation(api.testRecords.addRecord);

  // Keep local state for inputs/tables (not persisted)
  const [inputs, setInputs] = useState<InputFields>({
    orchestratorOut: '',
    searchIn: '',
    searchOut: '',
    screeningIn: ''
  });

  const [tables, setTables] = useState<StageData>({
    orchestratorOut: [],
    searchIn: [],
    searchOut: [],
    screeningIn: []
  });

  const [activeTab, setActiveTab] = useState<'input' | 'tables' | 'consolidated'>('input');
  const [consolidatedStage, setConsolidatedStage] = useState<StageKey>('orchestratorOut');
  const [error, setError] = useState('');
  const [testName, setTestName] = useState('Test 1');
  const [maxItems, setMaxItems] = useState(0); // 0 = no limit

  const handleParse = () => {
    setError('');
    try {
      const newTables: StageData = {
        orchestratorOut: [],
        searchIn: [],
        searchOut: [],
        screeningIn: []
      };
      for (const key of Object.keys(inputs) as StageKey[]) {
        if (inputs[key].trim()) {
          const parsed = parseYaml(inputs[key]);
          newTables[key] = flattenObject(parsed, '', maxItems || null);
        } else {
          newTables[key] = [];
        }
      }
      setTables(newTables);
      setActiveTab('tables');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleAdd = async () => {
    if (!testName.trim()) {
      setError('Please enter a test name');
      return;
    }

    const hasData = Object.values(tables).some(t => t.length > 0);
    if (!hasData) {
      setError('Please parse data first');
      return;
    }

    if (!user) {
      setError('Please sign in first');
      return;
    }

    try {
      await addRecordMutation({
        userId: user.id,
        testName: testName.trim(),
        data: tables,
      });

      // Auto-increment test name
      const match = testName.match(/^(.*?)(\d+)$/);
      if (match) {
        setTestName(`${match[1]}${parseInt(match[2]) + 1}`);
      }

      // Clear inputs
      setInputs({ orchestratorOut: '', searchIn: '', searchOut: '', screeningIn: '' });
      setTables({ orchestratorOut: [], searchIn: [], searchOut: [], screeningIn: [] });
      setActiveTab('input');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleClear = () => {
    setInputs({ orchestratorOut: '', searchIn: '', searchOut: '', screeningIn: '' });
    setTables({ orchestratorOut: [], searchIn: [], searchOut: [], screeningIn: [] });
    setError('');
  };

  const inputFields: Array<{ key: StageKey; label: string; bg: string }> = [
    { key: 'orchestratorOut', label: 'Orchestrator OUT', bg: 'bg-blue-600' },
    { key: 'searchIn', label: 'Search IN', bg: 'bg-green-600' },
    { key: 'searchOut', label: 'Search OUT', bg: 'bg-orange-500' },
    { key: 'screeningIn', label: 'Screening IN', bg: 'bg-purple-600' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3">
      <div className="bg-gray-800 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base font-bold">Agent Data Flow</h1>

          {/* Auth buttons */}
          <SignedOut>
            <SignInButton>
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>

          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm w-40"
            placeholder="Test name"
          />

          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">Max items:</span>
            <select
              value={maxItems}
              onChange={(e) => setMaxItems(parseInt(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-1 py-1 text-sm"
            >
              <option value={0}>All</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'input' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Input
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'tables' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Tables
            </button>
            <button
              onClick={() => setActiveTab('consolidated')}
              className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'consolidated' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Consolidated ({records.length})
            </button>
          </div>

          <button onClick={handleParse} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-medium">
            Parse
          </button>
          <button
            onClick={handleAdd}
            className={`px-3 py-1 rounded text-sm font-medium ${isAuthenticated ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-600 cursor-not-allowed'}`}
            disabled={!isAuthenticated}
          >
            + Add
          </button>
          <button onClick={handleClear} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-medium">
            Clear
          </button>
        </div>
        {error && <div className="bg-red-900 text-red-200 px-3 py-1 rounded text-sm mt-2">{error}</div>}
        {!isAuthenticated && (
          <div className="bg-blue-900 text-blue-200 px-3 py-1 rounded text-sm mt-2">
            Sign in to save and persist your test records
          </div>
        )}
      </div>

      {activeTab === 'input' && (
        <div className="grid grid-cols-2 gap-3">
          {inputFields.map(({ key, label, bg }) => (
            <div key={key} className="bg-gray-800 rounded-lg overflow-hidden">
              <div className={`${bg} px-3 py-1.5 text-sm font-medium`}>{label}</div>
              <textarea
                value={inputs[key]}
                onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
                className="w-full h-44 bg-gray-900 font-mono text-xs p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200"
                placeholder={`Paste ${label} YAML...`}
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="grid grid-cols-2 gap-3">
          {inputFields.map(({ key, label, bg }) => (
            <div key={key} className="bg-gray-800 rounded-lg overflow-hidden">
              <div className={`${bg} px-3 py-1.5 text-sm font-medium flex justify-between`}>
                <span>{label}</span>
                <span className="text-xs opacity-75">{tables[key]?.length || 0} rows</span>
              </div>
              <DataTable data={tables[key]} />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'consolidated' && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="flex gap-1 p-2 bg-gray-700">
            {inputFields.map(({ key, label, bg }) => (
              <button
                key={key}
                onClick={() => setConsolidatedStage(key)}
                className={`px-3 py-1 rounded text-xs font-medium ${consolidatedStage === key ? bg : 'bg-gray-600 hover:bg-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ConsolidatedTable records={records} stage={consolidatedStage} />
        </div>
      )}
    </div>
  );
}
