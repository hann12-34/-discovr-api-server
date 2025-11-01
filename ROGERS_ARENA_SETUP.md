# Rogers Arena Scraper Setup

## Problem
Rogers Arena's official website blocks web scrapers with a 403 Forbidden error.

## Solution
Use the **Ticketmaster Discovery API** to get Rogers Arena events.

## Setup Instructions

### 1. Get a Free Ticketmaster API Key

1. Go to: https://developer.ticketmaster.com/
2. Click **"Get Your API Key"**
3. Sign up for a free account
4. You'll receive an API key instantly (looks like: `abc123xyz456...`)

### 2. Add API Key to Your Environment

Create or edit `.env` file in the `discovr-api-server` directory:

```bash
TICKETMASTER_API_KEY=your_api_key_here
```

### 3. Test the Scraper

```bash
cd ~/Desktop/discovr-api-server
node -e "
const rogers = require('./scrapers/cities/vancouver/rogersArena.js');
rogers.scrape('Vancouver').then(events => {
  console.log('Rogers Arena events:', events.length);
  events.slice(0, 5).forEach(e => console.log('  -', e.title, '|', e.date));
});
"
```

### 4. Reimport Events

```bash
node ImportFiles/import-all-vancouver-events.js
```

## What You'll Get

- **Canucks games** (NHL hockey)
- **Concerts** at Rogers Arena
- **Other sports events** (NBA, UFC, etc.)
- All with proper dates and categories

## API Limits

- **Free tier:** 5,000 API calls per day
- **Rate limit:** 5 requests per second
- More than enough for daily scraping!

## Troubleshooting

If you see:
```
⚠️  TICKETMASTER_API_KEY not set - skipping Rogers Arena
```

Make sure:
1. You created the `.env` file in the correct directory
2. The API key is on a line like: `TICKETMASTER_API_KEY=abc123...`
3. There are no spaces around the `=` sign
4. You restart your import script after adding the key

## Alternative: Manual Event Entry

If you don't want to use the API, you can manually add major Rogers Arena events to your database or skip this venue entirely. The app will work fine with the other 108 working scrapers!
