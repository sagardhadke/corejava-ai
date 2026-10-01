/**
 * High-fidelity SVG Badge Emblems for Course Completion & Streak Milestones
 */

export default function BadgeIcon({ id, isUnlocked = false, size = 48, className = '' }) {
  const s = size;

  switch (id) {
    // ----------------------------------------------------
    // COURSE COMPLETION BADGES (10%, 20%, 50%, 80%, 90%, 100%)
    // ----------------------------------------------------
    case 'completion_10':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_c10_bg)' : '#191c22'} stroke={isUnlocked ? '#cd7f32' : '#2a2e37'} strokeWidth="2.5" />
          <path d="M24 10 L35 17 L35 31 L24 38 L13 31 L13 17 Z" stroke={isUnlocked ? '#f59e0b' : '#374151'} strokeWidth="1.5" fill={isUnlocked ? 'rgba(205,127,50,0.2)' : 'none'} />
          <path d="M24 16 L24 28 M18 22 C18 19 24 18 24 18 C24 18 30 19 30 22 C30 25 24 27 24 27 C24 27 18 25 18 22 Z" fill={isUnlocked ? '#fef08a' : '#4b5563'} stroke={isUnlocked ? '#cd7f32' : '#374151'} strokeWidth="1.2" strokeLinecap="round" />
          <text x="24" y="36" textAnchor="middle" fontSize="8" fontWeight="800" fill={isUnlocked ? '#fef08a' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">10%</text>
          <defs>
            <linearGradient id="grad_c10_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#78350f" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#451a03" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'completion_20':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_c20_bg)' : '#191c22'} stroke={isUnlocked ? '#e07a5f' : '#2a2e37'} strokeWidth="2.5" />
          <path d="M24 11 L36 24 L24 37 L12 24 Z" stroke={isUnlocked ? '#fb923c' : '#374151'} strokeWidth="1.5" fill={isUnlocked ? 'rgba(224,122,95,0.25)' : 'none'} />
          {/* Rocket icon */}
          <path d="M24 14 C27 17 29 22 28 26 L20 26 C19 22 21 17 24 14 Z" fill={isUnlocked ? '#fed7aa' : '#4b5563'} />
          <path d="M19 26 L16 30 L20 29 Z" fill={isUnlocked ? '#f97316' : '#374151'} />
          <path d="M29 26 L32 30 L28 29 Z" fill={isUnlocked ? '#f97316' : '#374151'} />
          <circle cx="24" cy="21" r="2" fill={isUnlocked ? '#ea580c' : '#1f2937'} />
          <text x="24" y="37" textAnchor="middle" fontSize="8" fontWeight="800" fill={isUnlocked ? '#fed7aa' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">20%</text>
          <defs>
            <linearGradient id="grad_c20_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#9a3412" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#431407" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'completion_50':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_c50_bg)' : '#191c22'} stroke={isUnlocked ? '#94a3b8' : '#2a2e37'} strokeWidth="2.5" />
          <path d="M24 8 C32.8 8 40 15.2 40 24 C40 32.8 32.8 40 24 40 L24 8 Z" fill={isUnlocked ? 'rgba(203,213,225,0.25)' : '#1f2937'} />
          <path d="M24 8 L24 40" stroke={isUnlocked ? '#f8fafc' : '#374151'} strokeWidth="2" strokeDasharray="3 2" />
          {/* Milestone Shield & Star */}
          <path d="M24 14 L30 18 L30 25 C30 28 27 31 24 33 C21 31 18 28 18 25 L18 18 Z" fill={isUnlocked ? '#f1f5f9' : '#4b5563'} stroke={isUnlocked ? '#94a3b8' : '#374151'} strokeWidth="1.5" />
          <path d="M24 19 L25.5 22 L29 22.5 L26.5 25 L27 28.5 L24 27 L21 28.5 L21.5 25 L19 22.5 L22.5 22 Z" fill={isUnlocked ? '#0284c7' : '#1f2937'} />
          <text x="24" y="38" textAnchor="middle" fontSize="8" fontWeight="800" fill={isUnlocked ? '#f8fafc' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">50%</text>
          <defs>
            <linearGradient id="grad_c50_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'completion_80':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_c80_bg)' : '#191c22'} stroke={isUnlocked ? '#ffb800' : '#2a2e37'} strokeWidth="2.5" />
          {/* Golden Crown */}
          <path d="M14 28 L14 19 L19 23 L24 14 L29 23 L34 19 L34 28 Z" fill={isUnlocked ? 'url(#grad_gold_fill)' : '#4b5563'} stroke={isUnlocked ? '#ffb800' : '#374151'} strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="14" cy="18" r="1.5" fill={isUnlocked ? '#fef08a' : '#6b7280'} />
          <circle cx="24" cy="13" r="2" fill={isUnlocked ? '#fef08a' : '#6b7280'} />
          <circle cx="34" cy="18" r="1.5" fill={isUnlocked ? '#fef08a' : '#6b7280'} />
          <rect x="14" y="27" width="20" height="3" rx="1.5" fill={isUnlocked ? '#d97706' : '#374151'} />
          <text x="24" y="38" textAnchor="middle" fontSize="8" fontWeight="800" fill={isUnlocked ? '#fef08a' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">80%</text>
          <defs>
            <linearGradient id="grad_c80_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#854d0e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#451a03" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad_gold_fill" x1="14" y1="14" x2="34" y2="30">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'completion_90':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_c90_bg)' : '#191c22'} stroke={isUnlocked ? '#38bdf8' : '#2a2e37'} strokeWidth="2.5" />
          {/* Diamond Gem */}
          <path d="M16 20 L24 13 L32 20 L24 30 Z" fill={isUnlocked ? 'url(#grad_cyan_fill)' : '#4b5563'} stroke={isUnlocked ? '#e0f2fe' : '#374151'} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M16 20 L32 20 M24 13 L24 30 M20 20 L24 30 M28 20 L24 30" stroke={isUnlocked ? 'rgba(255,255,255,0.7)' : '#1f2937'} strokeWidth="1" />
          {/* Radiating sparkles */}
          <circle cx="12" cy="15" r="1" fill={isUnlocked ? '#7dd3fc' : '#4b5563'} />
          <circle cx="36" cy="15" r="1" fill={isUnlocked ? '#7dd3fc' : '#4b5563'} />
          <circle cx="24" cy="33" r="1.2" fill={isUnlocked ? '#bae6fd' : '#4b5563'} />
          <text x="24" y="39" textAnchor="middle" fontSize="8" fontWeight="800" fill={isUnlocked ? '#e0f2fe' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">90%</text>
          <defs>
            <linearGradient id="grad_c90_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#075985" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad_cyan_fill" x1="16" y1="13" x2="32" y2="30">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'completion_100':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_c100_bg)' : '#191c22'} stroke={isUnlocked ? '#c084fc' : '#2a2e37'} strokeWidth="2.5" />
          {/* Laurel Wreath */}
          <path d="M12 28 C10 21 15 15 20 13 M28 13 C33 15 38 21 36 28" stroke={isUnlocked ? '#e9d5ff' : '#374151'} strokeWidth="1.8" strokeLinecap="round" />
          {/* Grand Trophy Cup */}
          <path d="M17 16 H31 V22 C31 26 27 28 24 28 C21 28 17 26 17 22 Z" fill={isUnlocked ? 'url(#grad_purple_gold)' : '#4b5563'} stroke={isUnlocked ? '#f3e8ff' : '#374151'} strokeWidth="1.5" />
          {/* Cup handles */}
          <path d="M17 18 C14 18 13 22 17 23" stroke={isUnlocked ? '#c084fc' : '#374151'} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M31 18 C34 18 35 22 31 23" stroke={isUnlocked ? '#c084fc' : '#374151'} strokeWidth="1.5" strokeLinecap="round" />
          {/* Trophy Stem & Base */}
          <path d="M24 28 V32 M20 32 H28" stroke={isUnlocked ? '#f3e8ff' : '#374151'} strokeWidth="2" strokeLinecap="round" />
          <text x="24" y="40" textAnchor="middle" fontSize="7.5" fontWeight="900" fill={isUnlocked ? '#f3e8ff' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">100%</text>
          <defs>
            <linearGradient id="grad_c100_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#581c87" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#2e1065" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad_purple_gold" x1="17" y1="16" x2="31" y2="28">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
        </svg>
      );

    // ----------------------------------------------------
    // STREAK COMPLETION BADGES (7, 15, 30, 50, 75, 100 DAYS)
    // ----------------------------------------------------
    case 'streak_7':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_s7_bg)' : '#191c22'} stroke={isUnlocked ? '#f97316' : '#2a2e37'} strokeWidth="2.5" />
          {/* Flame Icon */}
          <path d="M24 11 C26 15 22 17 22 21 C22 22.5 23 24 25 24 C28 24 30 21 30 19 C31 23 30 29 24 31 C18 31 16 25 17 21 C18 17 21 14 24 11 Z" fill={isUnlocked ? 'url(#grad_s7_flame)' : '#4b5563'} />
          <path d="M24 23 C25 25 23 27 24 29 C22 29 21 27 22 25 C22.5 24 23.5 23 24 23 Z" fill={isUnlocked ? '#fffbeb' : '#1f2937'} />
          <text x="24" y="39" textAnchor="middle" fontSize="8" fontWeight="800" fill={isUnlocked ? '#ffedd5' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">7 DAYS</text>
          <defs>
            <linearGradient id="grad_s7_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#7c2d12" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#431407" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad_s7_flame" x1="17" y1="11" x2="30" y2="31">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'streak_15':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_s15_bg)' : '#191c22'} stroke={isUnlocked ? '#fb7185' : '#2a2e37'} strokeWidth="2.5" />
          {/* Double Twin Flames */}
          <path d="M21 12 C23 16 19 18 19 22 C19 25 22 26 24 24 C23 21 25 18 27 16 C28 20 27 24 24 26 C21 27 18 25 18 20 C18 16 20 14 21 12 Z" fill={isUnlocked ? '#fb7185' : '#4b5563'} />
          <path d="M27 14 C29 18 26 20 26 23 C26 26 29 27 30 25 C29 23 31 20 32 18 C33 21 32 25 29 27 C26 28 24 26 24 22 C24 18 26 16 27 14 Z" fill={isUnlocked ? '#fda4af' : '#374151'} />
          <circle cx="24" cy="22" r="2" fill={isUnlocked ? '#fff1f2' : '#1f2937'} />
          <text x="24" y="38" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={isUnlocked ? '#ffe4e6' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">15 DAYS</text>
          <defs>
            <linearGradient id="grad_s15_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#881337" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4c0519" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'streak_30':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_s30_bg)' : '#191c22'} stroke={isUnlocked ? '#34d399' : '#2a2e37'} strokeWidth="2.5" />
          {/* Calendar Shield + Emerald Flame */}
          <rect x="14" y="13" width="20" height="17" rx="3" fill={isUnlocked ? 'rgba(52,211,153,0.2)' : 'none'} stroke={isUnlocked ? '#34d399' : '#374151'} strokeWidth="1.5" />
          <path d="M14 18 H34" stroke={isUnlocked ? '#34d399' : '#374151'} strokeWidth="1.5" />
          <circle cx="18" cy="11" r="1" fill={isUnlocked ? '#6ee7b7' : '#4b5563'} />
          <circle cx="30" cy="11" r="1" fill={isUnlocked ? '#6ee7b7' : '#4b5563'} />
          <path d="M24 19 C25 21 23 23 24 25 C25 27 23 28 22 27 C21 26 21 24 22 23 C22.5 21 23.5 20 24 19 Z" fill={isUnlocked ? '#a7f3d0' : '#4b5563'} />
          <text x="24" y="38" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={isUnlocked ? '#d1fae5' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">30 DAYS</text>
          <defs>
            <linearGradient id="grad_s30_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#064e3b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'streak_50':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_s50_bg)' : '#191c22'} stroke={isUnlocked ? '#eab308' : '#2a2e37'} strokeWidth="2.5" />
          {/* Golden Solar Fireball */}
          <circle cx="24" cy="21" r="8" fill={isUnlocked ? 'url(#grad_gold_sun)' : '#4b5563'} />
          {/* Sunburst rays */}
          <path d="M24 8 V11 M24 31 V34 M11 21 H14 M34 21 H37 M15 12 L17 14 M31 28 L33 30 M15 30 L17 28 M31 14 L33 12" stroke={isUnlocked ? '#fde047' : '#374151'} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M24 16 C25.5 18 23 20 24 22 C25 24 23 25 22 24 C21 23 22 21 22.5 19 C23 18 23.5 17 24 16 Z" fill={isUnlocked ? '#ffffff' : '#1f2937'} />
          <text x="24" y="38" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={isUnlocked ? '#fef08a' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">50 DAYS</text>
          <defs>
            <linearGradient id="grad_s50_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#713f12" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#422006" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad_gold_sun" x1="16" y1="13" x2="32" y2="29">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'streak_75':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_s75_bg)' : '#191c22'} stroke={isUnlocked ? '#06b6d4' : '#2a2e37'} strokeWidth="2.5" />
          {/* Diamond Prism + Cyan Flame */}
          <polygon points="24,10 33,18 24,31 15,18" fill={isUnlocked ? 'rgba(6,182,212,0.3)' : 'none'} stroke={isUnlocked ? '#67e8f9' : '#374151'} strokeWidth="1.5" />
          <path d="M24 14 C26 17 23 19 24 22 C25 24 24 26 23 25 C21.5 24 22 22 23 20 C23.5 19 23.5 16 24 14 Z" fill={isUnlocked ? '#cffafe' : '#4b5563'} />
          <circle cx="24" cy="18" r="1.5" fill={isUnlocked ? '#ffffff' : '#1f2937'} />
          <text x="24" y="39" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={isUnlocked ? '#cffafe' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">75 DAYS</text>
          <defs>
            <linearGradient id="grad_s75_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#164e63" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#083344" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'streak_100':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill={isUnlocked ? 'url(#grad_s100_bg)' : '#191c22'} stroke={isUnlocked ? '#ec4899' : '#2a2e37'} strokeWidth="2.5" />
          {/* Centurion 100 Laurel & Cosmic Flame */}
          <path d="M12 26 C11 20 15 14 19 12 M29 12 C33 14 37 20 36 26" stroke={isUnlocked ? '#fbcfe8' : '#374151'} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M24 10 C27 15 22 17 22 22 C22 24.5 24 26 26 25 C29 25 31 21 31 18 C32 23 31 29 24 30 C17 30 16 23 18 19 C19 15 22 12 24 10 Z" fill={isUnlocked ? 'url(#grad_s100_flame)' : '#4b5563'} />
          <path d="M24 20 C25 22 23 24 24 26 C23 26 22 24 23 22 C23.2 21 23.8 20.5 24 20 Z" fill={isUnlocked ? '#ffffff' : '#1f2937'} />
          <text x="24" y="39" textAnchor="middle" fontSize="7" fontWeight="900" fill={isUnlocked ? '#fdf2f8' : '#6b7280'} fontFamily="'Space Grotesk', sans-serif">100 DAYS</text>
          <defs>
            <linearGradient id="grad_s100_bg" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#831843" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#500724" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad_s100_flame" x1="16" y1="10" x2="31" y2="30">
              <stop offset="0%" stopColor="#fdf2f8" />
              <stop offset="40%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
          </defs>
        </svg>
      );

    default:
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#191c22" stroke="#2a2e37" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="10" fill="#21252d" />
        </svg>
      );
  }
}
