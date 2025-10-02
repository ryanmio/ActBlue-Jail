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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md border border-gray-200">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Error</h2>
          <p className="text-gray-600 mb-6 text-center">{error || "Failed to load results"}</p>
          <button
            onClick={() => router.push("/evaluation")}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors font-medium"
          >
            Back to Evaluation
          </button>
        </div>
      </div>
    );
  }

  const { sessionMetrics, aggregateMetrics } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Training Results
              </h1>
              <p className="text-gray-600 mt-1">
                Your evaluation compared to AI detection
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Evaluation Complete
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Your Session Results */}
        {sessionMetrics && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your Session
              </h2>
              <p className="text-gray-600">
                Evaluated {sessionMetrics.totalEvaluations} cases
              </p>
            </div>

            {/* Primary Metrics */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Accuracy</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  {sessionMetrics.accuracy}%
                </div>
                <p className="text-xs text-gray-500">
                  {sessionMetrics.exactMatches} of {sessionMetrics.totalEvaluations} exact matches
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Precision</span>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  {sessionMetrics.precision}%
                </div>
                <p className="text-xs text-gray-500">
                  Fewer false alarms
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Recall</span>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  {sessionMetrics.recall}%
                </div>
                <p className="text-xs text-gray-500">
                  Fewer missed violations
                </p>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-900">{sessionMetrics.truePositives}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">True Positives</div>
                <div className="text-xs text-gray-500 mt-1">Correctly flagged</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-900">{sessionMetrics.trueNegatives}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">True Negatives</div>
                <div className="text-xs text-gray-500 mt-1">Correctly not flagged</div>
              </div>
              <div className="bg-white border border-red-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-600">{sessionMetrics.falsePositives}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">False Positives</div>
                <div className="text-xs text-gray-500 mt-1">Incorrectly flagged</div>
              </div>
              <div className="bg-white border border-orange-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-orange-600">{sessionMetrics.falseNegatives}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">False Negatives</div>
                <div className="text-xs text-gray-500 mt-1">Missed violations</div>
              </div>
            </div>
          </div>
        )}

        {/* Aggregate Results */}
        {aggregateMetrics && aggregateMetrics.totalEvaluations > 0 && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                All Evaluators
              </h2>
              <p className="text-gray-600">
                {aggregateMetrics.totalEvaluations} evaluations across {aggregateMetrics.totalSessions || "all"} sessions
              </p>
            </div>

            {/* Primary Metrics */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Accuracy</span>
                </div>
                <div className="text-4xl font-bold text-blue-900 mb-1">
                  {aggregateMetrics.accuracy}%
                </div>
                <p className="text-xs text-blue-700">
                  {aggregateMetrics.exactMatches} of {aggregateMetrics.totalEvaluations} matches
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-900">Precision</span>
                </div>
                <div className="text-4xl font-bold text-purple-900 mb-1">
                  {aggregateMetrics.precision}%
                </div>
                <p className="text-xs text-purple-700">
                  Average across all evaluators
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Recall</span>
                </div>
                <div className="text-4xl font-bold text-green-900 mb-1">
                  {aggregateMetrics.recall}%
                </div>
                <p className="text-xs text-green-700">
                  Average across all evaluators
                </p>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-900">{aggregateMetrics.truePositives}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">True Positives</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-900">{aggregateMetrics.trueNegatives}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">True Negatives</div>
              </div>
              <div className="bg-white border border-red-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-600">{aggregateMetrics.falsePositives}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">False Positives</div>
              </div>
              <div className="bg-white border border-orange-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-orange-600">{aggregateMetrics.falseNegatives}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">False Negatives</div>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Guide */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Understanding the Metrics</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">A</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Accuracy</div>
                <p className="text-gray-600 text-xs mt-1">
                  Percentage of cases where AI matches your evaluation exactly
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-xs">P</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Precision</div>
                <p className="text-gray-600 text-xs mt-1">
                  When AI flags a violation, how often is it correct?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-xs">R</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Recall</div>
                <p className="text-gray-600 text-xs mt-1">
                  Of all actual violations, what % does AI catch?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-gray-600 font-bold text-xs">±</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">False Positives/Negatives</div>
                <p className="text-gray-600 text-xs mt-1">
                  Incorrect flags and missed violations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleStartNew}
            className="flex-1 bg-gray-900 text-white py-4 px-6 rounded-xl hover:bg-gray-800 font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Start New Evaluation
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all"
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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
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
