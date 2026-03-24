import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { Exam, ExamAnswerMode, GeneratedExamBatch, Question } from "./types";

type AlternativeVariant = {
  description: string;
  isCorrect: boolean;
};

type QuestionVariant = {
  description: string;
  alternatives: AlternativeVariant[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function labelForIndex(index: number, mode: ExamAnswerMode): string {
  if (mode === "LETTERS") {
    return String.fromCharCode(65 + index);
  }

  return String(2 ** index);
}

function answerForQuestion(question: QuestionVariant, mode: ExamAnswerMode): string {
  if (mode === "LETTERS") {
    return question.alternatives
      .map((alternative, index) => ({
        mark: alternative.isCorrect,
        label: labelForIndex(index, mode),
      }))
      .filter((entry) => entry.mark)
      .map((entry) => entry.label)
      .join("");
  }

  const sum = question.alternatives.reduce((accumulator, alternative, index) => {
    if (!alternative.isCorrect) {
      return accumulator;
    }

    return accumulator + Number(labelForIndex(index, mode));
  }, 0);

  return String(sum);
}

function ensureDirExists(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFooterOnAllPages(doc: InstanceType<typeof PDFDocument>, testNumber: number): void {
  const range = doc.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    doc
      .fontSize(9)
      .fillColor("#666666")
      .text(`Exam number: ${testNumber}`, 50, doc.page.height - 40, {
        width: doc.page.width - 100,
        align: "center",
      });
  }
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, requiredHeight: number): void {
  if (doc.y + requiredHeight > doc.page.height - 60) {
    doc.addPage();
  }
}

function renderSingleTestPdf(
  filePath: string,
  exam: Exam,
  testNumber: number,
  questions: QuestionVariant[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(18).fillColor("#111111").text(exam.title, { align: "center" });
    doc.moveDown(0.5);

    const dateText = new Date().toLocaleDateString("pt-BR");

    doc.fontSize(11).fillColor("#222222");
    if (exam.subject) {
      doc.text(`Subject: ${exam.subject}`);
    }
    if (exam.professor) {
      doc.text(`Professor: ${exam.professor}`);
    }
    if (exam.semester) {
      doc.text(`Semester: ${exam.semester}`);
    }
    doc.text(`Date: ${dateText}`);
    if (exam.metadata) {
      doc.text(`Additional info: ${exam.metadata}`);
    }

    doc.moveDown(1);

  questions.forEach((question, index) => {
      ensureSpace(doc, 80);

      doc
        .fontSize(12)
        .fillColor("#111111")
        .text(`${index + 1}. ${question.description}`, { width: 500 });

    question.alternatives.forEach((alternative, altIndex) => {
      const label = labelForIndex(altIndex, exam.answerMode);
      doc
        .fontSize(11)
        .fillColor("#222222")
        .text(`    (${label}) ${alternative.description}`, { width: 500 });
    });

      doc.moveDown(0.3);
      if (exam.answerMode === "LETTERS") {
        doc.fontSize(11).text("    Marked letters: ____________________");
      } else {
        doc.fontSize(11).text("    Sum of marked alternatives: ____________________");
      }

      doc.moveDown(0.9);
    });

    ensureSpace(doc, 90);
    doc.moveDown(0.6);
    doc.fontSize(12).fillColor("#111111").text("Student Identification");
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#222222").text("Name: ___________________________________________________________");
    doc.moveDown(0.2);
    doc.text("CPF: ____________________________________________________________");

    writeFooterOnAllPages(doc, testNumber);

    stream.on("finish", () => resolve());
    stream.on("error", (error) => reject(error));
    doc.on("error", (error) => reject(error));

    doc.end();
  });
}

export async function generateIndividualTests(params: {
  exam: Exam;
  questions: Question[];
  count: number;
  outputRootDir: string;
}): Promise<GeneratedExamBatch> {
  const { exam, questions, count, outputRootDir } = params;

  const batchId = `${exam.id}-${Date.now()}`;
  const outputDir = path.join(outputRootDir, batchId);
  ensureDirExists(outputDir);

  const answerKeyRows: string[] = [];

  const pdfFiles: string[] = [];

  for (let testNumber = 1; testNumber <= count; testNumber += 1) {
    const shuffledQuestions: QuestionVariant[] = shuffle(questions).map((question) => ({
      description: question.description,
      alternatives: shuffle(
        question.alternatives.map((alternative) => ({
          description: alternative.description,
          isCorrect: alternative.isCorrect,
        })),
      ),
    }));

    const answerKey = shuffledQuestions.map((question) => answerForQuestion(question, exam.answerMode));
    answerKeyRows.push([String(testNumber), ...answerKey].join(","));

    const pdfName = `test-${String(testNumber).padStart(4, "0")}.pdf`;
    const pdfPath = path.join(outputDir, pdfName);
    await renderSingleTestPdf(pdfPath, exam, testNumber, shuffledQuestions);
    pdfFiles.push(pdfName);
  }

  const answerKeyCsv = "answer-key.csv";
  fs.writeFileSync(path.join(outputDir, answerKeyCsv), `${answerKeyRows.join("\n")}\n`, "utf8");

  return {
    batchId,
    examId: exam.id,
    count,
    outputDir,
    pdfFiles,
    answerKeyCsv,
  };
}
