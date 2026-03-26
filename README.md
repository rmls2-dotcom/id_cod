# Question Bank Manager (React + Node + TypeScript)

This project implements the **question management** flow

## Tech Stack

- Client: React + TypeScript + Vite
- Server: Node.js + Express + TypeScript
- Validation: Zod


## What is implemented now

- Create, list, update, and delete closed questions
- Each question has:
  - `description`
  - `alternatives[]`
- Each alternative has:
  - `description`
  - `isCorrect` (`true` or `false`)
- Alternatives can be added, edited, and removed in the question form
- Server-side validation prevents:
  - empty question description
  - empty alternative description
  - question without alternatives
  - deleting a question that is referenced by an exam
- Create and list exams
- Update and delete exams
- Exam creation requires:
  - `title`
  - `answerMode` (`LETTERS` or `POWERS_OF_TWO`)
  - selection of at least one existing question
- Exam validation prevents:
  - exam without selected questions
  - exam referencing non-existing questions
- Generate N individualized tests for a given exam
- Generation output includes:
  - N PDF files with shuffled question and alternative order per test
  - one answer-key CSV with one line per test number (no header row)
  - answer mode specific key format (`LETTERS` as letters, `POWERS_OF_TWO` as sums)
  - PDF header with exam information (title, subject, professor, semester, date, and metadata)
  - footer on each PDF page with the generated exam number
  - student identification area (Name and CPF) at the end of each PDF
- Grade exams from CSV answer key and student responses
- Grading modes:
  - `STRICT`: any wrong/missing selection yields 0 for the question
  - `PROPORTIONAL`: score per question is proportional to correct selected/unselected alternatives
- Class report export includes:
  - one row per student response
  - columns: `studentName`, `cpf`, `testNumber`, `totalScore`, `percentage`, `status`
  - summary metrics: class average, highest grade, lowest grade, invalid row count
- CSV contract validations implemented:
  - missing required student-response columns (e.g. `testNumber`) aborts processing
  - invalid CPF format marks row invalid
  - unknown test number marks row invalid
  - answer-key question count mismatch aborts processing
- Frontend grading panel per exam supports:
  - pasting CSV content directly
  - uploading CSV files from disk
  - choosing `STRICT` or `PROPORTIONAL` grading mode
  - running grading and exporting class report CSV

## Run locally

Install dependencies in the root:

```bash
npm install
```

Run client + server in development:

```bash
npm run dev
```

Run only the server:

```bash
npm run dev:server
```

Run only the client:

```bash
npm run dev:client
```

Build all:

```bash
npm run build
```


### Student responses CSV required format

When creating the student responses CSV, use this structure (header required):

```csv
studentName,cpf,testNumber,q1Answer,q2Answer,q3Answer
Alice,12345678901,1,ABC,C,AB
Bruno,12345678902,2,A,AC,BCD
Carla,12345678903,3,ACD,AC,B
```

### Generated files

- Files are written to `generated/<batchId>/`.
- The server exposes them at `/generated/<batchId>/...`.

## Notes

- Data is currently stored in memory (no database yet).
- There is no access control/login by design.
