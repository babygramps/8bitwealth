# 8-Bit Wealth - Project Guide

## Overview
A retro 8-bit styled visualization of billionaire wealth vs average American household wealth. Uses 3D WebGL (Three.js/React Three Fiber) to show the real scale of wealth using $1B cubes.

## Tech Stack
- **Framework**: Next.js 15.5 with App Router
- **Styling**: Tailwind CSS v4 with NES-inspired theme
- **3D**: React Three Fiber + Three.js + @react-three/drei
- **State**: React hooks (useState, useCallback, useMemo)
- **Deployment**: Vercel
- **Cache**: Upstash Redis (via Vercel integration)

## Key Files
- `app/page.tsx` - Main page component
- `components/WealthScene3D.tsx` - 3D visualization with instanced meshes
- `components/WealthVisualization.tsx` - Container with education toggle
- `lib/wealth-data.ts` - Wealth profiles and constants
- `lib/forbes-api.ts` - Forbes Billionaires API integration
- `lib/wealth-cache.ts` - Upstash Redis caching utilities
- `app/api/cron/update-wealth/route.ts` - Monthly cron job for API updates
- `app/api/wealth/route.ts` - GET endpoint to retrieve cached wealth data

## Environment Variables

### Required for Forbes API (RapidAPI):
```
RAPIDAPI_KEY=your_rapidapi_key_here
CRON_SECRET=your_secret_for_cron_auth
```

### Required for Redis:
```
REDIS_URL=redis://default:password@your-redis-host:port
```

## Setting Up Redis on Vercel

1. Go to Vercel Dashboard → Your Project → Storage tab
2. Click "Create Database" → Select "Redis"
3. Name it (e.g., "8bitwealth-cache") and create
4. The `REDIS_URL` env var is auto-added to your project
5. Run `vercel env pull .env.development.local` to get it locally

## Vercel Cron Configuration
The `vercel.json` configures a monthly cron job:
- **Schedule**: `0 0 1 * *` (1st of every month at midnight UTC)
- **Endpoint**: `/api/cron/update-wealth`
- **Purpose**: Fetches latest billionaire data from Forbes API and caches in Redis

## API Endpoints

### GET `/api/wealth`
Returns cached billionaire wealth data or fallback data.
Response:
```json
{
  "success": true,
  "source": "cache" | "fallback",
  "data": {
    "elonMusk": { "id", "name", "netWorth", "rank", "source", "lastUpdated" },
    "updatedAt": "ISO timestamp"
  }
}
```

### GET `/api/cron/update-wealth`
Triggers the wealth data update (protected by CRON_SECRET in production).

## Performance Guidelines
Follow Vercel React Best Practices (see `.cursor/skills/vercel-react-best-practices/`):
- Use instanced meshes for many objects (BillionCubeGridInstanced)
- Functional setState for stable callbacks
- Memoize expensive computations
- Use explicit conditional rendering (ternary over &&)

## California Education Budget
The app includes a toggle to compare Elon Musk's wealth against California's annual education budget:
- **Total**: $164 billion (2025-26)
- **K-12**: $118.9 billion
- **Higher Ed**: $45.1 billion
