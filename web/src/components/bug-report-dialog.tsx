"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type BugReportDialogProps = {
  children: React.ReactNode;
  type?: "bug" | "feature";
};

export function BugReportDialog({ children, type = "bug" }: BugReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Upload screenshot if provided
      let screenshotUrl = "";
      if (screenshot) {
        const formData = new FormData();
        formData.append("file", screenshot);
        formData.append("type", type);

        const uploadResponse = await fetch("/api/upload-bug-screenshot", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload screenshot");
        }

        const uploadData = await uploadResponse.json();
        screenshotUrl = uploadData.url;
      }

      const response = await fetch("/api/create-github-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          screenshotUrl,
          type,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setTitle("");
        setDescription("");
        setScreenshot(null);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {type === "bug" ? "Report a Bug" : "Request a Feature"}
            </DialogTitle>
            <DialogDescription>
              {type === "bug"
                ? "Found something broken? Let us know and we'll fix it."
                : "Have an idea to improve AB Jail? We'd love to hear it."}
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-8 text-center">
              <div className="mb-2 text-4xl">✅</div>
              <p className="text-slate-900 font-medium">
                Thanks! Your {type === "bug" ? "bug report" : "feature request"} has been submitted.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium text-slate-900">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder={
                    type === "bug"
                      ? "Brief description of the bug"
                      : "Brief description of the feature"
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium text-slate-900">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[120px]"
                  placeholder={
                    type === "bug"
                      ? "Steps to reproduce:\n1. Go to...\n2. Click on...\n3. See error\n\nExpected behavior:\nWhat should happen\n\nActual behavior:\nWhat actually happens"
                      : "Describe the feature you'd like to see and how it would help you..."
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="screenshot" className="text-sm font-medium text-slate-900">
                  Screenshot <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <div className="space-y-2">
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          setError("Image must be less than 5MB");
                          e.target.value = "";
                        } else {
                          setScreenshot(file);
                          setError("");
                        }
                      }
                    }}
                    className="w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-900 hover:file:bg-slate-200 file:cursor-pointer"
                  />
                  {screenshot && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>📎 {screenshot.name}</span>
                      <button
                        type="button"
                        onClick={() => setScreenshot(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {!success && (
            <DialogFooter>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

