# Fortune Sound Club Scraper Integration Guide

This document explains how the Fortune Sound Club scraper is integrated with the main Discovr API system.

## Files and Components

### Python Scraper (Original Implementation)
- **`fortune_scraper.py`**: The main Python scraper that collects events from Fortune Sound Club's website
- **`fortune_events.json`**: Output file containing scraped events in JSON format
- **`mongo_integration.py`**: Standalone script for direct MongoDB integration (for testing)

### JavaScript Integration (Bridge)
- **`/scrapers/cities/vancouver/fortuneSoundClubBridge.js`**: Bridge that connects the Python scraper to the JavaScript scraper system
- **`/scrapers/cities/vancouver/index.js`**: Vancouver scrapers coordinator that includes the Fortune Sound Club bridge

### Test Scripts
- **`/test-fortune-bridge.js`**: Tests the Fortune Sound Club bridge integration
- **`/test-fortune-sound-club.js`**: Alternative JavaScript scraper test (not used in production)

## How the Integration Works

1. **Python Scraper Execution**:
   - The `fortuneSoundClubBridge.js` script calls the Python scraper using Node.js child process
   - The Python scraper outputs events to `fortune_events.json`

2. **Event Processing**:
   - The bridge reads the JSON file and converts events to the format expected by the Discovr API
   - Events are properly formatted with venue information, coordinates, and IDs

3. **Vancouver Scrapers Integration**:
   - The Fortune Sound Club bridge is registered in the Vancouver scrapers coordinator
   - When Vancouver scrapers run, Fortune Sound Club events are included

4. **MongoDB Integration**:
   - The main scraper coordinator in `/scrapers/index.js` saves all events to MongoDB
   - Events are deduplicated and properly formatted before saving

## Workflow

```
Python Scraper → JSON File → JavaScript Bridge → Vancouver Scrapers → MongoDB → Discovr App
```

## Event Format

Events are transformed to match this format:

```json
{
  "id": "unique-uuid",
  "title": "Event Title",
  "name": "Event Title",
  "description": "Event description...",
  "image": "https://example.com/image.jpg",
  "date": "2023-06-28T20:00:00.000Z",
  "startDate": "2023-06-28T20:00:00.000Z",
  "endDate": null,
  "season": "Summer",
  "category": "Music",
  "categories": ["Music", "Nightlife"],
  "location": "Fortune Sound Club",
  "venue": {
    "name": "Fortune Sound Club",
    "address": "147 E Pender St",
    "city": "Vancouver",
    "state": "BC",
    "country": "Canada",
    "coordinates": {
      "lat": 49.2801,
      "lng": -123.1022
    }
  },
  "sourceURL": "https://fortunesoundclub.com/events/event-name",
  "officialWebsite": "https://fortunesoundclub.com",
  "ticketURL": "https://fortunesoundclub.com/events/event-name",
  "dataSources": ["vancouver-fortune-sound-club"],
  "lastUpdated": "2023-06-28T16:45:00.000Z"
}
```

## Troubleshooting

### No Fortune Sound Club Events in the App

1. **Check Python Scraper Output**:
   ```
   cd /Users/seongwoohan/CascadeProjects/Discovr-API/Scrapers/FortuneSound
   python3 fortune_scraper.py
   cat fortune_events.json  # Should contain event data in JSON format
   ```

2. **Test the Bridge Integration**:
   ```
   cd /Users/seongwoohan/CascadeProjects/Discovr-API
   node test-fortune-bridge.js
   ```

3. **Check MongoDB for Events**:
   ```
   cd /Users/seongwoohan/CascadeProjects/Discovr-API
   node test-mongodb-connection.js
   ```

### Event Format Issues

If events are being scraped but not showing correctly in the app:

1. Verify the event format in `fortune_events.json` matches what's expected by the app
2. Check the formatting logic in `fortuneSoundClubBridge.js`
3. Ensure the `venue` object is correctly structured with coordinates
