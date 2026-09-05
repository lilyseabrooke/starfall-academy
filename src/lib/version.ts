// Single source of truth for the app's displayed version number.
//
// package.json is the record of truth — bump it there and this picks it up
// everywhere the version is shown (currently the footer on the landing page
// and the signed-in character dashboard). See CHANGELOG.md for what shipped
// in each version and VERSIONING.md for the bump policy.
import packageJson from "../../package.json";

export const APP_VERSION: string = packageJson.version;
