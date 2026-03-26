import { Router } from "express";
import path from "node:path";
import { generateIndividualTests } from "./generate-tests";
import { exportGradeReportCsv, getLastGradingExecution, gradeExamCsv } from "./grading";
import {
  allQuestionsExist,
  createExam,
  createQuestion,
  deleteExam,
  deleteQuestion,
  getExamById,
  getQuestionsByIds,
  getQuestionById,
  isQuestionUsedByAnyExam,
  listExams,
  listQuestions,
  updateExam,
  updateQuestion,
} from "./store";
import { examSchema, generateTestsSchema, gradeExamsSchema, questionSchema } from "./validation";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/questions", (_req, res) => {
  res.json(listQuestions());
});

router.get("/questions/:id", (req, res) => {
  const question = getQuestionById(req.params.id);
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  return res.json(question);
});

router.post("/questions", (req, res) => {
  const parsed = questionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation error",
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const created = createQuestion(parsed.data);
  return res.status(201).json(created);
});

router.put("/questions/:id", (req, res) => {
  const parsed = questionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation error",
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const updated = updateQuestion(req.params.id, parsed.data);
  if (!updated) {
    return res.status(404).json({ message: "Question not found" });
  }

  return res.json(updated);
});

router.delete("/questions/:id", (req, res) => {
  if (isQuestionUsedByAnyExam(req.params.id)) {
    return res.status(400).json({
      message: "Question is used by an exam",
      issues: ["Question is used by an exam"],
    });
  }

  const deleted = deleteQuestion(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Question not found" });
  }

  return res.status(204).send();
});

router.get("/exams", (_req, res) => {
  res.json(listExams());
});

router.get("/exams/:id", (req, res) => {
  const exam = getExamById(req.params.id);
  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  return res.json(exam);
});

router.post("/exams", (req, res) => {
  const parsed = examSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation error",
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  if (!allQuestionsExist(parsed.data.questionIds)) {
    return res.status(400).json({
      message: "Validation error",
      issues: ["All selected questions must exist"],
    });
  }

  const created = createExam(parsed.data);
  return res.status(201).json(created);
});

router.put("/exams/:id", (req, res) => {
  const parsed = examSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation error",
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  if (!allQuestionsExist(parsed.data.questionIds)) {
    return res.status(400).json({
      message: "Validation error",
      issues: ["All selected questions must exist"],
    });
  }

  const updated = updateExam(req.params.id, parsed.data);
  if (!updated) {
    return res.status(404).json({ message: "Exam not found" });
  }

  return res.json(updated);
});

router.delete("/exams/:id", (req, res) => {
  const deleted = deleteExam(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Exam not found" });
  }

  return res.status(204).send();
});

router.post("/exams/:id/generate-tests", async (req, res) => {
  const parsed = generateTestsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation error",
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const exam = getExamById(req.params.id);
  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  const questions = getQuestionsByIds(exam.questionIds);
  if (questions.length !== exam.questionIds.length) {
    return res.status(400).json({
      message: "Validation error",
      issues: ["Exam contains missing questions"],
    });
  }

  const outputRootDir = path.resolve(process.cwd(), "generated");
  const result = await generateIndividualTests({
    exam,
    questions,
    count: parsed.data.count,
    outputRootDir,
  });

  const baseUrl = `/generated/${result.batchId}`;
  return res.status(201).json({
    batchId: result.batchId,
    examId: result.examId,
    count: result.count,
    files: {
      pdfs: result.pdfFiles.map((fileName) => `${baseUrl}/${fileName}`),
      answerKeyCsv: `${baseUrl}/${result.answerKeyCsv}`,
    },
  });
});

router.post("/exams/:id/grade", (req, res) => {
  const parsed = gradeExamsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation error",
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const exam = getExamById(req.params.id);
  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  const questions = getQuestionsByIds(exam.questionIds);
  if (questions.length !== exam.questionIds.length) {
    return res.status(400).json({
      message: "Validation error",
      issues: ["Exam contains missing questions"],
    });
  }

  try {
    const execution = gradeExamCsv({
      exam,
      questions,
      answerKeyCsv: parsed.data.answerKeyCsv,
      studentResponsesCsv: parsed.data.studentResponsesCsv,
      rigorMode: parsed.data.rigorMode,
    });

    return res.status(200).json({
      examId: execution.examId,
      rigorMode: execution.rigorMode,
      executedAt: execution.executedAt,
      summary: execution.summary,
      rows: execution.rows,
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Could not grade exam",
      issues: [error instanceof Error ? error.message : "Could not grade exam"],
    });
  }
});

router.post("/exams/:id/grade-report", (req, res) => {
  const exam = getExamById(req.params.id);
  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  const execution = getLastGradingExecution(exam.id);
  if (!execution) {
    return res.status(400).json({
      message: "No grading execution found for exam",
      issues: ["Run grading before requesting class report export"],
    });
  }

  const outputRootDir = path.resolve(process.cwd(), "generated");
  const exportResult = exportGradeReportCsv({
    exam,
    execution,
    outputRootDir,
  });

  return res.status(201).json({
    reportUrl: exportResult.relativeUrl,
    summary: execution.summary,
    columns: ["studentName", "cpf", "testNumber", "totalScore", "percentage", "status"],
    rowCount: execution.rows.length,
  });
});
