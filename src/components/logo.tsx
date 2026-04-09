/**
 * CardWatch Logo — A playing card with an eye/scan motif.
 * Represents "watching" for cards. Subtle, clean, works on dark and light backgrounds.
 */
export default function Logo({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Card shape */}
      <rect
        x="6"
        y="3"
        width="20"
        height="26"
        rx="3"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {/* Eye/scan — outer */}
      <path
        d="M16 12C12 12 9 16 9 16C9 16 12 20 16 20C20 20 23 16 23 16C23 16 20 12 16 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eye — inner circle (iris) */}
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
      {/* Scan lines */}
      <line x1="10" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="25" x2="22" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
