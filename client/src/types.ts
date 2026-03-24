export type AlternativeInput = {
  description: string;
  isCorrect: boolean;
};

export type QuestionInput = {
  description: string;
  alternatives: AlternativeInput[];
};

export type Alternative = AlternativeInput & {
  id: string;
};

export type Question = {
  id: string;
  description: string;
  alternatives: Alternative[];
  createdAt: string;
  updatedAt: string;
};

export type ExamAnswerMode = "LETTERS" | "POWERS_OF_TWO";

export type ExamInput = {
  title: string;
  subject?: string;
  professor?: string;
  semester?: string;
  metadata?: string;
  questionIds: string[];
  answerMode: ExamAnswerMode;
};

export type Exam = ExamInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedTestsResult = {
  batchId: string;
  examId: string;
  count: number;
  files: {
    pdfs: string[];
    answerKeyCsv: string;
  };
};
