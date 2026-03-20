# AGENTS.md - Guidelines for AI Coding Agents

This document provides guidelines for AI coding agents working in this repository.

## Build/Lint/Test Commands

### Frontend (npm scripts)
```bash
# Development
npm run dev          # Start Vite dev server (port 1420)
npm run tauri dev    # Start Tauri desktop app in dev mode

# Production
npm run build        # TypeScript check (tsc) + Vite build
npm run tauri build  # Build Tauri desktop app installer
npm run preview      # Preview production build

# Rust Backend
cargo build          # Build Rust code (run from src-tauri/)
cargo test           # Run Rust tests (run from src-tauri/)
cargo clippy         # Rust linter (run from src-tauri/)
```

### Running Single Tests
- **No frontend test framework installed** - consider adding Vitest
- **Rust**: `cargo test <test_name>` runs a specific test

### Type Checking
```bash
npx tsc --noEmit     # Type-check without building
```

**Note**: No ESLint/Prettier configured. TypeScript strict mode is enabled.

---

## Code Style Guidelines

### TypeScript/JavaScript

#### Imports
```typescript
// React imports first, then Tauri, then local
import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
```

#### Types
- Use explicit types for function parameters and return values
- Avoid `any` - use proper interfaces or `unknown` when uncertain
- Define interfaces for data structures (e.g., `ChapterContent`, `Book`)

```typescript
interface Chapter {
  id: number;
  title: string;
  body: string;
  order_index: number;
}
```

#### Naming Conventions
- **Components**: PascalCase (e.g., `BookCard`, `VirtualTocList`)
- **Functions/Variables**: camelCase (e.g., `fetchBooks`, `currentChapterIndex`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `ITEM_H`, `TRIGGER_DISTANCE`)
- **Database columns**: snake_case (e.g., `progress_index`, `order_index`)

### React Patterns

#### Component Structure
```typescript
// Functional components with hooks
function ComponentName({ prop1, prop2 }: Props) {
  const [state, setState] = useState<Type>(initialValue);
  const ref = useRef<Type>(null);

  useEffect(() => {
    // Effect logic
    return () => { /* cleanup */ };
  }, [dependencies]);

  return <div>...</div>;
}
```

#### State Management
- Use `useState` for local component state
- Use `useRef` for mutable values that don't trigger re-renders
- Lift state up to parent when multiple children need access

### Error Handling

```typescript
// Async operations with try/catch
try {
  const result = await invoke("command_name", { param });
  // Handle success
} catch (err) {
  console.error("Operation failed:", err);
  alert("Error message: " + err);
}

// Database operations
try {
  await db.execute("SQL", [params]);
} catch (err) {
  console.error("Database error:", err);
}
```

### Tailwind CSS

- Use utility classes directly in JSX
- Prefer Tailwind over custom CSS
- Common patterns:
  - Flexbox: `flex items-center justify-between`
  - Spacing: `p-4`, `px-6 py-3`, `gap-4`
  - Colors: `bg-slate-800`, `text-white`, `border-white/10`
  - Transitions: `transition-all`, `hover:bg-white/10`, `active:scale-95`

---

## Project Structure

```
ReaderWin/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Tauri commands and app setup
│   │   └── main.rs        # Entry point
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── package.json           # Frontend dependencies and scripts
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

---

## Key Tauri Commands (Rust → Frontend)

| Command | Purpose |
|---------|---------|
| `parse_txt` | Parse TXT file into chapters |
| `parse_epub` | Parse EPUB file into chapters |
| `webdav_sync` | Upload/download database via WebDAV |
| `search_in_book` | Search text within a book |
| `check_update_custom` | Check for app updates |

---

## Database Schema

- **books**: id, title, author, path, progress_index, progress_offset, last_read
- **chapters**: id, book_id, title, body, order_index, link
- **settings**: key (PK), value
- **replacement_rules**: id, pattern, replacement, scope, is_regex, active
