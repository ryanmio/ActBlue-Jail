"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { VIOLATION_POLICIES, AUP_HELP_URL } from "@/lib/violation-policies";

const REQUIRED_EVALUATIONS = 20;

type Sample = {
  id: string;
  imageUrl: string;
  senderId: string | null;
  senderName: string | null;
  rawText: string | null;
  messageType: string | null;
  aiConfidence: number | null;
  createdAt: string;
  landingUrl: string | null;
  landingScreenshotUrl: string | null;
  aiViolations: Array<{ code: string; title: string; description: string; confidence: number }>;
};

export default function EvaluationPage() {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"image" | "text" | "landing">("image");

  // Initialize device ID and load progress from localStorage
  useEffect(() => {
    // Generate or retrieve device ID
    let storedDeviceId = localStorage.getItem("eval_device_id");
    if (!storedDeviceId) {
      storedDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("eval_device_id", storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // Load session ID and progress
    const storedSessionId = localStorage.getItem("eval_session_id");
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }

    const storedEvaluatedIds = localStorage.getItem("eval_evaluated_ids");
    if (storedEvaluatedIds) {
      try {
        setEvaluatedIds(JSON.parse(storedEvaluatedIds));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Fetch samples
  useEffect(() => {
    if (!deviceId) return;

    const fetchSamples = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const excludeParam = evaluatedIds.length > 0 ? `&exclude=${evaluatedIds.join(",")}` : "";
        const response = await fetch(`/api/evaluation/samples?count=${REQUIRED_EVALUATIONS}${excludeParam}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch samples");
        }

        const data = await response.json();
        setSamples(data.samples || []);
      } catch (err) {
        console.error("Error fetching samples:", err);
        setError("Failed to load evaluation samples. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchSamples();
  }, [deviceId, evaluatedIds]);

  // Set default tab based on what's available
  useEffect(() => {
    if (currentSample) {
      const hasImage = currentSample.imageUrl !== null && currentSample.imageUrl !== undefined;
      const hasLanding = currentSample.landingScreenshotUrl !== null && currentSample.landingScreenshotUrl !== undefined;
      
      // Default to text tab, switch to image if available
      if (hasImage) {
        setActiveTab("image");
      } else if (currentSample.rawText) {
        setActiveTab("text");
      } else if (hasLanding) {
        setActiveTab("landing");
      } else {
        setActiveTab("text");
      }
    }
  }, [currentIndex, samples]);

  const currentSample = samples[currentIndex];
  const progress = evaluatedIds.length;
  const progressPercent = (progress / REQUIRED_EVALUATIONS) * 100;
  const canSubmit = progress >= REQUIRED_EVALUATIONS;

  const handleToggleViolation = (code: string) => {
    setSelectedViolations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSaveEvaluation = async () => {
    if (!currentSample || !deviceId) return;

    setSubmitting(true);
    setError(null);

    try {
      const aiViolationCodes = currentSample.aiViolations.map((v) => v.code);

      const response = await fetch("/api/evaluation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          deviceId,
          submissionId: currentSample.id,
          manualViolations: selectedViolations,
          evaluatorNotes: notes.trim() || null,
          aiViolations: aiViolationCodes,
        }),
      });

      let currentSessionId = sessionId;
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "duplicate_evaluation") {
          // Already evaluated, skip to next
          console.log("Already evaluated, moving to next");
        } else {
          throw new Error(errorData.error || "Failed to submit evaluation");
        }
      } else {
        const data = await response.json();
        
        // Store session ID if not already set
        if (!sessionId && data.sessionId) {
          currentSessionId = data.sessionId;
          setSessionId(data.sessionId);
          localStorage.setItem("eval_session_id", data.sessionId);
        }
      }

      // Update evaluated IDs and save to localStorage
      const newEvaluatedIds = [...evaluatedIds, currentSample.id];
      setEvaluatedIds(newEvaluatedIds);
      localStorage.setItem("eval_evaluated_ids", JSON.stringify(newEvaluatedIds));

      // Reset form and move to next
      setSelectedViolations([]);
      setNotes("");
      
      if (currentIndex < samples.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (newEvaluatedIds.length >= REQUIRED_EVALUATIONS) {
        // Completed all evaluations, go to results
        router.push(`/evaluation/results?sessionId=${currentSessionId}`);
      } else {
        // Need more samples
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      setError("Failed to save evaluation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipToNext = () => {
    if (currentIndex < samples.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedViolations([]);
      setNotes("");
    }
  };

  const handleViewResults = () => {
    router.push(`/evaluation/results?sessionId=${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evaluation samples...</p>
        </div>
      </div>
    );
  }

  if (error && samples.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!currentSample && samples.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">No Samples Available</h2>
          <p className="text-gray-700">
            There are no evaluation samples available at this time. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  const hasImage = currentSample?.imageUrl !== null && currentSample?.imageUrl !== undefined;
  const hasLanding = currentSample?.landingScreenshotUrl !== null && currentSample?.landingScreenshotUrl !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            AI Training
          </h1>
          <p className="text-sm text-gray-600">
            Review each case and select violations you believe should be flagged.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {progress} / {REQUIRED_EVALUATIONS}
            </span>
            <div className="text-xs text-gray-500">
              {sessionId && (
                <HoverCard openDelay={200}>
                  <HoverCardTrigger asChild>
                    <button className="font-mono bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors cursor-help">
                      Session: {sessionId.slice(0, 8)}...
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 bg-white border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Your Session ID:
                        </p>
                        <code className="text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded block break-all">
                          {sessionId}
                        </code>
                        <p className="text-xs text-gray-500 mt-2">
                          Your progress is anonymously saved with this session ID.
                        </p>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <button
                          onClick={() => {
                            if (confirm("Start a new evaluation session? Your current progress will be saved, but you'll begin evaluating new cases.")) {
                              localStorage.removeItem("eval_session_id");
                              localStorage.removeItem("eval_evaluated_ids");
                              window.location.reload();
                            }
                          }}
                          className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                          Start New Session
                        </button>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          {canSubmit && (
            <button
              onClick={handleViewResults}
              className="mt-3 w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 font-medium transition-all shadow-sm"
            >
              ✓ View Results & Complete Evaluation
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Main Content Grid */}
        {currentSample && (
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Left: Case Content with Tabs */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* AI Violations - At Top */}
              <div className="border-b border-gray-200 bg-gray-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    AI-Detected Violations
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">
                    {currentSample.aiViolations.length} found
                  </span>
                </div>
                {currentSample.aiViolations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentSample.aiViolations.map((violation) => (
                      <HoverCard key={violation.code} openDelay={200}>
                        <HoverCardTrigger asChild>
                          <button className="inline-flex items-center bg-white border border-red-200 rounded-lg px-3 py-1.5 text-xs font-medium text-red-800 cursor-help hover:bg-red-50 hover:border-red-300 transition-all duration-200 shadow-sm">
                            <span className="font-semibold">{violation.code}</span>
                            <span className="ml-2 text-red-600 font-normal">
                              {Math.round((violation.confidence || 0) * 100)}%
                            </span>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 bg-gray-900 text-white border-gray-800">
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm">
                              {violation.code}: {violation.title}
                            </h4>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {violation.description || "No description provided"}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">No violations detected</p>
                )}
              </div>

              {/* Tab Bar */}
              <div className="flex border-b bg-gray-50">
                <button
                  onClick={() => setActiveTab("image")}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === "image"
                      ? "bg-white border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  📸 Image
                </button>
                <button
                  onClick={() => setActiveTab("text")}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === "text"
                      ? "bg-white border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  📄 Text
                </button>
                <button
                  onClick={() => setActiveTab("landing")}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === "landing"
                      ? "bg-white border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🌐 Landing
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {activeTab === "image" && (
                  <div>
                    {hasImage ? (
                      <Image
                        src={currentSample.imageUrl}
                        alt="Message screenshot"
                        width={800}
                        height={1000}
                        className="w-full h-auto rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center justify-center bg-gray-100 rounded-lg p-12">
                        <div className="text-center text-gray-400">
                          <svg
                            className="w-16 h-16 mx-auto mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="font-medium">No image available</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "text" && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                      {currentSample.rawText || "(No text extracted)"}
                    </pre>
                  </div>
                )}

                {activeTab === "landing" && (
                  <div>
                    {hasLanding && currentSample.landingScreenshotUrl ? (
                      <div>
                        <Image
                          src={currentSample.landingScreenshotUrl}
                          alt="Landing page screenshot"
                          width={800}
                          height={1000}
                          className="w-full h-auto rounded-lg"
                        />
                        {currentSample.landingUrl && (
                          <a
                            href={currentSample.landingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View live page
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center bg-gray-100 rounded-lg p-12">
                        <div className="text-center text-gray-400">
                          <svg
                            className="w-16 h-16 mx-auto mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                          </svg>
                          <p className="font-medium">No landing page provided</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Evaluation Form */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Your Evaluation</h2>
              
              {/* Violation Grid - More Compact */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {VIOLATION_POLICIES.map((policy) => (
                  <HoverCard key={policy.code} openDelay={300}>
                    <HoverCardTrigger asChild>
                      <button
                        onClick={() => handleToggleViolation(policy.code)}
                        className={`p-2 rounded-lg border text-left transition-all text-xs ${
                          selectedViolations.includes(policy.code)
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-bold text-gray-800">{policy.code}</div>
                        <div className="text-gray-600 leading-tight">{policy.title}</div>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-96 bg-white border-gray-200" side="right">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 mb-1">
                            {policy.code}: {policy.title}
                          </h4>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            ActBlue Policy:
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {policy.policy}
                          </p>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <a
                            href={AUP_HELP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View full ActBlue AUP
                            <svg
                              className="w-3 h-3 ml-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>

              {/* Selected Summary */}
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="text-xs font-semibold text-gray-700 mb-1">
                  Selected ({selectedViolations.length})
                </div>
                {selectedViolations.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedViolations.map((code) => (
                      <span
                        key={code}
                        className="inline-block bg-blue-600 text-white rounded px-2 py-0.5 text-xs font-medium"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">None selected</p>
                )}
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    if (e.target.value.length <= 240) {
                      setNotes(e.target.value);
                    }
                  }}
                  placeholder="Any additional observations..."
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                  rows={3}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {notes.length} / 240
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEvaluation}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {submitting ? "Saving..." : "✓ Save & Next"}
                </button>
                <button
                  onClick={handleSkipToNext}
                  disabled={submitting || currentIndex >= samples.length - 1}
                  className="bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Skip
                </button>
              </div>

              {/* Progress indicator */}
              <div className="mt-3 text-center text-xs text-gray-500">
                Case {currentIndex + 1} of {samples.length} loaded
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
