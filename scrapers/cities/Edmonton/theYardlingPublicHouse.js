/**
 * The Yardling Public House Edmonton Events Scraper
 * Bar with live music
 * URL: https://theyardling.com/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeYardling(city = 'Edmonton') {
  console.log('🍻 Scraping The Yardling Edmonton...');

  try {
    const response = await axios.get('https://theyardling.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="event"], .event, article').each((i, el) => {
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
          description: 'Live event at The Yardling Public House',
          date: isoDate,
          startDate: new Date(isoDate + 'T20:00:00'),
          url: url.startsWith('http') ? url : `https://theyardling.com${url}`,
          imageUrl: $el.find('img').first().attr('src') || null,
          venue: {
            name: 'The Yardling Public House',
            address: '10444 82 Avenue NW, Edmonton, AB T6E 2A2',
            city: 'Edmonton'
          },
          latitude: 53.5185,
          longitude: -113.4846,
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'The Yardling'
        });
      } catch (e) {}
    });

    console.log(`  ✅ Found ${events.length} The Yardling events`);
    return events;

  } catch (error) {
    console.error(`  ⚠️ The Yardling error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeYardling;
