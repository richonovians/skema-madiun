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