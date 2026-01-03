/**
 * Eventfinda Auckland Events Scraper (RSS Feed)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEventfindaAuckland(city = 'Auckland') {
  console.log('🎫 Scraping Eventfinda Auckland RSS...');

  try {
    const feeds = [
      'https://www.eventfinda.co.nz/feed/events/auckland/whatson/upcoming.rss',
      'https://www.eventfinda.co.nz/feed/events/auckland/concerts-gig-guide/upcoming.rss'
    ];
    
    const events = [];
    const seen = new Set();

    for (const feedUrl of feeds) {
      try {
        const response = await axios.get(feedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000
        });
        const $ = cheerio.load(response.data, { xmlMode: true });

        $('item').each((i, el) => {
          try {
            const $item = $(el);
            const title = $item.find('title').text().trim();
            const url = $item.find('link').text().trim();
            const description = $item.find('description').text().trim();
            
            if (!title || !url || seen.has(url)) return;
            seen.add(url);

            const urlMatch = url.match(/\/(\d{4})\//);
            if (!urlMatch || parseInt(urlMatch[1]) < 2025) return;
            const isoDate = `${urlMatch[1]}-01-15`;

            if (new Date(isoDate) < new Date()) return;

            events.push({
              id: uuidv4(),
              title: title.replace(/\s+/g, ' ').trim(),
              date: isoDate,
              url,
              description: description.replace(/<[^>]*>/g, '').substring(0, 200) || null,
              venue: { name: 'Auckland Venues', address: 'Auckland, New Zealand', city: 'Auckland' },
              latitude: -36.8485,
              longitude: 174.7633,
              city: 'Auckland',
              category: 'Events',
              source: 'Eventfinda Auckland'
            });
          } catch (e) {}
        });
      } catch (e) {}
    }

    // Fetch images
    for (const event of events.slice(0, 40)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${events.length} Eventfinda Auckland events`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Eventfinda Auckland error:', error.message);
    return [];
  }
}

module.exports = scrapeEventfindaAuckland;
