# Vercel Environment Variables Setup

To fix the `error=configuration` issue when logging in, you need to set the following environment variables in your Vercel project:

## Required Environment Variables

### 1. NEXTAUTH_SECRET (Required)
This is a secret key used to encrypt JWT tokens. Generate a random secret:

**How to generate:**
```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

**In Vercel:**
1. Go to your project settings: https://vercel.com/[your-username]/fast-keep/settings
2. Navigate to "Environment Variables"
3. Add:
   - **Name:** `NEXTAUTH_SECRET`
   - **Value:** (paste your generated secret)
   - **Environment:** Production, Preview, Development (select all)

### 2. NEXTAUTH_URL (Required)
The base URL of your application:

**In Vercel:**
- **Name:** `NEXTAUTH_URL`
- **Value:** `https://fast-keep.vercel.app`
- **Environment:** Production, Preview, Development (select all)

### 3. DATABASE_URL (Required)
Your PostgreSQL database connection string:

**In Vercel:**
- **Name:** `DATABASE_URL`
- **Value:** `postgresql://user:password@host:port/database?sslmode=require`
- **Environment:** Production, Preview, Development (select all)

## Optional Environment Variables

### OAuth Providers (Optional)
If you want to enable Google or GitHub login:

**Google OAuth:**
- **Name:** `GOOGLE_CLIENT_ID`
- **Name:** `GOOGLE_CLIENT_SECRET`

**GitHub OAuth:**
- **Name:** `GITHUB_CLIENT_ID`
- **Name:** `GITHUB_CLIENT_SECRET`

## Steps to Fix the Configuration Error

1. **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

2. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `fast-keep`
   - Go to Settings → Environment Variables

3. **Add all required variables:**
   - `NEXTAUTH_SECRET` (generated secret)
   - `NEXTAUTH_URL` (`https://fast-keep.vercel.app`)
   - `DATABASE_URL` (your PostgreSQL connection string)

4. **Redeploy:**
   - After adding environment variables, trigger a new deployment
   - Go to Deployments tab
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger automatic deployment

5. **Verify:**
   - Try logging in again at https://fast-keep.vercel.app/login
   - The `error=configuration` should be resolved

## Important Notes

- Environment variables are case-sensitive
- Make sure to select all environments (Production, Preview, Development) when adding variables
- After adding variables, you must redeploy for changes to take effect
- Never commit `.env` files to git (they're already in `.gitignore`)

## Troubleshooting

If you still see `error=configuration` after setting variables:

1. **Check variable names:** Ensure they match exactly (case-sensitive)
2. **Redeploy:** Environment variables only apply to new deployments
3. **Check Vercel logs:** Go to Deployments → [Latest] → Functions → View logs
4. **Verify secret format:** NEXTAUTH_SECRET should be a long random string (32+ characters)

