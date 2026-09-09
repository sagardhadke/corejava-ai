import { useRef, useState } from 'react';
import { exportAllData, importAllData } from '../data/courseStore';
import './BackupRestore.css';

export default function BackupRestore({ onRestored }) {
  const fileInputRef = useRef(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [error, setError] = useState('');
  const [exportedNote, setExportedNote] = useState('');

  const handleExport = () => {
    const backup = exportAllData();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `course-tracker-backup-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportedNote('Backup file downloaded.');
    setTimeout(() => setExportedNote(''), 3000);
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChosen = async (file) => {
    setError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.data || parsed.backupVersion !== 1) {
        throw new Error('This file doesn\'t look like a valid backup for this app.');
      }
      setPendingBackup(parsed);
    } catch (e) {
      setError(e.message || 'Could not read this backup file.');
    }
  };

  const handleConfirmRestore = () => {
    try {
      importAllData(pendingBackup);
      setPendingBackup(null);
      onRestored?.();
    } catch (e) {
      setError(e.message || 'Failed to restore this backup.');
    }
  };

  return (
    <div className="br-wrap">
      <div className="br-block">
        <h4>Export</h4>
        <p className="br-help">
          Download every course, watched lecture, today's plan, streak history, and setting as a
          single JSON file you can keep as a backup or move to another browser.
        </p>
        <button className="br-btn" onClick={handleExport}>Export backup file</button>
        {exportedNote && <div className="br-note">{exportedNote}</div>}
      </div>

      <div className="br-block">
        <h4>Import / Restore</h4>
        <p className="br-help">
          Restoring a backup <strong>completely replaces</strong> everything currently stored —
          all courses, progress, and settings — with what's in the backup file.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChosen(file);
            e.target.value = '';
          }}
        />
        <button className="br-btn" onClick={handlePickFile}>Choose backup file…</button>
        {error && <div className="br-error">{error}</div>}

        {pendingBackup && (
          <div className="br-confirm">
            <p className="br-confirm__text">
              This backup was exported {new Date(pendingBackup.exportedAt).toLocaleString()}.
              Restoring it will <strong>permanently overwrite</strong> everything you currently have
              in this browser. This can't be undone.
            </p>
            <div className="br-confirm__actions">
              <button className="br-btn br-btn--ghost" onClick={() => setPendingBackup(null)}>Cancel</button>
              <button className="br-btn br-btn--danger" onClick={handleConfirmRestore}>Overwrite and restore</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
