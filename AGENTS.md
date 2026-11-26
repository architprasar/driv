# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages (route segments like `parts/[id]`, `auctions/live`, `checkout/booking`).
- `src/components/`: Reusable React UI components (PascalCase filenames, e.g., `PartImageGallery.tsx`).
- `src/lib/`: Frontend API helpers (`api-client.ts`, `api-server.ts`).
- `public/`: Static frontend assets.
- `backend/`: Django backend (`manage.py`, `config/`, and domain apps in `backend/apps/*`).
- `backend/media/`: Uploaded/seeded media assets. Treat as runtime data, not feature code.
- `stitch 2/`: Design references and static mockups.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js frontend locally.
- `npm run build`: Create production frontend build.
- `npm run start`: Run the built frontend.
- `npm run lint`: Run ESLint for frontend TS/React code.
- `cd backend && python manage.py runserver`: Start Django API server.
- `cd backend && python manage.py test`: Run backend test suite.

## Coding Style & Naming Conventions
- TypeScript/React: 2-space indentation, functional components, and route files named `page.tsx`/`layout.tsx`.
- Components use PascalCase (`SellCaptureForm.tsx`); utility modules use kebab-case (`api-client.ts`).
- Python (Django): PEP 8 conventions, snake_case for functions/modules, PascalCase for classes.
- Run `npm run lint` before opening a PR.
- Important: this repo uses Next.js `16.2.1` with breaking changes. Before changing framework behavior, read the relevant docs under `node_modules/next/dist/docs/`.

## Testing Guidelines
- Backend tests live alongside apps (e.g., `backend/apps/orders/tests.py`).
- Add or update tests for behavior changes in serializers, views, and routing.
- Frontend has linting configured; add UI tests only when introducing non-trivial client behavior.
- Keep test names descriptive (`test_<feature>_<expected_behavior>`).

## Commit & Pull Request Guidelines
- Current history is minimal (`Initial commit from Create Next App`); use clear, imperative commits going forward.
- Recommended commit format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- PRs should include: scope summary, affected paths (frontend/backend), test evidence (`npm run lint`, Django tests), and screenshots for UI changes.
- Link related issues/tasks and call out breaking API or schema changes explicitly.

## Security & Configuration Tips
- Do not commit secrets or local environment files.
- Avoid committing generated artifacts (`.next/`, `__pycache__/`) in feature branches.
- Treat `backend/db.sqlite3` as local/dev data unless a change explicitly requires database snapshot updates.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
