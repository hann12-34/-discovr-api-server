/**
 * Bongo Club Edinburgh Events Scraper
 * Arts and club venue
 * URL: https://www.thebongoclub.co.uk/events-main/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeBongoClub(city = 'Edinburgh') {
  console.log('🎧 Scraping Bongo Club Edinburgh...');

  try {
    const response = await axios.get('https://www.thebongoclub.co.uk/events-main/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    // Find all event links - URLs contain dates like /event/name-2026-01-02/
    $('a[href*="/event/"]').each((i, el) => {
      try {
        const href = $(el).attr('href');
        if (!href || seen.has(href)) return;
        
        // Extract title from link text or nearby h2
        let title = $(el).text().trim();
        if (!title || title.length < 3 || title === 'Read more') {
          const h2 = $(el).closest('div').find('h2').first().text().trim();
          if (h2) title = h2;
        }
        
        if (!title || title.length < 3) return;
        
        // Extract date from URL - format: 2026-01-02
        const dateMatches = href.match(/(\d{4}-\d{2}-\d{2})/g);
        if (!dateMatches || dateMatches.length === 0) return;
        
        // Use the last date in URL (most specific/upcoming)
        const isoDate = dateMatches[dateMatches.length - 1];
        
        // Skip past events
        if (new Date(isoDate) < new Date()) return;
        
        seen.add(href);
        const url = href.startsWith('http') ? href : `https://www.thebongoclub.co.uk${href}`;
        
        events.push({
          id: uuidv4(),
          title: title.replace(/\[.*?\]/g, '').trim(),
          date: isoDate,
          url: url,
          venue: {
            name: 'Bongo Club',
            address: '66 Cowgate, Edinburgh EH1 1JX',
            city: 'Edinburgh'
          },
          latitude: 55.9488,
          longitude: -3.1885,
          city: 'Edinburgh',
          category: 'Nightlife',
          source: 'Bongo Club'
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

    // Fetch og:image for each event (limit to first 20 to avoid timeout)
    for (const event of uniqueEvents.slice(0, 20)) {
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
      } catch (e) {}
    }

    console.log(`  ✅ Found ${uniqueEvents.length} Bongo Club events`);
    return uniqueEvents;

  } catch (error) {
    console.error('  ⚠️ Bongo Club error:', error.message);
    return [];
  }
}

module.exports = scrapeBongoClub;
