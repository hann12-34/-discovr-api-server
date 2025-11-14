# 🌐 URL Field Requirements for All Scrapers

## ⚠️ CRITICAL: Every scraper MUST include a `url` field

The `url` field provides transparency and allows users to verify event information on the official website.

## Required Format:

Every event object must include:

```javascript
{
  id: uuidv4(),
  title: "Event Name",
  date: "2025-11-12",
  venue: {
    name: "Venue Name",
    address: "123 Main St",
    city: "City Name"
  },
  city: "City Name",
  category: "Concert", // or "Nightlife", "Festival", etc.
  source: "Source Name",
  url: "https://venue-website.com/events/event-slug" // ← REQUIRED!
}
```

## URL Priority:

1. **Best:** Direct event page URL
   ```javascript
   url: "https://venue.com/events/specific-event-2025-11-12"
   ```

2. **Good:** Venue events calendar page
   ```javascript
   url: "https://venue.com/events"
   ```

3. **Acceptable:** Venue homepage
   ```javascript
   url: "https://venue.com"
   ```

## Examples:

### ✅ Correct - Event-specific URL:
```javascript
events.push({
  id: uuidv4(),
  title: "Jazz Night with Sarah Jones",
  date: "2025-11-15",
  url: "https://bluenote.net/new-york/events/sarah-jones-jazz-2025-11-15",
  venue: {
    name: "Blue Note Jazz Club",
    address: "131 W 3rd St, New York, NY 10012",
    city: "New York"
  },
  city: "New York",
  category: "Concert",
  source: "Blue Note"
});
```

### ✅ Correct - Events calendar URL:
```javascript
const eventUrl = $el.find('a').attr('href') || 'https://venue.com/calendar';
if (eventUrl && !eventUrl.startsWith('http')) {
  eventUrl = 'https://venue.com' + eventUrl;
}

events.push({
  //... other fields
  url: eventUrl
});
```

### ❌ Incorrect - Missing URL:
```javascript
events.push({
  id: uuidv4(),
  title: "Concert Tonight",
  date: "2025-11-15"
  // ❌ NO URL - Users cannot verify the event!
});
```

## Quick Fix for Existing Scrapers:

1. Find where events are pushed: `events.push({`
2. Add url field:
   ```javascript
   url: 'https://venue-website.com/events',  // or extracted event URL
   ```

## Testing:

After adding URLs, verify:
1. URL opens in Safari when "Official Website" button is clicked
2. URL points to actual event or venue calendar
3. URL is not broken (404)

## Stats:
- **Target:** 100% of scrapers have URLs
- **Current:** 7% (25/377)
- **Goal:** Add URLs to all active scrapers returning events

Last updated: 2025-11-11
