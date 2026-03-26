export type Alternative = {
  id: string;
  description: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  description: string;
  alternatives: Alternative[];
  createdAt: string;
  updatedAt: string;
};

export type QuestionInput = {
  description: string;
  alternatives: {
    description: string;
    isCorrect: boolean;
  }[];
};

export type ExamAnswerMode = "LETTERS" | "POWERS_OF_TWO";

export type Exam = {
  id: string;
  title: string;
  subject?: string;
  professor?: string;
  semester?: string;
  metadata?: string;
  questionIds: string[];
  answerMode: ExamAnswerMode;
  createdAt: string;
  updatedAt: string;
};

export type ExamInput = {
  title: string;
  subject?: string;
  professor?: string;
  semester?: string;
  metadata?: string;
  questionIds: string[];
  answerMode: ExamAnswerMode;
};

export type GeneratedExamBatch = {
  batchId: string;
  examId: string;
  count: number;
  outputDir: string;
  pdfFiles: string[];
  answerKeyCsv: string;
};

export type GradingRigorMode = "STRICT" | "PROPORTIONAL";

export type GradingStatus = "VALID" | "INVALID";

export type GradingRow = {
  studentName: string;
  cpf: string;
  testNumber: number;
  perQuestionScores: number[];
  totalScore: number;
  percentage: number;
  status: GradingStatus;
  reason?: string;
};

export type GradingSummary = {
  classAverage: number;
  highestGrade: number;
  lowestGrade: number;
  invalidRowCount: number;
  totalRows: number;
};

export type GradingExecution = {
  examId: string;
  rigorMode: GradingRigorMode;
  executedAt: string;
  rows: GradingRow[];
  summary: GradingSummary;
};
