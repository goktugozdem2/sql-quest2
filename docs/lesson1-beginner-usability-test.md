# Lesson 1 Beginner Usability Test

Use this script to test whether a first-time SQL learner can start, understand, and finish Lesson 1 without help.

## Goal

Validate that Lesson 1 teaches one clear job: inspect a table safely with `SELECT`, `FROM`, and `LIMIT`.

## Participants

Run this with 3 to 5 people who have little or no SQL experience.

Good fit:

- Has heard of spreadsheets or tables.
- Has not written SQL recently.
- Can use a browser without guidance.

Avoid:

- Experienced SQL users.
- People who already know the current SQL Quest interface.

## Setup

- Open `http://127.0.0.1:4321/app.html`.
- Use a fresh guest session or clear local storage first.
- Do not explain SQL before the test starts.
- Ask the participant to think out loud.

## Tasks

1. Start the app as a guest.
2. Explain what the first screen wants you to do.
3. Start Lesson 1.
4. Complete the first exercise.
5. Complete all Lesson 1 exercises.
6. Explain what `SELECT * FROM employees LIMIT 10` does.
7. Find where you would practice more questions after the lesson.

## Observation Rubric

Mark each item as pass, friction, or fail.

| Area | Pass | Friction | Fail |
| --- | --- | --- | --- |
| First screen | Knows to start Learning Path | Hesitates but finds it | Goes to Challenges by mistake |
| Lesson focus | Understands the current step | Reads extra UI first | Does not know what to do next |
| Exercise feedback | Can recover after a wrong answer | Needs to reread feedback | Needs outside help |
| Query meaning | Explains table, all columns, and 10 rows | Misses one part | Cannot explain the query |
| Navigation | Finds Challenges and return path | Finds it after searching | Feels lost |

## Success Criteria

Lesson 1 is ready for broader rollout when:

- At least 4 of 5 participants complete Lesson 1 without help.
- Median time to first correct answer is under 2 minutes.
- Participants can explain `SELECT`, `FROM`, and `LIMIT` in their own words.
- No participant says they are unsure where to click next.

## Notes Template

```text
Participant:
SQL background:
Sector selected:
Time to first correct answer:
Time to finish Lesson 1:
Where they hesitated:
Wrong answers and recovery:
Could explain SELECT/FROM/LIMIT:
Suggested change:
```
