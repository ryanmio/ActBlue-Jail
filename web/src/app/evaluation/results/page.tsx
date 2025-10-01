"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Metrics = {
  totalEvaluations: number;
  exactMatches: number;
  accuracy: number;
  precision: number;
  recall: number;
  falsePositives: number;
  falseNegatives: number;
  truePositives: number;
  trueNegatives: number;
  totalSessions?: number;
};

type ResultsData = {
  sessionMetrics: Metrics | null;
  aggregateMetrics: Metrics | null;
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/evaluation/results?sessionId=${sessionId}&includeAggregate=true`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch results");
        }

        const resultsData = await response.json();
        setData(resultsData);
      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Failed to load evaluation results. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  const handleStartNew = () => {
    // Clear local storage
    localStorage.removeItem("eval_session_id");
    localStorage.removeItem("eval_evaluated_ids");
    router.push("/evaluation");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evaluation results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error || "Failed to load results"}</p>
          <button
            onClick={() => router.push("/evaluation")}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Evaluation
          </button>
        </div>
      </div>
    );
  }

  const { sessionMetrics, aggregateMetrics } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-6">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            AI Training Results
          </h1>
          <p className="text-sm text-gray-600">
            How the current AI prompt compares to your manual categorization and other evaluators.
          </p>
        </div>

        {/* Success Message */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-green-600 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-green-900 text-sm">
                Thank you for completing the evaluation!
              </h3>
              <p className="text-xs text-green-700">
                Your feedback helps us improve AI detection accuracy.
              </p>
            </div>
          </div>
        </div>

        {/* Your Session Results */}
        {sessionMetrics && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 className="text-xl font-bold mb-2 text-gray-900">
              Your Evaluation Session
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Comparison between AI detection and your manual evaluation of{" "}
              {sessionMetrics.totalEvaluations} cases.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* Accuracy */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {sessionMetrics.accuracy}%
                </div>
                <div className="text-sm font-medium text-gray-700">Exact Match Accuracy</div>
                <div className="text-xs text-gray-500 mt-1">
                  {sessionMetrics.exactMatches} of {sessionMetrics.totalEvaluations} cases matched
                  exactly
                </div>
              </div>

              {/* Precision */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {sessionMetrics.precision}%
                </div>
                <div className="text-sm font-medium text-gray-700">Precision</div>
                <div className="text-xs text-gray-500 mt-1">
                  Of AI violations, how many were correct
                </div>
              </div>

              {/* Recall */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {sessionMetrics.recall}%
                </div>
                <div className="text-sm font-medium text-gray-700">Recall</div>
                <div className="text-xs text-gray-500 mt-1">
                  Of actual violations, how many AI caught
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {/* True Positives */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-800">
                  {sessionMetrics.truePositives}
                </div>
                <div className="text-xs font-medium text-gray-600">True Positives</div>
                <div className="text-xs text-gray-500">Correctly flagged</div>
              </div>

              {/* True Negatives */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-800">
                  {sessionMetrics.trueNegatives}
                </div>
                <div className="text-xs font-medium text-gray-600">True Negatives</div>
                <div className="text-xs text-gray-500">Correctly not flagged</div>
              </div>

              {/* False Positives */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">
                  {sessionMetrics.falsePositives}
                </div>
                <div className="text-xs font-medium text-gray-700">False Positives</div>
                <div className="text-xs text-gray-500">Incorrectly flagged</div>
              </div>

              {/* False Negatives */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600">
                  {sessionMetrics.falseNegatives}
                </div>
                <div className="text-xs font-medium text-gray-700">False Negatives</div>
                <div className="text-xs text-gray-500">Missed violations</div>
              </div>
            </div>
          </div>
        )}

        {/* Aggregate Results */}
        {aggregateMetrics && aggregateMetrics.totalEvaluations > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 className="text-xl font-bold mb-2 text-gray-900">
              All Evaluators Combined
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Aggregate results from {aggregateMetrics.totalEvaluations} total evaluations across{" "}
              {aggregateMetrics.totalSessions || "all"} evaluation sessions.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* Accuracy */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {aggregateMetrics.accuracy}%
                </div>
                <div className="text-sm font-medium text-gray-700">Exact Match Accuracy</div>
                <div className="text-xs text-gray-500 mt-1">
                  {aggregateMetrics.exactMatches} of {aggregateMetrics.totalEvaluations} cases
                </div>
              </div>

              {/* Precision */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {aggregateMetrics.precision}%
                </div>
                <div className="text-sm font-medium text-gray-700">Precision</div>
                <div className="text-xs text-gray-500 mt-1">Average across all evaluators</div>
              </div>

              {/* Recall */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {aggregateMetrics.recall}%
                </div>
                <div className="text-sm font-medium text-gray-700">Recall</div>
                <div className="text-xs text-gray-500 mt-1">Average across all evaluators</div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {/* True Positives */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-800">
                  {aggregateMetrics.truePositives}
                </div>
                <div className="text-xs font-medium text-gray-600">True Positives</div>
              </div>

              {/* True Negatives */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-800">
                  {aggregateMetrics.trueNegatives}
                </div>
                <div className="text-xs font-medium text-gray-600">True Negatives</div>
              </div>

              {/* False Positives */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">
                  {aggregateMetrics.falsePositives}
                </div>
                <div className="text-xs font-medium text-gray-700">False Positives</div>
              </div>

              {/* False Negatives */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600">
                  {aggregateMetrics.falseNegatives}
                </div>
                <div className="text-xs font-medium text-gray-700">False Negatives</div>
              </div>
            </div>
          </div>
        )}

        {/* Interpretation Guide */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
          <h3 className="text-base font-semibold mb-2">Understanding the Metrics</h3>
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div>
              <strong className="text-gray-900">Accuracy:</strong>
              <p className="text-gray-600">
                Percentage of cases where AI matches your evaluation exactly.
              </p>
            </div>
            <div>
              <strong className="text-gray-900">Precision:</strong>
              <p className="text-gray-600">
                When AI flags a violation, how often is it correct? (Fewer false alarms = better)
              </p>
            </div>
            <div>
              <strong className="text-gray-900">Recall:</strong>
              <p className="text-gray-600">
                Of all actual violations, what % does AI catch? (Fewer misses = better)
              </p>
            </div>
            <div>
              <strong className="text-gray-900">False Positives:</strong>
              <p className="text-gray-600">
                AI incorrectly flagged violations that shouldn&apos;t be flagged.
              </p>
            </div>
            <div>
              <strong className="text-gray-900">False Negatives:</strong>
              <p className="text-gray-600">
                AI missed violations that should have been flagged.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleStartNew}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium transition-all shadow-md hover:shadow-lg"
          >
            Start New Evaluation
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EvaluationResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}

