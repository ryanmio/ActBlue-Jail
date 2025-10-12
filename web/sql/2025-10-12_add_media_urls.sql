-- Add media_urls field to store SMS/MMS media attachments from Twilio
-- Stores array of media URLs (e.g., image/video attachments from text messages)

alter table submissions
add column if not exists media_urls jsonb default '[]'::jsonb;

comment on column submissions.media_urls is 'Array of media attachment URLs from SMS/MMS (e.g., images sent via text message)';

