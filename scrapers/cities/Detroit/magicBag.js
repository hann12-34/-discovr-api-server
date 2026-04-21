/**
 * The Magic Bag Events Scraper - Detroit (Ferndale, Metro Detroit)
 * Source: https://www.themagicbag.com/magicbag-concerts-calendar
 * Address: 22920 Woodward Ave, Ferndale, MI 48220
 */

const { spawnSync } = require('child_process');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(dateText) {
  // "Apr 16 at 7:00 pm"
  const m = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase().slice(0, 3)];
  const day = m[2].padStart(2, '0');
  const now = new Date();
  const eventMonth = parseInt(month, 10);
  const currentMonth = now.getMonth() + 1;
  const year = eventMonth < currentMonth ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-${month}-${day}`;
}

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-sL', '-m', '15',
    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    url
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return result.stdout || '';
}

async function scrapeMagicBag(city = 'Detroit') {
  console.log('🎩 Scraping The Magic Bag...');

  try {
    const html = curlFetch('https://www.themagicbag.com/magicbag-concerts-calendar');
    if (!html) return [];

    const $ = cheerio.load(html);
    const events = [];
    const seenUrls = new Set();
    const today = new Date().toISOString().slice(0, 10);

    $('.magicbag-events-cal-container-mobile').each((i, el) => {
      try {
        const $el = $(el);

        const dateText = $el.find('.magicbag-events-cal-event-date-mobile').text().trim();
        const dateStr = parseDate(dateText);
        if (!dateStr || dateStr < today) return;

        const title = $el.find('.magicbag-events-cal-event-name-mobile').text().trim();
        if (!title || title.length < 3) return;
        if (/canceled|postponed/i.test(title)) return;

        const relHref = $el.find('a[href*="concerts-magicbag"]').attr('href') || '';
        if (!relHref || relHref.includes('-hide')) return;

        const eventUrl = relHref.startsWith('http')
          ? relHref
          : `https://www.themagicbag.com/${relHref}`;
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);

        const imageUrl = $el.find('img').attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description: '',
          imageUrl: imageUrl && !/logo|placeholder/i.test(imageUrl) ? imageUrl : null,
          venue: {
            name: 'The Magic Bag',
            address: '22920 Woodward Ave, Ferndale, MI 48220',
            city: 'Detroit',
          },
          city,
          source: 'magic-bag',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ The Magic Bag: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping The Magic Bag:', error.message);
    return [];
  }
}

module.exports = scrapeMagicBag;
