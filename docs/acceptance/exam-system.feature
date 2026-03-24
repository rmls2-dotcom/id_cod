Feature: Exam variation, application, and grading workflow
  As a teacher or school staff member
  I want to manage questions and exams, generate individualized tests, and grade student responses
  So that I can apply assessments with varied forms and produce reliable class reports

  Background:
    Given the system has authenticated users with role "teacher"
    And all dates are handled in local timezone

  Rule: Completed exam questions can be managed with alternatives and correctness flags

    Scenario: Add a completed exam question with alternatives
      Given I am on the question management page
      When I create a question with statement:
        "Which of the following are prime numbers below 10?"
      And I add alternatives:
        | label | description | shouldBeMarked |
        | A     | 2           | true           |
        | B     | 3           | true           |
        | C     | 4           | false          |
        | D     | 5           | true           |
      Then the question is saved successfully
      And the question is listed with all alternatives and correctness flags

    Scenario: Prevent saving a question without alternatives
      Given I am on the question management page
      When I create a question with statement:
        "Empty alternatives should not be allowed"
      And I try to save it without alternatives
      Then I should see a validation error "At least one alternative is required"
      And the question is not persisted

    Scenario: Update a question and its alternatives
      Given there is an existing question "Q-101"
      And "Q-101" has alternatives:
        | label | description        | shouldBeMarked |
        | A     | HyperText Markup   | false          |
        | B     | Cascading Style    | true           |
      When I update "Q-101" statement to "Select technologies related to styling"
      And I update alternative "A" shouldBeMarked to "true"
      Then "Q-101" reflects the new statement
      And alternative "A" is marked as correct

    Scenario: Delete a question that is not used by any exam
      Given there is an existing question "Q-DELETE-1"
      And "Q-DELETE-1" is not referenced by any exam
      When I delete question "Q-DELETE-1"
      Then question "Q-DELETE-1" no longer appears in question listings

    Scenario: Prevent deleting a question already used by an exam
      Given there is an existing question "Q-IN-EXAM"
      And question "Q-IN-EXAM" belongs to exam "Math Test 1"
      When I attempt to delete question "Q-IN-EXAM"
      Then I should see a validation error "Question is used by an exam"
      And question "Q-IN-EXAM" remains active

  Rule: Exams are assembled from registered questions with answer mode letters or powers of 2

    Scenario: Create an exam using letter identification mode
      Given the following questions are registered:
        | questionId |
        | Q-201      |
        | Q-202      |
        | Q-203      |
      When I create an exam with data:
        | title             | subject      | professor       | semester |
        | Midterm 2026.1    | Discrete Math| Prof. Ana Souza | 2026.1   |
      And I select questions:
        | questionId |
        | Q-201      |
        | Q-202      |
        | Q-203      |
      And I choose answer identification mode "LETTERS"
      Then the exam is saved successfully
      And each question in this exam uses lettered alternatives
      And each question rendering reserves space for students to write selected letters

    Scenario: Create an exam using powers of 2 identification mode
      Given the following questions are registered:
        | questionId |
        | Q-301      |
        | Q-302      |
      When I create an exam titled "Logic Evaluation"
      And I select questions:
        | questionId |
        | Q-301      |
        | Q-302      |
      And I choose answer identification mode "POWERS_OF_TWO"
      Then the exam is saved successfully
      And alternatives are identified as 1, 2, 4, 8, 16, 32 in each question
      And each question rendering reserves space for students to write the sum of marked alternatives

    Scenario: Prevent creating an exam without selecting questions
      Given I am on the exam management page
      When I create an exam titled "Invalid Empty Exam"
      And I do not select any questions
      Then I should see a validation error "At least one registered question must be selected"
      And the exam is not persisted

  Rule: Individualized PDFs and answer-key CSV are generated for selected exam and quantity

    Scenario: Generate N individualized tests in PDF and one answer-key CSV
      Given exam "Midterm 2026.1" exists with 10 questions
      And the exam title block includes:
        | field     | value            |
        | subject   | Discrete Math    |
        | professor | Prof. Ana Souza  |
        | metadata  | Campus A - Night |
      When I request generation of 30 individualized tests
      Then the system generates 30 PDF files
      And each PDF contains the exam title block on the first page
      And each PDF contains fields for student "Name" and "CPF"
      And each page footer contains the generated individual test number
      And no PDF contains final score field
      And the system generates one CSV answer key file with 30 lines for 30 tests

    Scenario: Ensure randomization changes question and alternative order per test
      Given exam "Midterm 2026.1" exists with at least 5 questions
      When I generate 5 individualized tests
      Then at least two tests have different question ordering
      And for at least one question, the alternative ordering differs between two tests

    Scenario Outline: Answer-key CSV line format follows exam answer mode
      Given exam "<examTitle>" uses mode "<mode>"
      And individualized tests were generated
      When I open the generated answer-key CSV
      Then each line starts with a numeric test number
      And each subsequent column stores the expected answer for one question in mode "<mode>"

      Examples:
        | examTitle        | mode           |
        | Midterm 2026.1   | LETTERS        |
        | Logic Evaluation | POWERS_OF_TWO  |

    Scenario: CSV answer keys in letters mode store selected letters
      Given exam "Midterm 2026.1" uses mode "LETTERS"
      And test number 17 has correct alternatives equivalent to letters "A" and "D" for question 1
      When I read line for test number 17 in answer-key CSV
      Then column for question 1 is "AD"

    Scenario: CSV answer keys in powers mode store expected sum
      Given exam "Logic Evaluation" uses mode "POWERS_OF_TWO"
      And for test number 8, question 2 has correct alternatives with identifiers 1 and 8
      When I read line for test number 8 in answer-key CSV
      Then column for question 2 is "9"

  Rule: Tests can be graded from answer-key CSV and student-response CSV with strict or proportional rigor

    Scenario: Strict grading mode gives zero when any expected alternative is wrong or missing
      Given an answer-key CSV exists for exam "Midterm 2026.1"
      And a student response CSV exists with row:
        | studentName | cpf         | testNumber | q1Answer | q2Answer |
        | Carla Lima  | 12345678901 | 17         | AC       | B        |
      And in answer-key CSV test 17 expects "AD" for question 1
      When I run grading in mode "STRICT"
      Then Carla Lima receives zero for question 1
      And grading output includes per-question score and total score

    Scenario: Proportional grading mode discounts by error percentage
      Given an answer-key CSV exists for exam "Midterm 2026.1"
      And question 1 weight is 1.0
      And a student response CSV contains test 17 answer "AC" for question 1
      And answer-key for test 17 question 1 is "AD"
      When I run grading in mode "PROPORTIONAL"
      Then question 1 score is greater than 0
      And question 1 score is less than 1.0
      And the score is proportional to incorrectly selected or omitted alternatives

    Scenario: Reject grading when a response references unknown test number
      Given an answer-key CSV exists with test numbers 1 to 30
      And a student response CSV has a row with test number 99
      When I run grading in mode "STRICT"
      Then that row is marked as invalid with reason "Unknown test number"
      And the system includes the invalid row count in grading summary

    Scenario: Generate class grade report after grading
      Given grading has been executed successfully
      When I request the class report export
      Then the system generates a report with columns:
        | studentName |
        | cpf         |
        | testNumber  |
        | totalScore  |
        | percentage  |
        | status      |
      And report includes one row per student response
      And report summary includes class average, highest grade, and lowest grade

  Rule: CSV contracts for integrations are explicit and validated

    Scenario: Validate required columns in student response CSV
      Given I provide a student response CSV missing column "testNumber"
      When I run grading in mode "STRICT"
      Then processing is aborted
      And I should see validation error "Missing required column: testNumber"

    Scenario: Validate CPF format in student response CSV
      Given I provide a student response CSV with CPF "12345"
      When I run grading in mode "STRICT"
      Then that row is marked invalid with reason "Invalid CPF format"

    Scenario: Validate answer-key CSV question count matches exam definition
      Given exam "Midterm 2026.1" has 10 questions
      And the provided answer-key CSV has only 9 answer columns
      When I run grading in mode "PROPORTIONAL"
      Then processing is aborted
      And I should see validation error "Answer key does not match exam question count"
