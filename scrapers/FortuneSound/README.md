# Fortune Sound Club Event Scraper

This scraper extracts event data from the [Fortune Sound Club](https://www.fortunesoundclub.com/events) website and formats it according to the MongoDB API models used in the Discovr app.

## Features

- Extracts all upcoming events from Fortune Sound Club
- Captures event details including:
  - Title
  - Description
  - Start and end dates/times
  - Venue information
  - Ticket purchase links
  - Event images
- Formats data to match the Discovr app's MongoDB API models
- Saves events to a structured JSON file

## Requirements

- Python 3.7+
- Required packages:
  - requests
  - beautifulsoup4

## Installation

1. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the scraper:

```bash
python fortune_scraper.py
```

The scraper will:
1. Connect to the Fortune Sound Club website
2. Extract all event links from the main events page
3. Visit each event page to extract detailed information
4. Save the results to `fortune_events.json` in the same directory

## Output Format

The output JSON file follows this structure:

```json
{
  "data": [
    {
      "title": "Event Title",
      "description": "Event description...",
      "venue": {
        "name": "Fortune Sound Club",
        "address": "147 East Pender Street, Vancouver, BC, V6A 1T6, Canada",
        "location": {
          "type": "Point",
          "coordinates": [-123.100751, 49.280528]
        }
      },
      "startDate": "2025-06-27T22:00:00",
      "endDate": "2025-06-28T02:00:00",
      "ticketUrl": "https://example.com/tickets",
      "imageUrl": "https://example.com/image.jpg",
      "sourceUrl": "https://www.fortunesoundclub.com/events/event-name",
      "source": "FortuneSound",
      "scrapedAt": "2025-06-28T10:30:00"
    },
    // Additional events...
  ],
  "count": 42,
  "source": "FortuneSound",
  "timestamp": "2025-06-28T10:30:00"
}
```

## Integration with Discovr API

The JSON output is formatted to match the MongoDB API models used in the Discovr app. It can be directly uploaded to a MongoDB database or consumed by the Discovr API.

## Limitations

- The scraper respects the website's rate limits by adding a delay between requests
- Event details might sometimes be incomplete if the website's structure changes
- Images are referenced by URL and not downloaded locally
