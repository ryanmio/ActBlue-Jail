import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  screenshotUrl: z.string().url().optional().or(z.literal("")),
  type: z.enum(["bug", "feature"]).default("bug"),
});

export async function POST(req: NextRequest) {
  try {
    // Get GitHub token from environment
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error("GITHUB_TOKEN not configured");
      return NextResponse.json(
        { error: "GitHub integration not configured" },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { title, description, screenshotUrl, type } = RequestSchema.parse(body);

    // Build issue body
    let issueBody = description;
    if (screenshotUrl) {
      issueBody += `\n\n### Screenshot\n![screenshot](${screenshotUrl})`;
    }
    issueBody += `\n\n---\n*Submitted via AB Jail bug report form*`;

    // Determine labels
    const labels = type === "bug" ? ["bug", "from-app"] : ["enhancement", "from-app"];

    // Create GitHub issue
    const response = await fetch(
      "https://api.github.com/repos/ryanmio/ActBlue-Jail/issues",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          title,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("GitHub API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create GitHub issue" },
        { status: response.status }
      );
    }

    const issue = await response.json();

    return NextResponse.json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    });
  } catch (error) {
    console.error("Error creating GitHub issue:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

