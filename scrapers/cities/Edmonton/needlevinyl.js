/**
 * The Needle Vinyl Tavern Edmonton Scraper
 * URL: https://theneedlevinyltavern.com/events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeNeedleVinyl(city = 'Edmonton') {
  console.log('🎵 Scraping Needle Vinyl Tavern Edmonton...');

  try {
    const response = await axios.get('https://www.theneedle.ca/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="event"], .event, article, [class*="event"]').each((i, el) => {
      try {
        const $el = $(el);
        const title = $el.find('h2, h3, h4, .title').first().text().trim() || $el.text().trim().substring(0, 100);
        if (!title || title.length < 3 || seen.has(title)) return;
        seen.add(title);

        const link = $el.attr('href') || $el.find('a').first().attr('href');
        const url = link ? (link.startsWith('http') ? link : `https://www.theneedlevinyltavern.com${link}`) : 'https://www.theneedlevinyltavern.com/events';

        const img = $el.find('img').first();
        const imageUrl = img.attr('src') || img.attr('data-src') || null;

        const dateText = $el.text();
        const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        
        let isoDate = null;
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || new Date().getFullYear();
          isoDate = `${year}-${month}-${day}`;
        }

        if (!isoDate || new Date(isoDate) < new Date()) return;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          startDate: new Date(isoDate + 'T20:00:00'),
          url,
          imageUrl,
          venue: { name: 'The Needle Vinyl Tavern', address: '9510 111 St NW, Edmonton, AB T5K 1L8', city: 'Edmonton' },
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'Needle Vinyl Tavern'
        });
      } catch (e) {}
    });

    console.log(`  ✅ Found ${events.length} Needle Vinyl events`);
    return events;
  } catch (error) {
    console.error(`  ⚠️ Needle Vinyl error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeNeedleVinyl;
