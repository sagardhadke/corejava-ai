# Java Course Tracker

A daily lecture tracker for Java courses, with full multi-course support. Built with
React 19 + Vite 8. All data lives in your browser's `localStorage` — nothing is sent
anywhere except a direct call to `api.openai.com` if you add your own API key for the
daily motivation message.

Ships with two courses out of the box: **Core Java + AI Development** (150 lectures)
and **Foundation of Java with Logic Building** (parsed from the provided XML files) —
you can add more, replace either, or delete them via Settings.

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run preview   # preview the production build
```

## Features

- **Zero-setup Today's Plan**: 1.5 hours is selected by default from the very first
  load — no manual target selection needed. The first section is expanded by default
  too, so the starting lectures are visible immediately.
- **One checkbox per lecture** for "today's plan" (amber) — separate from the green
  "watched" toggle. **The plan checkbox is hidden entirely once a lecture is marked
  watched** — there's nothing left to plan for it.
- **Auto-plan mode** (on by default): picks the next unwatched lectures in course
  order until your daily target is reached. **Once generated for a day, the plan is
  frozen** in localStorage under that date and won't change again that day — not on
  reload, not when you mark lectures watched. It only regenerates on an actual day
  change or an explicit setting change.
- **Global lecture numbering**: every lecture shows its position across the whole
  course next to its checkbox, continuing across section boundaries.
- **Per-section progress** panel (below Today's Plan): every topic with its
  watched-count and remaining time, e.g. "Java Basics — 1/21 · 4h 58m left". Click any
  entry to jump to and expand that section.
- **Sticky sidebar**: Today's Plan and Per-section progress scroll together with the
  page instead of staying pinned to the top, so they're reachable no matter how far
  down the syllabus you're working.
- **Multi-course support**: switch courses from the header dropdown or Settings. Each
  course keeps its **own independent** watched/plan/streak/settings data — switching
  never mixes progress between courses.
- **Import courses from XML** (Settings → Import course): upload a file in the same
  `<course><sections><section><items><item type="video" duration="...">` format as the
  bundled courses. After parsing, choose to:
  - **Add alongside** the current course (keeps everything, just adds an option), or
  - **Replace** the current course (requires typing a random 6-digit confirmation code
    shown on screen — this permanently deletes the old course and its progress).
- **Default course selection** in Settings — pick which course opens by default.
- **Memory management** (Settings): lists every course with its storage footprint,
  lets you set any course active, and delete individual courses (at least one must
  always remain).
- **Full backup & restore** (Settings): export everything (all courses, progress,
  settings) to a single JSON file; import it back later. Restoring requires explicit
  confirmation since it completely overwrites existing data.
- **Delete everything & reset to default** (Settings, danger zone): wipes all
  courses/progress/settings and restores the exact state of a fresh install — both
  bundled default courses return automatically.
- **Streak calendar** in the header — GitHub-style activity grid. Amber intensity =
  time watched that day; grey = a confirmed practice day. **Click any greyed-out past
  day with no activity** to retroactively mark it as a practice day.
- **Practice days**: log a day with no lecture but real practice (coding problems,
  revision) so your streak doesn't break. Requires a 10+ word note and re-typing a
  random 6-digit code — an intentional, occasional override, not a free daily pass.
- **Daily motivation popup**: shows once per day with a short, encouraging message.
  Add your own OpenAI API key in Settings for a freshly AI-written message each day;
  without a key, it falls back to built-in messages, so it always works.
- Duration labels always display with a space between units (`41m 51s`, not `41m51s`).
- Search, expand/collapse all, section-wise and course-wide duration stats.

## Data model (localStorage keys)

All per-course keys are namespaced by course id, e.g. `jct_watched__core-java-ai`:

- `jct_course_registry_v1` — `{ courseIds: [...], activeCourseId, customCourses: { [id]: courseObject } }`
  — the list of available courses and which one is active. Default (bundled) courses
  are not stored here in full, only referenced by id.
- `jct_watched__<courseId>` — `{ [lectureId]: true }`
- `jct_today_plan__<courseId>` — `{ date, ids: [...], auto: boolean }` — frozen per-day
- `jct_settings__<courseId>` — daily target, auto-plan flag, streak mode (defaults to
  1.5h / auto-plan on / streak-mode "any" for every course, including newly imported ones)
- `jct_history__<courseId>` — per-day buckets, keyed by date: `{ watchedSec, watchedCount, lectureIds, isPractice?, practiceNote? }`
- `jct_motivation_shown_v1` — `{ date }` — global, not per-course (the greeting is once a day for the whole app)
- `jct_openai_api_key_v1` — your OpenAI API key, if added (never sent anywhere except directly to `api.openai.com`)

## Importing your own course XML

The importer expects the same format as the two bundled files:

```xml
<course>
  <title>My Course</title>
  <sections>
    <section number="01" title="Introduction">
      <items>
        <item type="video" title="Welcome" duration="12m30s" />
        <item type="pdf" title="Slides" />
        <!-- non-video items are ignored for tracking purposes -->
      </items>
    </section>
  </sections>
</course>
```

Only `type="video"` items with a `duration` attribute become trackable lectures;
`pdf`/`article`/`quiz` items are parsed but not counted toward duration or progress.

## Editing/adding default courses

The two bundled courses live pre-parsed in `src/data/defaultCourses.js`. To swap them
for different bundled defaults, re-parse new XML through `src/data/xmlCourseParser.js`
(see the parser's `parseCourseXml` function) and replace the exported array — or
simpler, just use the in-app Import feature at runtime instead of rebuilding.
