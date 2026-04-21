/**
 * The Crofoot Events Scraper - Detroit Metro Area
 * Source: https://www.thecrofoot.com
 * Covers: Crofoot Ballroom, Pike Room, Russell Industrial Center, Lincoln Factory, etc.
 */

const { spawnSync } = require('child_process');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VENUE_ADDRESSES = {
  'crofoot ballroom':    { name: 'The Crofoot Ballroom', address: '1 South Saginaw St, Pontiac, MI 48342' },
  'pike room':           { name: 'The Pike Room',        address: '1 South Saginaw St, Pontiac, MI 48342' },
  'vernors room':        { name: 'The Vernors Room',     address: '1 South Saginaw St, Pontiac, MI 48342' },
  'russell industrial':  { name: 'Russell Industrial Center', address: '1600 Clay St, Detroit, MI 48211' },
  'lincoln factory':     { name: 'Lincoln Factory',      address: '4200 Rosa Parks Blvd, Detroit, MI 48208' },
  'edgemen':             { name: 'EDGEMEN',              address: '42705 Mound Rd, Sterling Heights, MI 48314' },
};

const MONTHS = {
  january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
  july:'07', august:'08', september:'09', october:'10', november:'11', december:'12',
};

function parseDate(raw) {
  if (!raw) return null;
  // "April 17, 2026" or "April 17, 2026"
  const longMatch = raw.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (longMatch) {
    const m = MONTHS[longMatch[1].toLowerCase()];
    return `${longMatch[3]}-${m}-${longMatch[2].padStart(2, '0')}`;
  }
  // "04/14/26 @ 6:00pm"
  const shortMatch = raw.match(/(\d{2})\/(\d{2})\/(\d{2})/);
  if (shortMatch) {
    const year = `20${shortMatch[3]}`;
    return `${year}-${shortMatch[1]}-${shortMatch[2]}`;
  }
  return null;
}

function resolveVenue(venueName) {
  const key = Object.keys(VENUE_ADDRESSES).find(k => venueName.toLowerCase().includes(k));
  return key ? VENUE_ADDRESSES[key] : { name: venueName, address: '1 South Saginaw St, Pontiac, MI 48342' };
}

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-sL', '-m', '15',
    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    url
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return result.stdout || '';
}

async function scrapeCrofoot(city = 'Detroit') {
  console.log('🎸 Scraping The Crofoot...');

  try {
    const html = curlFetch('https://www.thecrofoot.com');
    if (!html) return [];

    const $ = cheerio.load(html);
    const events = [];
    const seenUrls = new Set();
    const today = new Date().toISOString().slice(0, 10);

    $('.event').each((i, el) => {
      try {
        const $el = $(el);

        const title = $el.find('h2, h3, .title, [class*=title]').first().text().trim();
        if (!title || title.length < 2) return;

        const link = $el.find('a').first().attr('href') || '';
        if (!link) return;
        const eventUrl = link.startsWith('http') ? link : `https://www.thecrofoot.com${link}`;
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);

        const dateRaw = $el.find('.date, [class*=date]').first().text().trim();
        const dateStr = parseDate(dateRaw);
        if (!dateStr || dateStr < today) return;

        const venueName = $el.find('.venue, [class*=venue]').first().text().trim().replace(/^@\s*/, '');
        const venueInfo = resolveVenue(venueName);

        const imageUrl = $el.find('img').attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description: '',
          imageUrl: imageUrl && !/logo|placeholder|default/i.test(imageUrl) ? imageUrl : null,
          venue: { ...venueInfo, city: 'Detroit' },
          city,
          source: 'crofoot',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ Crofoot: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping Crofoot:', error.message);
    return [];
  }
}

module.exports = scrapeCrofoot;
