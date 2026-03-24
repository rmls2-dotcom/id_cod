import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  createExam,
  createQuestion,
  deleteExam,
  deleteQuestion,
  generateExamTests,
  listExams,
  listQuestions,
  updateExam,
  updateQuestion,
} from "./api";
import type { Exam, ExamAnswerMode, GeneratedTestsResult, Question } from "./types";
import "./App.css";

type AlternativeDraft = {
  id: string;
  description: string;
  isCorrect: boolean;
};

function createAlternativeDraft(): AlternativeDraft {
  return {
    id: crypto.randomUUID(),
    description: "",
    isCorrect: false,
  };
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [alternatives, setAlternatives] = useState<AlternativeDraft[]>([createAlternativeDraft()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState("");
  const [examProfessor, setExamProfessor] = useState("");
  const [examSemester, setExamSemester] = useState("");
  const [examMetadata, setExamMetadata] = useState("");
  const [examAnswerMode, setExamAnswerMode] = useState<ExamAnswerMode>("LETTERS");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [examError, setExamError] = useState<string | null>(null);
  const [examFeedback, setExamFeedback] = useState<string | null>(null);
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [generationCountByExamId, setGenerationCountByExamId] = useState<Record<string, number>>({});
  const [generationResultByExamId, setGenerationResultByExamId] = useState<
    Record<string, GeneratedTestsResult>
  >({});
  const [isGeneratingByExamId, setIsGeneratingByExamId] = useState<Record<string, boolean>>({});

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId],
  );

  useEffect(() => {
    void loadQuestions();
    void loadExams();
  }, []);

  async function loadQuestions(): Promise<void> {
    try {
      setIsLoading(true);
      const data = await listQuestions();
      setQuestions(data);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Could not load questions");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadExams(): Promise<void> {
    try {
      setIsLoadingExams(true);
      const data = await listExams();
      setExams(data);
    } catch (apiError) {
      setExamError(apiError instanceof Error ? apiError.message : "Could not load exams");
    } finally {
      setIsLoadingExams(false);
    }
  }

  function resetForm(): void {
    setSelectedQuestionId(null);
    setDescription("");
    setAlternatives([createAlternativeDraft()]);
    setError(null);
  }

  function resetExamForm(): void {
    setSelectedExamId(null);
    setExamTitle("");
    setExamSubject("");
    setExamProfessor("");
    setExamSemester("");
    setExamMetadata("");
    setExamAnswerMode("LETTERS");
    setSelectedQuestionIds([]);
    setExamError(null);
  }

  function startEditingExam(exam: Exam): void {
    setSelectedExamId(exam.id);
    setExamTitle(exam.title);
    setExamSubject(exam.subject ?? "");
    setExamProfessor(exam.professor ?? "");
    setExamSemester(exam.semester ?? "");
    setExamMetadata(exam.metadata ?? "");
    setExamAnswerMode(exam.answerMode);
    setSelectedQuestionIds(exam.questionIds);
    setExamError(null);
    setExamFeedback(null);
  }

  function startEditing(question: Question): void {
    setSelectedQuestionId(question.id);
    setDescription(question.description);
    setAlternatives(
      question.alternatives.map((alternative) => ({
        id: alternative.id,
        description: alternative.description,
        isCorrect: alternative.isCorrect,
      })),
    );
    setError(null);
    setFeedback(null);
  }

  function addAlternative(): void {
    setAlternatives((current) => [...current, createAlternativeDraft()]);
  }

  function removeAlternative(id: string): void {
    setAlternatives((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((alternative) => alternative.id !== id);
    });
  }

  function updateAlternative(
    id: string,
    key: "description" | "isCorrect",
    value: string | boolean,
  ): void {
    setAlternatives((current) =>
      current.map((alternative) => {
        if (alternative.id !== id) {
          return alternative;
        }

        if (key === "description") {
          return { ...alternative, description: String(value) };
        }

        return { ...alternative, isCorrect: Boolean(value) };
      }),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    const payload = {
      description,
      alternatives: alternatives.map((alternative) => ({
        description: alternative.description,
        isCorrect: alternative.isCorrect,
      })),
    };

    try {
      setIsSaving(true);

      if (selectedQuestionId) {
        await updateQuestion(selectedQuestionId, payload);
        setFeedback("Question updated successfully.");
      } else {
        await createQuestion(payload);
        setFeedback("Question created successfully.");
      }

      await loadQuestions();
      resetForm();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Could not save question");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(questionId: string): Promise<void> {
    const confirmed = window.confirm("Delete this question?");
    if (!confirmed) {
      return;
    }

    setError(null);
    setFeedback(null);

    try {
      await deleteQuestion(questionId);
      setFeedback("Question deleted.");
      if (selectedQuestionId === questionId) {
        resetForm();
      }
      await loadQuestions();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Could not delete question");
    }
  }

  function toggleQuestionSelection(questionId: string): void {
    setSelectedQuestionIds((current) => {
      if (current.includes(questionId)) {
        return current.filter((id) => id !== questionId);
      }

      return [...current, questionId];
    });
  }

  async function handleCreateExam(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setExamError(null);
    setExamFeedback(null);

    try {
      setIsSavingExam(true);

      const payload = {
        title: examTitle,
        subject: examSubject || undefined,
        professor: examProfessor || undefined,
        semester: examSemester || undefined,
        metadata: examMetadata || undefined,
        questionIds: selectedQuestionIds,
        answerMode: examAnswerMode,
      };

      if (selectedExamId) {
        await updateExam(selectedExamId, payload);
        setExamFeedback("Exam updated successfully.");
      } else {
        await createExam(payload);
        setExamFeedback("Exam created successfully.");
      }

      await loadExams();
      resetExamForm();
    } catch (apiError) {
      setExamError(apiError instanceof Error ? apiError.message : "Could not save exam");
    } finally {
      setIsSavingExam(false);
    }
  }

  async function handleDeleteExam(examId: string): Promise<void> {
    const confirmed = window.confirm("Delete this exam?");
    if (!confirmed) {
      return;
    }

    setExamError(null);
    setExamFeedback(null);

    try {
      await deleteExam(examId);
      setExamFeedback("Exam deleted.");

      if (selectedExamId === examId) {
        resetExamForm();
      }

      await loadExams();
    } catch (apiError) {
      setExamError(apiError instanceof Error ? apiError.message : "Could not delete exam");
    }
  }

  function handleGenerationCountChange(examId: string, rawValue: string): void {
    const parsed = Number(rawValue);
    setGenerationCountByExamId((current) => ({
      ...current,
      [examId]: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1,
    }));
  }

  async function handleGenerateTests(examId: string): Promise<void> {
    const count = generationCountByExamId[examId] ?? 1;

    setExamError(null);
    setExamFeedback(null);
    setIsGeneratingByExamId((current) => ({ ...current, [examId]: true }));

    try {
      const result = await generateExamTests(examId, count);
      setGenerationResultByExamId((current) => ({
        ...current,
        [examId]: result,
      }));
      setExamFeedback(`Generated ${result.count} individualized tests.`);
    } catch (apiError) {
      setExamError(apiError instanceof Error ? apiError.message : "Could not generate tests");
    } finally {
      setIsGeneratingByExamId((current) => ({ ...current, [examId]: false }));
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Closed Questions</p>
        <h1>Question Bank Manager</h1>
        <p className="subtitle">
          Create, edit, and remove closed questions with alternatives and correctness flags.
        </p>
      </header>

      <main className="layout">
        <section className="panel panel-list">
          <div className="panel-title-row">
            <h2>Questions</h2>
            <button className="btn btn-subtle" onClick={resetForm} type="button">
              New question
            </button>
          </div>

          {isLoading ? <p className="muted">Loading questions...</p> : null}
          {!isLoading && questions.length === 0 ? (
            <p className="muted">No questions yet.</p>
          ) : null}

          <ul className="question-list">
            {questions.map((question) => (
              <li key={question.id} className="question-item">
                <button
                  className={`question-card ${selectedQuestionId === question.id ? "is-active" : ""}`}
                  onClick={() => startEditing(question)}
                  type="button"
                >
                  <span className="question-text">{question.description}</span>
                  <span className="question-meta">{question.alternatives.length} alternatives</span>
                </button>
                <button className="btn btn-danger" onClick={() => void handleDelete(question.id)} type="button">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>{selectedQuestion ? "Edit question" : "Create question"}</h2>

          <form className="form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="field">
              <span>Question description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Write the question statement"
              />
            </label>

            <div className="field-group">
              <div className="field-group-title-row">
                <span>Alternatives</span>
                <button className="btn btn-subtle" onClick={addAlternative} type="button">
                  Add alternative
                </button>
              </div>

              {alternatives.map((alternative, index) => (
                <div key={alternative.id} className="alternative-row">
                  <label className="field alt-desc-field">
                    <span>Alternative {index + 1}</span>
                    <input
                      value={alternative.description}
                      onChange={(event) =>
                        updateAlternative(alternative.id, "description", event.target.value)
                      }
                      placeholder="Alternative description"
                    />
                  </label>

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={alternative.isCorrect}
                      onChange={(event) =>
                        updateAlternative(alternative.id, "isCorrect", event.target.checked)
                      }
                    />
                    <span>Correct</span>
                  </label>

                  <button
                    className="btn btn-subtle"
                    onClick={() => removeAlternative(alternative.id)}
                    type="button"
                    disabled={alternatives.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {error ? <p className="status status-error">{error}</p> : null}
            {feedback ? <p className="status status-success">{feedback}</p> : null}

            <div className="actions">
              <button className="btn btn-primary" disabled={isSaving} type="submit">
                {isSaving ? "Saving..." : selectedQuestion ? "Update question" : "Create question"}
              </button>
              {selectedQuestion ? (
                <button className="btn btn-subtle" onClick={resetForm} type="button">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel panel-full">
          <div className="panel-title-row">
            <h2>{selectedExamId ? "Edit exam" : "Create exam"}</h2>
          </div>

          <form className="form" onSubmit={(event) => void handleCreateExam(event)}>
            <div className="two-cols">
              <label className="field">
                <span>Exam title</span>
                <input
                  value={examTitle}
                  onChange={(event) => setExamTitle(event.target.value)}
                  placeholder="Example: Midterm 2026.1"
                />
              </label>

              <label className="field">
                <span>Subject (optional)</span>
                <input
                  value={examSubject}
                  onChange={(event) => setExamSubject(event.target.value)}
                  placeholder="Discrete Math"
                />
              </label>

              <label className="field">
                <span>Professor (optional)</span>
                <input
                  value={examProfessor}
                  onChange={(event) => setExamProfessor(event.target.value)}
                  placeholder="Prof. Ana Souza"
                />
              </label>

              <label className="field">
                <span>Semester (optional)</span>
                <input
                  value={examSemester}
                  onChange={(event) => setExamSemester(event.target.value)}
                  placeholder="2026.1"
                />
              </label>

              <label className="field">
                <span>Metadata (optional)</span>
                <input
                  value={examMetadata}
                  onChange={(event) => setExamMetadata(event.target.value)}
                  placeholder="Campus A - Night"
                />
              </label>
            </div>

            <div className="field-group">
              <div className="field-group-title-row">
                <span>Answer identification mode</span>
              </div>

              <div className="mode-group">
                <label className="mode-option">
                  <input
                    type="radio"
                    name="answerMode"
                    checked={examAnswerMode === "LETTERS"}
                    onChange={() => setExamAnswerMode("LETTERS")}
                  />
                  <span>
                    <strong>LETTERS</strong> (A, B, C...) - students mark selected letters.
                  </span>
                </label>

                <label className="mode-option">
                  <input
                    type="radio"
                    name="answerMode"
                    checked={examAnswerMode === "POWERS_OF_TWO"}
                    onChange={() => setExamAnswerMode("POWERS_OF_TWO")}
                  />
                  <span>
                    <strong>POWERS_OF_TWO</strong> (1, 2, 4, 8...) - students inform the sum.
                  </span>
                </label>
              </div>
            </div>

            <div className="field-group">
              <div className="field-group-title-row">
                <span>Select registered questions</span>
                <span className="muted-inline">{selectedQuestionIds.length} selected</span>
              </div>

              {questions.length === 0 ? (
                <p className="muted">Create at least one question before creating an exam.</p>
              ) : (
                <ul className="selection-list">
                  {questions.map((question) => (
                    <li key={question.id}>
                      <label className="selection-item">
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(question.id)}
                          onChange={() => toggleQuestionSelection(question.id)}
                        />
                        <span>{question.description}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {examError ? <p className="status status-error">{examError}</p> : null}
            {examFeedback ? <p className="status status-success">{examFeedback}</p> : null}

            <div className="actions">
              <button className="btn btn-primary" disabled={isSavingExam} type="submit">
                {isSavingExam ? "Saving..." : selectedExamId ? "Update exam" : "Create exam"}
              </button>
              <button className="btn btn-subtle" onClick={resetExamForm} type="button">
                {selectedExamId ? "Cancel edit" : "Clear"}
              </button>
            </div>
          </form>

          <div className="exam-list-wrap">
            <h3>Created exams</h3>
            {isLoadingExams ? <p className="muted">Loading exams...</p> : null}
            {!isLoadingExams && exams.length === 0 ? <p className="muted">No exams yet.</p> : null}

            <ul className="exam-list">
              {exams.map((exam) => (
                <li key={exam.id} className="exam-item">
                  <p className="exam-title">{exam.title}</p>
                  <p className="exam-meta">
                    Mode: {exam.answerMode} | Questions: {exam.questionIds.length}
                  </p>
                  <p className="exam-meta">
                    {exam.answerMode === "LETTERS"
                      ? "Student answer field should capture marked letters."
                      : "Student answer field should capture sum of marked powers."}
                  </p>
                  <div className="exam-actions">
                    <button className="btn btn-subtle" onClick={() => startEditingExam(exam)} type="button">
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => void handleDeleteExam(exam.id)} type="button">
                      Delete
                    </button>
                  </div>

                  <div className="generate-box">
                    <label className="field compact-field">
                      <span>Tests to generate</span>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={generationCountByExamId[exam.id] ?? 1}
                        onChange={(event) =>
                          handleGenerationCountChange(exam.id, event.target.value)
                        }
                      />
                    </label>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={Boolean(isGeneratingByExamId[exam.id])}
                      onClick={() => void handleGenerateTests(exam.id)}
                    >
                      {isGeneratingByExamId[exam.id] ? "Generating..." : "Generate PDFs + CSV"}
                    </button>
                  </div>

                  {generationResultByExamId[exam.id] ? (
                    <div className="generation-results">
                      <p className="exam-meta">
                        Batch: {generationResultByExamId[exam.id].batchId} | Files: {generationResultByExamId[exam.id].files.pdfs.length} PDFs
                      </p>
                      <p className="exam-meta">
                        <a href={`http://localhost:3001${generationResultByExamId[exam.id].files.answerKeyCsv}`} target="_blank" rel="noreferrer">
                          Open answer-key CSV
                        </a>
                      </p>
                      <details>
                        <summary>Open generated PDFs</summary>
                        <ul className="generated-links">
                          {generationResultByExamId[exam.id].files.pdfs.map((pdfPath) => (
                            <li key={pdfPath}>
                              <a href={`http://localhost:3001${pdfPath}`} target="_blank" rel="noreferrer">
                                {pdfPath.split("/").pop()}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
