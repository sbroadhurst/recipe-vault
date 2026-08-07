# Recipe Vault — Setup & Deploy Guide

This app is done and ready to go live. It needs two free accounts: **Supabase** (database + login) and **Netlify** (hosting). Total time: about 10 minutes.

## 1. Create your database (Supabase)

1. Go to https://supabase.com and sign up for a free account.
2. Click **New Project**. Pick any name and password (save the password somewhere safe — you won't need it again for this app, but Supabase asks for it).
3. Once the project finishes setting up, go to the **SQL Editor** (left sidebar) → **New query**.
4. Open `supabase-setup.sql` from this folder, copy all of it, paste it into the editor, and click **Run**. This creates the recipes table and locks it down so only you can see your own recipes.
5. Go to **Project Settings** (gear icon) → **API**. You'll see:
   - **Project URL**
   - **anon public** key
6. Optional but recommended for now: go to **Authentication** → **Providers** → **Email**, and turn off "Confirm email" so you can log in immediately after signing up without checking your inbox. You can turn it back on later.

## 2. Connect the app to your database

1. Open `config.js` in this folder.
2. Replace the two placeholder values with the Project URL and anon key from step 1.6:

```js
window.SUPABASE_URL = 'https://xxxxxxx.supabase.co'
window.SUPABASE_ANON_KEY = 'eyJ...'
```

3. Save the file.

## 3. Put it online (Netlify)

1. Go to https://netlify.com and sign up for a free account.
2. On your dashboard, look for **"Add new site" → "Deploy manually"** (sometimes shown as a drag-and-drop box).
3. Drag the whole `recipe-vault` folder (this folder) into that box.
4. Netlify gives you a live URL like `https://random-name-123.netlify.app`. That's your app's permanent address.

## 4. Install it on your phone

1. Open the Netlify URL in your phone's browser (Safari on iPhone, Chrome on Android).
2. Sign up for an account right in the app (this is separate from your Supabase/Netlify accounts — it's your personal login for your recipes).
3. Tap the browser's share/menu button and choose **"Add to Home Screen"** (iPhone) or **"Install app"** (Android/Chrome).
4. It now behaves like a normal app icon on your home screen.

## 5. Install it on your computer

Open the same Netlify URL in Chrome or Edge on your computer. You'll see an install icon (a little monitor with a down arrow) in the address bar — click it to install as a desktop app.

## What's next

The "Auto-fill" field in the Add Recipe form is a placeholder for a future version, where you'll be able to paste a link to a recipe (a webpage or a video like a Facebook/Instagram/TikTok post) and have the details filled in automatically. That's a bigger feature (it needs a small server function to fetch and parse the page or video), so it's left as a clearly-marked "coming soon" for now — just say the word when you want it built.

## Making changes later

If you ever want to tweak the app, edit the files in this folder and re-drag the folder onto Netlify's deploy box (or connect it to a GitHub repo for automatic deploys — ask if you'd like help setting that up).
