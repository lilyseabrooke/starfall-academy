"use client";

import * as React from "react";

/**
 * A labelled text field with optional hint, error state, and leading/trailing
 * icons. Wraps a native <input>, so all input attributes pass through.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Helper text below the field. */
  hint?: React.ReactNode;
  /** Error message — also flips the field into the error style. */
  error?: React.ReactNode;
  /** Show a gold required asterisk. @default false */
  required?: boolean;
  /** Icon inside the field, left side. */
  iconLeft?: React.ReactNode;
  /** Icon inside the field, right side. */
  iconRight?: React.ReactNode;
}

export function Input({
  label,
  hint,
  error,
  required = false,
  iconLeft,
  iconRight,
  id,
  className = "",
  ...rest
}: InputProps) {
  const reactId = React.useId();
  const fieldId = id || reactId;
  const wrapCls = ["sa-field", error ? "sa-field--error" : "", className].filter(Boolean).join(" ");
  const inputCls = ["sa-input", iconLeft ? "sa-input--has-left" : "", iconRight ? "sa-input--has-right" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={wrapCls}>
      {label ? (
        <label className="sa-field__label" htmlFor={fieldId}>
          {label}
          {required ? <span className="sa-field__req">*</span> : null}
        </label>
      ) : null}
      <div className="sa-field__wrap">
        {iconLeft ? <span className="sa-field__icon sa-field__icon--left">{iconLeft}</span> : null}
        <input id={fieldId} className={inputCls} aria-invalid={!!error} {...rest} />
        {iconRight ? <span className="sa-field__icon sa-field__icon--right">{iconRight}</span> : null}
      </div>
      {error ? (
        <span className="sa-field__hint">{error}</span>
      ) : hint ? (
        <span className="sa-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
