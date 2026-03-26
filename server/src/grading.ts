import fs from "node:fs";
import path from "node:path";
import { Exam, GradingExecution, GradingRigorMode, GradingRow, GradingSummary, Question } from "./types";

type ParsedCsv = {
  rows: string[][];
};

type StudentCsvColumns = {
  studentNameIndex: number;
  cpfIndex: number;
  testNumberIndex: number;
  answerIndexes: number[];
};

const gradingExecutionsByExamId = new Map<string, GradingExecution>();

function parseCsvLine(line: string): string[] {
  // Accept common spreadsheet paste formats: TSV and semicolon-delimited CSV.
  if (!line.includes(",") && line.includes("\t")) {
    return line.split("\t").map((value) => value.trim());
  }

  if (!line.includes(",") && line.includes(";")) {
    return line.split(";").map((value) => value.trim());
  }

  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if ((char === "," || char === ";") && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(input: string): ParsedCsv {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    rows: lines.map(parseCsvLine),
  };
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findHeaderIndex(normalizedHeaders: string[], aliases: string[]): number {
  return normalizedHeaders.findIndex((header) => aliases.includes(header));
}

function parseAnswerColumns(headers: string[], questionCount: number): number[] {
  const candidates = headers
    .map((header, index) => {
      const normalized = normalizeHeader(header);
      const match = normalized.match(/^q(\d+)(answer)?$/);
      if (!match) {
        return null;
      }

      return {
        index,
        questionNumber: Number(match[1]),
      };
    })
    .filter((candidate): candidate is { index: number; questionNumber: number } => Boolean(candidate))
    .sort((a, b) => a.questionNumber - b.questionNumber);

  if (candidates.length !== questionCount) {
    throw new Error("Student responses do not match exam question count");
  }

  return candidates.map((candidate) => candidate.index);
}

function parseStudentCsvColumns(headerRow: string[], questionCount: number): StudentCsvColumns {
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const studentNameIndex = findHeaderIndex(normalizedHeaders, [
    "studentname",
    "name",
    "aluno",
    "nome",
    "nomedoaluno",
  ]);
  const cpfIndex = findHeaderIndex(normalizedHeaders, ["cpf"]);
  const testNumberIndex = findHeaderIndex(normalizedHeaders, [
    "testnumber",
    "testid",
    "examnumber",
    "examid",
    "numerodaprova",
    "numeroprova",
    "provanumero",
    "provaid",
    "prova",
  ]);

  const expectedHeaderExample =
    "studentName,cpf,testNumber," +
    Array.from({ length: questionCount }, (_, index) => `q${index + 1}Answer`).join(",");

  if (studentNameIndex < 0) {
    throw new Error(
      `Missing required column: studentName. Expected header format: ${expectedHeaderExample}`,
    );
  }

  if (cpfIndex < 0) {
    throw new Error(`Missing required column: cpf. Expected header format: ${expectedHeaderExample}`);
  }

  if (testNumberIndex < 0) {
    throw new Error(
      `Missing required column: testNumber. Expected header format: ${expectedHeaderExample}`,
    );
  }

  const answerIndexes = parseAnswerColumns(headerRow, questionCount);

  return {
    studentNameIndex,
    cpfIndex,
    testNumberIndex,
    answerIndexes,
  };
}

function parseAnswerKeyCsv(answerKeyCsv: string, questionCount: number): Map<number, string[]> {
  const parsed = parseCsv(answerKeyCsv);
  const keyByTestNumber = new Map<number, string[]>();

  for (const row of parsed.rows) {
    if (row.length !== questionCount + 1) {
      throw new Error("Answer key does not match exam question count");
    }

    const testNumber = Number(row[0]);
    if (!Number.isInteger(testNumber) || testNumber <= 0) {
      throw new Error("Answer key has invalid test number");
    }

    keyByTestNumber.set(testNumber, row.slice(1));
  }

  return keyByTestNumber;
}

function cpfIsValid(cpf: string): boolean {
  return /^\d{11}$/.test(cpf.trim());
}

function expectedSetForQuestion(answerKeyToken: string, question: Question, mode: Exam["answerMode"]): Set<number> {
  if (mode === "LETTERS") {
    const set = new Set<number>();
    const normalized = answerKeyToken.toUpperCase();

    for (let index = 0; index < question.alternatives.length; index += 1) {
      const letter = String.fromCharCode(65 + index);
      if (normalized.includes(letter)) {
        set.add(index);
      }
    }

    return set;
  }

  const numeric = Number(answerKeyToken);
  const set = new Set<number>();

  if (!Number.isFinite(numeric) || numeric < 0) {
    return set;
  }

  let remaining = Math.floor(numeric);
  for (let index = question.alternatives.length - 1; index >= 0; index -= 1) {
    const value = 2 ** index;
    if (remaining >= value) {
      set.add(index);
      remaining -= value;
    }
  }

  return set;
}

function studentSetForQuestion(answerToken: string, question: Question, mode: Exam["answerMode"]): Set<number> {
  return expectedSetForQuestion(answerToken, question, mode);
}

function strictScore(
  answerKeyToken: string,
  studentToken: string,
  question: Question,
  mode: Exam["answerMode"],
): number {
  const expected = expectedSetForQuestion(answerKeyToken, question, mode);
  const actual = studentSetForQuestion(studentToken, question, mode);

  if (expected.size !== actual.size) {
    return 0;
  }

  for (const expectedIndex of expected) {
    if (!actual.has(expectedIndex)) {
      return 0;
    }
  }

  return 1;
}

function proportionalScore(
  answerKeyToken: string,
  studentToken: string,
  question: Question,
  mode: Exam["answerMode"],
): number {
  const expected = expectedSetForQuestion(answerKeyToken, question, mode);
  const actual = studentSetForQuestion(studentToken, question, mode);

  const totalAlternatives = question.alternatives.length;
  if (totalAlternatives === 0) {
    return 0;
  }

  let correctDecisions = 0;
  for (let index = 0; index < totalAlternatives; index += 1) {
    const expectedSelected = expected.has(index);
    const actualSelected = actual.has(index);
    if (expectedSelected === actualSelected) {
      correctDecisions += 1;
    }
  }

  return correctDecisions / totalAlternatives;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSummary(rows: GradingRow[]): GradingSummary {
  const validRows = rows.filter((row) => row.status === "VALID");
  const invalidRowCount = rows.length - validRows.length;

  if (validRows.length === 0) {
    return {
      classAverage: 0,
      highestGrade: 0,
      lowestGrade: 0,
      invalidRowCount,
      totalRows: rows.length,
    };
  }

  const totals = validRows.map((row) => row.totalScore);
  const classAverage = totals.reduce((sum, total) => sum + total, 0) / totals.length;

  return {
    classAverage: round(classAverage),
    highestGrade: round(Math.max(...totals)),
    lowestGrade: round(Math.min(...totals)),
    invalidRowCount,
    totalRows: rows.length,
  };
}

export function gradeExamCsv(params: {
  exam: Exam;
  questions: Question[];
  answerKeyCsv: string;
  studentResponsesCsv: string;
  rigorMode: GradingRigorMode;
}): GradingExecution {
  const { exam, questions, answerKeyCsv, studentResponsesCsv, rigorMode } = params;

  const answerKeys = parseAnswerKeyCsv(answerKeyCsv, questions.length);

  const parsedStudents = parseCsv(studentResponsesCsv);
  if (parsedStudents.rows.length < 2) {
    throw new Error("Student responses CSV must include header and at least one row");
  }

  const [headerRow, ...dataRows] = parsedStudents.rows;
  const columns = parseStudentCsvColumns(headerRow, questions.length);

  const rows: GradingRow[] = dataRows.map((row) => {
    const studentName = row[columns.studentNameIndex] ?? "";
    const cpf = row[columns.cpfIndex] ?? "";
    const testNumber = Number(row[columns.testNumberIndex]);

    if (!Number.isInteger(testNumber) || testNumber <= 0) {
      return {
        studentName,
        cpf,
        testNumber: 0,
        perQuestionScores: new Array(questions.length).fill(0),
        totalScore: 0,
        percentage: 0,
        status: "INVALID",
        reason: "Invalid test number",
      };
    }

    if (!cpfIsValid(cpf)) {
      return {
        studentName,
        cpf,
        testNumber,
        perQuestionScores: new Array(questions.length).fill(0),
        totalScore: 0,
        percentage: 0,
        status: "INVALID",
        reason: "Invalid CPF format",
      };
    }

    const expectedAnswers = answerKeys.get(testNumber);
    if (!expectedAnswers) {
      return {
        studentName,
        cpf,
        testNumber,
        perQuestionScores: new Array(questions.length).fill(0),
        totalScore: 0,
        percentage: 0,
        status: "INVALID",
        reason: "Unknown test number",
      };
    }

    const perQuestionScores = columns.answerIndexes.map((answerIndex, questionIndex) => {
      const studentToken = (row[answerIndex] ?? "").trim();
      const answerKeyToken = (expectedAnswers[questionIndex] ?? "").trim();
      const question = questions[questionIndex];

      if (rigorMode === "STRICT") {
        return strictScore(answerKeyToken, studentToken, question, exam.answerMode);
      }

      return proportionalScore(answerKeyToken, studentToken, question, exam.answerMode);
    });

    const totalScore = round(perQuestionScores.reduce((sum, score) => sum + score, 0));
    const percentage = round((totalScore / questions.length) * 100);

    return {
      studentName,
      cpf,
      testNumber,
      perQuestionScores,
      totalScore,
      percentage,
      status: "VALID",
    };
  });

  const execution: GradingExecution = {
    examId: exam.id,
    rigorMode,
    executedAt: new Date().toISOString(),
    rows,
    summary: buildSummary(rows),
  };

  gradingExecutionsByExamId.set(exam.id, execution);
  return execution;
}

export function getLastGradingExecution(examId: string): GradingExecution | undefined {
  return gradingExecutionsByExamId.get(examId);
}

export function exportGradeReportCsv(params: {
  exam: Exam;
  execution: GradingExecution;
  outputRootDir: string;
}): { filePath: string; relativeUrl: string } {
  const { exam, execution, outputRootDir } = params;

  const dir = path.join(outputRootDir, "grade-reports");
  fs.mkdirSync(dir, { recursive: true });

  const fileName = `${exam.id}-${Date.now()}-report.csv`;
  const filePath = path.join(dir, fileName);

  const header = ["studentName", "cpf", "testNumber", "totalScore", "percentage", "status"].join(",",
  );

  const lines = execution.rows.map((row) =>
    [row.studentName, row.cpf, String(row.testNumber), String(row.totalScore), String(row.percentage), row.status]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  fs.writeFileSync(filePath, `${header}\n${lines.join("\n")}\n`, "utf8");

  return {
    filePath,
    relativeUrl: `/generated/grade-reports/${fileName}`,
  };
}
