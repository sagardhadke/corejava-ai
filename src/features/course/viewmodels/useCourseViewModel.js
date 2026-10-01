import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  listCourses,
  getActiveCourseId,
  setActiveCourseId,
  getCourseById,
  addCourse,
  replaceCourse,
  resetEverything,
} from '../../../data/courseStore.js';
import { getActiveSectionIds } from '../../../utils/activeSection.js';
import { filterCourseSections, buildLectureLookup } from '../models/courseProgressModel.js';

/**
 * Headless Course ViewModel Hook
 * Encapsulates multi-course switching, section accordion state,
 * active-section tracking, lecture numbering, and query filtering.
 */
export function useCourseViewModel({
  course: propCourse,
  courses: propCourses,
  activeCourseId: propActiveCourseId,
  watchedSet = new Set(),
  planSet = new Set(),
  onSwitchCourse: propOnSwitchCourse,
  onRefreshCourses: propOnRefreshCourses,
  onCourseChange,
} = {}) {
  const [courseListVersion, setCourseListVersion] = useState(0);
  const [internalActiveCourseId, setInternalActiveCourseId] = useState(() => getActiveCourseId());
  const [internalCourse, setInternalCourse] = useState(() => getCourseById(getActiveCourseId()));
  const [query, setQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  // Use props if provided, otherwise internal state
  const activeCourse = propCourse !== undefined ? propCourse : internalCourse;
  const activeCourseId = propActiveCourseId !== undefined ? propActiveCourseId : internalActiveCourseId;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const internalCourses = useMemo(() => listCourses(), [courseListVersion]);
  const courses = propCourses !== undefined ? propCourses : internalCourses;

  const refreshCourseList = useCallback(() => {
    if (typeof propOnRefreshCourses === 'function') {
      propOnRefreshCourses();
      return;
    }
    setCourseListVersion((v) => v + 1);
    const curActiveId = getActiveCourseId();
    setInternalActiveCourseId(curActiveId);
    const nextCourse = getCourseById(curActiveId);
    setInternalCourse(nextCourse);
    if (typeof onCourseChange === 'function') {
      onCourseChange(nextCourse);
    }
  }, [propOnRefreshCourses, onCourseChange]);

  const handleSwitchCourse = useCallback((courseId) => {
    if (typeof propOnSwitchCourse === 'function') {
      propOnSwitchCourse(courseId);
      return;
    }
    setActiveCourseId(courseId);
    setInternalActiveCourseId(courseId);
    const nextCourse = getCourseById(courseId);
    setInternalCourse(nextCourse);
    setCourseListVersion((v) => v + 1);
    if (typeof onCourseChange === 'function') {
      onCourseChange(nextCourse);
    }
  }, [propOnSwitchCourse, onCourseChange]);

  // Derive active sections (sections containing unwatched lectures or today's plan)
  const activeSectionIds = useMemo(
    () => getActiveSectionIds(activeCourse, watchedSet, planSet),
    [activeCourse, watchedSet, planSet]
  );
  const activeSectionIdsKey = useMemo(() => [...activeSectionIds].sort().join(','), [activeSectionIds]);

  const [openSections, setOpenSections] = useState(() => {
    const init = {};
    const activeSet = new Set(activeSectionIds);
    activeCourse?.sections?.forEach((s) => { init[s.id] = activeSet.has(s.id); });
    return init;
  });

  // Keep active sections auto-expanded
  const prevCourseIdForSectionsRef = useRef(null);
  const prevActiveSectionsKeyRef = useRef(null);

  useEffect(() => {
    if (!activeCourse) return;
    const courseChanged = prevCourseIdForSectionsRef.current !== activeCourse.id;
    const activeSectionsChanged = prevActiveSectionsKeyRef.current !== activeSectionIdsKey;

    if (courseChanged) {
      prevCourseIdForSectionsRef.current = activeCourse.id;
      prevActiveSectionsKeyRef.current = activeSectionIdsKey;
      const init = {};
      const activeSet = new Set(activeSectionIds);
      activeCourse.sections?.forEach((s) => { init[s.id] = activeSet.has(s.id); });
      setOpenSections(init);
    } else if (activeSectionsChanged) {
      const prevActiveSet = new Set((prevActiveSectionsKeyRef.current || '').split(',').filter(Boolean));
      prevActiveSectionsKeyRef.current = activeSectionIdsKey;
      const currentActiveSet = new Set(activeSectionIds);

      setOpenSections((prev) => {
        const next = { ...prev };
        // Collapse sections that were previously active but are no longer active
        prevActiveSet.forEach((id) => {
          if (!currentActiveSet.has(id)) {
            next[id] = false;
          }
        });
        // Collapse completed sections that are no longer active
        activeCourse.sections?.forEach((s) => {
          if (!currentActiveSet.has(s.id)) {
            const isSecComplete = s.lectures && s.lectures.length > 0 && s.lectures.every((l) => watchedSet.has(l.id));
            if (isSecComplete) {
              next[s.id] = false;
            }
          }
        });
        // Auto-expand all active sections
        currentActiveSet.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
    }
  }, [activeCourse, activeSectionIds, activeSectionIdsKey, watchedSet]);

  const toggleSection = useCallback((sectionId) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const expandAll = useCallback(() => {
    if (!activeCourse?.sections) return;
    const next = {};
    activeCourse.sections.forEach((s) => { next[s.id] = true; });
    setOpenSections(next);
  }, [activeCourse]);

  const collapseAll = useCallback(() => {
    if (!activeCourse?.sections) return;
    const next = {};
    activeCourse.sections.forEach((s) => { next[s.id] = false; });
    setOpenSections(next);
  }, [activeCourse]);

  const jumpToSection = useCallback((sectionId) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: true }));
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        const el = document.getElementById(`section-${sectionId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  // Lecture numbering lookup Map (lectureId -> 1-based index)
  const lectureNumbers = useMemo(() => {
    if (!activeCourse?.allLectures) return new Map();
    return new Map(activeCourse.allLectures.map((l, i) => [l.id, i + 1]));
  }, [activeCourse]);

  // Detailed lecture lookup (lectureId -> { lecture, globalNumber, sectionId })
  const lectureLookup = useMemo(() => buildLectureLookup(activeCourse), [activeCourse]);

  // Search filter
  const filteredSections = useMemo(() => {
    if (!activeCourse?.sections) return [];
    return filterCourseSections(activeCourse.sections, query);
  }, [activeCourse, query]);

  // Course Import handlers
  const handleImportAdd = useCallback((parsedCourse) => {
    const newId = addCourse(parsedCourse);
    refreshCourseList();
    handleSwitchCourse(newId);
  }, [refreshCourseList, handleSwitchCourse]);

  const handleImportReplace = useCallback((parsedCourse) => {
    const newId = replaceCourse(activeCourseId, parsedCourse);
    refreshCourseList();
    handleSwitchCourse(newId);
  }, [activeCourseId, refreshCourseList, handleSwitchCourse]);

  const handleDeleteEverything = useCallback(() => {
    resetEverything();
    const freshId = getActiveCourseId();
    if (propActiveCourseId === undefined) {
      setInternalActiveCourseId(freshId);
      setInternalCourse(getCourseById(freshId));
    }
    refreshCourseList();
  }, [propActiveCourseId, refreshCourseList]);

  const handleRestoredBackup = useCallback(() => {
    const freshId = getActiveCourseId();
    if (propActiveCourseId === undefined) {
      setInternalActiveCourseId(freshId);
      setInternalCourse(getCourseById(freshId));
    }
    refreshCourseList();
  }, [propActiveCourseId, refreshCourseList]);

  return {
    course: activeCourse,
    courses,
    activeCourseId,
    activeSectionIds,
    openSections,
    query,
    filteredSections,
    lectureNumbers,
    lectureLookup,
    importOpen,
    setQuery,
    setImportOpen,
    setOpenSections,
    toggleSection,
    expandAll,
    collapseAll,
    jumpToSection,
    switchCourse: handleSwitchCourse,
    refreshCourseList,
    importAdd: handleImportAdd,
    importReplace: handleImportReplace,
    deleteEverything: handleDeleteEverything,
    restoredBackup: handleRestoredBackup,
  };
}
