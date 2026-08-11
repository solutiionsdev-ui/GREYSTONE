// 📖 Docs: obsidian/frontend/components/common.md

/**
 * Underlined contact-form input — Figma "Frame 2147225517" (1484:1684).
 *
 * The design shows only the field name sitting on a rule, so the name doubles
 * as the placeholder; the real `<label>` stays in the accessibility tree.
 */
export interface TextFieldProps {
  name: string;
  label: string;
  type: "text" | "tel" | "email";
  autoComplete: string;
  required?: boolean;
}

export const TextField = ({
  name,
  label,
  type,
  autoComplete,
  required = true,
}: TextFieldProps) => (
  <div className="flex flex-1 items-center border-b border-border-field pb-3">
    <label htmlFor={name} className="sr-only">
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      autoComplete={autoComplete}
      required={required}
      placeholder={label}
      className="w-full bg-transparent text-lead leading-body text-foreground outline-none placeholder:text-foreground focus-visible:placeholder:text-foreground-muted"
    />
  </div>
);
