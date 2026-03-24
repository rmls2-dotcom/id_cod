# Question Bank Manager (React + Node + TypeScript)

This project implements the **question management** flow from `docs/acceptance/exam-system.feature`, especially the rule:

- `Completed exam questions can be managed with alternatives and correctness flags`

And now also includes the next slice:

- `Exams are assembled from registered questions with answer mode letters or powers of 2`
- `Individualized PDFs and answer-key CSV are generated for selected exam and quantity`

## Tech Stack

- Client: React + TypeScript + Vite
- Server: Node.js + Express + TypeScript
- Validation: Zod

## Suggested Project Structure

```text
id_cod/
  client/
    src/
      api.ts
      App.tsx
      App.css
      index.css
      types.ts
  server/
    src/
      index.ts
      routes.ts
      store.ts
      types.ts
      validation.ts
  docs/
    acceptance/
      exam-system.feature
  package.json
  README.md
```

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

## API endpoints

Base URL: `http://localhost:3001/api`

- `GET /health`
- `GET /questions`
- `GET /questions/:id`
- `POST /questions`
- `PUT /questions/:id`
- `DELETE /questions/:id`
- `GET /exams`
- `GET /exams/:id`
- `POST /exams`
- `PUT /exams/:id`
- `DELETE /exams/:id`
- `POST /exams/:id/generate-tests`

### Payload for create/update

```json
{
  "description": "Question statement",
  "alternatives": [
    { "description": "Alternative A", "isCorrect": true },
    { "description": "Alternative B", "isCorrect": false }
  ]
}
```

### Payload for test generation

```json
{
  "count": 30
}
```

### Generated files

- Files are written to `generated/<batchId>/`.
- The server exposes them at `/generated/<batchId>/...`.

## Notes

- Data is currently stored in memory (no database yet).
- There is no access control/login by design.
