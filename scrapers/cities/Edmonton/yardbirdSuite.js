/**
 * Yardbird Suite Edmonton Jazz Club Scraper
 * URL: https://www.yardbirdsuite.com/schedule/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeYardbirdSuite(city = 'Edmonton') {
  console.log('🎷 Scraping Yardbird Suite Edmonton...');

  try {
    const response = await axios.get('https://yardbirdsuite.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="event"], .event, article, .tribe-events-calendar-list__event').each((i, el) => {
      try {
        const $el = $(el);
        const title = $el.find('h2, h3, h4, .tribe-events-calendar-list__event-title').first().text().trim();
        if (!title || title.length < 3 || seen.has(title)) return;
        seen.add(title);

        const link = $el.attr('href') || $el.find('a').first().attr('href');
        const url = link ? (link.startsWith('http') ? link : `https://yardbirdsuite.com${link}`) : 'https://yardbirdsuite.com/calendar/';

        const img = $el.find('img').first();
        const imageUrl = img.attr('src') || img.attr('data-src') || null;

        const dateEl = $el.find('time, .tribe-events-calendar-list__event-datetime, [datetime]');
        let isoDate = dateEl.attr('datetime')?.substring(0, 10);
        
        if (!isoDate) {
          const dateText = $el.text();
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3] || new Date().getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }

        if (!isoDate || new Date(isoDate) < new Date()) return;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          startDate: new Date(isoDate + 'T20:00:00'),
          url,
          imageUrl,
          venue: { name: 'Yardbird Suite', address: '11 Tommy Banks Way, Edmonton, AB T6E 2M2', city: 'Edmonton' },
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'Yardbird Suite'
        });
      } catch (e) {}
    });

    console.log(`  ✅ Found ${events.length} Yardbird Suite events`);
    return events;
  } catch (error) {
    console.error(`  ⚠️ Yardbird Suite error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeYardbirdSuite;
