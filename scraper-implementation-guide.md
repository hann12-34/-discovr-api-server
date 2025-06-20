# Vancouver Scraper Implementation Guide

This document provides guidelines for implementing event and venue scrapers for the Discovr API server.

## Required Event Structure

Each event must include at least these essential fields:

- `title` (string): The name of the event
- `date` (Date object): The date of the event
- `url` (string): A URL where more information about the event can be found

## Common Event Fields

Additional recommended fields:

- `description` (string): A description of the event
- `imageUrl` (string): URL to an image representing the event
- `venue` (string or object): Where the event takes place
- `source` (string): The source of the event information
- `price` (string or number): Price information for the event
- `category` (string): The category of the event
- `tags` (array): Additional tags for the event

## Basic Scraper Template

All scrapers should follow this general structure:

```javascript
/**
 * [Event/Venue Name] Scraper
 * Website: [URL]
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');

/**
 * Scrapes events from [Source Name]
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: '[Scraper Name]' });
  const events = [];
  
  try {
    logger.info('Starting [Scraper Name] scraper');
    
    // Make HTTP request with a timeout and user-agent
    const response = await axios.get('[URL]', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    logger.info('Loaded page from [URL]');
    
    // Select elements that contain events
    $('[CSS Selector for Event Container]').each((i, el) => {
      try {
        // Extract basic event information
        const title = $(el).find('[Title Selector]').text().trim();
        const dateText = $(el).find('[Date Selector]').text().trim();
        const url = $(el).find('a').attr('href');
        
        // Convert date string to Date object (implement date parsing logic)
        const date = new Date(dateText);
        
        // Only add events with required fields
        if (title && url) {
          events.push({
            title,
            date, // Required field
            url,  // Required field
            description: $(el).find('[Description Selector]').text().trim(),
            // Add other fields as available
          });
          
          logger.info(`Found event: ${title}`);
        }
      } catch (err) {
        logger.error({ error: err }, `Error processing event ${i+1}`);
      }
    });
    
    logger.info(`Scraped ${events.length} events from [Source Name]`);
    return events;
  } catch (error) {
    logger.error({ error }, 'Error scraping [Source Name]');
    return [];
  }
}

module.exports = {
  name: '[Scraper Name]',
  urls: ['[URL1]', '[URL2]'],
  scrape
};
```

## Common Patterns

### Date Parsing

```javascript
/**
 * Parse date string to Date object
 * @param {string} dateString - String containing date information
 * @returns {Date|null} Date object or null if parsing fails
 */
function parseEventDate(dateString) {
  if (!dateString) return null;
  
  try {
    // Try direct Date parsing
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    // Add custom date format parsing logic here
    // ...
    
  } catch (e) {
    // Failed to parse date
  }
  
  return null;
}
```

### Making URLs Absolute

```javascript
// Making relative URLs absolute
if (url && !url.startsWith('http')) {
  url = `https://example.com${url.startsWith('/') ? '' : '/'}${url}`;
}
```

## Error Handling

Always wrap scraping logic in try/catch blocks to prevent a single event error from crashing the entire scraper.

## Testing

Use the test-scraper-data.js script to test your scraper:

```bash
node test-scraper-data.js "Scraper Name"
```

This will validate that your scraper produces events with all required fields.

## Tips for Difficult Sites

- Some sites use JavaScript to load content, making basic scraping difficult
- Consider special handling for these cases, such as:
  - Using API endpoints directly if available
  - Using alternative data sources
  - Looking for structured data in the page (JSON-LD, microdata, etc.)

## Debugging

If a scraper is not returning expected results:
- Check the selectors using browser DevTools
- Add more detailed logging
- Try simplifying the scraping logic first, then build up

## Final Checklist

Before considering a scraper complete:
1. Does it extract events with all required fields?
2. Is there proper error handling?
3. Are dates parsed correctly?
4. Are URLs made absolute when needed?
5. Does the scraper produce valid data when tested?
