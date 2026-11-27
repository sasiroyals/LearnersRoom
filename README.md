# Learners Room

Learn Python and Java through animated, step-by-step simulations. Live at
https://sasiroyals.github.io/LearnersRoom/

- **Lessons:** each lesson runs real code one line at a time and draws the names, objects, frames and classes as they change, with a prediction, a recap and a final check.
- **Practice:** an in-browser Python editor with a step debugger (Back / Step / Step over / Step out).
- **Curriculum:** beginner to professional with full OOP coverage, following Python Crash Course, Learning Python and Fluent Python (Python) and Head First Java, Core Java and Effective Java (Java).

## How the project is organised

```
content/                  what students learn (edit these to change lessons)
  curriculum.toml         the course map: topics, levels, books, planned lessons
  python/NN-topic.toml    the lessons of one topic, in order
src/                      how the site works
  index.html              page markup
  css/app.css             styles
  js/NN-*.js              the app, in load order (see below)
  shims/*.py              small Python modules the in-browser runner lacks
build.py                  assembles everything into index.html
tests/test_lessons.py     checks every lesson file (pytest)
tests/e2e/                runs every lesson in a real browser
index.html                the built site that GitHub Pages serves (generated)
```

The JavaScript files share one scope and are joined in number order:

| File | Job |
| --- | --- |
| `00-core.js` | storage, DOM helpers |
| `01-alias-content.js`, `02-alias-lesson.js` | the hand-animated lesson "Why did both lists change?" |
| `03-outline-nav.js` | course outline, trophies, navigation |
| `04-tracer.js` | runs Python (Skulpt) and records a snapshot of every line |
| `05-explain.js` | turns two snapshots into "What Python did" sentences |
| `06-memory-view.js` | draws frames, objects and classes |
| `07-practice.js` | Practice mode and the debugger panel |
| `08-trace-lessons.js` | lesson player: predictions, variants, code and flowchart views |
| `09-home.js` | home page and keyboard shortcuts |
| `10-auth.js` | log in and sign up pages, account menu, progress sync |
| `11-boot.js` | language switching and start-up |

### Design in one paragraph

Lessons are **data, not code**: a lesson file says what program to run, what to explain on which line, and what to ask. One generic **lesson player** turns any lesson file into an animated lesson, by running the code through the **tracer** and handing each snapshot to the **explainer** and the **memory view**. Adding a lesson never means writing JavaScript. Python modules the browser runner lacks (dataclasses, contextlib, file I/O) are provided by small **shims** written in Python.

## Working on it

```
python build.py            # rebuild index.html after any change
python -m pytest           # check every lesson file
npm install && npx playwright install chromium
npm run test:e2e           # run every lesson in a browser
```

Commit the rebuilt `index.html` with your change; CI fails if it is out of date.

### Adding a lesson

1. Open the topic file in `content/python/`, copy an existing `[[lesson]]` block, and give it a new `id`.
2. Write the `code`, one `pseudo` entry per code line (`"(blank)"` for blank lines), explanations under `[lesson.lines.N]`, a `[lesson.predict]` question, at least one `[[lesson.variants]]`, a `recap`, and a `[lesson.check]`.
3. Run `python build.py`, `python -m pytest` and `npm run test:e2e`.

## Accounts

Log in and sign up use Amazon Cognito when `src/config/cognito.json` exists:

```json
{"region": "us-east-1", "userPoolId": "us-east-1_XXXXXXXXX", "clientId": "XXXXXXXXXXXXXXXXXXXXXXXXXX"}
```

These values are public by design. The page calls Cognito directly
(`USER_PASSWORD_AUTH`, so the app client must allow that flow). Sign up sends
a verification code by email; forgotten passwords use a reset code. Trophies
and the last lesson are saved in the user's `custom:progress` attribute
(string, max 2048), so no database is needed. Without the file the pages
still work, but accounts are kept in the visitor's browser only.
