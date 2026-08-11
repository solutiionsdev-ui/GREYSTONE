// 📖 Docs: obsidian/frontend/components/common.md

/** Figma "Group" (1469:1378) — the arrow inside every CTA's white tile. */
export interface ArrowRightIconProps {
  className?: string;
}

export const ArrowRightIcon = ({ className }: ArrowRightIconProps) => (
  <svg
    className={className}
    viewBox="0 0 18 8.71875"
    fill="none"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.7938 3.86167L17.7931 3.861L14.1192 0.204748C13.8439 -0.0691546 13.3987 -0.0681353 13.1248 0.207138C12.8508 0.482376 12.8519 0.92756 13.1271 1.2015L15.5938 3.65625H0.703125C0.314789 3.65625 0 3.97104 0 4.35937C0 4.74771 0.314789 5.0625 0.703125 5.0625H15.5938L13.1272 7.51725C12.8519 7.79118 12.8509 8.23637 13.1248 8.51161C13.3988 8.78692 13.844 8.78786 14.1192 8.514L17.7932 4.85775L17.7938 4.85708C18.0692 4.58223 18.0683 4.1356 17.7938 3.86167Z"
      fill="currentColor"
    />
  </svg>
);
