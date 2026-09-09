# Core Java + AI Development Course Tracker

<div align="center">

![React 19](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)
![Vite 8](https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite)
![Oxlint](https://img.shields.io/badge/Oxlint-passing-brightgreen?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-14%2F14%20Passing-success?style=for-the-badge)

**A modern, production-grade learning management and lecture progress tracker tailored for deep syllabus tracking, daily planning, and streak consistency.**

[Explore Repository](https://github.com/sagardhadke/corejava-ai) · [Report Bug](https://github.com/sagardhadke/corejava-ai/issues) · [Request Feature](https://github.com/sagardhadke/corejava-ai/issues)

</div>

---

## 🌟 Overview

**Core Java + AI Development Course Tracker** is an interactive, privacy-first web application engineered to track large curriculum courses. Built with React 19 and Vite 8, all user progress, daily schedules, streak histories, and configuration settings are stored 100% locally in your browser's `localStorage`—no account creation, telemetry, or backend database required.

The application comes preloaded with the flagship **Core Java + AI Development (Interview Prep. & Projects)** curriculum (150 lectures / ~131 hours across 18 comprehensive sections), featuring full support for importing, adding, and replacing custom course XMLs.

---

## 🚀 Key Features

### 📅 Smart Daily Target & Frozen Auto-Plan
* **Zero-Configuration Setup**: Launches immediately with a balanced **1.5h daily target** and expands Section 1 by default.
* **Auto-Plan Mode**: Automatically calculates and selects the optimal next lectures in syllabus order to meet your daily target.
* **Daily Plan Freeze**: Once generated, the day's plan remains locked in `localStorage` for that date. Refreshing the browser or checking off lectures will not mutate your planned schedule until a new calendar day begins.
* **Smart Lecture State**: Completed lectures display a crisp `COMPLETED` pill badge, row dimming, and strikethrough title while hiding the "Mark as Today" plan toggle to eliminate visual clutter.

### 📊 Modern Per-Section Progress Sidebar
* **Interactive Section Cards**: Displays live watched ratios (e.g. `3/7 lectures`), remaining section duration (`1h 46m left`), and dynamic progress bars with amber-to-green gradient transitions.
* **One-Click Section Navigation**: Clicking any section card smoothly scrolls to and expands that specific section in the syllabus.
* **Sticky Dual-Panel**: Today's Plan and Section Progress scroll alongside the main curriculum, remaining visible without having to scroll back to the top of long syllabi.

### 🔄 Multi-Course Lifecycle & XML Importer
* **Single Built-in Flagship Course**: Pre-configured with **Core Java + AI Development**.
* **Flexible Course Management**:
  * **Add Course Alongside**: Import any custom course XML to track multiple curriculums concurrently without losing existing data.
  * **Replace Course**: Cleanly replace an existing course with a new XML syllabus.
* **Data Isolation**: Each course maintains isolated namespaces in `localStorage` for watched lectures, daily plans, streak history, settings, and start dates. Switching courses never mixes progress.
* **Safe Course Deletion**: Destructive actions and course replacements are guarded by a 6-character alphanumeric PIN confirmation modal where the confirm button is strictly disabled until the exact code matches.

### 🔥 Consistency & Streak Calendar
* **GitHub-Style Contribution Heatmap**: Visualizes your daily watch time with varying intensity of amber cells.
* **Practice Days**: Allows logging non-video study sessions (coding exercises, interview prep, revision) to preserve streaks. Requires a reflective 10+ word note and confirmation code.
* **Historical Logging**: Retroactively log practice sessions on past inactive days directly from the calendar modal.
* **Course Completion Projection**: Calculates estimated finish dates based on your actual start date, remaining course duration, and daily pace.

### 🧠 Daily AI Motivation (Optional)
* Features an uplifting daily encouragement popup.
* Bring your own OpenAI API key in Settings for dynamic, AI-generated daily messages, with seamless automatic fallback to built-in motivational quotes if no API key is provided.

### 🛡️ Privacy & Storage Management
* **Data Export & Backup**: Export your entire application state (all courses, progress, plans, and history) into a portable JSON backup file.
* **Data Restore**: Import backup snapshots with safety validation.
* **Danger Zone Factory Reset**: Cleanly wipe all stored data and restore a pristine default installation.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) |
| **Build Tool & Dev Server** | [Vite 8](https://vite.dev/) |
| **Styling & Design System** | Vanilla CSS3 (Custom Design Tokens, Glassmorphism, CSS Grid & Flexbox) |
| **Code Quality & Linter** | [Oxlint](https://oxc.rs/) |
| **Testing Suite** | Node.js Native Test Runner (`node:test`) with custom localStorage mock |
| **Storage Engine** | Browser `localStorage` (Namespaced JSON keys) |

---

## 📦 Getting Started

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sagardhadke/corejava-ai.git
   cd corejava-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production bundle**:
   ```bash
   npm run preview
   ```

---

## 🧪 Testing & Quality Assurance

The application includes an automated integration test suite covering the course management system, data isolation, replacement logic, and edge cases:

```bash
npm test
```

### Test Suite Coverage (14/14 Passing)
- [x] Fresh install initializes with single built-in Core Java + AI course
- [x] Adding custom XML course alongside preserves default course
- [x] Course switching persists active state and synchronizes UI
- [x] Multi-course progress data isolation across `localStorage`
- [x] Course replacement completely removes target course and purges all 5 data keys
- [x] Replaced courses do not resurrect on simulated reload or registry refresh
- [x] Replacing custom courses with new custom courses works cleanly
- [x] Course deletion enforces minimum 1-course safeguard
- [x] Deleting a course purges all associated keys and frees storage space
- [x] Deleting active course automatically falls back to the remaining course
- [x] Factory reset purges all custom keys and restores default configuration
- [x] Graceful recovery and fallback upon encountering corrupt `localStorage` registry
- [x] Stale/orphan course IDs in registry are filtered automatically
- [x] Complete backup export and restore preserves all courses and progress

### Linting
```bash
npm run lint
```
Uses `oxlint` for high-performance static analysis with zero warnings and zero errors.

---

## 📑 Course XML Format

Custom courses can be imported at runtime via **Settings → Memory & Courses → Import course from XML**. The XML parser expects the following schema:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<course>
  <title>Your Course Title Here</title>
  <sections>
    <section number="01" title="Fundamentals &amp; Setup">
      <items>
        <item type="video" title="Introduction to Architecture" duration="15m30s" />
        <item type="video" title="Environment Configuration" duration="28m45s" />
        <item type="pdf" title="Cheatsheet" /> <!-- Non-video items are preserved without affecting duration -->
      </items>
    </section>
    <section number="02" title="Advanced Concepts">
      <items>
        <item type="video" title="Memory Model &amp; Garbage Collection" duration="42m10s" />
      </items>
    </section>
  </sections>
</course>
```

> **Note**: Durations can be formatted as `Xh Ym Zs`, `Xh Ym`, `Ym Zs`, or `Xm`. Ampersands in titles should be escaped as `&amp;`.

---

## 🗄️ LocalStorage Data Architecture

All course data is stored under namespaced keys to guarantee zero cross-talk between curriculums:

| Key Pattern | Structure / Purpose |
|---|---|
| `jct_course_registry_v1` | `{ courseIds: string[], activeCourseId: string, customCourses: Record<string, Course> }` |
| `jct_watched__<courseId>` | `{ [lectureId: string]: boolean }` — Map of completed lecture IDs |
| `jct_today_plan__<courseId>` | `{ date: string, ids: string[], auto: boolean }` — Frozen daily schedule |
| `jct_settings__<courseId>` | `{ dailySec: number, autoPlan: boolean, streakMode: "target" \| "any" }` |
| `jct_history__<courseId>` | `{ [dateKey: string]: { watchedSec, watchedCount, lectureIds, isPractice, practiceNote } }` |
| `jct_start_date__<courseId>` | `"YYYY-MM-DD"` — Custom start date for completion estimation |
| `jct_motivation_shown_v1` | `{ date: string }` — Global daily flag for motivation popup |
| `jct_openai_api_key_v1` | `string` — User-provided OpenAI API key (client-side only) |
