/**
 * Harpa Concert Hall Reykjavik Events Scraper
 * URL: https://www.harpa.is/en
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeHarpa(city = 'Reykjavik') {
  console.log('🎵 Scraping Harpa Concert Hall...');

  try {
    const response = await axios.get('https://www.harpa.is/en/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="/en/events/"]').each((i, el) => {
      try {
        const $el = $(el);
        let href = $el.attr('href');
        if (!href || seen.has(href)) return;
        
        // Skip malformed URLs
        if (href.includes('/is/events/https')) return;
        seen.add(href);

        const text = $el.text().trim();
        
        // Extract title and date from link text like "Sunday Classics: Songs of Soaring Birds11th January 2026, 16:00"
        const dateMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        if (!dateMatch) return;

        const title = text.replace(/\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}.*$/i, '').trim();
        if (!title || title.length < 3) return;

        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase()];
        const year = dateMatch[3];
        const isoDate = `${year}-${month}-${day}`;

        const url = href.startsWith('http') ? href : `https://www.harpa.is${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'Harpa Concert Hall', address: 'Austurbakki 2, 101 Reykjavík', city: 'Reykjavik' },
          latitude: 64.1503,
          longitude: -21.9326,
          city: 'Reykjavik',
          category: 'Music',
          source: 'Harpa Concert Hall'
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

    // Fetch images from event pages
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

    console.log(`  ✅ Found ${unique.length} Harpa Concert Hall events`);
    return unique;

  } catch (error) {
    console.error(`  ⚠️ Harpa Concert Hall error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeHarpa;
