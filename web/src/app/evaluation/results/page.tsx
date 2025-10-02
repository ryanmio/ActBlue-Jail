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
      {/* Compact Hero Section */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Training Results</h1>
                <p className="text-sm text-gray-600">Your evaluation compared to AI detection</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Complete
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Your Session Results */}
        {sessionMetrics && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">Your Session</h2>
              <p className="text-sm text-gray-600">Evaluated {sessionMetrics.totalEvaluations} cases</p>
            </div>

            {/* Primary Metrics with Hover Tooltips */}
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <div className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-help">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Accuracy</span>
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{sessionMetrics.accuracy}%</div>
                <p className="text-xs text-gray-500">{sessionMetrics.exactMatches} of {sessionMetrics.totalEvaluations} exact matches</p>
                
                {/* Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl">
                  <div className="font-bold mb-1">Accuracy</div>
                  <div className="text-gray-300">Percentage of cases where AI matches your evaluation exactly</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>

              <div className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-purple-300 transition-all cursor-help">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Precision</span>
                  <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{sessionMetrics.precision}%</div>
                <p className="text-xs text-gray-500">Fewer false alarms</p>
                
                {/* Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl">
                  <div className="font-bold mb-1">Precision</div>
                  <div className="text-gray-300">When AI flags a violation, how often is it correct? (Fewer false alarms = better)</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>

              <div className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-green-300 transition-all cursor-help">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Recall</span>
                  <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{sessionMetrics.recall}%</div>
                <p className="text-xs text-gray-500">Fewer missed violations</p>
                
                {/* Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl">
                  <div className="font-bold mb-1">Recall</div>
                  <div className="text-gray-300">Of all actual violations, what % does AI catch? (Fewer misses = better)</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid md:grid-cols-4 gap-3">
              <div className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-help">
                <div className="text-xl font-bold text-gray-900">{sessionMetrics.truePositives}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">True Positives</div>
                
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl">
                  Correctly flagged violations
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              
              <div className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-help">
                <div className="text-xl font-bold text-gray-900">{sessionMetrics.trueNegatives}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">True Negatives</div>
                
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl">
                  Correctly not flagged
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              
              <div className="group relative bg-white border border-red-200 rounded-lg p-3 hover:shadow-md hover:border-red-300 transition-all cursor-help">
                <div className="text-xl font-bold text-red-600">{sessionMetrics.falsePositives}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">False Positives</div>
                
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl">
                  AI incorrectly flagged violations
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              
              <div className="group relative bg-white border border-orange-200 rounded-lg p-3 hover:shadow-md hover:border-orange-300 transition-all cursor-help">
                <div className="text-xl font-bold text-orange-600">{sessionMetrics.falseNegatives}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">False Negatives</div>
                
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl">
                  AI missed violations
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900 mb-1">How Your Data Improves AI Accuracy</h3>
              <p className="text-xs text-blue-800 leading-relaxed">
                Your manual evaluations help train the AI to be more accurate. By tagging cases, we can determine which violations need more specific detection instructions and which patterns to ignore, reducing both false positives (incorrect flags) and false negatives (missed violations).
              </p>
            </div>
          </div>
        </div>

        {/* All Evaluators - Smaller */}
        {aggregateMetrics && aggregateMetrics.totalEvaluations > 0 && (
          <div className="mb-6">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-gray-900">All Evaluators</h2>
              <p className="text-xs text-gray-600">{aggregateMetrics.totalEvaluations} evaluations across {aggregateMetrics.totalSessions || "all"} sessions</p>
            </div>

            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Accuracy</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{aggregateMetrics.accuracy}%</div>
                <p className="text-xs text-gray-500">{aggregateMetrics.exactMatches} of {aggregateMetrics.totalEvaluations}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Precision</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{aggregateMetrics.precision}%</div>
                <p className="text-xs text-gray-500">Average</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Recall</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{aggregateMetrics.recall}%</div>
                <p className="text-xs text-gray-500">Average</p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-2">
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="text-lg font-bold text-gray-900">{aggregateMetrics.truePositives}</div>
                <div className="text-xs font-medium text-gray-600">TP</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="text-lg font-bold text-gray-900">{aggregateMetrics.trueNegatives}</div>
                <div className="text-xs font-medium text-gray-600">TN</div>
              </div>
              <div className="bg-white border border-red-100 rounded-lg p-2">
                <div className="text-lg font-bold text-red-600">{aggregateMetrics.falsePositives}</div>
                <div className="text-xs font-medium text-gray-600">FP</div>
              </div>
              <div className="bg-white border border-orange-100 rounded-lg p-2">
                <div className="text-lg font-bold text-orange-600">{aggregateMetrics.falseNegatives}</div>
                <div className="text-xs font-medium text-gray-600">FN</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleStartNew}
            className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-xl hover:bg-gray-800 font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Start New Evaluation
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all"
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
