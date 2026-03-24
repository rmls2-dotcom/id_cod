import { Exam, ExamInput, Question, QuestionInput } from "./types";

const questions: Question[] = [];
const exams: Exam[] = [];

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listQuestions(): Question[] {
  return questions;
}

export function getQuestionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function createQuestion(input: QuestionInput): Question {
  const timestamp = nowIso();

  const question: Question = {
    id: nextId("q"),
    description: input.description,
    alternatives: input.alternatives.map((alt) => ({
      id: nextId("alt"),
      description: alt.description,
      isCorrect: alt.isCorrect,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  questions.push(question);
  return question;
}

export function updateQuestion(id: string, input: QuestionInput): Question | undefined {
  const question = getQuestionById(id);
  if (!question) {
    return undefined;
  }

  question.description = input.description;
  question.alternatives = input.alternatives.map((alt) => ({
    id: nextId("alt"),
    description: alt.description,
    isCorrect: alt.isCorrect,
  }));
  question.updatedAt = nowIso();

  return question;
}

export function deleteQuestion(id: string): boolean {
  const index = questions.findIndex((q) => q.id === id);
  if (index < 0) {
    return false;
  }

  questions.splice(index, 1);
  return true;
}

export function isQuestionUsedByAnyExam(questionId: string): boolean {
  return exams.some((exam) => exam.questionIds.includes(questionId));
}

export function listExams(): Exam[] {
  return exams;
}

export function getExamById(id: string): Exam | undefined {
  return exams.find((exam) => exam.id === id);
}

export function allQuestionsExist(questionIds: string[]): boolean {
  return questionIds.every((questionId) => questions.some((question) => question.id === questionId));
}

export function createExam(input: ExamInput): Exam {
  const timestamp = nowIso();

  const exam: Exam = {
    id: nextId("exam"),
    title: input.title,
    subject: input.subject,
    professor: input.professor,
    semester: input.semester,
    metadata: input.metadata,
    questionIds: input.questionIds,
    answerMode: input.answerMode,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  exams.push(exam);
  return exam;
}

export function updateExam(id: string, input: ExamInput): Exam | undefined {
  const exam = getExamById(id);
  if (!exam) {
    return undefined;
  }

  exam.title = input.title;
  exam.subject = input.subject;
  exam.professor = input.professor;
  exam.semester = input.semester;
  exam.metadata = input.metadata;
  exam.questionIds = input.questionIds;
  exam.answerMode = input.answerMode;
  exam.updatedAt = nowIso();

  return exam;
}

export function deleteExam(id: string): boolean {
  const index = exams.findIndex((exam) => exam.id === id);
  if (index < 0) {
    return false;
  }

  exams.splice(index, 1);
  return true;
}

export function getQuestionsByIds(questionIds: string[]): Question[] {
  return questionIds
    .map((questionId) => getQuestionById(questionId))
    .filter((question): question is Question => Boolean(question));
}
