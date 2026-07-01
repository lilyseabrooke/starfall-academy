"use client";

import * as React from "react";

/**
 * A checkbox with a gold check mark, optional description, and indeterminate
 * support. Controlled or uncontrolled like a native checkbox.
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Label beside the box. */
  label?: React.ReactNode;
  /** Secondary description under the label. */
  description?: React.ReactNode;
  /** Render the indeterminate (mixed) state. @default false */
  indeterminate?: boolean;
  disabled?: boolean;
}

export function Checkbox({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  indeterminate = false,
  className = "",
  ...rest
}: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const cls = ["sa-check", disabled ? "sa-check--disabled" : "", className].filter(Boolean).join(" ");
  return (
    <label className={cls}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="sa-check__box" />
      {label || description ? (
        <span className="sa-check__body">
          {label ? <span className="sa-check__label">{label}</span> : null}
          {description ? <span className="sa-check__desc">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}
