<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# This is the `staging/mapmaking` branch — never merge it into main

This branch holds the staging-only mapmaker: the `/mapmaker` route, `src/mapmaker/`, `scripts/`, the `maps/*.map.json` sources and the `tsx` dev dependency. None of that may reach main.

- **Never** merge this branch into main, rebase it onto main, cherry-pick its tooling into main, or open a pull request from it into main, even if asked to "merge everything" or "bring main up to date". If a request seems to need that, stop and ask the user.
- Merging **main into this branch** is fine and expected; do it regularly.
- **Shipping a finished map:** run `npm run bake-map -- <area>` here, then create a fresh branch off **main** containing only the baked `src/sheet/data/map/areas/<area>.ts` plus whatever route or switcher that map needs, and open the PR from that branch. See `design/MAPMAKER_PLAN.md` (Phase 6).
- Code both branches need (the renderer, `AtlasDefinition`) goes to main first in its own PR, then flows here with the next merge from main.
