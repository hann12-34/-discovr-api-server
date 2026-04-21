/**
 * Black Cat DC Events Scraper
 * Source: https://blackcatdc.com/shows
 * Address: 1811 14th St NW, Washington, DC 20009
 */

const { spawnSync } = require('child_process');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

function parseDate(raw) {
  // "Sat Apr 30", "Mon May 16", "May 6-May 7"
  const m = raw.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const today = new Date();
  const yr = parseInt(month) < today.getMonth() + 1 ? today.getFullYear() + 1 : today.getFullYear();
  return `${yr}-${month}-${m[2].padStart(2, '0')}`;
}

function curlFetch(url) {
  const r = spawnSync('curl', ['-sL', '-m', '15',
    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    url], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return r.stdout || '';
}

async function scrapeBlackCat(city = 'Washington DC') {
  console.log('🐱 Scraping Black Cat DC...');
  try {
    const html = curlFetch('https://blackcatdc.com/shows');
    if (!html || html.length < 1000) return [];

    const $ = cheerio.load(html);
    const events = [];
    const seenUrls = new Set();
    const today = new Date().toISOString().slice(0, 10);

    $('.photo-date').each((i, el) => {
      try {
        const $el = $(el);
        // Split on <br> to separate date from title
        const rawHtml = $el.html() || '';
        const [datePart, ...titleParts] = rawHtml.split(/<br\s*\/?>/i);
        const dateRaw = datePart.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const title = titleParts.join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!title || title.length < 2) return;

        const dateStr = parseDate(dateRaw);
        if (!dateStr || dateStr < today) return;

        const $parent = $el.closest('div');
        const link = $parent.find('a').first().attr('href') || '';
        if (!link) return;
        const eventUrl = link.startsWith('http') ? link : `https://blackcatdc.com${link}`;
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);

        const imgSrc = $parent.find('img').attr('src') || null;
        const imageUrl = imgSrc && !imgSrc.startsWith('data:')
          ? (imgSrc.startsWith('http') ? imgSrc : `https://blackcatdc.com${imgSrc}`)
          : null;

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description: '',
          imageUrl,
          venue: {
            name: 'Black Cat',
            address: '1811 14th St NW, Washington, DC 20009',
            city: 'Washington DC',
          },
          city,
          source: 'black-cat-dc',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ Black Cat DC: ${events.length} events`);
    return filterEvents(events);
  } catch (err) {
    console.error('Error scraping Black Cat DC:', err.message);
    return [];
  }
}

module.exports = scrapeBlackCat;
