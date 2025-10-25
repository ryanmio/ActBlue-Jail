/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PIIDetectionResult {
  name: string | null;
  email: string | null;
  confidence: number;
  notes?: string;
}

/**
 * Detect submitter's PII (name and email) from message content using AI.
 * Uses text analysis to identify the person who forwarded/submitted the message.
 */
export async function detectPII(
  rawText: string,
  emailFrom?: string | null
): Promise<PIIDetectionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("detectPII:no_api_key");
    return {
      name: null,
      email: null,
      confidence: 0,
      notes: "No API key available",
    };
  }

  const model = "gpt-5-mini-2025-08-07";
  
  const system = `You are identifying PERSONAL INFORMATION (name and email) that should be redacted from a political fundraising message.

Your task: Find any personalized recipient information (name and/or email address) that appears in the message content.

Look for:
- Personalized greetings: "Hi Ryan", "Dear Ryan Mioduski"
- Personalized content: "NAME: Ryan Mioduski", "FOR: Ryan Mioduski", "Match offer for Ryan Mioduski"
- Direct address in subject/body: "Your 600% match, Ryan"
- Personal email addresses mentioned in the content (not org emails)
- "From:" header lines with personal emails (gmail.com, outlook.com, yahoo.com, etc.) in forwarded messages

Return the EXACT strings that should be redacted (the full name as it appears, the email as it appears).

DO NOT extract:
- Organization names
- Political candidate names being discussed
- PAC/committee names
- Organization email addresses (like @dccc.org, @actblue.com, @democraticvictoryfund.org)
- Generic greetings without names ("Hi there", "Dear Friend", "Dear Democrat")

Return STRICT JSON only (no markdown):
{
  "name": string | null,
  "email": string | null,
  "confidence": <number between 0 and 1>,
  "notes": "<brief explanation of what you found>"
}

Examples:
- Input: "NAME: Ryan Mioduski\n4X-MATCH YOUR $6" → {"name": "Ryan Mioduski", "email": null, "confidence": 0.95}
- Input: "Hi Ryan,\nYour match is unlocked!" → {"name": "Ryan", "email": null, "confidence": 0.85}
- Input: "From: John Smith <john@gmail.com>" → {"name": "John Smith", "email": "john@gmail.com", "confidence": 0.9}
- Input: "Paid for by Democratic Victory Fund" → {"name": null, "email": null, "confidence": 0.9, "notes": "No personal info"}

Be conservative with confidence. Only return high confidence (≥0.7) when you find clear personalized content or personal email addresses.`;

  type Message = { role: "system" | "user"; content: string };
  
  // Build message text
  let messageText = "";
  if (emailFrom) {
    messageText += `From: ${emailFrom}\n\n`;
  }
  messageText += String(rawText || "").trim() || "(none)";
  
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: messageText },
  ];

  try {
    console.log("detectPII:calling_openai", { 
      model, 
      textLength: messageText.length,
      hasEmailFrom: !!emailFrom,
    });
    
    const startTime = Date.now();
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${apiKey}` 
      },
      body: JSON.stringify({ 
        model, 
        messages,
        reasoning_effort: "low",
        verbosity: "low",
      }),
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!resp.ok) {
      const errorBody = await resp.json().catch(() => null);
      console.error("detectPII:openai_failed", { 
        status: resp.status, 
        elapsed,
        error: errorBody,
      });
      
      return {
        name: null,
        email: null,
        confidence: 0,
        notes: `OpenAI API failed with status ${resp.status}`,
      };
    }
    
    const json = await resp.json();
    const content = (json as any)?.choices?.[0]?.message?.content?.trim() || "{}";
    
    try {
      const parsed = JSON.parse(content);
      
      console.log("detectPII:success", {
        elapsed,
        hasName: !!parsed.name,
        hasEmail: !!parsed.email,
        confidence: parsed.confidence,
      });
      
      return {
        name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : null,
        email: typeof parsed.email === "string" && parsed.email.trim() ? parsed.email.trim() : null,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
      };
    } catch (parseError) {
      console.warn("detectPII:parse_failed", { content, error: String(parseError) });
      
      return {
        name: null,
        email: null,
        confidence: 0,
        notes: "Failed to parse AI response",
      };
    }
  } catch (error) {
    const errorMsg = String(error);
    console.warn("detectPII:error", { error: errorMsg });
    
    return {
      name: null,
      email: null,
      confidence: 0,
      notes: errorMsg.includes("abort") ? "Request timeout" : "Network error",
    };
  }
}

