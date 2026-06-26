"use client";

import * as React from "react";

/**
 * A gilded on/off toggle. Controlled (`checked` + `onChange`) or uncontrolled
 * (`defaultChecked`). The track fills with metallic gold when on.
 */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Text label rendered beside the toggle. */
  label?: React.ReactNode;
  /** Controlled checked state. */
  checked?: boolean;
  /** Uncontrolled initial state. */
  defaultChecked?: boolean;
  /** Disable the control. @default false */
  disabled?: boolean;
}

export function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  className = "",
  ...rest
}: SwitchProps) {
  const cls = ["sa-switch", disabled ? "sa-switch--disabled" : "", className].filter(Boolean).join(" ");
  return (
    <label className={cls}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="sa-switch__track">
        <span className="sa-switch__thumb" />
      </span>
      {label ? <span className="sa-switch__label">{label}</span> : null}
    </label>
  );
}
