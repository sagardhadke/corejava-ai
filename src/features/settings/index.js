/**
 * Settings Feature Module (Feature-Driven Architecture)
 * Exports Domain Model, Headless ViewModel, and Views
 */

export * from './models/settingsModel.js';
export * from './viewmodels/useSettingsViewModel.js';
export { default as SettingsPanel } from './views/SettingsPanel.jsx';
export { default as BackupRestore } from './views/BackupRestore.jsx';
export { default as MemoryManagement } from './views/MemoryManagement.jsx';
export { default as DeleteConfirmModal } from './views/DeleteConfirmModal.jsx';
