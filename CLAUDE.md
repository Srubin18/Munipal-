# Munipal - Development Guidelines

## Project Overview
AI-powered municipal bill verification for City of Johannesburg residents. Next.js 14 (App Router) + Prisma + Supabase + Tailwind CSS.

## Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production (runs prisma generate first)
- `npm run lint` - Run ESLint
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema to database

## Architecture
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components (shadcn/ui style)
- `src/lib/` - Core business logic (parsers, verification, knowledge)
- `prisma/` - Database schema
- `scripts/` - Utility scripts (run with `tsx`)

## Conventions
- TypeScript throughout
- Tailwind CSS for styling
- Prisma for database access
- Zod for validation
- shadcn/ui component patterns (Radix UI primitives)

## Superpowers
This project uses [superpowers](https://github.com/obra/superpowers) skills for structured development workflows. Skills are located in `.claude/skills/` and are automatically invoked during development tasks like brainstorming, planning, implementation, debugging, and code review.
