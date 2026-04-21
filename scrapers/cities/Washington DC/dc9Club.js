/**
 * DC9 Nightclub Events Scraper
 * Source: https://dc9.club
 * Address: 1940 9th St NW, Washington, DC 20001
 */

const { spawnSync } = require('child_process');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

function parseDate(raw) {
  // "Tue, May 19" or "Fri, Apr 22"
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

async function scrapeDC9(city = 'Washington DC') {
  console.log('🎵 Scraping DC9 Club...');
  try {
    const html = curlFetch('https://dc9.club');
    if (!html || html.length < 1000) return [];

    const $ = cheerio.load(html);
    const events = [];
    const seenUrls = new Set();
    const today = new Date().toISOString().slice(0, 10);

    $('.listing__details').each((i, el) => {
      try {
        const $el = $(el);
        const title = $el.find('.listing__title h3, .listing__titleLink').first().text().trim();
        if (!title || title.length < 2) return;

        const dateRaw = $el.find('.listingDateTime span').first().text().trim();
        const dateStr = parseDate(dateRaw);
        if (!dateStr || dateStr < today) return;

        const link = $el.find('a.listing__titleLink').attr('href') || '';
        if (!link || seenUrls.has(link)) return;
        seenUrls.add(link);

        // Image is lazy-loaded in a sibling; try og:image fallback per event page not feasible in bulk
        // Use null - index.js will fetch og:image from event URL
        events.push({
          id: uuidv4(),
          title,
          url: link,
          date: dateStr,
          description: '',
          imageUrl: null,
          venue: {
            name: 'DC9',
            address: '1940 9th St NW, Washington, DC 20001',
            city: 'Washington DC',
          },
          city,
          source: 'dc9-club',
        });
      } catch (e) { /* skip */ }
    });

    // Fetch og:image from each event URL (real images only)
    await Promise.all(events.map(async (ev) => {
      try {
        const res = await axios.get(ev.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          timeout: 8000
        });
        const $p = cheerio.load(res.data);
        const ogImg = $p('meta[property="og:image"]').attr('content');
        if (ogImg && ogImg.startsWith('http') && !/logo|placeholder|default|icon/i.test(ogImg)) {
          ev.imageUrl = ogImg;
        }
        const ogDesc = $p('meta[property="og:description"]').attr('content') ||
                       $p('meta[name="description"]').attr('content') || '';
        if (ogDesc && ogDesc.length >= 20) {
          ev.description = ogDesc.replace(/\s+/g, ' ').trim().slice(0, 500);
        }
      } catch (e) { /* skip, leave imageUrl null */ }
    }));

    console.log(`✅ DC9 Club: ${events.length} events`);
    return filterEvents(events);
  } catch (err) {
    console.error('Error scraping DC9:', err.message);
    return [];
  }
}

module.exports = scrapeDC9;
