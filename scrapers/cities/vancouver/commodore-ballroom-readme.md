# Commodore Ballroom Scraper

## Overview
This scraper extracts event data from the Commodore Ballroom venue in Vancouver using the Ticketmaster Discovery API. The scraper is designed to be reliable and maintainable, with no fallback methods or brittle scraping approaches.

## Implementation Details

### API Used
- **Ticketmaster Discovery API**: Public API endpoint that provides event data for venues
- **Venue ID**: `KovZpZAEkn6A` (Commodore Ballroom venue ID in Ticketmaster's system)
- **API Key**: Uses a public API key

### Data Extraction
The scraper extracts the following data for each event:
- Title
- Start Date/Time
- End Date/Time (if available)
- URL (ticket/event page)
- Image URL
- Venue name
- Organizer
- Address
- Slug (URL-friendly version of the title)

### Error Handling
- Comprehensive error handling for API requests
- Detailed logging for debugging purposes
- Saves API responses for reference

### Database Integration
The scraper is integrated with the database through:
1. The Vancouver scrapers index file (`/scrapers/cities/vancouver/index.js`)
2. The main scraper runner (`/scrapers/run-all-scrapers.js`)

Events are added to the MongoDB database with:
- Unique IDs generated using UUID v5 (deterministic based on event details)
- Duplicate checking based on source URL
- Proper formatting to match the database schema

## Usage

### Running the Scraper Individually
```javascript
const commodoreBallroomEvents = require('./scrapers/cities/vancouver/commodoreBallroomEvents');

async function runScraper() {
  const events = await commodoreBallroomEvents.scrape();
  console.log(`Found ${events.length} events`);
  console.log(events);
}

runScraper();
```

### Running with Database Integration
Use the main scraper runner:
```bash
node scrapers/run-all-scrapers.js
```

Or use the dedicated script:
```bash
node add-commodore-events-to-db.js
```

## Maintenance Notes
- The scraper relies solely on the Ticketmaster API - no fallback methods
- If the API changes, update the API endpoint and response parsing logic
- The venue ID (`KovZpZAEkn6A`) is specific to Commodore Ballroom and should not change
- Monitor API rate limits if running the scraper frequently

## Troubleshooting
- If no events are returned, check the API endpoint and venue ID
- If the API returns errors, check the API key and request parameters
- For database integration issues, verify the Event model schema and MongoDB connection
