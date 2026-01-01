/**
 * Yellowhead Brewery Edmonton Events Scraper
 * Brewery with live music events
 * URL: https://yellowheadbrewery.com/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeYellowheadBrewery(city = 'Edmonton') {
  console.log('🍺 Scraping Yellowhead Brewery Edmonton...');

  try {
    const response = await axios.get('https://yellowheadbrewery.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="event"], .event-item, article, .tribe-events-event').each((i, el) => {
      try {
        const $el = $(el);
        const linkEl = $el.is('a') ? $el : $el.find('a').first();
        const url = linkEl.attr('href');
        if (!url || seen.has(url)) return;
        seen.add(url);

        const title = $el.find('h2, h3, h4, .title').first().text().trim() || linkEl.text().trim();
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
          description: 'Live event at Yellowhead Brewery',
          date: isoDate,
          startDate: new Date(isoDate + 'T19:00:00'),
          url: url.startsWith('http') ? url : `https://yellowheadbrewery.com${url}`,
          imageUrl: $el.find('img').first().attr('src') || null,
          venue: {
            name: 'Yellowhead Brewery',
            address: '10229 105 Street NW, Edmonton, AB T5J 1E3',
            city: 'Edmonton'
          },
          latitude: 53.5472,
          longitude: -113.5020,
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'Yellowhead Brewery'
        });
      } catch (e) {}
    });

    console.log(`  ✅ Found ${events.length} Yellowhead Brewery events`);
    return events;

  } catch (error) {
    console.error(`  ⚠️ Yellowhead Brewery error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeYellowheadBrewery;
