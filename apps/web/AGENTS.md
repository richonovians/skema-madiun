# Frontend Development Rules

Framework:
Next.js App Router

Language:
JavaScript

Styling:
Tailwind CSS

Architecture:
Feature based

File Extension:
.js / .jsx

Folder Structure:
src/
├── app/
├── components/
├── constants/
├── features/
├── hooks/
├── services/
├── stores/
└── utils/

Do not create TypeScript type definitions.
Do not use /types folder for TypeScript interfaces.

Rules:
- Jangan mengubah struktur folder tanpa izin
- Gunakan reusable components
- Semua API melalui services
- Jangan akses backend langsung dari component

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
