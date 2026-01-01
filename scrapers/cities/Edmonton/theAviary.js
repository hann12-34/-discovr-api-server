/**
 * The Aviary Edmonton Events Scraper
 * Nightclub/bar venue
 * URL: https://www.theaviaryedmonton.com
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTheAviary(city = 'Edmonton') {
  console.log(' Scraping The Aviary Edmonton...');

  try {
    const response = await axios.get('https://www.theaviaryedmonton.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="event"], .event, article, .show').each((i, el) => {
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
          description: 'Event at The Aviary Edmonton',
          date: isoDate,
          startDate: new Date(isoDate + 'T21:00:00'),
          url: url.startsWith('http') ? url : `https://aviaryedmonton.com${url}`,
          imageUrl: $el.find('img').first().attr('src') || null,
          venue: {
            name: 'The Aviary',
            address: '9940 106 Street NW, Edmonton, AB T5K 2V2',
            city: 'Edmonton'
          },
          latitude: 53.5461,
          longitude: -113.5070,
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'The Aviary'
        });
      } catch (e) {}
    });

    console.log(`  ✅ Found ${events.length} The Aviary events`);
    return events;

  } catch (error) {
    console.error(`  ⚠️ The Aviary error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTheAviary;
