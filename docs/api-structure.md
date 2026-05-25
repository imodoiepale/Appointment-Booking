# API Structure

The application exposes API routes through Next.js route handlers in `app/api`.
Those files are intentionally thin URL entry points that re-export handlers from
the top-level `api` folder.

## Route Groups

### Auth APIs

- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Implementation: `api/auth`

### Google Auth APIs

- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/google/status`
- `POST /api/auth/google/disconnect`

Implementation: `api/auth/google`

### Calendar APIs

- `POST /api/auto-sync-calendar`
- `PUT /api/auto-sync-calendar`
- `DELETE /api/auto-sync-calendar`
- `POST /api/sync-to-calendar`

Implementation: `api/calendar`

### Meeting APIs

- `GET /api/meetings`
- `POST /api/meetings`
- `GET /api/meetings/[id]`
- `PATCH /api/meetings/[id]`
- `DELETE /api/meetings/[id]`

Implementation: `api/meetings`

### Notification APIs

- `GET /api/meeting-notifications`

Implementation: `api/notifications`

### Diagnostic APIs

- `GET /api/test-env`

Implementation: `api/diagnostics`

## Legacy Pages API Files

The `pages/api` folder still contains older or experimental Pages Router files.
They were left in place to avoid changing runtime behavior while the App Router
APIs were reorganized.

## Supabase Edge Functions

The `supabase/functions` folder contains deployable Supabase functions such as
`scheduler` and `booking-confirmation`. These are separate from Next.js API
routes and are deployed with the Supabase CLI.
