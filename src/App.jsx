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
import MobileMenuDrawer from './components/MobileMenuDrawer.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import { exportBackup } from './services/storageService.js';
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
import { NotificationsPanel, useNotificationsViewModel } from './features/notifications/index.js';
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
    availableFreezes, usedFreezes, redeemStreakCode,
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

  // Headless Notifications & Push Reminder ViewModel
  const notificationsVM = useNotificationsViewModel({
    streak,
    courseTitle: course?.title,
    remainingLectures: Math.max(0, (stats?.totalCount || 0) - (stats?.completedCount || 0)),
  });

  // Drawer and Modal visibility
  const [calendarOpen, setCalendarOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#calendar');
  const [settingsOpen, setSettingsOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#settings');
  const [badgesOpen, setBadgesOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#badges');
  const [notificationsOpen, setNotificationsOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#notifications');
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceModalDate, setPracticeModalDate] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState('home');

  // Centralized Drawer & Navigation Managers
  const closeAllDrawers = useCallback(() => {
    setCalendarOpen(false);
    setSettingsOpen(false);
    setBadgesOpen(false);
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    setCommandPaletteOpen(false);
    setActiveNavTab('home');
  }, []);

  const openStreakDrawer = useCallback(() => {
    setSettingsOpen(false);
    setBadgesOpen(false);
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    setCommandPaletteOpen(false);
    setCalendarOpen(true);
    setActiveNavTab('streak');
  }, []);

  const openBadgesDrawer = useCallback(() => {
    setCalendarOpen(false);
    setSettingsOpen(false);
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    setCommandPaletteOpen(false);
    setBadgesOpen(true);
    setActiveNavTab('badges');
  }, []);

  const openSettingsDrawer = useCallback(() => {
    setCalendarOpen(false);
    setBadgesOpen(false);
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    setCommandPaletteOpen(false);
    setSettingsOpen(true);
    setActiveNavTab('settings');
  }, []);

  const openNotificationsDrawer = useCallback(() => {
    setCalendarOpen(false);
    setBadgesOpen(false);
    setSettingsOpen(false);
    setMobileMenuOpen(false);
    setCommandPaletteOpen(false);
    setNotificationsOpen(true);
    setActiveNavTab('notifications');
  }, []);

  const toggleStreakDrawer = useCallback(() => {
    if (calendarOpen) {
      setCalendarOpen(false);
      setActiveNavTab('home');
    } else {
      openStreakDrawer();
    }
  }, [calendarOpen, openStreakDrawer]);

  const toggleBadgesDrawer = useCallback(() => {
    if (badgesOpen) {
      setBadgesOpen(false);
      setActiveNavTab('home');
    } else {
      openBadgesDrawer();
    }
  }, [badgesOpen, openBadgesDrawer]);

  const toggleSettingsDrawer = useCallback(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
      setActiveNavTab('home');
    } else {
      openSettingsDrawer();
    }
  }, [settingsOpen, openSettingsDrawer]);

  const navigateHome = useCallback(() => {
    closeAllDrawers();
    setActiveNavTab('home');
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [closeAllDrawers]);

  const navigateToday = useCallback(() => {
    closeAllDrawers();
    setActiveNavTab('today');
    requestAnimationFrame(() => {
      const el = document.getElementById('today-plan-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [closeAllDrawers]);

  // Deep-link hash routing
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#calendar') openStreakDrawer();
      if (window.location.hash === '#settings') openSettingsDrawer();
      if (window.location.hash === '#badges') openBadgesDrawer();
      if (window.location.hash === '#notifications') openNotificationsDrawer();
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [openStreakDrawer, openSettingsDrawer, openBadgesDrawer, openNotificationsDrawer]);

  // Listener for test push notification trigger
  useEffect(() => {
    const handleSendTest = () => notificationsVM.sendTestNotification();
    window.addEventListener('jct:send_test_notification', handleSendTest);
    return () => window.removeEventListener('jct:send_test_notification', handleSendTest);
  }, [notificationsVM]);

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
        onOpenCalendar={openStreakDrawer}
        onOpenSettings={openSettingsDrawer}
        pct={stats.pct}
        courses={courses}
        activeCourseId={activeCourseId}
        onSwitchCourse={handleSwitchCourse}
        unlockedBadgesCount={unlockedBadgesCount}
        onOpenBadges={openBadgesDrawer}
        unreadNotificationsCount={notificationsVM.unreadCount}
        onOpenNotifications={openNotificationsDrawer}
        onOpenCommandPalette={() => {
          closeAllDrawers();
          setCommandPaletteOpen(true);
        }}
        onOpenMobileMenu={() => {
          closeAllDrawers();
          setMobileMenuOpen(true);
        }}
      />

      <main className="app-main">
        <StatsBar stats={stats} targetSec={targetSec} autoPlan={settings.autoPlan} />

        <div className="app-layout" id="syllabus-section">
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
        onClose={() => { setCalendarOpen(false); setActiveNavTab('home'); }}
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
        onOpenBadges={openBadgesDrawer}
        availableFreezes={availableFreezes}
        usedFreezes={usedFreezes}
        onRedeemCode={redeemStreakCode}
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
        onClose={() => { setSettingsOpen(false); setActiveNavTab('home'); }}
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
        onClose={() => { setBadgesOpen(false); setActiveNavTab('home'); }}
        badges={badges}
        courseTitle={course.title}
      />

      <BadgeToast
        badge={newlyUnlockedBadge}
        onOpenBadges={openBadgesDrawer}
        onClose={clearNewlyUnlockedBadge}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        course={course}
        courses={courses}
        onSwitchCourse={handleSwitchCourse}
        onJumpToSection={courseVM.jumpToSection}
        onOpenCalendar={openStreakDrawer}
        onOpenBadges={openBadgesDrawer}
        onOpenNotifications={openNotificationsDrawer}
        onSendTestNotification={notificationsVM.sendTestNotification}
        onOpenSettings={openSettingsDrawer}
        onOpenPracticeModal={openPracticeModalForToday}
        onOpenImport={() => {
          closeAllDrawers();
          courseVM.setImportOpen(true);
        }}
        onClearPlan={clearPlan}
      />

      <MobileMenuDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        course={course}
        courses={courses}
        activeCourseId={activeCourseId}
        onSwitchCourse={handleSwitchCourse}
        stats={stats}
        pct={stats.pct}
        streak={streak}
        availableFreezes={availableFreezes}
        unlockedBadgesCount={unlockedBadgesCount}
        unreadNotificationsCount={notificationsVM.unreadCount}
        onOpenPlan={navigateToday}
        onOpenStreak={openStreakDrawer}
        onOpenBadges={openBadgesDrawer}
        onOpenNotifications={openNotificationsDrawer}
        onOpenSettings={openSettingsDrawer}
        onOpenCommandPalette={() => {
          closeAllDrawers();
          setCommandPaletteOpen(true);
        }}
        onOpenPracticeModal={openPracticeModalForToday}
        onOpenImport={() => {
          closeAllDrawers();
          courseVM.setImportOpen(true);
        }}
        onExportBackup={() => {
          const backup = exportBackup();
          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `corejava-backup-${dateKey()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Backup exported successfully!', 'success', 3000);
        }}
      />

      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => { setNotificationsOpen(false); setActiveNavTab('home'); }}
        viewModel={notificationsVM}
        onOpenBadges={openBadgesDrawer}
        onOpenStreak={openStreakDrawer}
        onOpenToday={navigateToday}
        onOpenSettings={openSettingsDrawer}
      />

      <MobileBottomNav
        activeTab={calendarOpen ? 'streak' : badgesOpen ? 'badges' : settingsOpen ? 'settings' : activeNavTab}
        streak={streak}
        planCount={stats.planCount}
        unlockedBadgesCount={unlockedBadgesCount}
        onNavigateHome={navigateHome}
        onNavigateToday={navigateToday}
        onOpenStreak={toggleStreakDrawer}
        onOpenBadges={toggleBadgesDrawer}
        onOpenSettings={toggleSettingsDrawer}
      />

      <ToastContainer />
      <DeveloperBadge />
    </div>
  );
}
