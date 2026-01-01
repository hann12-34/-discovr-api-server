/**
 * Button Factory Dublin Events Scraper
 * Live music and club venue
 * URL: https://buttonfactory.ie/shows
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeButtonFactory(city = 'Dublin') {
  console.log('🎸 Scraping Button Factory Dublin...');

  try {
    const response = await axios.get('https://buttonfactory.ie/shows', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    // Find all show links - URL pattern: /shows/YYYY/M/DD/event-name
    $('a[href*="/shows/"]').each((i, el) => {
      try {
        const href = $(el).attr('href');
        if (!href || seen.has(href)) return;
        
        // Extract date from URL - format: /shows/2026/1/3/event-name
        const dateMatch = href.match(/\/shows\/(\d{4})\/(\d{1,2})\/(\d{1,2})\/(.+)/);
        if (!dateMatch) return;
        
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        const slug = dateMatch[4];
        const isoDate = `${year}-${month}-${day}`;
        
        // Skip past events
        if (new Date(isoDate) < new Date()) return;
        
        // Get title from link text
        let title = $(el).text().trim();
        if (!title || title.length < 3 || title === 'View Event →' || title === 'Google Calendar' || title === 'ICS' || title.includes('(map)')) {
          return;
        }
        
        // Clean title
        title = title.replace(/\s+/g, ' ').trim();
        if (title.length < 3) return;
        
        seen.add(href);
        const url = href.startsWith('http') ? href : `https://buttonfactory.ie${href}`;
        
        events.push({
          id: uuidv4(),
          title: title,
          date: isoDate,
          url: url,
          slug: slug,
          venue: {
            name: 'Button Factory',
            address: 'Curved Street, Temple Bar, Dublin D02 EY83',
            city: 'Dublin'
          },
          latitude: 53.3456,
          longitude: -6.2642,
          city: 'Dublin',
          category: 'Nightlife',
          source: 'Button Factory'
        });
      } catch (e) {}
    });

    // Deduplicate by title + date
    const uniqueEvents = [];
    const titleDateSet = new Set();
    for (const event of events) {
      const key = `${event.title}|${event.date}`;
      if (!titleDateSet.has(key)) {
        titleDateSet.add(key);
        uniqueEvents.push(event);
      }
    }

    // Fetch og:image for each event (limit to avoid timeout)
    for (const event of uniqueEvents.slice(0, 30)) {
      try {
        const eventPage = await axios.get(event.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 8000
        });
        const $event = cheerio.load(eventPage.data);
        const ogImage = $event('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http') && !ogImage.includes('placeholder')) {
          event.imageUrl = ogImage;
        }
        const desc = $event('meta[property="og:description"]').attr('content');
        if (desc) {
          event.description = desc.substring(0, 300);
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${uniqueEvents.length} valid Button Factory events`);
    return uniqueEvents;

  } catch (error) {
    console.error('  ⚠️ Button Factory error:', error.message);
    return [];
  }
}

module.exports = scrapeButtonFactory;
