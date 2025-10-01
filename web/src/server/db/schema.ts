import {
  pgTable,
  uuid,
  timestamp,
  text,
  numeric,
  jsonb,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    uploaderFingerprint: text("uploader_fingerprint"),
    imageUrl: text("image_url").notNull(),
    messageType: text("message_type").default("unknown"), // enum in SQL
    rawText: text("raw_text"),
    senderId: text("sender_id"),
    senderName: text("sender_name"),
    isFundraising: boolean("is_fundraising"),
    links: jsonb("links").$type<Array<{ url: string; domain?: string }>>().default([]),
    redactLevel: text("redact_level").default("default"), // enum in SQL
    aiVersion: text("ai_version"),
    aiConfidence: numeric("ai_confidence", { precision: 3, scale: 2 }),
    emailSubject: text("email_subject"),
    emailBody: text("email_body"),
    isPublic: boolean("public").default(true),
  },
  (table) => {
    return {
      senderIdx: index("submissions_sender_idx").on(table.senderId),
      createdIdx: index("submissions_created_idx").on(table.createdAt),
    };
  }
);

export const violations = pgTable("violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidenceSpans: jsonb("evidence_spans").$type<
    Array<{ text: string; start: number; end: number }>
  >(),
  severity: integer("severity").notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  submissionId: uuid("submission_id"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").notNull(),
    reason: text("reason").notNull(),
    requester: text("requester"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      submissionIdx: index("deletion_requests_submission_idx").on(table.submissionId),
    };
  }
);

export const evaluationBenchmarks = pgTable(
  "evaluation_benchmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").notNull(),
    manualViolations: jsonb("manual_violations").$type<Array<{
      code: string;
      title: string;
      rationale: string;
      severity: number;
      confidence: number;
    }>>().default([]),
    evaluatorNotes: text("evaluator_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      submissionIdx: index("evaluation_benchmarks_submission_idx").on(table.submissionId),
    };
  }
);

