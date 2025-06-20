# Contributing to AidJobs Platform

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aidjobs-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/
│   ├── @authenticated/     # Authenticated user components
│   ├── landing/           # Landing page components
│   ├── layout/            # Layout components (Sidebar, Chat, etc.)
│   └── ui/               # Reusable UI components (ShadCN)
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
└── main.tsx             # Application entry point

supabase/
└── migrations/          # Database schema migrations
```

## Code Style

- Use TypeScript for all new code
- Follow the existing component patterns
- Use Tailwind CSS for styling
- Maintain the AidJobs design system colors:
  - Primary: `#D5765B` (terracotta)
  - Background: `#F9F7F4` (warm white)
  - Text: `#3A3936` (dark gray)
  - Secondary: `#66615C` (medium gray)

## Component Guidelines

- Use ShadCN UI components when possible
- Follow the established naming conventions
- Include proper TypeScript types
- Add hover states and micro-interactions
- Ensure responsive design

## Database Changes

- Create new migration files in `supabase/migrations/`
- Follow the existing naming convention
- Include proper RLS policies
- Test migrations thoroughly

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Submit a pull request with clear description
5. Ensure all checks pass

## Questions?

Open an issue for any questions or suggestions.