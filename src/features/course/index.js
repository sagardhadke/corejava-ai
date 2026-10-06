/**
 * Course Feature Module (Feature-Driven Architecture)
 * Exports Course Models, Headless ViewModels, and Views
 */

export * from './models/courseProgressModel.js';
export * from './models/courseStoreModel.js';
export * from './models/courseCompletionModel.js';
export * from './viewmodels/useCourseViewModel.js';

export { default as SectionCard } from './views/SectionCard.jsx';
export { default as LectureRow } from './views/LectureRow.jsx';
export { default as PerSectionProgress } from './views/PerSectionProgress.jsx';
export { default as CourseSelector } from './views/CourseSelector.jsx';
export { default as CourseImportModal } from './views/CourseImportModal.jsx';
export { default as Toolbar } from './views/Toolbar.jsx';
export { default as StatsBar } from './views/StatsBar.jsx';
export { default as CourseCompletionBanner } from './views/CourseCompletionBanner.jsx';
