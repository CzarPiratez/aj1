# AidJobs Platform - Deployment Guide

## Quick Deploy Options

### 1. Deploy to Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### 2. Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables in Vercel dashboard

### 3. Deploy to GitHub Pages
```bash
npm run build
npm run preview
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Database Setup

1. Create a new Supabase project
2. Run the migrations in `supabase/migrations/` in order
3. Enable authentication in Supabase dashboard
4. Configure email templates (optional)

## Build Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Domain Configuration

After deployment, you can configure a custom domain through your hosting provider's dashboard.

## Troubleshooting

- Ensure all environment variables are set correctly
- Check that Supabase project is active and accessible
- Verify database migrations have been applied
- Check browser console for any JavaScript errors