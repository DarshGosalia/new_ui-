# github_fin

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Typescript

## Tech Stack

- **Runtime**: node
- **Package Manager**: npm

### Frontend

- Framework: tanstack-router
- CSS: tailwind
- UI Library: shadcn-ui

### Backend

- Framework: express
- API: trpc
- Validation: zod

### Database

- Database: sqlite
- ORM: drizzle

### Authentication

- Provider: better-auth

### Additional Features

- Testing: vitest

## Project Structure

```
github_fin/
├── apps/
│   ├── web/         # Frontend application
│   └── server/      # Backend API
├── packages/
│   ├── api/         # API layer
│   ├── auth/        # Authentication
│   └── db/          # Database schema
```

## Common Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open database UI

## Maintenance

Keep CLAUDE.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.
