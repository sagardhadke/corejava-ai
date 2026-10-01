import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  listCourses,
  getActiveCourseId,
  setActiveCourseId,
  getCourseById,
} from './data/courseStore.js';
import { useCourseProgress } from './hooks/useCourseProgress.js';
import Header from './components/Header.jsx';
import DeveloperBadge from './components/DeveloperBadge.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import ToastContainer from './components/Toast.jsx';
import { showToast } from './utils/toast.js';
import { dateKey } from './utils/time.js';

// Feature-Driven Architecture (Models, ViewModels, Views)
import {
  useCourseViewModel,
  StatsBar,
  Toolbar,
  SectionCard,
  PerSectionProgress,
  CourseImportModal,
} from './features/course/index.js';
import { TodayPlanCard } from './features/today-plan/index.js';
import { CalendarPanel, PracticeDayModal } from './features/streak/index.js';
import { BadgesPanel, BadgeToast } from './features/badges/index.js';
import { SettingsPanel } from './features/settings/index.js';
import { MotivationPopup } from './features/motivation/index.js';
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

  // Headless Course Progress ViewModel Hook
  const {
    watchedSet, planSet, settings, history, stats, sectionProgress, streak, longestStreak, targetSec, today,
    startDate, isStartDateManual, todayWatchedSec, isTodayPracticeDay, hasWatchedToday,
    badges, unlockedBadgesCount, newlyUnlockedBadge, clearNewlyUnlockedBadge,
    toggleWatched, togglePlan, clearPlan, resetAll, updateSettings, updateStartDate, resetStartDateToAuto,
    markPracticeDay, unmarkPracticeDay,
  } = useCourseProgress(course);

  // Headless Course ViewModel (accordion state, filtering, import actions)
  const courseVM = useCourseViewModel({
    course,
    courses,
    activeCourseId,
    watchedSet,
    planSet,
    onSwitchCourse: handleSwitchCourse,
    onRefreshCourses: refreshCourseList,
  });

  // Drawer and Modal visibility
  const [calendarOpen, setCalendarOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#calendar');
  const [settingsOpen, setSettingsOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#settings');
  const [badgesOpen, setBadgesOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#badges');
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceModalDate, setPracticeModalDate] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Deep-link hash routing
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#calendar') setCalendarOpen(true);
      if (window.location.hash === '#settings') setSettingsOpen(true);
      if (window.location.hash === '#badges') setBadgesOpen(true);
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Global keyboard shortcuts (Ctrl+K or Cmd+K for Command Palette)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Storage quota alert listener
  useEffect(() => {
    const handleQuota = () => {
      showToast('Browser storage limit reached! Export a backup from Settings to prevent data loss.', 'warning', 6000);
    };
    window.addEventListener('jct:storage_quota_exceeded', handleQuota);
    return () => window.removeEventListener('jct:storage_quota_exceeded', handleQuota);
  }, []);

  const plannedLectures = useMemo(() => {
    if (!course?.allLectures) return [];
    return course.allLectures.filter((l) => planSet.has(l.id));
  }, [course, planSet]);

  const openPracticeModalForToday = () => {
    setPracticeModalDate(null);
    setPracticeModalOpen(true);
  };
  const openPracticeModalForDate = (date) => {
    setPracticeModalDate(date);
    setPracticeModalOpen(true);
  };

  const handleMarkPracticeDay = useCallback((note, targetDate) => {
    markPracticeDay(note, targetDate);
    showToast('Practice day recorded! Keep up the momentum! 🔥', 'success');
  }, [markPracticeDay]);

  const handleUnmarkPracticeDay = useCallback((targetDate) => {
    unmarkPracticeDay(targetDate);
    showToast('Practice day removed.', 'info');
  }, [unmarkPracticeDay]);

  const handleDeleteEverything = () => {
    courseVM.deleteEverything();
    const freshId = getActiveCourseId();
    setActiveCourseIdState(freshId);
    setCourse(getCourseById(freshId));
    refreshCourseList();
    setSettingsOpen(false);
    showToast('All progress reset to clean install.', 'info');
  };

  const handleRestoredBackup = () => {
    courseVM.restoredBackup();
    const freshId = getActiveCourseId();
    setActiveCourseIdState(freshId);
    setCourse(getCourseById(freshId));
    refreshCourseList();
    showToast('Backup restored successfully!', 'success');
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
        unlockedBadgesCount={unlockedBadgesCount}
        onOpenBadges={() => setBadgesOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <main className="app-main">
        <StatsBar stats={stats} targetSec={targetSec} autoPlan={settings.autoPlan} />

        <div className="app-layout">
          <div className="app-layout__main">
            <Toolbar
              query={courseVM.query}
              onQueryChange={courseVM.setQuery}
              onExpandAll={courseVM.expandAll}
              onCollapseAll={courseVM.collapseAll}
              onClearPlan={clearPlan}
              plannedCount={planSet.size}
            />

            {courseVM.filteredSections.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">🔍</span>
                <p>No lectures match "<strong>{courseVM.query}</strong>".</p>
                <button className="empty-state__btn" onClick={() => courseVM.setQuery('')}>
                  Clear search
                </button>
              </div>
            ) : (
              courseVM.filteredSections.map((section) => (
                <div key={section.id} id={`section-${section.id}`}>
                  <SectionCard
                    section={section}
                    isOpen={courseVM.query ? true : !!courseVM.openSections[section.id]}
                    onToggleOpen={() => courseVM.toggleSection(section.id)}
                    watchedSet={watchedSet}
                    planSet={planSet}
                    onToggleWatched={toggleWatched}
                    onTogglePlan={togglePlan}
                    lectureNumbers={courseVM.lectureNumbers}
                  />
                </div>
              ))
            )}
          </div>

          {/* Sticky sidebar: Today's Plan + Per-section progress travel together */}
          <div className="app-layout__side">
            <div className="sticky-side-panel">
              <TodayPlanCard
                plannedLectures={plannedLectures}
                watchedSet={watchedSet}
                targetSec={targetSec}
                autoPlan={settings.autoPlan}
                onToggleWatched={toggleWatched}
                lectureNumbers={courseVM.lectureNumbers}
                isTodayPracticeDay={isTodayPracticeDay}
                hasWatchedToday={hasWatchedToday}
                onOpenPracticeModal={openPracticeModalForToday}
                onUnmarkPracticeDay={() => handleUnmarkPracticeDay()}
                todayWatchedSec={todayWatchedSec}
                startDate={startDate}
              />
              <PerSectionProgress
                sectionProgress={sectionProgress}
                onJumpToSection={courseVM.jumpToSection}
                visibleCount={settings.perSectionVisibleCount || 7}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        {course.title} · {stats.totalCount} lectures across {course.sections.length} sections · enterprise progress tracking
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
        onUnmarkPracticeDay={() => handleUnmarkPracticeDay()}
        onOpenPracticeModalForDate={openPracticeModalForDate}
        startDate={startDate}
        courses={courses}
        course={course}
        onOpenBadges={() => setBadgesOpen(true)}
      />

      <PracticeDayModal
        open={practiceModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        onConfirm={(note) => handleMarkPracticeDay(note, practiceModalDate ? dateKey(practiceModalDate) : undefined)}
        targetDate={practiceModalDate}
        startDate={startDate}
      />

      <CourseImportModal
        open={courseVM.importOpen}
        onClose={() => courseVM.setImportOpen(false)}
        onAdd={courseVM.importAdd}
        onReplace={courseVM.importReplace}
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
        onOpenImport={() => { setSettingsOpen(false); courseVM.setImportOpen(true); }}
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

      <BadgesPanel
        open={badgesOpen}
        onClose={() => setBadgesOpen(false)}
        badges={badges}
        courseTitle={course.title}
      />

      <BadgeToast
        badge={newlyUnlockedBadge}
        onOpenBadges={() => setBadgesOpen(true)}
        onClose={clearNewlyUnlockedBadge}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        course={course}
        courses={courses}
        onSwitchCourse={handleSwitchCourse}
        onJumpToSection={courseVM.jumpToSection}
        onOpenCalendar={() => setCalendarOpen(true)}
        onOpenBadges={() => setBadgesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPracticeModal={openPracticeModalForToday}
        onOpenImport={() => courseVM.setImportOpen(true)}
        onClearPlan={clearPlan}
      />

      <ToastContainer />
      <DeveloperBadge />
    </div>
  );
}
