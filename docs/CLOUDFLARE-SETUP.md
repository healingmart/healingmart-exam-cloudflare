# Cloudflare EXAM 운영 설정 (2026-10-30)

- Worker: `healingmart-exam-cloudflare`
- Repository: https://github.com/healingmart/healingmart-exam-cloudflare
- Production: https://healingmart-exam-cloudflare.eternityland34.workers.dev
- Mode: Cloudflare Workers Static Assets + `/api/health` only
- Bindings: `ASSETS` only. No D1/KV/R2/AI/Queues.
- Cron: none until vetted ingestion pipeline is ready.
- Cache: HTML revalidates; JS/CSS 60s; JSON 60s.
- Never expose API keys through public JSON or GitHub.

## Build automation — one-time dashboard connection

1. Cloudflare Dashboard → Workers & Pages → `healingmart-exam-cloudflare` → Settings → Builds → Connect.
2. Connect GitHub and authorize `healingmart/healingmart-exam-cloudflare` if not previously installed.
3. Production branch: `main`. Root directory: `/`.
4. Build command: `npm run check`.
5. Deploy command: `npx wrangler deploy`.
6. Set Build watch paths to app/config/data only if necessary. GitHub Actions not needed.
7. After enabling, test with a harmless Git commit and verify Builds success.

This OAuth app authorization step may require the owner's interactive login. Until then manual deploy with `npx wrangler deploy` works.

## Checks

```bash
npm run check
npx wrangler deploy
curl -sS https://healingmart-exam-cloudflare.eternityland34.workers.dev/api/health
```

No live API credentials are necessary for this seed release. Add Cloudflare secrets only when source contracts and data ingestion have been approved.
