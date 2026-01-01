/**
 * Blues On Whyte Edmonton Scraper
 * Famous blues bar with live music
 * URL: https://www.bluesonwhyte.ca
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeBluesOnWhyte(city = 'Edmonton') {
  console.log('🎸 Scraping Blues On Whyte Edmonton...');

  try {
    const response = await axios.get('https://www.bluesonwhyte.ca/calendar/', {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="event"], .event, .show, article, [class*="calendar"]').each((i, el) => {
      try {
        const $el = $(el);
        const linkEl = $el.is('a') ? $el : $el.find('a').first();
        const url = linkEl.attr('href') || 'https://bluesonwhyte.ca/';
        if (seen.has(url)) return;
        seen.add(url);

        const title = $el.find('h2, h3, h4, .title, .artist').first().text().trim() || linkEl.text().trim();
        if (!title || title.length < 3) return;

        const dateText = $el.text();
        const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        
        let isoDate = null;
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || new Date().getFullYear().toString();
          isoDate = `${year}-${month}-${day}`;
        }

        if (!isoDate || new Date(isoDate) < new Date()) return;

        events.push({
          id: uuidv4(),
          title,
          description: 'Live blues at Blues On Whyte',
          date: isoDate,
          startDate: new Date(isoDate + 'T21:00:00'),
          url: url.startsWith('http') ? url : `https://bluesonwhyte.ca${url}`,
          imageUrl: $el.find('img').first().attr('src') || null,
          venue: {
            name: 'Blues On Whyte',
            address: '10329 82 Avenue NW, Edmonton, AB T6E 1Z9',
            city: 'Edmonton'
          },
          latitude: 53.5185,
          longitude: -113.4888,
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'Blues On Whyte'
        });
      } catch (e) {}
    });

    console.log(`  ✅ Found ${events.length} Blues On Whyte events`);
    return events;

  } catch (error) {
    console.error(`  ⚠️ Blues On Whyte error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeBluesOnWhyte;
