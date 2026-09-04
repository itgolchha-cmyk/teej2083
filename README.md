# Teej 2083 Gift Selection

A production-ready employee gift selection app with:

- a responsive public selection form;
- employee details loaded from the supplied 68-person roster;
- exclusive selection between the Teej Gift Hamper and Tranquility Spa;
- one-of-four spa treatment selection;
- Supabase persistence with Row Level Security;
- password-protected admin dashboard; and
- filtered `.xlsx` exports with response and summary worksheets.

## Architecture

- **Frontend:** Vite, vanilla JavaScript, and responsive CSS
- **Backend:** Supabase Postgres, Auth, database functions, and RLS
- **Hosting:** Cloudflare Pages
- **Source and CI:** GitHub Actions

Repository: <https://github.com/itgolchha-cmyk/teej2083>  
Cloudflare Pages: <https://teej-2083-gift-selection.pages.dev>

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
2. Open the SQL Editor and run `supabase/migrations/20260904000000_teej_gift_schema.sql`.
3. In **Authentication > Users**, create an email/password user for the administrator.
4. Edit `supabase/setup-admin.sql`, replace `REPLACE_WITH_ADMIN_EMAIL`, and run it once in the SQL Editor.
5. Keep public sign-up disabled; the application exposes sign-in only.

The migration creates and seeds:

- `staff` — the active employee roster;
- `gift_selections` — one response per staff member;
- `admin_users` — the administrator allowlist;
- `submit_gift_selection(...)` — validated public submission RPC; and
- `is_admin()` — server-side authorization helper.

## Cloudflare Pages deployment

The included `wrangler.jsonc` deploys the Vite `dist` directory. For a direct deployment:

```sh
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name teej-2083-gift-selection
```

Set these variables in the Cloudflare Pages project before building from Git:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## GitHub continuous deployment

Create a GitHub repository, push the `main` branch, and add these repository Actions secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Every push to `main` runs `.github/workflows/deploy-cloudflare.yml` and publishes the built site to Cloudflare Pages.

## Admin Excel export

After signing in at `/admin.html`, an authorized administrator can search or filter the responses and select **Download Excel**. The file contains:

- `Gift Selections` — the currently filtered rows; and
- `Summary` — totals by gift and pending-response count.

## Data note

Several values in the bottom “Daily wages and intern” section of the photographed roster were not present or were not legible, so they are marked `Not specified`. Review those rows in the migration before production if authoritative details are available.
