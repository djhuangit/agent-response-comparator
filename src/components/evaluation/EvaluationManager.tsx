import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Evaluation, TableDefinition, createDefaultTables } from '../../types/evaluation';
import { TableDefinitionEditor } from './TableDefinitionEditor';
import { Id } from '../../../convex/_generated/dataModel';

interface EvaluationManagerProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation?: Evaluation | null;  // If editing, undefined/null for create
  userId: string;
  onCreated?: (id: Id<"evaluations">) => void;
}

export const EvaluationManager = ({
  isOpen,
  onClose,
  evaluation,
  userId,
  onCreated,
}: EvaluationManagerProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tables, setTables] = useState<TableDefinition[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const createEvaluation = useMutation(api.evaluations.createEvaluation);
  const updateEvaluation = useMutation(api.evaluations.updateEvaluation);
  const deleteEvaluation = useMutation(api.evaluations.deleteEvaluation);

  // Reset form when modal opens or evaluation changes
  useEffect(() => {
    if (isOpen) {
      if (evaluation) {
        setName(evaluation.name);
        setDescription(evaluation.description || '');
        setTables(evaluation.tables);
      } else {
        setName('');
        setDescription('');
        setTables(createDefaultTables());
      }
      setError('');
      setIsDeleting(false);
    }
  }, [isOpen, evaluation]);

  if (!isOpen) return null;

  const isEditing = !!evaluation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (tables.length === 0) {
      setError('Please add at least one table');
      return;
    }

    if (tables.some(t => !t.name.trim())) {
      setError('All tables must have a name');
      return;
    }

    try {
      if (isEditing) {
        await updateEvaluation({
          evaluationId: evaluation._id,
          name: name.trim(),
          description: description.trim() || undefined,
          tables,
        });
      } else {
        const newId = await createEvaluation({
          userId,
          name: name.trim(),
          description: description.trim() || undefined,
          tables,
        });
        onCreated?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!evaluation) return;

    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }

    try {
      await deleteEvaluation({ evaluationId: evaluation._id });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Evaluation' : 'Create New Evaluation'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              placeholder="My Evaluation"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              placeholder="What is this evaluation for?"
            />
          </div>

          <TableDefinitionEditor tables={tables} onChange={setTables} />

          {error && (
            <div className="bg-red-900 text-red-200 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  isDeleting
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-gray-700 hover:bg-gray-600 text-red-400'
                }`}
              >
                {isDeleting ? 'Click again to confirm delete' : 'Delete'}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium"
            >
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
