import { z } from "zod";

const alternativeSchema = z.object({
  description: z.string().trim().min(1, "Alternative description is required"),
  isCorrect: z.boolean(),
});

export const questionSchema = z.object({
  description: z.string().trim().min(1, "Question description is required"),
  alternatives: z.array(alternativeSchema).min(1, "At least one alternative is required"),
});

export type QuestionSchemaInput = z.infer<typeof questionSchema>;

export const examSchema = z.object({
  title: z.string().trim().min(1, "Exam title is required"),
  subject: z.string().trim().optional(),
  professor: z.string().trim().optional(),
  semester: z.string().trim().optional(),
  metadata: z.string().trim().optional(),
  questionIds: z
    .array(z.string().trim().min(1, "Invalid question id"))
    .min(1, "At least one registered question must be selected"),
  answerMode: z.enum(["LETTERS", "POWERS_OF_TWO"]),
});

export type ExamSchemaInput = z.infer<typeof examSchema>;

export const generateTestsSchema = z.object({
  count: z.number().int().min(1, "Count must be at least 1").max(500, "Count must be at most 500"),
});

export type GenerateTestsSchemaInput = z.infer<typeof generateTestsSchema>;

export const gradeExamsSchema = z.object({
  rigorMode: z.enum(["STRICT", "PROPORTIONAL"]),
  answerKeyCsv: z.string().min(1, "Answer key CSV is required"),
  studentResponsesCsv: z.string().min(1, "Student responses CSV is required"),
});

export type GradeExamsSchemaInput = z.infer<typeof gradeExamsSchema>;
