import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const noteSchema = z.object({
  note: z.string(),
  time: z.number(),
  duration: z.number().optional(),
  velocity: z.number().optional(),
});

export const chordSchema = z.object({
  notes: z.array(z.string()),
  name: z.string(),
  time: z.number(),
  duration: z.number().optional(),
});

export const strudelCodeSchema = z.object({
  melody: z.string(),
  chords: z.string(),
  combined: z.string(),
});

export const analysisResultSchema = z.object({
  melody: z.array(noteSchema),
  chords: z.array(chordSchema),
  strudelCode: strudelCodeSchema,
  duration: z.number(),
  sampleRate: z.number(),
  detectedKey: z.string().optional(),
  estimatedTempo: z.number().optional(),
  waveformData: z.array(z.number()).optional(),
});

export const processingStatusSchema = z.object({
  step: z.enum(["uploading", "decoding", "analyzing", "detecting", "generating", "complete"]),
  progress: z.number().min(0).max(100),
  message: z.string(),
});

export type Note = z.infer<typeof noteSchema>;
export type Chord = z.infer<typeof chordSchema>;
export type StrudelCode = z.infer<typeof strudelCodeSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;

export const uploadAudioSchema = z.object({
  file: z.instanceof(File),
});

export type UploadAudio = z.infer<typeof uploadAudioSchema>;
