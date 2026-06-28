# Backend Deployment

Deploy `BACKEND/` as its own Node service. The app listens on `PORT` and exposes `GET /api/health` for platform health checks.

## Render

- Connect the backend repository.
- Use the included `render.yaml`, or set these manually:
- Build command: `npm ci && npm run build`
- Start command: `npm run start:prod`
- Health check path: `/api/health`

## Railway

- Connect the backend repository.
- Railway can use the included `railway.json` and `nixpacks.toml`.
- The backend deploy is forced to npm with `npm ci`, not pnpm.
- Add a PostgreSQL service or external Postgres URL, then set `DATABASE_URL`.

## Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_ACCESS_SECRET`: random string, minimum 32 characters.
- `JWT_REFRESH_SECRET`: different random string, minimum 32 characters.
- `R2_ACCOUNT_ID`: Cloudflare account ID.
- `R2_ACCESS_KEY_ID`: R2 access key.
- `R2_SECRET_ACCESS_KEY`: R2 secret key.
- `R2_BUCKET_NAME`: R2 bucket for PDFs.
- `R2_PUBLIC_URL`: public R2 bucket/custom-domain URL.
- `RESEND_API_KEY`: starts with `re_`.
- `EMAIL_FROM`: verified sender email in Resend.
- `FRONTEND_URL`: deployed frontend origin, for example `https://your-app.vercel.app`.

Do not include `/api` in `FRONTEND_URL`.

## After Deploy

- Run database migrations from the backend service shell or a CI job: `npx drizzle-kit migrate`.
- Verify health: `https://your-backend-host/api/health`.
- Verify docs: `https://your-backend-host/api/docs`.
