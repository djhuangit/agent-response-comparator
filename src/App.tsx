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

  // Skip Convex query if it's a guest evaluation ID
  const isGuestEvaluationId = currentEvaluationId?.toString().startsWith('guest');
  const currentEvaluation = useQuery(
    api.evaluations.getEvaluation,
    currentEvaluationId && !isGuestEvaluationId ? { evaluationId: currentEvaluationId } : "skip"
  ) as Evaluation | undefined;

  const records = useQuery(
    api.testRecords.getEvaluationRecords,
    isAuthenticated && user && currentEvaluationId && !isGuestEvaluationId
      ? { userId: user.id, evaluationId: currentEvaluationId }
      : "skip"
  ) as TestRecord[] | undefined ?? [];

  // Mutation
  const addRecordMutation = useMutation(api.testRecords.addRecord);
  const updateRecordMutation = useMutation(api.testRecords.updateRecord);

  // Local state for inputs/tables (not persisted)
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [parsedData, setParsedData] = useState<Record<string, FieldValue[]>>({});
  const [activeTab, setActiveTab] = useState<'input' | 'tables' | 'consolidated'>('input');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [error, setError] = useState('');
  const [testName, setTestName] = useState('Test 1');
  const [maxItems, setMaxItems] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  // Guest mode: local storage for evaluations and records
  const [guestEvaluations, setGuestEvaluations] = useState<Evaluation[]>(() => {
    try {
      const saved = localStorage.getItem('guestEvaluations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out old default guest evaluation
          return parsed.filter((e: Evaluation) => e._id !== 'guest');
        }
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });
  const [guestRecords, setGuestRecords] = useState<TestRecord[]>(() => {
    try {
      const saved = localStorage.getItem('guestRecords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  // Persist guest data to localStorage
  useEffect(() => {
    localStorage.setItem('guestEvaluations', JSON.stringify(guestEvaluations));
  }, [guestEvaluations]);

  useEffect(() => {
    localStorage.setItem('guestRecords', JSON.stringify(guestRecords));
  }, [guestRecords]);

  // Determine if we're in guest mode (only after loading is complete)
  const isGuest = !isLoading && !isAuthenticated;

  // When user logs in, clear guest evaluation ID so auto-select picks a real one
  useEffect(() => {
    if (isAuthenticated && currentEvaluationId?.toString().startsWith('guest')) {
      setCurrentEvaluationId(null);
    }
  }, [isAuthenticated, currentEvaluationId]);

  // Auto-select first evaluation on load
  useEffect(() => {
    const availableEvaluations = isGuest ? guestEvaluations : evaluations;
    if (availableEvaluations.length > 0 && !currentEvaluationId) {
      // Try to restore from localStorage
      const savedId = localStorage.getItem('currentEvaluationId');
      if (savedId && availableEvaluations.some(e => e._id === savedId)) {
        setCurrentEvaluationId(savedId as Id<"evaluations">);
      } else {
        setCurrentEvaluationId(availableEvaluations[0]._id);
      }
    }
  }, [evaluations, guestEvaluations, currentEvaluationId, isGuest]);

  // Save current evaluation to localStorage
  useEffect(() => {
    if (currentEvaluationId) {
      localStorage.setItem('currentEvaluationId', currentEvaluationId);
    }
  }, [currentEvaluationId]);

  // Auto-select first table when evaluation changes
  useEffect(() => {
    const evaluation = isGuest
      ? guestEvaluations.find(e => e._id === currentEvaluationId)
      : currentEvaluation;
    if (evaluation?.tables.length && !selectedTableId) {
      const sortedTables = [...evaluation.tables].sort((a, b) => a.order - b.order);
      setSelectedTableId(sortedTables[0].id);
    }
  }, [currentEvaluation, selectedTableId, isGuest, guestEvaluations, currentEvaluationId]);

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
    const evaluation = isGuest
      ? guestEvaluations.find(e => e._id === currentEvaluationId)
      : currentEvaluation;
    if (!evaluation) return;
    setError('');

    try {
      const newParsedData: Record<string, FieldValue[]> = {};
      for (const table of evaluation.tables) {
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

    const activeEvaluation = isGuest
      ? guestEvaluations.find(e => e._id === currentEvaluationId)
      : currentEvaluation;

    if (!activeEvaluation) {
      setError('Please select an evaluation');
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
      if (isGuest) {
        // Guest mode: store locally (session only)
        const newRecord: TestRecord = {
          _id: `guest-record-${Date.now()}` as any,
          _creationTime: Date.now(),
          userId: 'guest',
          evaluationId: currentEvaluationId!,
          testName: testName.trim(),
          createdAt: Date.now(),
          data: parsedData,
        };
        setGuestRecords(prev => [...prev, newRecord]);
      } else {
        // Authenticated: save to Convex
        await addRecordMutation({
          userId: user!.id,
          evaluationId: currentEvaluationId!,
          testName: testName.trim(),
          data: parsedData,
        });
      }

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

  const handleRenameTest = async (recordId: string, newName: string) => {
    if (isGuest) {
      setGuestRecords(prev => prev.map(r =>
        r._id === recordId ? { ...r, testName: newName } : r
      ));
    } else {
      await updateRecordMutation({
        recordId: recordId as Id<"testRecords">,
        testName: newName,
      });
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
    // Get the active evaluation for both guest and authenticated users
    const evalToEdit = isGuest
      ? guestEvaluations.find(e => e._id === currentEvaluationId)
      : currentEvaluation;
    if (evalToEdit) {
      setEditingEvaluation(evalToEdit);
      setShowEvaluationManager(true);
    }
  };

  const handleEvaluationCreated = (id: Id<"evaluations">) => {
    setCurrentEvaluationId(id);
  };

  // Guest mode handlers for evaluations
  const handleGuestCreateEvaluation = (evaluation: Evaluation) => {
    setGuestEvaluations(prev => [...prev, evaluation]);
  };

  const handleGuestUpdateEvaluation = (updatedEvaluation: Evaluation) => {
    setGuestEvaluations(prev =>
      prev.map(e => e._id === updatedEvaluation._id ? updatedEvaluation : e)
    );
  };

  const handleGuestDeleteEvaluation = (evaluationId: string) => {
    setGuestEvaluations(prev => prev.filter(e => e._id !== evaluationId));
    setGuestRecords(prev => prev.filter(r => r.evaluationId !== evaluationId));
    // Select another evaluation if current was deleted
    if (currentEvaluationId === evaluationId) {
      const remaining = guestEvaluations.filter(e => e._id !== evaluationId);
      setCurrentEvaluationId(remaining[0]?._id || null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Use guest evaluations when not authenticated
  const activeEvaluation = isGuest
    ? guestEvaluations.find(e => e._id === currentEvaluationId) || guestEvaluations[0]
    : currentEvaluation;
  const activeRecords = isGuest
    ? guestRecords.filter(r => r.evaluationId === currentEvaluationId)
    : records;
  const activeEvaluations = isGuest ? guestEvaluations : evaluations;
  const tables = activeEvaluation?.tables || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3">
      <div className="bg-gray-800 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base font-bold">Agent Response Comparator</h1>

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

          {/* Evaluation selector - shown for both guests and authenticated users */}
          <EvaluationSelector
            evaluations={activeEvaluations as Evaluation[]}
            currentEvaluationId={currentEvaluationId}
            onSelect={setCurrentEvaluationId}
            onCreateNew={openCreateEvaluation}
            onEdit={openEditEvaluation}
          />
        </div>

        {/* Second row: workflow buttons */}
        {activeEvaluation && (
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
              className={`px-3 py-1 rounded text-sm font-medium ${isAdding
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
              Consolidated ({activeRecords.length})
            </button>
          </div>
        )}

        {/* Third row: Test name and options */}
        {activeEvaluation && (
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

        {isGuest && (
          <div className="bg-blue-900 text-blue-200 px-3 py-1 rounded text-sm mt-2">
            Guest mode: Data is stored locally for this session only. Sign in to save permanently.
          </div>
        )}

        {isAuthenticated && evaluations.length === 0 && (
          <div className="bg-yellow-900 text-yellow-200 px-3 py-1 rounded text-sm mt-2">
            Create your first evaluation to get started
          </div>
        )}
      </div>

      {/* Main content */}
      {activeEvaluation && tables.length > 0 && (
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
              records={activeRecords}
              tables={tables}
              selectedTableId={selectedTableId || tables[0]?.id || ''}
              onTableSelect={setSelectedTableId}
              onRenameTest={handleRenameTest}
            />
          )}
        </>
      )}

      {/* Evaluation Manager Modal */}
      <EvaluationManager
        isOpen={showEvaluationManager}
        onClose={() => {
          setShowEvaluationManager(false);
          setEditingEvaluation(null);
        }}
        evaluation={editingEvaluation}
        userId={user?.id || 'guest'}
        onCreated={handleEvaluationCreated}
        isGuest={isGuest}
        onGuestCreate={handleGuestCreateEvaluation}
        onGuestUpdate={handleGuestUpdateEvaluation}
        onGuestDelete={handleGuestDeleteEvaluation}
      />
    </div>
  );
}
