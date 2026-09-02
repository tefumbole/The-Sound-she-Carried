# The Sound She Carries

Donation site and staff admin for Lian Ministrel’s live recording concert (TSSC).

- Public landing: countdown, progress, Campay MoMo / OM / Visa
- WhatsApp thank-you and admin alerts via WasenderAPI
- Admin: campaign settings, People, Task Manager, Letters, Announcements

## Local development

```bash
cp apps/api/.env.example apps/api/.env
# set DB_*, JWT_SECRET, CAMPAY_*, WASENDER_*
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- Site: http://localhost:5173
- Admin: http://localhost:5173/admin/login

## Production

See [docs/HOSTINGER_DEPLOYMENT.md](docs/HOSTINGER_DEPLOYMENT.md).
