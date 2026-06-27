"use client";

import * as React from "react";

export interface TabItem {
  /** Unique value identifying the tab. */
  value: string;
  /** Visible label. */
  label: React.ReactNode;
  /** Optional leading icon node. */
  icon?: React.ReactNode;
  /** Optional trailing count. */
  count?: number;
}

/**
 * A horizontal tab bar with a gold active underline. Controlled (`value` +
 * `onChange`) or uncontrolled (`defaultValue`).
 */
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The tabs to render. */
  items: TabItem[];
  /** Controlled active value. */
  value?: string;
  /** Uncontrolled initial value. @default first item */
  defaultValue?: string;
  /** Fires with the newly selected value. */
  onChange?: (value: string) => void;
}

export function Tabs({ items = [], value, defaultValue, onChange, className = "", ...rest }: TabsProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<string | undefined>(
    defaultValue ?? (items[0] && items[0].value)
  );
  const active = isControlled ? value : internal;
  const select = (v: string) => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };
  return (
    <div className={["sa-tabs", className].filter(Boolean).join(" ")} role="tablist" {...rest}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={active === it.value}
          className="sa-tab"
          onClick={() => select(it.value)}
        >
          {it.icon ? it.icon : null}
          {it.label}
          {it.count != null ? <span className="sa-tab__count">{it.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
