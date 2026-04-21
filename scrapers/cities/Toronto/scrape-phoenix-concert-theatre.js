/**
 * The Phoenix Concert Theatre Events Scraper
 * Source: https://thephoenixconcerttheatre.com/events/
 * Address: 410 Sherbourne St, Toronto, ON M4X 1K2
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS_ABBR = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(dateText) {
  // "Friday, Apr 17, Doors: 7pm"  or  "Apr 17, 2026"
  const withYear = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (withYear) {
    const month = MONTHS_ABBR[withYear[1].toLowerCase().slice(0, 3)];
    return `${withYear[3]}-${month}-${withYear[2].padStart(2, '0')}`;
  }
  const noYear = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
  if (!noYear) return null;
  const month = MONTHS_ABBR[noYear[1].toLowerCase().slice(0, 3)];
  const day = noYear[2].padStart(2, '0');
  const now = new Date();
  const eventMonth = parseInt(month, 10);
  const currentMonth = now.getMonth() + 1;
  const year = eventMonth < currentMonth ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-${month}-${day}`;
}

async function scrapePhoenixConcertTheatre(city = 'Toronto') {
  console.log('🎸 Scraping The Phoenix Concert Theatre events...');

  try {
    const response = await axios.get('https://thephoenixconcerttheatre.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 20000,
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();

    $('article').each((i, el) => {
      try {
        const $el = $(el);

        // URL and title from anchor with title attribute
        const anchor = $el.find('a[title]').first();
        const title = (anchor.attr('title') || anchor.text()).trim()
          .replace(/&#\d+;/g, '').replace(/&amp;/g, '&').replace(/&apos;/g, "'")
          .replace(/\s*[–\-]\s*SOLD\s*OUT\s*$/i, '')
          .trim();
        if (!title || title.length < 3) return;

        const eventUrl = anchor.attr('href') || $el.find('a[href*="/event/"]').first().attr('href') || '';
        if (!eventUrl || seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);

        // Date from header.event-date
        const dateText = $el.find('.event-date, header').first().text().trim();
        const dateStr = parseDate(dateText);
        if (!dateStr) return;

        // Image from background-image style
        const styleAttr = $el.find('[style*="background-image"]').first().attr('style') || '';
        const imgMatch = styleAttr.match(/url\(['"]?([^'")]+)['"]?\)/);
        const imageUrl = imgMatch ? imgMatch[1] : ($el.find('img').first().attr('src') || null);

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description: '',
          imageUrl: imageUrl && !/logo|placeholder/i.test(imageUrl) ? imageUrl : null,
          venue: {
            name: 'The Phoenix Concert Theatre',
            address: '410 Sherbourne St, Toronto, ON M4X 1K2',
            city: 'Toronto',
          },
          city,
          source: 'phoenix-concert-theatre',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ Phoenix Concert Theatre: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping Phoenix Concert Theatre:', error.message);
    return [];
  }
}

module.exports = scrapePhoenixConcertTheatre;
