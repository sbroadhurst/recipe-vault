# Set up GitHub Auto-Deploy for Recipe Vault

Right now you're deploying by dragging the folder onto Netlify each time. This connects your existing site (`subtle-beignet-bb0139.netlify.app`) to a GitHub repo so every change auto-deploys.

## 1. Create the GitHub repo

1. Go to https://github.com/new (sign in or create a free account if you don't have one).
2. Repository name: `recipe-vault` (or anything you like).
3. Leave it **Public** or **Private** — either works with Netlify's free tier.
4. Do **not** check "Add a README" — leave the repo empty.
5. Click **Create repository**.

## 2. Upload your files

On the new repo's page:

1. Click **"uploading an existing file"** (a link in the setup instructions).
2. Open the `recipe-vault` folder on your computer and select **all the files and the `icons` folder inside it** (not the `recipe-vault` folder itself — you want its *contents* at the top level of the repo).
3. Drag them all into the GitHub upload box.
4. Scroll down and click **Commit changes**.

Your repo should now show `index.html`, `app.js`, `style.css`, `config.js`, `manifest.json`, `sw.js`, the `icons` folder, etc. all at the top level.

## 3. Connect Netlify to the repo

1. Go to your Netlify dashboard → open your **Recipe Vault** site (`subtle-beignet-bb0139`).
2. Go to **Project configuration → Build & deploy → Continuous deployment**.
3. Click **Link repository**.
4. Authorize Netlify to access GitHub if prompted, then pick your `recipe-vault` repo.
5. Build settings: leave the build command **blank** and set the publish directory to `/` (this is a plain static site, no build step needed).
6. Save.

From now on, any change you push to that GitHub repo will automatically redeploy the live site within a minute or two — no more dragging folders.

## Making future edits

The simplest way without installing git: open the file on GitHub.com (click into it in the repo), click the pencil/edit icon, make your change, and commit directly to the main branch. Netlify picks it up automatically.

If you'd rather edit locally and push changes yourself, let me know and I can help set up git on your computer too.
