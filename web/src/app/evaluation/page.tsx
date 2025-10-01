"use client";

import { useState, useEffect } from "react";

type Violation = {
  code: string;
  title: string;
  rationale: string;
  severity: number;
  confidence: number;
};

type Submission = {
  id: string;
  raw_text: string;
  image_url: string;
  sender_name: string;
  created_at: string;
  violations: Violation[];
};

type ManualViolation = {
  code: string;
  title: string;
  rationale: string;
  severity: number;
  confidence: number;
};

const VIOLATION_CODES = [
  { code: "AB001", title: "Misrepresentation/Impersonation", description: "Image shows unaffiliated candidates without clear affiliation stated" },
  { code: "AB002", title: "Direct-Benefit Claim", description: "Claims donations directly benefit specific individuals" },
  { code: "AB003", title: "Missing Full Entity Name", description: "No full entity name appears anywhere in the message" },
  { code: "AB004", title: "Entity Clarity (Org vs Candidate)", description: "Unclear whether organization or candidate is the sender" },
  { code: "AB005", title: "Branding/Form Clarity", description: "Unclear branding or form purpose" },
  { code: "AB006", title: "PAC Disclosure Clarity", description: "PAC doesn't clearly state donations go to PAC, not candidate" },
  { code: "AB007", title: "False/Unsubstantiated Claims", description: "Makes specific, provable false factual claims" },
  { code: "AB008", title: "Unverified Matching Program", description: "Advertises improbable matching programs" },
];

export default function EvaluationPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const [manualViolations, setManualViolations] = useState<ManualViolation[]>([]);
  const [evaluatorNotes, setEvaluatorNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ totalEvaluated: 0, totalAvailable: 0, completionPercentage: 0, isComplete: false });

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const response = await fetch("/api/evaluation?includeEvaluated=true");
      const data = await response.json();
      setSubmissions(data.submissions || []);
      setProgress(data.progress || { totalEvaluated: 0, totalAvailable: 0, completionPercentage: 0, isComplete: false });
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveEvaluation = async () => {
    if (!currentSubmission) return;

    setSaving(true);
    try {
      const response = await fetch("/api/evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: currentSubmission.id,
          manualViolations,
          evaluatorNotes,
        }),
      });

      if (response.ok) {
        alert("Evaluation saved successfully!");
        // Reload submissions and progress data to update the progress bar
        await loadSubmissions();

        // Move to next submission
        const currentIndex = submissions.findIndex(s => s.id === currentSubmission.id);
        if (currentIndex < submissions.length - 1) {
          setCurrentSubmission(submissions[currentIndex + 1]);
          setManualViolations([]);
          setEvaluatorNotes("");
        } else {
          // No more submissions in current batch, load more
          if (submissions.length > 0) {
            setCurrentSubmission(submissions[0]);
          }
        }
      } else {
        alert("Error saving evaluation");
      }
    } catch (error) {
      console.error("Error saving evaluation:", error);
      alert("Error saving evaluation");
    } finally {
      setSaving(false);
    }
  };

  const addViolation = (code: string) => {
    const violationType = VIOLATION_CODES.find(v => v.code === code);
    if (!violationType) return;

    const newViolation: ManualViolation = {
      code,
      title: violationType.title,
      rationale: "",
      severity: 3,
      confidence: 0.8,
    };

    setManualViolations([...manualViolations, newViolation]);
  };

  const updateViolation = (index: number, updates: Partial<ManualViolation>) => {
    const updated = [...manualViolations];
    updated[index] = { ...updated[index], ...updates };
    setManualViolations(updated);
  };

  const removeViolation = (index: number) => {
    setManualViolations(manualViolations.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading submissions...</h1>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Evaluation Queue</h1>
          <p className="text-gray-600">No submissions available for evaluation.</p>
        </div>
      </div>
    );
  }

  if (!currentSubmission) {
    setCurrentSubmission(submissions[0]);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border border-gray-300">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">AI Prompt Evaluation</h1>
          <p className="text-lg text-gray-800 font-medium mb-4">
            Review submissions and manually tag violations to evaluate AI accuracy.
            Focus on submissions with AB007 (False Claims) violations.
          </p>

          {/* Progress Bar */}
          {submissions.length > 0 && (
            <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">Evaluation Progress</h3>
                <span className="text-sm font-medium text-gray-700">
                  {progress.totalEvaluated} of {progress.totalAvailable} submissions evaluated
                </span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${progress.isComplete ? 'bg-green-600' : 'bg-blue-600'}`}
                  style={{ width: `${progress.completionPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">
                  Progress: <span className="font-bold">{progress.completionPercentage}%</span>
                </span>
                <span className={`font-bold ${progress.isComplete ? 'text-green-700' : 'text-blue-700'}`}>
                  {progress.isComplete ? '🎉 Complete!' : '⏳ In Progress'}
                </span>
                <span className="text-gray-600">
                  Goal: 40+ evaluations for reliable results
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column - Submission Review */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-300">
            <div className="p-6 border-b-2 border-gray-400 bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-900">Submission Review</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Sender Info */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Sender</h3>
                    <p className="text-gray-800 font-medium">{currentSubmission.sender_name || "Unknown"}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Date</h3>
                    <p className="text-gray-800 font-medium">{new Date(currentSubmission.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Image */}
              {currentSubmission.image_url && (
                <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm">
                  <h4 className="font-bold text-gray-900 text-lg mb-3">Image</h4>
                  <div className="border-2 border-gray-400 rounded-lg overflow-hidden bg-white">
                    <img
                      src={currentSubmission.image_url}
                      alt="Submission"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Text Content */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                <h4 className="font-bold text-gray-900 text-lg mb-3">Text Content</h4>
                <div className="bg-white border-2 border-gray-400 rounded-lg p-4 max-h-80 overflow-y-auto shadow-inner">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 font-medium">
                    {currentSubmission.raw_text || "No text content"}
                  </pre>
                </div>
              </div>

              {/* AI Violations */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                <h4 className="font-bold text-gray-900 text-lg mb-3">AI-Detected Violations</h4>
                {currentSubmission.violations.length > 0 ? (
                  <div className="space-y-3">
                    {currentSubmission.violations.map((violation, index) => (
                      <div key={index} className="bg-red-100 border-2 border-red-400 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-red-900 text-lg">
                            {violation.code}: {violation.title}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-red-800 bg-red-200 px-2 py-1 rounded">
                              {Math.round(violation.confidence * 100)}% confidence
                            </div>
                            <div className="text-xs text-red-700 font-medium">
                              Severity: {violation.severity}/5
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-red-800 leading-relaxed font-medium bg-red-50 p-2 rounded">
                          {violation.rationale}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-green-900 text-lg">✓ No violations detected by AI</div>
                    <p className="text-green-800 mt-1 font-medium">The AI found no policy violations in this submission.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Manual Evaluation */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-300">
            <div className="p-6 border-b-2 border-gray-400 bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-900">Manual Evaluation</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Add Violation Buttons */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm">
                <h3 className="font-bold text-gray-900 text-lg mb-3">Add Violation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VIOLATION_CODES.map((code) => (
                    <button
                      key={code.code}
                      onClick={() => addViolation(code.code)}
                      className="p-3 text-sm border-2 border-gray-400 rounded-lg hover:bg-blue-100 hover:border-blue-500 transition-colors text-left bg-white shadow-sm"
                    >
                      <div className="font-bold text-gray-900 text-sm">{code.code}</div>
                      <div className="text-xs text-gray-700 font-medium">{code.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Violations */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm">
                <h3 className="font-bold text-gray-900 text-lg mb-3">
                  Manual Violations ({manualViolations.length})
                </h3>
                {manualViolations.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {manualViolations.map((violation, index) => (
                      <div key={index} className="bg-white border-2 border-gray-400 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-gray-900 text-lg">
                            {violation.code}: {violation.title}
                          </div>
                          <button
                            onClick={() => removeViolation(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-bold px-2 py-1 bg-red-100 rounded"
                          >
                            ✕ Remove
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-1">Rationale:</label>
                            <textarea
                              value={violation.rationale}
                              onChange={(e) => updateViolation(index, { rationale: e.target.value })}
                              className="w-full p-3 border-2 border-gray-400 rounded-lg text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              rows={3}
                              placeholder="Explain why this is a violation..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-bold text-gray-900 mb-1">Severity (1-5):</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={violation.severity}
                                onChange={(e) => updateViolation(index, { severity: parseInt(e.target.value) })}
                                className="w-full p-2 border-2 border-gray-400 rounded-lg text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-gray-900 mb-1">Confidence (0-1):</label>
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                value={violation.confidence}
                                onChange={(e) => updateViolation(index, { confidence: parseFloat(e.target.value) })}
                                className="w-full p-2 border-2 border-gray-400 rounded-lg text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 shadow-sm">
                    <div className="font-bold text-yellow-900 text-lg">No manual violations added</div>
                    <p className="text-yellow-800 mt-1 font-medium">Click the violation buttons above to add violations you believe should be flagged.</p>
                  </div>
                )}
              </div>

              {/* Evaluator Notes */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm">
                <h3 className="font-bold text-gray-900 text-lg mb-3">Evaluator Notes</h3>
                <textarea
                  value={evaluatorNotes}
                  onChange={(e) => setEvaluatorNotes(e.target.value)}
                  className="w-full p-4 border-2 border-gray-400 rounded-lg text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  rows={4}
                  placeholder="Additional notes about this evaluation..."
                />
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={saveEvaluation}
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors shadow-lg"
                  >
                    {saving ? "💾 Saving..." : "✅ Save Evaluation"}
                  </button>
                  <button
                    onClick={() => {
                      const currentIndex = submissions.findIndex(s => s.id === currentSubmission.id);
                      if (currentIndex < submissions.length - 1) {
                        setCurrentSubmission(submissions[currentIndex + 1]);
                        setManualViolations([]);
                        setEvaluatorNotes("");
                      }
                    }}
                    className="px-6 py-3 border-2 border-gray-400 rounded-lg hover:bg-gray-200 font-bold transition-colors shadow-sm bg-white text-gray-900"
                  >
                    ⏭️ Skip to Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
