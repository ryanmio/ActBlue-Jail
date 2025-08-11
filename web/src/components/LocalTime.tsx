'use client';

import { useEffect, useMemo, useState } from 'react';

type LocalTimeProps = {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
};

/**
 * Renders a timestamp in the user's local timezone using Intl.DateTimeFormat.
 * Uses client-side rendering to avoid server timezone differences. Suppresses
 * hydration warnings since the server cannot know the user's timezone.
 */
export default function LocalTime({ iso, options, className }: LocalTimeProps) {
  const [text, setText] = useState<string>('');

  const fmtOptions = useMemo<Intl.DateTimeFormatOptions>(() => {
    return (
      options || {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }
    );
  }, [options]);

  useEffect(() => {
    try {
      // Normalize to strict ISO 8601 for Safari and others: ensure 'T' separator
      const withT = iso.trim().replace(' ', 'T');
      // If no timezone info present, assume UTC to avoid shifting on parse
      const hasZone = /Z|[+-]\d{2}:?\d{2}$/.test(withT);
      const normalized = hasZone ? withT : `${withT}Z`;
      const date = new Date(normalized);
      const formatter = new Intl.DateTimeFormat(undefined, fmtOptions);
      setText(formatter.format(date));
    } catch {
      setText('');
    }
  }, [iso, fmtOptions]);

  return (
    <time className={className} dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}


