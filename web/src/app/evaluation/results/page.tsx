"use client";

import { useState, useEffect } from "react";

type EvaluationMetrics = {
  totalEvaluations: number;
  aiViolations: number;
  manualViolations: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  violationsByCode: Record<string, {
    aiCount: number;
    manualCount: number;
    correctCount: number;
    incorrectCount: number;
  }>;
};

type Evaluation = {
  id: string;
  submission_id: string;
  manual_violations: any[];
  evaluator_notes: string;
  created_at: string;
  updated_at: string;
  submissions: {
    id: string;
    raw_text: string;
    image_url: string;
    sender_name: string;
    violations: any[];
  };
};

export default function EvaluationResultsPage() {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const response = await fetch("/api/evaluation/results");
      const data = await response.json();
      setMetrics(data.metrics);
      setEvaluations(data.evaluations);
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading evaluation results...</h1>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Evaluation Results</h1>
          <p className="text-gray-600">No evaluation data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">AI Prompt Evaluation Results</h1>
          <p className="text-gray-600">
            Analysis of AI classification accuracy compared to manual evaluation.
            Total evaluations: {metrics.totalEvaluations}
          </p>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Accuracy Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Precision:</span>
                <span className="font-medium">{Math.round(metrics.precision * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recall:</span>
                <span className="font-medium">{Math.round(metrics.recall * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">F1 Score:</span>
                <span className="font-medium">{Math.round(metrics.f1Score * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Violation Counts</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">AI Violations:</span>
                <span className="font-medium">{metrics.aiViolations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Manual Violations:</span>
                <span className="font-medium">{metrics.manualViolations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">True Positives:</span>
                <span className="font-medium text-green-600">{metrics.truePositives}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Error Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">False Positives:</span>
                <span className="font-medium text-red-600">{metrics.falsePositives}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">False Negatives:</span>
                <span className="font-medium text-orange-600">{metrics.falseNegatives}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Accuracy:</span>
                <span className="font-medium">
                  {metrics.totalEvaluations > 0
                    ? Math.round((metrics.truePositives + metrics.trueNegatives) / metrics.totalEvaluations * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Violations by Code */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Performance by Violation Code</h2>
          </div>
          <div className="p-6">
            {Object.keys(metrics.violationsByCode).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Code</th>
                      <th className="text-left py-2">AI Count</th>
                      <th className="text-left py-2">Manual Count</th>
                      <th className="text-left py-2">Correct</th>
                      <th className="text-left py-2">Incorrect</th>
                      <th className="text-left py-2">Precision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metrics.violationsByCode).map(([code, stats]) => {
                      const precision = stats.aiCount > 0 ? stats.correctCount / stats.aiCount : 0;
                      return (
                        <tr key={code} className="border-b">
                          <td className="py-2 font-medium">{code}</td>
                          <td className="py-2">{stats.aiCount}</td>
                          <td className="py-2">{stats.manualCount}</td>
                          <td className="py-2 text-green-600">{stats.correctCount}</td>
                          <td className="py-2 text-red-600">{stats.incorrectCount}</td>
                          <td className="py-2">{Math.round(precision * 100)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No violation data available</p>
            )}
          </div>
        </div>

        {/* Recent Evaluations */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Evaluations</h2>
          </div>
          <div className="p-6">
            {evaluations.length > 0 ? (
              <div className="space-y-4">
                {evaluations.slice(0, 10).map((evaluation) => (
                  <div key={evaluation.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">
                          Submission {evaluation.submission_id.substring(0, 8)}...
                        </h3>
                        <p className="text-sm text-gray-600">
                          {evaluation.submissions.sender_name || "Unknown sender"} •
                          {new Date(evaluation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div>AI: {evaluation.submissions.violations?.length || 0} violations</div>
                        <div>Manual: {evaluation.manual_violations?.length || 0} violations</div>
                      </div>
                    </div>

                    {evaluation.evaluator_notes && (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <strong>Notes:</strong> {evaluation.evaluator_notes}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>AI Violations:</strong>
                        {evaluation.submissions.violations?.map((v: any, i: number) => (
                          <div key={i} className="ml-2">• {v.code}: {v.title}</div>
                        )) || <div className="ml-2 text-gray-500">None</div>}
                      </div>
                      <div>
                        <strong>Manual Violations:</strong>
                        {evaluation.manual_violations?.map((v: any, i: number) => (
                          <div key={i} className="ml-2">• {v.code}: {v.title}</div>
                        )) || <div className="ml-2 text-gray-500">None</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No evaluations completed yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
