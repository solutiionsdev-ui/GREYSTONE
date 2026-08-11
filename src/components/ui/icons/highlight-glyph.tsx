// 📖 Docs: obsidian/frontend/components/common.md

/**
 * The two outline glyphs on the about-section highlight tiles — Figma
 * "Ellipse 2389" (1484:1761) and "Polygon 11" (1484:1760).
 */
export interface HighlightGlyphProps {
  name: "circle" | "triangle";
  className?: string;
}

export const HighlightGlyph = ({ name, className }: HighlightGlyphProps) => {
  if (name === "circle") {
    return (
      <svg
        className={className}
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="36" cy="36" r="19.5" stroke="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 43 41"
      fill="none"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.4688 5.25586C19.8157 2.92123 23.1843 2.92123 24.5312 5.25586L40.1064 32.251C41.4524 34.5843 39.7679 37.5 37.0742 37.5H5.92578C3.23205 37.5 1.5476 34.5843 2.89355 32.251L18.4688 5.25586Z"
        stroke="currentColor"
      />
    </svg>
  );
};
