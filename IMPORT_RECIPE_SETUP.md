# Set up "Auto-fill from link"

This feature needs one more piece besides your database: a small server-side function that fetches the recipe page for you (browsers aren't allowed to fetch other websites directly). It lives in Supabase, next to your database - no extra hosting account needed.

## 1. Deploy the function

1. Go to your Supabase project dashboard.
2. Open **Edge Functions** in the left sidebar.
3. Click **Deploy a new function** -> **Via Editor**.
4. Name it exactly `import-recipe`.
5. Delete the placeholder code in the editor, then open `supabase/functions/import-recipe/index.ts` from this folder, copy all of it, and paste it in.
6. Click **Deploy**.

That's it - no command line or local setup required.

## 2. Try it out

1. Open the app, click **+ Add Recipe**.
2. Paste a link to a recipe page (for example, an AllRecipes or Food Network recipe page - not a video link) into the "Paste a recipe link" field at the top of the form.
3. Click **Auto-fill**.

The title, photo, ingredients, and instructions should populate. Always glance over the result before saving - the ingredient quantity/unit splitting is a best-effort guess, and a few sites don't publish their recipe data in a way this can read at all (you'll get a clear error message if so).

## What this does and doesn't do

- Works for most recipe blogs and recipe sites, because they publish a hidden, structured copy of the recipe (called JSON-LD) for Google - the function reads that copy directly rather than trying to scrape the visible page.
- Does **not** work for video links (Instagram, TikTok, Facebook, YouTube) - those don't have any recipe text to read, and importing from a video would need a very different (and more expensive) approach: transcribing the audio and using AI to pull a recipe out of it. That's future-version territory.
- A handful of sites block automated requests entirely (anti-bot protection); those will fail with a fetch error even though the recipe is real.

## Updating the function later

If you ever change `supabase/functions/import-recipe/index.ts`, you'll need to re-paste the updated code into the Edge Function editor and redeploy - pushing to GitHub does **not** redeploy Edge Functions (only your Netlify site).
