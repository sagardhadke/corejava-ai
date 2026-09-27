import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  listCourses, getActiveCourseId, setActiveCourseId, getCourseById,
  addCourse, replaceCourse, resetEverything,
} from './data/courseStore';
import { useCourseProgress } from './hooks/useCourseProgress';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import Toolbar from './components/Toolbar';
import SectionCard from './components/SectionCard';
import TodayPlanCard from './components/TodayPlanCard';
import PerSectionProgress from './components/PerSectionProgress';
import CalendarPanel from './components/CalendarPanel';
import SettingsPanel from './components/SettingsPanel';
import PracticeDayModal from './components/PracticeDayModal';
import MotivationPopup from './components/MotivationPopup';
import CourseImportModal from './components/CourseImportModal';
import DeveloperBadge from './components/DeveloperBadge';
import { dateKey } from './utils/time';
import { getActiveSectionId } from './utils/activeSection';
import './App.css';

export default function App() {
  const [courseListVersion, setCourseListVersion] = useState(0);
  const [activeCourseId, setActiveCourseIdState] = useState(() => getActiveCourseId());
  const [course, setCourse] = useState(() => getCourseById(getActiveCourseId()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const courses = useMemo(() => listCourses(), [courseListVersion]);

  const refreshCourseList = useCallback(() => {
    setCourseListVersion((v) => v + 1);
    const curActiveId = getActiveCourseId();
    setActiveCourseIdState(curActiveId);
    setCourse(getCourseById(curActiveId));
  }, []);

  const handleSwitchCourse = useCallback((courseId) => {
    setActiveCourseId(courseId);
    setActiveCourseIdState(courseId);
    setCourse(getCourseById(courseId));
    refreshCourseList();
  }, [refreshCourseList]);

  const {
    watchedSet, planSet, settings, history, stats, sectionProgress, streak, longestStreak, targetSec, today,
    startDate, isStartDateManual, todayWatchedSec, isTodayPracticeDay, hasWatchedToday,
    toggleWatched, togglePlan, clearPlan, resetAll, updateSettings, updateStartDate, resetStartDateToAuto,
    markPracticeDay, unmarkPracticeDay,
  } = useCourseProgress(course);

  const [query, setQuery] = useState('');
  const [openSections, setOpenSections] = useState(() => {
    const activeId = getActiveSectionId(course, watchedSet);
    const init = {};
    course?.sections.forEach((s) => { init[s.id] = s.id === activeId; });
    return init;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceModalDate, setPracticeModalDate] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  // When the active course changes (switch, import, replace), reset which
  // sections are open so the new course's active section starts expanded.
  const prevCourseIdForSectionsRef = useRef(course?.id);
  useEffect(() => {
    if (!course) return;
    if (prevCourseIdForSectionsRef.current === course.id) return;
    prevCourseIdForSectionsRef.current = course.id;
    const activeId = getActiveSectionId(course, watchedSet);
    const init = {};
    course.sections.forEach((s) => { init[s.id] = s.id === activeId; });
    setOpenSections(init);
  }, [course, watchedSet]);

  const lectureNumbers = useMemo(() => {
    if (!course) return new Map();
    return new Map(course.allLectures.map((l, i) => [l.id, i + 1]));
  }, [course]);

  const filteredSections = useMemo(() => {
    if (!course) return [];
    const q = query.trim().toLowerCase();
    if (!q) return course.sections;
    return course.sections
      .map((s) => ({ ...s, lectures: s.lectures.filter((l) => l.title.toLowerCase().includes(q)) }))
      .filter((s) => s.lectures.length > 0);
  }, [course, query]);

  const plannedLectures = useMemo(() => {
    if (!course) return [];
    return course.allLectures.filter((l) => planSet.has(l.id));
  }, [course, planSet]);

  const toggleOpen = (id) => setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  const expandAll = () => {
    if (!course) return;
    const next = {};
    course.sections.forEach((s) => { next[s.id] = true; });
    setOpenSections(next);
  };
  const collapseAll = () => {
    if (!course) return;
    const next = {};
    course.sections.forEach((s) => { next[s.id] = false; });
    setOpenSections(next);
  };

  const openPracticeModalForToday = () => {
    setPracticeModalDate(null);
    setPracticeModalOpen(true);
  };
  const openPracticeModalForDate = (date) => {
    setPracticeModalDate(date);
    setPracticeModalOpen(true);
  };

  const handleJumpToSection = (sectionId) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleImportAdd = (parsedCourse) => {
    const newId = addCourse(parsedCourse);
    refreshCourseList();
    handleSwitchCourse(newId);
  };

  const handleImportReplace = (parsedCourse) => {
    const newId = replaceCourse(activeCourseId, parsedCourse);
    refreshCourseList();
    handleSwitchCourse(newId);
  };

  const handleDeleteEverything = () => {
    resetEverything();
    const freshId = getActiveCourseId();
    setActiveCourseIdState(freshId);
    setCourse(getCourseById(freshId));
    refreshCourseList();
    setSettingsOpen(false);
  };

  const handleRestoredBackup = () => {
    const freshId = getActiveCourseId();
    setActiveCourseIdState(freshId);
    setCourse(getCourseById(freshId));
    refreshCourseList();
  };

  if (!course) {
    return (
      <div className="app-shell app-shell--empty">
        <p>No course available. Something went wrong loading the default course.</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        streak={streak}
        onOpenCalendar={() => setCalendarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        pct={stats.pct}
        courses={courses}
        activeCourseId={activeCourseId}
        onSwitchCourse={handleSwitchCourse}
      />

      <main className="app-main">
        <StatsBar stats={stats} targetSec={targetSec} autoPlan={settings.autoPlan} />

        <div className="app-layout">
          <div className="app-layout__main">
            <Toolbar
              query={query}
              onQueryChange={setQuery}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onClearPlan={clearPlan}
              plannedCount={planSet.size}
            />

            {filteredSections.length === 0 ? (
              <div className="empty-state">No lectures match "{query}".</div>
            ) : (
              filteredSections.map((section) => (
                <div key={section.id} id={`section-${section.id}`}>
                  <SectionCard
                    section={section}
                    isOpen={query ? true : !!openSections[section.id]}
                    onToggleOpen={() => toggleOpen(section.id)}
                    watchedSet={watchedSet}
                    planSet={planSet}
                    onToggleWatched={toggleWatched}
                    onTogglePlan={togglePlan}
                    lectureNumbers={lectureNumbers}
                  />
                </div>
              ))
            )}
          </div>

          {/* Sticky sidebar: Today's Plan + Per-section progress travel together
              as the user scrolls, so they stay reachable without scrolling back
              to the top of a long syllabus. */}
          <div className="app-layout__side">
            <div className="sticky-side-panel">
              <TodayPlanCard
                plannedLectures={plannedLectures}
                watchedSet={watchedSet}
                targetSec={targetSec}
                autoPlan={settings.autoPlan}
                onToggleWatched={toggleWatched}
                lectureNumbers={lectureNumbers}
                isTodayPracticeDay={isTodayPracticeDay}
                hasWatchedToday={hasWatchedToday}
                onOpenPracticeModal={openPracticeModalForToday}
                onUnmarkPracticeDay={() => unmarkPracticeDay()}
                todayWatchedSec={todayWatchedSec}
                startDate={startDate}
              />
              <PerSectionProgress sectionProgress={sectionProgress} onJumpToSection={handleJumpToSection} />
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        {course.title} · {stats.totalCount} lectures across {course.sections.length} sections · progress saved locally on this device
      </footer>

      <MotivationPopup today={today} stats={stats} streak={streak} courseTitle={course.title} />

      <CalendarPanel
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        history={history}
        streak={streak}
        longestStreak={longestStreak}
        targetSec={targetSec}
        streakMode={settings.streakMode}
        isTodayPracticeDay={isTodayPracticeDay}
        hasWatchedToday={hasWatchedToday}
        onOpenPracticeModal={openPracticeModalForToday}
        onUnmarkPracticeDay={() => unmarkPracticeDay()}
        onOpenPracticeModalForDate={openPracticeModalForDate}
        startDate={startDate}
        courses={courses}
        course={course}
      />

      <PracticeDayModal
        open={practiceModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        onConfirm={(note) => markPracticeDay(note, practiceModalDate ? dateKey(practiceModalDate) : undefined)}
        targetDate={practiceModalDate}
        startDate={startDate}
      />

      <CourseImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onAdd={handleImportAdd}
        onReplace={handleImportReplace}
        activeCourseTitle={course.title}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
        onResetAll={resetAll}
        courses={courses}
        activeCourseId={activeCourseId}
        onSwitchCourse={handleSwitchCourse}
        onOpenImport={() => { setSettingsOpen(false); setImportOpen(true); }}
        onCoursesChanged={refreshCourseList}
        onRestoredBackup={handleRestoredBackup}
        onDeleteEverything={handleDeleteEverything}
        course={course}
        stats={stats}
        startDate={startDate}
        onUpdateStartDate={updateStartDate}
        isStartDateManual={isStartDateManual}
        onResetStartDateToAuto={resetStartDateToAuto}
      />

      <DeveloperBadge />
    </div>
  );
}
