"use client";

import { useState, useEffect } from "react";

type PromptTestResult = {
  promptId: string;
  promptName: string;
  promptDescription: string;
  totalTests: number;
  correctTests: number;
  accuracy: number;
  averagePrecision: number;
  averageRecall: number;
  averageF1Score: number;
  results: any[];
};

type PromptComparisonResult = {
  summary: {
    totalTests: number;
    promptsTested: number;
    bestPrompt: string;
    bestF1Score: number;
  };
  promptResults: Array<{
    id: string;
    name: string;
    description: string;
    totalTests: number;
    correctTests: number;
    averagePrecision: number;
    averageRecall: number;
    averageF1Score: number;
    falsePositives: number;
    falseNegatives: number;
  }>;
  individualResults: any[];
  timestamp: string;
};

export default function PromptTestingPage() {
  const [loading, setLoading] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<PromptComparisonResult | null>(null);
  const [customTestResults, setCustomTestResults] = useState<PromptTestResult | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [submissionIds, setSubmissionIds] = useState("");
  const [testLimit, setTestLimit] = useState("10");
  const [error, setError] = useState<string | null>(null);

  const runAllPromptsTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/evaluation/test-prompts?limit=${testLimit}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run prompt tests");
      }

      if (data.error) {
        setError(data.error);
        setComparisonResults(null);
      } else {
        setComparisonResults(data);
        setError(null);
      }
    } catch (error) {
      console.error("Error running prompt tests:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      setComparisonResults(null);
    } finally {
      setLoading(false);
    }
  };

  const runCustomPromptTest = async () => {
    if (!selectedPromptId || !submissionIds.trim()) {
      alert("Please select a prompt and enter submission IDs");
      return;
    }

    const ids = submissionIds.split(",").map(id => id.trim()).filter(id => id);
    if (ids.length === 0) {
      alert("Please enter valid submission IDs");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/evaluation/test-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: selectedPromptId,
          submissionIds: ids
        }),
      });
      const data = await response.json();
      setCustomTestResults(data);
    } catch (error) {
      console.error("Error running custom prompt test:", error);
      alert("Error running custom prompt test");
    } finally {
      setLoading(false);
    }
  };

  const promptOptions = [
    { id: "original", name: "Original Prompt", description: "Current production prompt" },
    { id: "strict_ab007", name: "Stricter AB007 Detection", description: "More specific criteria for false claims" },
    { id: "conservative_ab007", name: "Conservative AB007 Detection", description: "Only flags most egregious false claims" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">AI Prompt Testing & Comparison</h1>
          <p className="text-gray-600">
            Test different prompt variations against your evaluation benchmarks to find the most accurate one.
            This enables iterative prompt refinement based on real performance metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - All Prompts Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Compare All Prompt Variations</h2>
            <p className="text-gray-600 mb-6">
              Run all prompt variations against your evaluation benchmark and see which performs best.
            </p>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="font-medium text-red-800">Error</div>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            )}

            {/* Test Limit Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of evaluations to test:
              </label>
              <select
                value={testLimit}
                onChange={(e) => setTestLimit(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="3">3 (Quick test)</option>
                <option value="5">5 (Fast test)</option>
                <option value="10">10 (Balanced test)</option>
                <option value="20">20 (Comprehensive test)</option>
                <option value="50">All available (~50)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Start with 3-5 to test quickly, then scale up for reliable results.
              </p>
            </div>

            <button
              onClick={runAllPromptsTest}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? "🔄 Running Tests..." : `🚀 Run Tests (${testLimit} evaluations)`}
            </button>
          </div>

          {/* Right Column - Custom Prompt Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Single Prompt</h2>
            <p className="text-gray-600 mb-6">
              Test a specific prompt variation on selected submissions.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Prompt:</label>
                <select
                  value={selectedPromptId}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Choose a prompt...</option>
                  {promptOptions.map(prompt => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Submission IDs:</label>
                <textarea
                  value={submissionIds}
                  onChange={(e) => setSubmissionIds(e.target.value)}
                  placeholder="Enter submission IDs separated by commas"
                  className="w-full p-2 border rounded h-24"
                />
              </div>

              <button
                onClick={runCustomPromptTest}
                disabled={loading || !selectedPromptId || !submissionIds.trim()}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test Selected Prompt"}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {comparisonResults && comparisonResults.summary && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Prompt Comparison Results</h2>
              <p className="text-gray-600">
                Tested {comparisonResults.summary.promptsTested || 0} prompt variations across {comparisonResults.summary.totalTests || 0} evaluation benchmarks
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold text-blue-800">Best Performing Prompt</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {comparisonResults.summary.bestPrompt || "No results"}
                  </p>
                  <p className="text-sm text-blue-600">
                    F1 Score: {comparisonResults.summary.bestF1Score ? Math.round(comparisonResults.summary.bestF1Score * 100) : 0}%
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-semibold text-green-800">Total Tests</h3>
                  <p className="text-2xl font-bold text-green-600">{comparisonResults.summary.totalTests || 0}</p>
                  <p className="text-sm text-green-600">Evaluation benchmarks</p>
                </div>

                <div className="bg-purple-50 p-4 rounded">
                  <h3 className="font-semibold text-purple-800">Prompts Tested</h3>
                  <p className="text-2xl font-bold text-purple-600">{comparisonResults.summary.promptsTested || 0}</p>
                  <p className="text-sm text-purple-600">Variations compared</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                {comparisonResults.promptResults && comparisonResults.promptResults.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Prompt</th>
                        <th className="text-left py-2">Tests</th>
                        <th className="text-left py-2">Accuracy</th>
                        <th className="text-left py-2">Precision</th>
                        <th className="text-left py-2">Recall</th>
                        <th className="text-left py-2">F1 Score</th>
                        <th className="text-left py-2">False Pos/Neg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResults.promptResults.map((prompt) => (
                        <tr key={prompt.id} className="border-b">
                          <td className="py-3">
                            <div>
                              <div className="font-medium">{prompt.name || "Unknown"}</div>
                              <div className="text-sm text-gray-600">{prompt.description || ""}</div>
                            </div>
                          </td>
                          <td className="py-3">{prompt.totalTests || 0}</td>
                          <td className="py-3">
                            {prompt.totalTests > 0 ? Math.round((prompt.correctTests / prompt.totalTests) * 100) : 0}%
                          </td>
                          <td className="py-3">{Math.round((prompt.averagePrecision || 0) * 100)}%</td>
                          <td className="py-3">{Math.round((prompt.averageRecall || 0) * 100)}%</td>
                          <td className="py-3 font-medium">{Math.round((prompt.averageF1Score || 0) * 100)}%</td>
                          <td className="py-3">
                            <span className="text-red-600">{prompt.falsePositives || 0} FP</span>
                            <span className="mx-1">/</span>
                            <span className="text-orange-600">{prompt.falseNegatives || 0} FN</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <p className="text-gray-500 text-lg">No results available</p>
                    <p className="text-gray-400 text-sm">Try running a test with fewer evaluations to start</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Test Results */}
        {customTestResults && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Custom Prompt Test Results</h2>
              <p className="text-gray-600">
                Testing "{customTestResults.promptName}" on {customTestResults.totalTests} submissions
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-blue-600">{customTestResults.correctTests}</div>
                  <div className="text-sm text-blue-600">Correct / {customTestResults.totalTests}</div>
                </div>
                <div className="bg-green-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(customTestResults.accuracy * 100)}%</div>
                  <div className="text-sm text-green-600">Accuracy</div>
                </div>
                <div className="bg-purple-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(customTestResults.averagePrecision * 100)}%</div>
                  <div className="text-sm text-purple-600">Precision</div>
                </div>
                <div className="bg-orange-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-orange-600">{Math.round(customTestResults.averageF1Score * 100)}%</div>
                  <div className="text-sm text-orange-600">F1 Score</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <strong>Tested:</strong> {customTestResults.promptName} - {customTestResults.promptDescription}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
