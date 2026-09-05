# Versioning

Starfall Academy uses [semantic versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR** — reserved for a rewrite or a break in how existing campaigns/characters
  work (a save-data migration, a rules overhaul). Hasn't happened yet.
- **MINOR** — a new player- or GM-facing feature (a new sheet tab, a new Compendium
  view, a new roll mechanic).
- **PATCH** — bug fixes, copy/UI tweaks, and refinements to something already
  shipped this minor version.

The version lives in one place, `package.json`'s `"version"` field, and is
re-exported from `src/lib/version.ts` as `APP_VERSION`. It's shown in the
footer on the landing page and the character dashboard, so anyone can tell at
a glance whether they're on the latest deploy.

**When merging a PR to `main`:** bump `package.json`'s version as part of the
PR — minor for a new feature, patch for a fix — before merging. `CHANGELOG.md`
gets a matching entry. The PR template (`.github/pull_request_template.md`)
has a Version section for this so it isn't forgotten.

Versioning started retroactively at **v1.0.0**: the build that was live for
the first real game session (2026-07-17). See `CHANGELOG.md` for the full
history, including how the early versions were reconstructed from git and
Vercel deployment history.
