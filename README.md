# Teej 2083 Gift Selection

A production-ready employee gift selection app with:

- a responsive public selection form;
- manual employee-name entry with roster autocomplete and automatic detail matching;
- secure duplicate-name and duplicate-submission protection;
- exclusive selection between the Teej Gift Hamper and Tranquility Spa;
- one-of-four spa treatment selection;
- Supabase persistence with Row Level Security;
- password-protected admin dashboard; and
- filtered `.xlsx` exports with response and summary worksheets.

## Architecture

- **Frontend:** Vite, vanilla JavaScript, and responsive CSS
- **Backend:** Supabase Postgres, Auth, database functions, and RLS
- **Hosting:** Cloudflare Workers with Static Assets
- **Source and CI:** GitHub with Cloudflare Workers Builds

Repository: <https://github.com/itgolchha-cmyk/teej2083>  
Cloudflare project: `teej2083`

The Supabase publishable/anon key is intentionally used in the browser. Security is enforced in Postgres: public visitors may read the active roster and call only the validated submission function; only authenticated users listed in `admin_users` can read responses.

## Local development

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the values from Supabase **Project Settings > API**.
3. Install and start:

   ```sh
   npm install
   npm run dev
   ```

The public form is at `/`; the administrator dashboard is at `/admin.html`.

## Supabase setup

1. Create a Supabase project.
2. Apply every SQL file in `supabase/migrations/` in filename order (or run `npx supabase db push --linked`).
3. In **Authentication > Users**, create an email/password user for the administrator.
4. Edit `supabase/setup-admin.sql`, replace `REPLACE_WITH_ADMIN_EMAIL`, and run it once in the SQL Editor.
5. Keep public sign-up disabled; the application exposes sign-in only.

The migration creates and seeds:

- `staff` — the active employee roster;
- `gift_selections` — one response per staff member;
- `admin_users` — the administrator allowlist;
- `submit_gift_selection(...)` — validated public submission RPC; and
- `is_admin()` — server-side authorization helper.

Names are normalized for capitalization and repeated spaces before matching. An existing roster record is reused, a previously unlisted employee and their office details are created during submission, and a second gift response for the same employee is rejected atomically by Postgres.

## Cloudflare Workers deployment

The included `wrangler.jsonc` runs the Vite build and deploys the `dist` directory as Worker Static Assets. For a direct deployment:

```sh
npx wrangler login
npm run deploy
```

Set these variables in the Cloudflare Pages project before building from Git:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## GitHub and Cloudflare continuous deployment

Connect the GitHub repository to the `teej2083` Worker using Cloudflare Workers Builds. Use:

- Build command: optional (`wrangler.jsonc` runs `npm run build` before deployment)
- Deploy command: `npx wrangler deploy`
- Production branch: `main`

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Cloudflare build variables. Every push to `main` is then built and deployed by Cloudflare. GitHub Actions independently validates the production build and Excel artifact tests.

## Admin Excel export

After signing in at `/admin.html`, an authorized administrator can search or filter the responses and select **Download Excel**. The file contains:

- `Gift Selections` — the currently filtered rows; and
- `Summary` — totals by gift and pending-response count.

## Data note

Several values in the bottom “Daily wages and intern” section of the photographed roster were not present or were not legible, so they are marked `Not specified`. Review those rows in the migration before production if authoritative details are available.
