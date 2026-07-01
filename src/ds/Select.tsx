"use client";

import * as React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A styled native <select> with a gold chevron. Pass `options` for the simple
 * case, or <option> children for full control.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Field label. */
  label?: React.ReactNode;
  /** Helper text below the control. */
  hint?: React.ReactNode;
  /** Convenience options — strings or {value,label} objects. */
  options?: Array<string | SelectOption>;
  children?: React.ReactNode;
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function Select({ label, hint, options, children, id, className = "", ...rest }: SelectProps) {
  const reactId = React.useId();
  const fieldId = id || reactId;
  return (
    <div className={["sa-select-field", className].filter(Boolean).join(" ")}>
      {label ? (
        <label className="sa-select-field__label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <div className="sa-select-wrap">
        <select id={fieldId} className="sa-select" {...rest}>
          {options
            ? options.map((o) => {
                const opt: SelectOption = typeof o === "string" ? { value: o, label: o } : o;
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                );
              })
            : children}
        </select>
        <span className="sa-select-wrap__chevron">
          <Chevron />
        </span>
      </div>
      {hint ? <span className="sa-select-field__hint">{hint}</span> : null}
    </div>
  );
}
