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

/**
 * Get badge styling classes for a violation based on its verification status.
 * 
 * @param actblueVerified - Whether the violation has been verified by ActBlue
 * @returns Object with className and optional title for tooltip
 */
export function getViolationBadgeStyle(actblueVerified?: boolean | null): {
  className: string;
  tooltip?: string;
  prefix?: string;
} {
  if (actblueVerified) {
    return {
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      tooltip: 'ActBlue has reviewed this and does not consider it a violation',
      prefix: '✓ ',
    };
  }
  
  return {
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  };
}

