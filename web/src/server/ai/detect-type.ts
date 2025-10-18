/* eslint-disable @typescript-eslint/no-explicit-any */

export type MessageType = "sms" | "email" | "web" | "social" | "other" | "unknown";

export interface TypeDetectionResult {
  type: MessageType;
  confidence: number;
  rationale?: string;
  usedModel: boolean;
}

/**
 * Detect screenshot type using AI vision model.
 * Fast, cheap, and safe - designed for the OCR pipeline.
 */
export async function detectScreenshotType(
  imageDataUrl: string,
  timeoutMs?: number // Optional timeout; omit for no timeout (recommended for GPT-5)
): Promise<TypeDetectionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // If no API key, return unknown
  if (!apiKey) {
    console.warn("/api/ocr:type_detection:no_api_key");
    return {
      type: "unknown",
      confidence: 0,
      rationale: "No API key available",
      usedModel: false,
    };
  }
  
  console.log("/api/ocr:type_detection:api_key_present", { 
    keyPrefix: apiKey.substring(0, 7),
    keyLength: apiKey.length,
  });

  const model = "gpt-5-mini-2025-08-07";
  
  const system = `You are classifying the medium/type of a screenshot by visually analyzing the image.

Your task: Determine if this is an SMS message, email, web page, social media post, or other type.

Classification types:
- "sms": Text message screenshot (SMS/MMS, iMessage, messaging apps)
- "email": Email screenshot (inbox, email client, webmail)
- "web": Web page or website screenshot
- "social": Social media post (Twitter/X, Facebook, Instagram, etc.)
- "other": Other type of screenshot
- "unknown": Cannot determine with confidence

Visual indicators to look for:
- SMS: Phone UI elements (signal bars, battery, time at top), message bubbles, "Reply STOP" or "Stop to end", phone numbers, messaging app interface
- Email: Subject line, From/To/Cc fields, email addresses, inbox/folder UI, reply/forward buttons, email client branding (Gmail, Outlook, etc.)
- Web: Browser UI (address bar, tabs, back/forward buttons), URL visible, website navigation menus, typical web page layout
- Social: Platform branding (Twitter/X, Facebook, Instagram logos), likes/shares/retweets, profile pictures, @username handles, comment threads

Return STRICT JSON only (no markdown):
{
  "type": "sms" | "email" | "web" | "social" | "other" | "unknown",
  "confidence": <number between 0 and 1>,
  "rationale": "<brief explanation of what you see>"
}

Be conservative with confidence. Only use high confidence (≥0.7) when visual indicators are clear and unambiguous.`;

  type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
  type Message = { role: "system" | "user"; content: string | ContentPart[] };
  
  // Send only the image - the vision model can see everything
  const userContent: ContentPart[] = [
    { type: "image_url", image_url: { url: imageDataUrl } }
  ];
  
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
  
  try {
    const controller = new AbortController();
    const timeout = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    
    const requestBody = { 
      model, 
      messages,
      reasoning_effort: "low",
      verbosity: "low",
    };
    
    console.log("/api/ocr:type_detection:calling_openai", { 
      model, 
      messageCount: messages.length,
      hasTimeout: !!timeoutMs,
    });
    
    const startTime = Date.now();
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${apiKey}` 
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    if (timeout) clearTimeout(timeout);
    const elapsed = Date.now() - startTime;
    
    if (!resp.ok) {
      const errorBody = await resp.json().catch(() => null);
      console.error("/api/ocr:type_detection:openai_failed", { 
        status: resp.status, 
        elapsed,
        error: errorBody,
        model,
      });
      
      return {
        type: "unknown",
        confidence: 0,
        rationale: `OpenAI API failed with status ${resp.status}`,
        usedModel: false,
      };
    }
    
    const json = await resp.json();
    const content = (json as any)?.choices?.[0]?.message?.content?.trim() || "{}";
    
    try {
      const parsed = JSON.parse(content);
      const type = ["sms", "email", "web", "social", "other", "unknown"].includes(parsed.type)
        ? parsed.type
        : "unknown";
      const confidence = typeof parsed.confidence === "number" 
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0;
      const rationale = typeof parsed.rationale === "string" ? parsed.rationale : undefined;
      
      return {
        type,
        confidence,
        rationale,
        usedModel: true,
      };
    } catch (parseError) {
      console.warn("/api/ocr:type_detection:parse_failed", { content, error: String(parseError) });
      
      return {
        type: "unknown",
        confidence: 0,
        rationale: "Failed to parse AI response",
        usedModel: false,
      };
    }
  } catch (error) {
    const errorMsg = String(error);
    console.warn("/api/ocr:type_detection:error", { error: errorMsg });
    
    return {
      type: "unknown",
      confidence: 0,
      rationale: errorMsg.includes("abort") ? "Request timeout" : "Network error",
      usedModel: false,
    };
  }
}

