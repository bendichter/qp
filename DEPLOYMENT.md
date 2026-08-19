# GitHub Action Deployment Setup

This repository uses GitHub Actions to automatically deploy to Cloudflare Pages when changes are pushed to the `main` branch.

## Required GitHub Secrets

To enable automatic deployments, you need to add the following secrets to your GitHub repository:

### 1. CLOUDFLARE_API_TOKEN

This is a Cloudflare API token with permissions to deploy to Cloudflare Pages.

**How to create:**

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to "My Profile" → "API Tokens"
3. Click "Create Token"
4. Use the "Edit Cloudflare Workers" template or create a custom token with the following permissions:
   - **Account** - Cloudflare Pages: Edit
5. Click "Continue to summary" and then "Create Token"
6. Copy the generated token (you won't be able to see it again)

**How to add to GitHub:**

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `CLOUDFLARE_API_TOKEN`
5. Value: Paste your Cloudflare API token
6. Click "Add secret"

### 2. CLOUDFLARE_ACCOUNT_ID

This is your Cloudflare account ID.

**How to find:**

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select any site or go to Workers & Pages
3. Your Account ID is displayed in the right sidebar or in the URL

**How to add to GitHub:**

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `CLOUDFLARE_ACCOUNT_ID`
5. Value: Paste your Cloudflare Account ID
6. Click "Add secret"

## Workflow Behavior

The deployment workflow (`.github/workflows/deploy.yml`) will:

1. Trigger automatically when changes are pushed to the `main` branch
2. Check out the repository code
3. Install Node.js and project dependencies
4. Build the project using `npm run build`
5. Deploy the `dist` folder to Cloudflare Pages using Wrangler

## Manual Deployment

If you need to deploy manually, you can still use:

```bash
npm run build
wrangler pages deploy dist --project-name qp --branch main
```

Make sure you have the Wrangler CLI installed and authenticated with your Cloudflare account.

## Troubleshooting

### Deployment Fails

- Verify both secrets are correctly set in GitHub repository settings
- Check that your Cloudflare API token has the correct permissions
- Ensure the Cloudflare Pages project name is `qp`
- Review the GitHub Actions logs for specific error messages

### Build Fails

- Check that all dependencies are properly listed in `package.json`
- Verify that the build works locally with `npm run build`
- Review build logs for specific TypeScript or Vite errors
