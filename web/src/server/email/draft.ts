export interface EmailDraftInput {
  siteUrl: string;
  submission: { id: string; message_type?: string | null; sender_id?: string | null; sender_name?: string | null; raw_text?: string | null; links?: Array<{ url: string; domain?: string }>|null };
  violations: Array<{ code: string; title: string; description?: string|null }>;
}

export function createEmailDraft(_input: EmailDraftInput): { subject: string; body: string } {
  return { subject: "", body: "" };
}
