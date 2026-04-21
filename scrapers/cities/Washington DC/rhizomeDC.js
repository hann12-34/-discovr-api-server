/**
 * Rhizome DC Events Scraper
 * Source: https://www.rhizomedc.org/events
 * Address: 6950 Laurel Ave, Takoma Park, MD 20912
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

function parseDate(raw) {
  // "Apr 5" or "May 22"
  const m = raw.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const today = new Date();
  const yr = parseInt(month) < today.getMonth() + 1 ? today.getFullYear() + 1 : today.getFullYear();
  return `${yr}-${month}-${m[2].padStart(2, '0')}`;
}

async function scrapeRhizome(city = 'Washington DC') {
  console.log('🎨 Scraping Rhizome DC...');
  try {
    const res = await axios.get('https://www.rhizomedc.org/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });
    const $ = cheerio.load(res.data);
    const events = [];
    const seenUrls = new Set();
    const today = new Date().toISOString().slice(0, 10);

    $('.summary-item').each((i, el) => {
      try {
        const $el = $(el);
        const title = $el.find('.summary-title').first().text().trim();
        if (!title || title.length < 2) return;

        const dateRaw = $el.find('.summary-thumbnail-event-date').first().text().trim();
        const dateStr = parseDate(dateRaw);
        if (!dateStr || dateStr < today) return;

        const relHref = $el.find('a.summary-title-link, a').first().attr('href') || '';
        if (!relHref) return;
        const eventUrl = relHref.startsWith('http') ? relHref : `https://www.rhizomedc.org${relHref}`;
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);

        const imgSrc = $el.find('img').attr('data-src') || $el.find('img').attr('src') || null;
        const imageUrl = imgSrc && !imgSrc.startsWith('data:')
          ? (imgSrc.startsWith('http') ? imgSrc : `https://www.rhizomedc.org${imgSrc}`)
          : null;

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description: '',
          imageUrl: imageUrl && !/logo|placeholder/i.test(imageUrl) ? imageUrl : null,
          venue: {
            name: 'Rhizome DC',
            address: '6950 Laurel Ave, Takoma Park, MD 20912',
            city: 'Washington DC',
          },
          city,
          source: 'rhizome-dc',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ Rhizome DC: ${events.length} events`);
    return filterEvents(events);
  } catch (err) {
    console.error('Error scraping Rhizome DC:', err.message);
    return [];
  }
}

module.exports = scrapeRhizome;
