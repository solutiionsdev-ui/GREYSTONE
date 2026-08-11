// 📖 Docs: obsidian/frontend/components/common.md

/**
 * The AERRA mark — a chevron over an arc. Figma "Union" (1484:1660 at
 * 120 × 129, and 1484:1592 scaled down inside the nav logo tile).
 */
export interface BrandMarkProps {
  className?: string;
  /** Rendered decoratively next to a text label by default. */
  title?: string;
}

export const BrandMark = ({ className, title }: BrandMarkProps) => (
  <svg
    className={className}
    viewBox="0 0 120 129"
    fill="none"
    role={title ? "img" : undefined}
    aria-hidden={title ? undefined : "true"}
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    {title ? <title>{title}</title> : null}
    <path
      d="M28.596 81.9388C28.596 99.4431 42.8424 113.633 60.4162 113.633C77.99 113.633 92.2364 99.4431 92.2364 81.9388H107.664C107.664 107.93 86.5107 129 60.4162 129C34.3218 129 13.168 107.93 13.168 81.9388H28.596Z"
      fill="currentColor"
    />
    <path
      d="M120 59.7644L109.092 70.6293L60 21.7335L10.9081 70.6293L0 59.7644L60 0L120 59.7644Z"
      fill="currentColor"
    />
  </svg>
);
