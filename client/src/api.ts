import type {
  Exam,
  ExamInput,
  GeneratedTestsResult,
  GradeExamResult,
  GradeReportResult,
  GradingRigorMode,
  Question,
  QuestionInput,
} from "./types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed";

    try {
      const body = await response.json();
      if (Array.isArray(body?.issues) && body.issues.length > 0) {
        message = body.issues.join(", ");
      } else if (typeof body?.message === "string") {
        message = body.message;
      }
    } catch {
      // Keep default message when response body is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listQuestions(): Promise<Question[]> {
  const response = await fetch(`${API_BASE_URL}/questions`);
  return parseResponse<Question[]>(response);
}

export async function createQuestion(input: QuestionInput): Promise<Question> {
  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<Question>(response);
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<Question> {
  const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<Question>(response);
}

export async function deleteQuestion(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: "DELETE",
  });

  await parseResponse<void>(response);
}

export async function listExams(): Promise<Exam[]> {
  const response = await fetch(`${API_BASE_URL}/exams`);
  return parseResponse<Exam[]>(response);
}

export async function createExam(input: ExamInput): Promise<Exam> {
  const response = await fetch(`${API_BASE_URL}/exams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<Exam>(response);
}

export async function updateExam(id: string, input: ExamInput): Promise<Exam> {
  const response = await fetch(`${API_BASE_URL}/exams/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<Exam>(response);
}

export async function deleteExam(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/exams/${id}`, {
    method: "DELETE",
  });

  await parseResponse<void>(response);
}

export async function generateExamTests(examId: string, count: number): Promise<GeneratedTestsResult> {
  const response = await fetch(`${API_BASE_URL}/exams/${examId}/generate-tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });

  return parseResponse<GeneratedTestsResult>(response);
}

export async function gradeExam(params: {
  examId: string;
  rigorMode: GradingRigorMode;
  answerKeyCsv: string;
  studentResponsesCsv: string;
}): Promise<GradeExamResult> {
  const response = await fetch(`${API_BASE_URL}/exams/${params.examId}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rigorMode: params.rigorMode,
      answerKeyCsv: params.answerKeyCsv,
      studentResponsesCsv: params.studentResponsesCsv,
    }),
  });

  return parseResponse<GradeExamResult>(response);
}

export async function exportGradeReport(examId: string): Promise<GradeReportResult> {
  const response = await fetch(`${API_BASE_URL}/exams/${examId}/grade-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  return parseResponse<GradeReportResult>(response);
}
