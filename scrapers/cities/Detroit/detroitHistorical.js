/**
 * Detroit Historical Society Events Scraper
 * Source: https://www.detroithistorical.org/events
 * Covers Detroit Historical Museum & Dossin Great Lakes Museum
 */

const { spawnSync } = require('child_process');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-sL', '-m', '15',
    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    url
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return result.stdout || '';
}

function parseDate(dateText) {
  // "April 18, 2026, 2:00 - 3:30pm"
  const m = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/i);
  if (!m) return null;
  const months = { january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
    july:'07',august:'08',september:'09',october:'10',november:'11',december:'12' };
  const month = months[m[1].toLowerCase()];
  const day = m[2].padStart(2, '0');
  return `${m[3]}-${month}-${day}`;
}

async function scrapeDetroitHistorical(city = 'Detroit') {
  console.log('🏛️ Scraping Detroit Historical Society...');

  try {
    const html = curlFetch('https://www.detroithistorical.org/events');
    if (!html) return [];

    const $ = cheerio.load(html);
    const events = [];
    const seenUrls = new Set();
    const today = new Date().toISOString().slice(0, 10);

    $('.views-row').each((i, el) => {
      try {
        const $el = $(el);

        const title = $el.find('.field--name-title').first().text().trim();
        if (!title || title.length < 3) return;

        const relHref = $el.find('a[href*="/events/"]').last().attr('href') || '';
        if (!relHref) return;
        const eventUrl = relHref.startsWith('http') ? relHref : `https://www.detroithistorical.org${relHref}`;
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);

        const dateText = $el.find('.post-date').text().trim();
        const dateStr = parseDate(dateText);
        if (!dateStr || dateStr < today) return;

        const venueName = $el.find('.events__location').text().trim() || 'Detroit Historical Museum';
        const address = /dossin/i.test(venueName)
          ? '100 The Strand, Belle Isle, Detroit, MI 48207'
          : '5401 Woodward Ave, Detroit, MI 48202';

        const imageUrl = $el.find('img').attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description: '',
          imageUrl: imageUrl && !/logo|placeholder/i.test(imageUrl) ? imageUrl : null,
          venue: {
            name: venueName || 'Detroit Historical Museum',
            address,
            city: 'Detroit',
          },
          city,
          source: 'detroit-historical',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ Detroit Historical: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping Detroit Historical:', error.message);
    return [];
  }
}

module.exports = scrapeDetroitHistorical;
