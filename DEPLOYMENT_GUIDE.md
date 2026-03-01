# 🚀 LeadEngine — Complete Deployment Guide
## From Zero to Live Secure Website in ~30 Minutes

---

## What You'll End Up With

```
https://leads.yourcompany.com
```
- 🔒 HTTPS secured automatically (free SSL)
- 🔐 Google login — only @yourcompany.com emails can access
- 🌍 Available to your whole sales team from any browser
- 💾 Search history saved permanently per user
- ₹0 hosting cost (Vercel free tier)

---

## Prerequisites (One-Time Setup)

You need these 3 things installed on your computer:
- **Node.js** (v18+) → Download from https://nodejs.org
- **Git** → Download from https://git-scm.com
- **VS Code** (optional but recommended) → https://code.visualstudio.com

To verify they're installed, open Terminal / Command Prompt and run:
```bash
node --version    # Should show v18.x.x or higher
git --version     # Should show git version 2.x.x
```

---

## STEP 1 — Set Up Clerk (Authentication)
*Time: ~5 minutes | Cost: Free forever*

Clerk handles all the login logic — Google OAuth, domain restriction, user sessions.

### 1.1 Create a Clerk account
1. Go to **https://clerk.com** → Click **"Start building for free"**
2. Sign up (you can use your Google account)
3. Click **"Create application"**
4. Name it: `LeadEngine`
5. Under **"How will your users sign in?"** — toggle ON **Google**
6. Click **"Create application"**

### 1.2 Get your API keys
1. In your Clerk dashboard, click **"API Keys"** in the left sidebar
2. Copy the **"Publishable key"** — it looks like: `pk_test_abc123...`
3. Keep this tab open, you'll need it in Step 3

### 1.3 Configure domain restriction (security)
1. In Clerk dashboard → **"User & Authentication"** → **"Email, Phone, Username"**
2. Under **"Email address"** → turn OFF "Allow any email address"
3. Under **"Restrictions"** → turn ON **"Allowlist"**
4. Add your company domain: `yourcompany.com`
5. Click **Save**

> ✅ Now ONLY emails ending in @yourcompany.com can log in — everyone else gets blocked.

---

## STEP 2 — Set Up GitHub Repository
*Time: ~5 minutes | Cost: Free*

Vercel deploys directly from GitHub, so you need to push your code there.

### 2.1 Create a GitHub account (if you don't have one)
Go to **https://github.com** → Sign up free

### 2.2 Create a new repository
1. Click the **"+"** icon → **"New repository"**
2. Name: `leadengine`
3. Set to **Private** (important — keeps your code private)
4. Click **"Create repository"**

### 2.3 Push your code
Open Terminal in the project folder and run these commands one by one:

```bash
# Navigate to your project folder
cd /path/to/leadengine-deploy

# Initialize git
git init
git add .
git commit -m "Initial commit — LeadEngine"

# Connect to GitHub (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/leadengine.git
git branch -M main
git push -u origin main
```

> ✅ Your code is now on GitHub. NEVER push your .env.local file — it's in .gitignore already.

---

## STEP 3 — Deploy to Vercel
*Time: ~5 minutes | Cost: Free forever*

### 3.1 Create a Vercel account
1. Go to **https://vercel.com** → **"Sign Up"**
2. Click **"Continue with GitHub"** → Authorize Vercel
3. You're in!

### 3.2 Import your project
1. In Vercel dashboard → click **"Add New..."** → **"Project"**
2. Find your `leadengine` GitHub repository → click **"Import"**
3. Framework Preset: select **"Create React App"**
4. Click **"Deploy"** — Vercel will build and deploy automatically

### 3.3 Add environment variables (CRITICAL)
After deployment, go to your project settings:
1. Click your project → **"Settings"** → **"Environment Variables"**
2. Add these 3 variables:

| Name | Value |
|------|-------|
| `REACT_APP_CLERK_PUBLISHABLE_KEY` | `pk_test_your_key_from_step_1` |
| `REACT_APP_ALLOWED_DOMAIN` | `yourcompany.com` |
| `REACT_APP_COMPANY_NAME` | `Your Company Name` |

3. Click **"Save"** after each one
4. Go to **"Deployments"** → click **"Redeploy"** → **"Redeploy"** to apply the variables

### 3.4 Your site is live!
Vercel gives you a free URL like: `https://leadengine-abc123.vercel.app`

Test it: open the URL, click "Sign in with Google", try with your company email — it should work. Try with a personal Gmail — it should be blocked.

---

## STEP 4 — Custom Domain (Optional but Recommended)
*Time: ~10 minutes | Cost: Domain ~₹700–1,200/year*

Set up `leads.yourcompany.com` instead of the ugly Vercel URL.

### Option A — If you already have a company domain

#### In Vercel:
1. Project → **"Settings"** → **"Domains"**
2. Type: `leads.yourcompany.com` → **"Add"**
3. Vercel will show you a DNS record to add

#### In your domain registrar (GoDaddy / Namecheap / BigRock etc):
1. Log in to your domain registrar
2. Go to **DNS settings** for your domain
3. Add a new **CNAME record**:
   - Name/Host: `leads`
   - Value/Target: `cname.vercel-dns.com`
   - TTL: 3600
4. Save

Wait 5–30 minutes for DNS to propagate. Then `https://leads.yourcompany.com` will work!

#### Update Clerk for your custom domain:
1. In Clerk dashboard → **"Domains"** → **"Add domain"**
2. Add `leads.yourcompany.com`
3. This ensures Google OAuth works on your custom domain

### Option B — Buy a new domain
1. Go to **https://namecheap.com** or **https://bigrock.in**
2. Search for `yourbrandleads.com` (~₹800/year)
3. Buy it, then follow Option A steps above

---

## STEP 5 — Add Team Members
*Time: 1 minute per person | Cost: Free*

Since you're using **domain restriction**, anyone with a `@yourcompany.com` email can log in automatically — no manual user management needed!

Just share the URL with your sales team:
```
Hey team — our new lead generation tool is live at:
https://leads.yourcompany.com

Sign in with your company Google account. No password needed.
```

That's it. They'll be able to sign in on their first visit.

---

## STEP 6 — Keep Code Updated
*Time: 2 minutes whenever you make changes*

Whenever you want to update the app (add features, fix bugs):

```bash
# Make your changes in the code files
# Then run:
git add .
git commit -m "describe what you changed"
git push
```

Vercel automatically detects the push and redeploys in ~2 minutes. Zero downtime.

---

## Security Checklist ✅

Before going live, verify these:

- [ ] `.env.local` is NOT committed to GitHub (check your repo — it shouldn't be there)
- [ ] Repository is set to **Private** on GitHub
- [ ] Allowed domain is set correctly in both Clerk AND your `.env.local`
- [ ] `vercel.json` security headers are in place (already included in the project)
- [ ] You've tested that a non-company email gets blocked

---

## Troubleshooting

### "Sign in with Google" doesn't appear on login page
→ In Clerk dashboard, make sure Google is enabled under **User & Authentication → Social Connections**

### Users from other domains can still log in
→ Check Clerk → **User & Authentication → Restrictions → Allowlist**. Make sure your domain is there and "Allow any email" is OFF.

### Page shows "Setup Required"
→ Your `REACT_APP_CLERK_PUBLISHABLE_KEY` environment variable is missing or wrong in Vercel Settings.

### Build fails on Vercel
→ Check that all files are in the correct folders. Run `npm install && npm run build` locally first to catch errors.

### Custom domain not working after DNS change
→ DNS changes take up to 48 hours (usually 5–30 mins). Check propagation at https://dnschecker.org

---

## Monthly Costs Summary

| Service | Free Tier | What You Get |
|---------|-----------|--------------|
| **Vercel** | Free forever | 100GB bandwidth, unlimited deployments |
| **Clerk** | Free up to 10,000 MAU | Full auth, Google login, domain restriction |
| **GitHub** | Free private repos | Unlimited private repos |
| **Domain** (optional) | ~₹800–1,200/year | `leads.yourcompany.com` |

**Total: ₹0/month** (or ~₹100/month if you buy a domain)

---

## Architecture Summary

```
User's Browser
     │
     ▼
Vercel CDN (HTTPS) ──── serves React app
     │
     ▼
Clerk (Auth) ──── verifies @yourcompany.com domain
     │
     ▼
LeadEngine App ──── runs in browser, saves history locally
     │
     ▼
Lead data ──── generated client-side + storage API for history
```

---

## Need Help?

If you get stuck at any step, copy the error message and ask Claude for help.
Common places to get support:
- Vercel docs: https://vercel.com/docs
- Clerk docs: https://clerk.com/docs
- GitHub docs: https://docs.github.com


https://leadengineetechcube.vercel.app/