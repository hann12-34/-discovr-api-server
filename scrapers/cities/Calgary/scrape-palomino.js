/**
 * The Palomino Smokehouse Live Events Scraper
 * Source: https://thepalomino.ca/live-events/
 * Address: 109 7 Ave SW, Calgary, AB T2P 5M7
 */

const { spawnSync } = require('child_process');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

function parseDate(raw) {
  // "APR 11, 2026" or "MAY 1, 2026"
  const m = raw.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`;
}

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-sL', '-m', '15',
    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    url
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return result.stdout || '';
}

async function scrapePalomino(city = 'Calgary') {
  console.log('🎸 Scraping The Palomino Smokehouse...');

  try {
    const html = curlFetch('https://thepalomino.ca/live-events/');
    if (!html || html.length < 1000) return [];

    const $ = cheerio.load(html);
    const events = [];
    const seenUrls = new Set();
    const today = new Date().toISOString().slice(0, 10);

    $('.e-loop-item').each((i, el) => {
      try {
        const $el = $(el);

        const dateRaw = $el.find('.event-date').first().text().trim();
        const dateStr = parseDate(dateRaw);
        if (!dateStr || dateStr < today) return;

        const title = $el.find('h2,h3,h4,.event-title').first().text().trim() ||
                      $el.text().replace(dateRaw, '').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (!title || title.length < 3) return;

        const link = $el.find('a').first().attr('href') || '';
        const eventUrl = link.startsWith('http') ? link : `https://thepalomino.ca${link}`;
        if (!link || seenUrls.has(eventUrl)) return;
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
            name: 'The Palomino Smokehouse',
            address: '109 7 Ave SW, Calgary, AB T2P 5M7',
            city: 'Calgary',
          },
          city,
          source: 'palomino',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ Palomino: ${events.length} events`);
    return filterEvents(events);
  } catch (error) {
    console.error('Error scraping Palomino:', error.message);
    return [];
  }
}

module.exports = scrapePalomino;
