# Discovr API Server Scraper Utilities

This directory contains shared utility modules used across the Discovr API Server scrapers.

## Date Parsing Utility

The `dateParsing.js` module provides standardized date parsing functionality to ensure consistent handling of date formats across all venue scrapers.

### Usage Example

```javascript
// Import the date parsing utilities
const { parseEventDate, determineSeason } = require('../utils/dateParsing');

// In your scraper function
function scrape(customLogger = null) {
  const logger = customLogger || scrapeLogger.child({ scraper: 'Your Venue Name' });

  // Later in your code, when parsing a date string:
  const dateStr = "Jan 15, 2025";
  const eventDate = parseEventDate(dateStr, logger, 'Your Venue Name');
  
  // The venue name parameter helps identify this venue in logs
  // You should always pass the logger when making recursive calls
  
  // You can also determine the season for an event
  const season = determineSeason(eventDate); // "winter", "spring", "summer", or "fall"
}
```

### Key Features

1. **Standardized Function Signature**:
   - `parseEventDate(dateString, customLogger = null, venueName = 'Unknown Venue')`

2. **Special Keyword Support**:
   - Handles "today", "tonight", "tomorrow" keywords

3. **Multiple Date Format Support**:
   - Standard JavaScript Date parsing
   - "DD MMM YYYY" and "DD MMM" (with default year 2025)
   - "MMM DD, YYYY" and "MMM DD" (with default year 2025)
   - ISO format "YYYY-MM-DD"
   - Numeric formats "MM/DD/YYYY" or "MM-DD-YYYY"
   - Recursive date range parsing by extracting first date in range

4. **Detailed Debug Logging**:
   - Logs each step of date parsing process
   - Provides context on which format matched
   - Records failures and exceptions

5. **Season Determination**:
   - `determineSeason(date)` returns the season based on month

### Migration Guide

When updating a venue scraper to use the centralized date parsing:

1. Import the utilities:
   ```javascript
   const { parseEventDate, determineSeason } = require('../utils/dateParsing');
   ```

2. Remove local implementations of these functions

3. Update all calls to include the venue name parameter:
   ```javascript
   const eventDate = parseEventDate(dateStr, logger, 'Your Venue Name');
   ```

4. Update module.exports to remove references to the local functions

5. Keep passing the logger parameter in all calls to maintain contextual logging
