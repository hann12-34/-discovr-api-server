# Vancouver Scraper Image Extraction Status

## Summary
The bulk script added image extraction code to **151 Vancouver scrapers**, but many don't actually return images because:

1. **JSON-based scrapers**: Extract event data from embedded JSON (no DOM images to scrape)
2. **Text-only pages**: Some venues list events as plain text without images
3. **JavaScript-heavy sites**: Images load dynamically after initial page load

## Key Venues Status

### ❌ **No Images (JSON-based):**
- **Commodore Ballroom** - Extracts from embedded JSON, no image data
- **Rogers Arena** - Uses NHL API + embedded JSON
- **Queen Elizabeth Theatre** - JSON-based extraction
- **Orpheum** - Similar structure

### ⚠️ **Limited Images:**
- **The Roxy** - Text-based event listings, few images
- **Vogue Theatre** - May have images but needs Puppeteer
- **Fortune Sound Club** - Similar

### ✅ **Should Have Images:**
- **BC Place** - Standard HTML scraping
- **PNE Events** - Has event posters
- **Vancouver Art Gallery** - Exhibition images
- **Science World** - Event graphics

## Root Cause

Vancouver's major venues (Commodore, Rogers Arena, etc.) use:
```javascript
// Embedded JSON like this:
"discovery_id":"123","name":"Event Name","url":"event-url","start_date":"2025-11-15"
// No image field in JSON!
```

## Solutions

### Option 1: Accept Limited Coverage
- Keep current ~10-20% image coverage for Vancouver
- Focus on venues that naturally have images
- Toronto/Vancouver comparison:
  - Toronto: 98% (uses universal template with DOM scraping)
  - Vancouver: ~15% (many JSON-based scrapers)

### Option 2: Add Puppeteer Image Scraping
- For each JSON event, load the individual event page
- Scrape the image from the event detail page
- **Downside:** 50+ page loads per venue = slow + resource intensive

### Option 3: Use Venue APIs (if available)
- Check if venues have APIs with image URLs
- Ticketmaster API might have images for Commodore/Rogers events
- **Downside:** Requires API keys, rate limits

### Option 4: Generic Venue Images
- Use a default venue photo for events without specific images
- Better than nothing for UX
- **Downside:** Not event-specific

## Recommendation

**Accept current state:** Vancouver has ~15-20% image coverage, which is still better than 0%.

**Priority venues with good image potential:**
1. PNE Events (festivals have posters)
2. Vancouver Art Gallery (exhibition images)
3. Science World (event graphics)
4. Smaller venues with standard HTML pages

**Major venues will have limited images** due to their JSON-based structure unless we invest significant resources in per-event page scraping.

## Current Stats
- Total Vancouver scrapers: 156
- With image extraction code: 151
- Actually returning images: ~20-30 scrapers (~15-20%)
- Major venues without images: Commodore, Rogers Arena, Orpheum, QE Theatre
