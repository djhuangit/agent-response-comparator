import { useState, useEffect } from 'react';
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser
} from "@clerk/clerk-react";

import { FieldValue, Evaluation, TestRecord } from './types/evaluation';
import { parseYaml } from './utils/yamlParser';
import { flattenObject } from './utils/dataFlattener';
import { EvaluationSelector } from './components/evaluation/EvaluationSelector';
import { EvaluationManager } from './components/evaluation/EvaluationManager';
import { DynamicInputPanel } from './components/input/DynamicInputPanel';
import { DynamicTablesView } from './components/tables/DynamicTablesView';
import { ConsolidatedTable } from './components/comparison/ConsolidatedTable';

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();

  // Evaluation state
  const [currentEvaluationId, setCurrentEvaluationId] = useState<Id<"evaluations"> | null>(null);
  const [showEvaluationManager, setShowEvaluationManager] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);

  // Queries
  const evaluations = useQuery(
    api.evaluations.getUserEvaluations,
    isAuthenticated && user ? { userId: user.id } : "skip"
  ) ?? [];

  const currentEvaluation = useQuery(
    api.evaluations.getEvaluation,
    currentEvaluationId ? { evaluationId: currentEvaluationId } : "skip"
  ) as Evaluation | undefined;

  const records = useQuery(
    api.testRecords.getEvaluationRecords,
    isAuthenticated && user && currentEvaluationId
      ? { userId: user.id, evaluationId: currentEvaluationId }
      : "skip"
  ) as TestRecord[] | undefined ?? [];

  // Mutation
  const addRecordMutation = useMutation(api.testRecords.addRecord);

  // Local state for inputs/tables (not persisted)
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [parsedData, setParsedData] = useState<Record<string, FieldValue[]>>({});
  const [activeTab, setActiveTab] = useState<'input' | 'tables' | 'consolidated'>('input');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [error, setError] = useState('');
  const [testName, setTestName] = useState('Test 1');
  const [maxItems, setMaxItems] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  // Auto-select first evaluation on load
  useEffect(() => {
    if (evaluations.length > 0 && !currentEvaluationId) {
      // Try to restore from localStorage
      const savedId = localStorage.getItem('currentEvaluationId');
      if (savedId && evaluations.some(e => e._id === savedId)) {
        setCurrentEvaluationId(savedId as Id<"evaluations">);
      } else {
        setCurrentEvaluationId(evaluations[0]._id);
      }
    }
  }, [evaluations, currentEvaluationId]);

  // Save current evaluation to localStorage
  useEffect(() => {
    if (currentEvaluationId) {
      localStorage.setItem('currentEvaluationId', currentEvaluationId);
    }
  }, [currentEvaluationId]);

  // Auto-select first table when evaluation changes
  useEffect(() => {
    if (currentEvaluation?.tables.length && !selectedTableId) {
      const sortedTables = [...currentEvaluation.tables].sort((a, b) => a.order - b.order);
      setSelectedTableId(sortedTables[0].id);
    }
  }, [currentEvaluation, selectedTableId]);

  // Reset inputs when evaluation changes
  useEffect(() => {
    setInputs({});
    setParsedData({});
    setSelectedTableId('');
  }, [currentEvaluationId]);

  const handleInputChange = (tableId: string, value: string) => {
    setInputs(prev => ({ ...prev, [tableId]: value }));
  };

  const handleParse = () => {
    if (!currentEvaluation) return;
    setError('');

    try {
      const newParsedData: Record<string, FieldValue[]> = {};
      for (const table of currentEvaluation.tables) {
        const inputText = inputs[table.id] || '';
        if (inputText.trim()) {
          const parsed = parseYaml(inputText);
          newParsedData[table.id] = flattenObject(parsed, '', maxItems || null);
        } else {
          newParsedData[table.id] = [];
        }
      }
      setParsedData(newParsedData);
      setActiveTab('tables');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleAdd = async () => {
    if (isAdding) return; // Prevent double-clicks

    if (!currentEvaluation || !user || !currentEvaluationId) {
      setError('Please select an evaluation and sign in');
      return;
    }

    if (!testName.trim()) {
      setError('Please enter a test name');
      return;
    }

    const hasData = Object.values(parsedData).some(t => t.length > 0);
    if (!hasData) {
      setError('Please parse data first');
      return;
    }

    setIsAdding(true);
    try {
      await addRecordMutation({
        userId: user.id,
        evaluationId: currentEvaluationId,
        testName: testName.trim(),
        data: parsedData,
      });

      // Auto-increment test name
      const match = testName.match(/^(.*?)(\d+)$/);
      if (match) {
        setTestName(`${match[1]}${parseInt(match[2]) + 1}`);
      }

      // Clear inputs
      setInputs({});
      setParsedData({});
      setActiveTab('input');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClear = () => {
    setInputs({});
    setParsedData({});
    setError('');
  };

  const openCreateEvaluation = () => {
    setEditingEvaluation(null);
    setShowEvaluationManager(true);
  };

  const openEditEvaluation = () => {
    if (currentEvaluation) {
      setEditingEvaluation(currentEvaluation);
      setShowEvaluationManager(true);
    }
  };

  const handleEvaluationCreated = (id: Id<"evaluations">) => {
    setCurrentEvaluationId(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const tables = currentEvaluation?.tables || [];

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

          {/* Evaluation selector */}
          {isAuthenticated && user && (
            <EvaluationSelector
              evaluations={evaluations as Evaluation[]}
              currentEvaluationId={currentEvaluationId}
              onSelect={setCurrentEvaluationId}
              onCreateNew={openCreateEvaluation}
              onEdit={openEditEvaluation}
            />
          )}
        </div>

        {/* Second row: workflow buttons */}
        {currentEvaluation && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-gray-700">
            {/* Left side: Input -> Parse -> Tables -> Clear */}
            <button
              onClick={() => setActiveTab('input')}
              className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'input' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Input
            </button>
            <button onClick={handleParse} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-medium">
              Parse
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'tables' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Tables
            </button>
            <button onClick={handleClear} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-medium">
              Clear
            </button>

            {/* Spacer */}
            <div className="w-8" />

            {/* Right side: Add -> Consolidated */}
            <button
              onClick={handleAdd}
              disabled={isAdding}
              className={`px-3 py-1 rounded text-sm font-medium ${
                isAdding
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-500'
              }`}
            >
              {isAdding ? 'Adding...' : '+ Add'}
            </button>
            <button
              onClick={() => setActiveTab('consolidated')}
              className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'consolidated' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Consolidated ({records.length})
            </button>
          </div>
        )}

        {/* Third row: Test name and options */}
        {currentEvaluation && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-gray-700">
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
          </div>
        )}

        {error && <div className="bg-red-900 text-red-200 px-3 py-1 rounded text-sm mt-2">{error}</div>}

        {!isAuthenticated && (
          <div className="bg-blue-900 text-blue-200 px-3 py-1 rounded text-sm mt-2">
            Sign in to create evaluations and save test records
          </div>
        )}

        {isAuthenticated && evaluations.length === 0 && (
          <div className="bg-yellow-900 text-yellow-200 px-3 py-1 rounded text-sm mt-2">
            Create your first evaluation to get started
          </div>
        )}
      </div>

      {/* Main content */}
      {currentEvaluation && tables.length > 0 && (
        <>
          {activeTab === 'input' && (
            <DynamicInputPanel
              tables={tables}
              inputs={inputs}
              onInputChange={handleInputChange}
            />
          )}

          {activeTab === 'tables' && (
            <DynamicTablesView
              tables={tables}
              parsedData={parsedData}
            />
          )}

          {activeTab === 'consolidated' && (
            <ConsolidatedTable
              records={records}
              tables={tables}
              selectedTableId={selectedTableId || tables[0]?.id || ''}
              onTableSelect={setSelectedTableId}
            />
          )}
        </>
      )}

      {/* Evaluation Manager Modal */}
      {user && (
        <EvaluationManager
          isOpen={showEvaluationManager}
          onClose={() => {
            setShowEvaluationManager(false);
            setEditingEvaluation(null);
          }}
          evaluation={editingEvaluation}
          userId={user.id}
          onCreated={handleEvaluationCreated}
        />
      )}
    </div>
  );
}
