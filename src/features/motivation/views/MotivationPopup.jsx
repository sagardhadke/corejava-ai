import { useMotivationViewModel } from '../viewmodels/useMotivationViewModel.js';
import './MotivationPopup.css';

export default function MotivationPopup({
  today,
  stats,
  streak,
  courseTitle,
  viewModel,
}) {
  const internalVm = useMotivationViewModel({ today, stats, streak, courseTitle });
  const vm = viewModel || internalVm;

  if (!vm.visible) return null;

  return (
    <div className="motivation-overlay" onClick={vm.dismiss}>
      <div
        className="motivation-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily Motivation"
      >
        <button
          className="motivation-card__close"
          onClick={vm.dismiss}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="motivation-card__badge">
          <SparkleIcon />
          <span>Daily Motivation</span>
          {vm.isAiGenerated && <span className="motivation-card__ai-tag">AI</span>}
        </div>

        <h3 className="motivation-card__greeting">Welcome back!</h3>

        <div className="motivation-card__body">
          {vm.loading ? (
            <p className="motivation-card__loading">Generating your message...</p>
          ) : (
            <p className="motivation-card__text">"{vm.message}"</p>
          )}
        </div>

        <button
          className="motivation-card__cta"
          onClick={vm.dismiss}
        >
          Start Studying →
        </button>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
    </svg>
  );
}
