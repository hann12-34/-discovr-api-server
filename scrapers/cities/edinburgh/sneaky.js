/**
 * Sneaky Pete's Edinburgh Events Scraper
 * URL: https://sneakypetes.co.uk/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeSneakyPetes(city = 'Edinburgh') {
  console.log('🎧 Scraping Sneaky Pete\'s Edinburgh...');

  try {
    const response = await axios.get('https://sneakypetes.co.uk/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    // URLs have dates like /2026/01/09/event-name
    $('a[href*="/202"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        
        // Extract date from URL like /2026/01/09/
        const dateMatch = href.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
        if (!dateMatch) return;
        
        const isoDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        // Only filter out dates before 2025
        if (parseInt(dateMatch[1]) < 2025) return;
        
        seen.add(href);

        let title = $el.text().trim();
        if (!title || title.length < 3) return;
        // Clean up title - remove "for fans of..." part for cleaner titles
        title = title.split('for fans of')[0].trim();
        if (title.length > 100) title = title.substring(0, 100);

        const url = href.startsWith('http') ? href : `https://sneakypetes.co.uk${href}`;

        events.push({
          id: uuidv4(),
          title: title.replace(/\s+/g, ' ').trim(),
          date: isoDate,
          url,
          venue: {
            name: "Sneaky Pete's",
            address: '73 Cowgate, Edinburgh EH1 1JW',
            city: 'Edinburgh'
          },
          latitude: 55.9488,
          longitude: -3.1883,
          city: 'Edinburgh',
          category: 'Nightlife',
          source: "Sneaky Pete's"
        });
      } catch (e) {}
    });

    // Dedupe by title+date
    const unique = [];
    const keySet = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!keySet.has(key)) {
        keySet.add(key);
        unique.push(e);
      }
    }

    // Fetch images
    for (const event of unique.slice(0, 30)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${unique.length} Sneaky Pete's events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Sneaky Pete\'s error:', error.message);
    return [];
  }
}

module.exports = scrapeSneakyPetes;
