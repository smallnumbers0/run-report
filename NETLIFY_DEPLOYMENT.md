# Netlify Deployment Guide

## 🚀 Deploying The Running Report to Netlify

### Prerequisites
1. GitHub account with your code repository
2. Netlify account (free tier works)
3. OpenAI API account (for news generation)

### Step 1: Prepare Repository
```bash
# Install dependencies
npm install

# Build the site locally to test
npm run build
```

### Step 2: Deploy to Netlify

#### Option A: Git-based Deployment (Recommended)
1. Push your code to GitHub
2. Go to [Netlify Dashboard](https://app.netlify.com/)
3. Click "New site from Git"
4. Connect to GitHub and select your repository
5. Set build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`

#### Option B: Drag & Drop Deployment
1. Run `npm run build` locally
2. Drag the `dist` folder to Netlify dashboard

### Step 3: Configure Environment Variables
In Netlify Dashboard → Site Settings → Environment Variables:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Step 4: Enable Scheduled Functions
1. Install the Scheduled Functions plugin in Netlify
2. The news scraper will run daily at 8 AM PST automatically

### Step 5: Test Functions
After deployment, test your functions:
- Manual trigger: `https://your-site.netlify.app/.netlify/functions/trigger-news-scraper`
- Check logs in Netlify Dashboard → Functions

## 🔧 Configuration Options

### OpenAI API Setup
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add it to Netlify environment variables

### Advanced: Sanity CMS Integration (Optional)
For dynamic content management:
1. Create Sanity project: `npm create sanity@latest`
2. Set up schema for articles
3. Add Sanity environment variables to Netlify

### Build Hook for Auto-Rebuilds
1. Netlify Dashboard → Site Settings → Build & Deploy → Build Hooks
2. Create new hook, copy URL
3. Add as `WEBHOOK_URL` environment variable

## 📱 How It Works

### Daily Automation
- Netlify scheduled function runs at 8 AM PST
- Scrapes news from FloTrack, Running Magazine, etc.
- Generates summary using OpenAI
- Can trigger site rebuild with new content

### Manual Updates
- Visit: `https://your-site.netlify.app/.netlify/functions/trigger-news-scraper`
- Check function logs in Netlify dashboard
- New articles appear after site rebuild

## 🛠 Local Development with Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Run local development with functions
netlify dev
```

This runs your site locally with Netlify Functions available at:
- Site: `http://localhost:8888`
- Functions: `http://localhost:8888/.netlify/functions/`

## 🔍 Troubleshooting

### Function Errors
- Check Netlify Dashboard → Functions → Logs
- Verify environment variables are set
- Test OpenAI API key validity

### Build Failures
- Check build logs in Netlify Dashboard
- Ensure all dependencies in package.json
- Verify astro.config.mjs is properly configured

### News Scraper Issues
- Some sources may block requests (normal)
- Check function logs for specific errors
- OpenAI API rate limits may apply

## 🎯 Next Steps

1. **Custom Domain:** Configure your own domain in Netlify
2. **Analytics:** Add Netlify Analytics or Google Analytics
3. **Performance:** Enable Netlify's asset optimization
4. **Security:** Set up form handling and security headers

Your Running Report will be live with automated daily news updates! 🏃‍♂️⚡
