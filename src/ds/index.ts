/* ===========================================================================
   Starfall Academy — design system (native React 19 package)
   ---------------------------------------------------------------------------
   Ported from the Claude Design source export. Replaces the runtime UMD bundle
   (`window.StarfallAcademyDesignSystem_61fef2`) that the iframe prototype loaded
   from a <script>. Component CSS lives in ds.css (imported here once); the
   design tokens it references are loaded by the root layout via
   src/styles/design-system.css.
   =========================================================================== */
import "./ds.css";

export { Button, type ButtonProps } from "./Button";
export { Badge, type BadgeProps } from "./Badge";
export { Card, type CardProps } from "./Card";
export { Crest, type CrestProps } from "./Crest";
export { IconButton, type IconButtonProps } from "./IconButton";
export { Banner, type BannerProps } from "./Banner";
export { Input, type InputProps } from "./Input";
export { Select, type SelectProps, type SelectOption } from "./Select";
export { Checkbox, type CheckboxProps } from "./Checkbox";
export { Switch, type SwitchProps } from "./Switch";
export { Tabs, type TabsProps, type TabItem } from "./Tabs";
