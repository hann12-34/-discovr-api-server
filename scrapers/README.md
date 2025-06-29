# Discovr Scraper System

This directory contains all the scrapers used by the Discovr platform to gather event data from various venues and sources.

## Directory Structure

```
scrapers/
├── cities/                    # City-specific scrapers
│   ├── vancouver/             # Vancouver venues
│   │   ├── index.js           # Exports all Vancouver scrapers
│   │   ├── foxCabaret.js      # Fox Cabaret implementation
│   │   ├── fortuneSoundClub.js # Fortune Sound Club implementation
│   │   └── ...                # Other Vancouver venues
│   ├── toronto/               # Toronto venues (future)
│   └── ...                    # Other cities
├── tests/                     # Individual scraper tests
│   ├── test-fox-cabaret.js    # Fox Cabaret test
│   ├── test-fortune-sound-club.js # Fortune Sound Club test
│   └── ...                    # Other venue tests
├── utils/                     # Shared utilities for scrapers
├── run-all-scrapers.js        # Main script to run all scrapers
└── README.md                  # This documentation file
```

## Running Scrapers

### Running All Scrapers

To run all scrapers and save events to the database:

```bash
node scrapers/run-all-scrapers.js
```

### Running Individual Scrapers

To test or run a specific venue scraper:

```bash
node scrapers/tests/test-fox-cabaret.js
node scrapers/tests/test-fortune-sound-club.js
# etc.
```

## Scraper Implementation

Each scraper should follow these guidelines:

1. Implement a class with standard methods:
   - `scrape()` - Main method that returns a list of events
   - `scrapeWithAxiosCheerio()` - HTML parsing method (optional)
   - `scrapeWithPuppeteer()` - Browser automation method (optional)

2. Format events according to the Event schema:
   - title (required)
   - startDate (required)
   - venue.name (required)
   - description
   - endDate
   - image
   - sourceURL
   - officialWebsite

3. Include proper error handling and logging

## Adding a New Scraper

1. Create a new scraper implementation in the appropriate city directory
2. Add the scraper to the city's `index.js` file
3. Create a test script in the `tests/` directory
4. Test the scraper independently
5. Run the all-scrapers script to verify integration
