# 🤖 Facebook Messenger Bot with Gemini AI

A free chatbot for Facebook Messenger powered by Google Gemini AI.

---

## 📁 Files
- `index.js` — Main server (webhook + Gemini AI)
- `package.json` — Dependencies
- `.env.example` — Environment variable template
- `.gitignore` — Keeps secrets out of GitHub

---

## 🚀 Deploy in 4 Steps

### Step 1 — Get Your Free Gemini API Key
1. Go to https://aistudio.google.com
2. Click **"Get API Key"** → Create key
3. Copy it

### Step 2 — Upload to GitHub
1. Go to https://github.com → New repository → name it `messenger-bot`
2. Upload all these files

### Step 3 — Deploy on Render (Free)
1. Go to https://render.com → Sign up
2. Click **New +** → **Web Service** → Connect GitHub repo
3. Settings:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance: `Free`
4. Add Environment Variables:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | Your key from Step 1 |
| `PAGE_ACCESS_TOKEN` | From Facebook App |
| `VERIFY_TOKEN` | Any secret word e.g. `mysecretbot123` |

5. Click **Create Web Service** — your URL will be:
   `https://messenger-bot-xxxx.onrender.com`

### Step 4 — Connect Facebook
1. Go to https://developers.facebook.com → Your App → Messenger → Settings
2. Under **Webhooks** → Add Callback URL:
   - URL: `https://messenger-bot-xxxx.onrender.com/webhook`
   - Verify Token: same word as your `VERIFY_TOKEN`
3. Click **Verify and Save** ✅
4. Subscribe to your Facebook Page

---

## ✅ Done!
Your Facebook Page will now reply to every message using Gemini AI.
