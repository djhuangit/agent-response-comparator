import { Evaluation } from '../../types/evaluation';
import { Id } from '../../../convex/_generated/dataModel';

interface EvaluationSelectorProps {
  evaluations: Evaluation[];
  currentEvaluationId: Id<"evaluations"> | null;
  onSelect: (id: Id<"evaluations"> | null) => void;
  onCreateNew: () => void;
  onEdit: () => void;
}

export const EvaluationSelector = ({
  evaluations,
  currentEvaluationId,
  onSelect,
  onCreateNew,
  onEdit,
}: EvaluationSelectorProps) => {
  const currentEvaluation = evaluations.find(e => e._id === currentEvaluationId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Evaluation:</span>

      <select
        value={currentEvaluationId || ''}
        onChange={(e) => onSelect(e.target.value ? e.target.value as Id<"evaluations"> : null)}
        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm min-w-40"
      >
        {evaluations.length === 0 ? (
          <option value="">No evaluations</option>
        ) : (
          <>
            <option value="">Select evaluation...</option>
            {evaluations.map((evaluation) => (
              <option key={evaluation._id} value={evaluation._id}>
                {evaluation.name}
              </option>
            ))}
          </>
        )}
      </select>

      <button
        onClick={onCreateNew}
        className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-medium"
        title="Create new evaluation"
      >
        +
      </button>

      {currentEvaluation && (
        <button
          onClick={onEdit}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          title="Edit evaluation"
        >
          Edit
        </button>
      )}
    </div>
  );
};
