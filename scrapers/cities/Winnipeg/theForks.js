/**
 * The Forks Events Scraper - Winnipeg
 * Source: https://theforks.com/events
 * Address: 1 Forks Market Rd, Winnipeg, MB R3C 4L9
 */

const { spawnSync } = require('child_process');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS_ABBR = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(dateText) {
  // "Monday, Apr 13 to Saturday, Apr 18" — use start date
  // "Wednesday, Apr 15"
  const m = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
  if (!m) return null;
  const month = MONTHS_ABBR[m[1].toLowerCase().slice(0, 3)];
  const day = m[2].padStart(2, '0');
  const now = new Date();
  const eventMonth = parseInt(month, 10);
  const currentMonth = now.getMonth() + 1;
  const year = eventMonth < currentMonth ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-${month}-${day}`;
}

async function scrapeTheForks(city = 'Winnipeg') {
  console.log('🌊 Scraping The Forks events...');

  try {
    const result = spawnSync('curl', [
      '-sL', '-m', '15',
      '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'https://www.theforks.com/events/calendar-of-events'
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    if (!result.stdout) return [];

    const $ = cheerio.load(result.stdout);
    const events = [];
    const seenUrls = new Set();

    $('.event-listing').each((i, el) => {
      try {
        const $el = $(el);

        const titleEl = $el.find('h3 a, h2 a').first();
        const title = titleEl.text().trim();
        if (!title || title.length < 3) return;

        const relUrl = titleEl.attr('href') || '';
        if (!relUrl) return;
        const eventUrl = relUrl.startsWith('http') ? relUrl : `https://www.theforks.com${relUrl}`;
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);

        // Date from .dates inside .event-listing
        const dateText = $el.find('.dates').first().text().trim() ||
          $el.closest('.event-set').find('.dates').first().text().trim();
        const dateStr = parseDate(dateText);
        if (!dateStr) return;

        const description = $el.find('p').not('.dates').first().text().trim().slice(0, 300);
        const imageUrl = $el.find('img').first().attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description,
          imageUrl: imageUrl && !/logo|placeholder/i.test(imageUrl) ? imageUrl : null,
          venue: {
            name: 'The Forks',
            address: '1 Forks Market Rd, Winnipeg, MB R3C 4L9',
            city: 'Winnipeg',
          },
          city,
          source: 'the-forks',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ The Forks: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping The Forks:', error.message);
    return [];
  }
}

module.exports = scrapeTheForks;
