/**
 * Utility functions for determining submission source badges
 */

export interface SubmissionBadgeInfo {
  messageType?: string | null;
  imageUrl?: string | null;
  senderId?: string | null;
  forwarderEmail?: string | null;
}

/**
 * Determines if a submission was bot-submitted or user-submitted.
 * 
 * Bot submitted: Direct ingestion from Twilio (SMS with sender_id) or email bot (email without forwarder)
 * User submitted: Manual screenshot upload, forwarded emails, or unknown types
 * 
 * @param submission - Submission data with messageType, imageUrl, senderId, forwarderEmail
 * @returns true if bot-submitted, false if user-submitted
 */
export function isBotSubmitted(submission: SubmissionBadgeInfo): boolean {
  const messageType = submission.messageType?.toLowerCase();
  const imageUrl = submission.imageUrl || '';
  
  // If it's a manual upload (screenshot), it's always user-submitted
  const isManualUpload = imageUrl.startsWith('supabase://');
  if (isManualUpload) {
    return false;
  }
  
  // For bot-ingested content:
  // - SMS with sender_id = Twilio bot
  // - Email without forwarder = sent directly to bot email
  return (
    (messageType === 'sms' && !!submission.senderId) ||
    (messageType === 'email' && !submission.forwarderEmail)
  );
}

