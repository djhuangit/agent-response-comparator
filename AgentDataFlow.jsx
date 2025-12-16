import React, { useState } from 'react';

const parseYaml = (text) => {
  const lines = text.split('\n');
  const result = {};
  const stack = [{ obj: result, indent: -1 }];
  
  for (let line of lines) {
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
        const keys = Object.keys(parent);
        const lastKey = keys[keys.length - 1];
        if (parent[lastKey] === null || parent[lastKey] === undefined) {
          parent[lastKey] = [];
        }
        if (Array.isArray(parent[lastKey])) {
          if (itemContent.includes(': ')) {
            const obj = {};
            const [k, ...v] = itemContent.split(': ');
            obj[k] = v.join(': ');
            parent[lastKey].push(obj);
            stack.push({ obj: obj, indent: indent });
          } else {
            parent[lastKey].push(itemContent);
          }
        }
      }
    } else if (content.includes(': ')) {
      const colonIdx = content.indexOf(': ');
      const key = content.slice(0, colonIdx);
      const value = content.slice(colonIdx + 2);
      
      if (value === '' || value === '|') {
        parent[key] = {};
        stack.push({ obj: parent[key], indent: indent });
      } else {
        parent[key] = value;
      }
    }
  }
  
  return result;
};

const flattenObject = (obj, prefix = '', maxArrayItems = null) => {
  const result = [];
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value === null || value === undefined) {
      result.push({ field: newKey, value: 'null' });
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result.push({ field: newKey, value: '[]' });
      } else if (typeof value[0] === 'object') {
        result.push({ field: `${newKey} (count)`, value: `${value.length} items` });
        const itemsToShow = maxArrayItems ? value.slice(0, maxArrayItems) : value;
        itemsToShow.forEach((item, idx) => {
          result.push(...flattenObject(item, `${newKey}[${idx}]`, maxArrayItems));
        });
        if (maxArrayItems && value.length > maxArrayItems) {
          result.push({ field: `${newKey}[...]`, value: `... ${value.length - maxArrayItems} more items` });
        }
      } else {
        result.push({ field: newKey, value: value.join('\n') });
      }
    } else if (typeof value === 'object') {
      result.push(...flattenObject(value, newKey, maxArrayItems));
    } else {
      result.push({ field: newKey, value: String(value) });
    }
  }
  return result;
};

const DataTable = ({ data }) => {
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

const ConsolidatedTable = ({ records, stage }) => {
  if (records.length === 0) {
    return <div className="text-gray-400 italic p-4 text-center">No records added yet. Parse data and click "+ Add" to add tests.</div>;
  }

  const allFields = new Set();
  records.forEach(r => {
    r.data[stage]?.forEach(row => allFields.add(row.field));
  });
  const fields = Array.from(allFields);

  const testLookups = records.map(r => {
    const lookup = {};
    r.data[stage]?.forEach(row => { lookup[row.field] = row.value; });
    return lookup;
  });

  return (
    <div className="overflow-auto max-h-[600px]">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0">
          <tr className="bg-gray-700 text-white">
            <th className="text-left p-1.5 border border-gray-600 font-medium min-w-48">Field</th>
            {records.map((r, i) => (
              <th key={i} className="text-left p-1.5 border border-gray-600 font-medium min-w-40">{r.testName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((field, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
              <td className="p-1.5 border border-gray-700 font-mono text-blue-300 align-top">{field}</td>
              {testLookups.map((lookup, i) => (
                <td key={i} className="p-1.5 border border-gray-700 text-gray-200 break-all align-top whitespace-pre-wrap max-w-xs">
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
  const [inputs, setInputs] = useState({
    orchestratorOut: '',
    searchIn: '',
    searchOut: '',
    screeningIn: ''
  });
  
  const [tables, setTables] = useState({
    orchestratorOut: [],
    searchIn: [],
    searchOut: [],
    screeningIn: []
  });
  
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('input');
  const [consolidatedStage, setConsolidatedStage] = useState('orchestratorOut');
  const [error, setError] = useState('');
  const [testName, setTestName] = useState('Test 1');
  const [maxItems, setMaxItems] = useState(0); // 0 = no limit

  const handleParse = () => {
    setError('');
    try {
      const newTables = {};
      for (const key in inputs) {
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
      setError(e.message);
    }
  };

  const handleAdd = () => {
    if (!testName.trim()) {
      setError('Please enter a test name');
      return;
    }
    
    const hasData = Object.values(tables).some(t => t.length > 0);
    if (!hasData) {
      setError('Please parse data first');
      return;
    }

    setRecords([...records, { testName: testName.trim(), data: { ...tables } }]);
    
    const match = testName.match(/^(.*?)(\d+)$/);
    if (match) {
      setTestName(`${match[1]}${parseInt(match[2]) + 1}`);
    }
    
    setInputs({ orchestratorOut: '', searchIn: '', searchOut: '', screeningIn: '' });
    setTables({ orchestratorOut: [], searchIn: [], searchOut: [], screeningIn: [] });
    setActiveTab('input');
  };

  const handleClear = () => {
    setInputs({ orchestratorOut: '', searchIn: '', searchOut: '', screeningIn: '' });
    setTables({ orchestratorOut: [], searchIn: [], searchOut: [], screeningIn: [] });
    setError('');
  };

  const handleClearAll = () => {
    setRecords([]);
    handleClear();
    setTestName('Test 1');
  };

  const inputFields = [
    { key: 'orchestratorOut', label: 'Orchestrator OUT', bg: 'bg-blue-600' },
    { key: 'searchIn', label: 'Search IN', bg: 'bg-green-600' },
    { key: 'searchOut', label: 'Search OUT', bg: 'bg-orange-500' },
    { key: 'screeningIn', label: 'Screening IN', bg: 'bg-purple-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3">
      <div className="bg-gray-800 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base font-bold">Agent Data Flow</h1>
          
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
          <button onClick={handleAdd} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm font-medium">
            + Add
          </button>
          <button onClick={handleClear} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-medium">
            Clear
          </button>
          <button onClick={handleClearAll} className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm font-medium">
            Clear All
          </button>
        </div>
        {error && <div className="bg-red-900 text-red-200 px-3 py-1 rounded text-sm mt-2">{error}</div>}
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
