import { useEffect, useState } from 'react';
import { listCourses, getActiveCourseId, deleteCourse, getStorageUsageBytes, getPerCourseStorageBytes } from '../../../data/courseStore.js';
import { formatBytes } from '../../../utils/time.js';
import DeleteConfirmModal from './DeleteConfirmModal';
import './MemoryManagement.css';

export default function MemoryManagement({ onCoursesChanged, onRequestSetActive }) {
  const [courses, setCourses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [totalBytes, setTotalBytes] = useState(0);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const refresh = () => {
    setCourses(listCourses());
    setActiveId(getActiveCourseId());
    setTotalBytes(getStorageUsageBytes());
  };

  // Reads external state (localStorage-backed course registry) on mount —
  // a legitimate use of an effect for synchronizing with an external system.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  const handleDelete = (courseId) => {
    const result = deleteCourse(courseId);
    if (!result.ok) {
      setErrorMsg(result.reason);
      return;
    }
    setErrorMsg('');
    setDeleteTargetId(null);
    refresh();
    onCoursesChanged?.();
  };

  const deleteTarget = courses.find((c) => c.id === deleteTargetId);

  return (
    <div className="mm-wrap">
      <div className="mm-total">
        <span>Total storage used</span>
        <strong>{formatBytes(totalBytes)}</strong>
      </div>

      {errorMsg && <div className="mm-error">{errorMsg}</div>}

      <ul className="mm-list">
        {courses.map((c) => {
          const bytes = getPerCourseStorageBytes(c.id);
          const isActive = c.id === activeId;
          return (
            <li key={c.id} className="mm-item">
              <div className="mm-item__main">
                <div className="mm-item__title">
                  {c.title}
                  {isActive && <span className="mm-active-tag">ACTIVE</span>}
                  {c.isDefault && <span className="mm-default-tag">BUILT-IN</span>}
                </div>
                <div className="mm-item__meta">{c.lectureCount} lectures · {formatBytes(bytes)} of progress data</div>
              </div>
              <div className="mm-item__actions">
                {!isActive && (
                  <button className="mm-btn" onClick={() => onRequestSetActive?.(c.id)}>Set active</button>
                )}
                <button className="mm-btn mm-btn--danger" onClick={() => setDeleteTargetId(c.id)}>Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
      {courses.length <= 1 && (
        <p className="mm-hint">At least one course must always remain — import another course before deleting this one.</p>
      )}

      <DeleteConfirmModal
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => handleDelete(deleteTargetId)}
        title="Delete course"
        itemName={deleteTarget?.title}
        warningMessage="Deleting this course will permanently remove all its saved progress — watched lectures, streak history, daily plans, start date, and settings. This action cannot be undone."
      />
    </div>
  );
}
