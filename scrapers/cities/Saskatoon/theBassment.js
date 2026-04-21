/**
 * The Bassment (Saskatoon Jazz Society) Events Scraper
 * Source: https://thebassment.ca/events/list/ (WordPress + Tribe Events)
 * Address: 250 2nd Ave S, Saskatoon, SK S7K 1K9
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(dateText) {
  // "Tue Apr 14 - 7:30 pm" or "Fri Apr 17 - 4:30 pm"
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

async function scrapeTheBassment(city = 'Saskatoon') {
  console.log('🎷 Scraping The Bassment (Saskatoon Jazz Society)...');

  const allEvents = [];
  const seenUrls = new Set();

  try {
    let page = 1;

    while (page <= 10) {
      const url = page === 1
        ? 'https://thebassment.ca/events/list/'
        : `https://thebassment.ca/events/list/?tribe_event_display=list&tribe_paged=${page}`;

      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const items = $('.type-tribe_events');
      if (items.length === 0) break;

      items.each((i, el) => {
        try {
          const $el = $(el);

          const titleEl = $el.find('h2.tribe-events-list-event-title a');
          const title = titleEl.text().trim();
          if (!title || title.length < 3) return;

          const eventUrl = titleEl.attr('href') || '';
          if (!eventUrl || seenUrls.has(eventUrl)) return;
          seenUrls.add(eventUrl);

          const dateText = $el.find('.tribe-event-date-start').first().text().trim();
          const dateStr = parseDate(dateText);
          if (!dateStr) return;

          const imageUrl = $el.find('img').first().attr('src') || null;

          allEvents.push({
            id: uuidv4(),
            title,
            url: eventUrl,
            date: dateStr,
            description: '',
            imageUrl: imageUrl && !/logo|placeholder/i.test(imageUrl) ? imageUrl : null,
            venue: {
              name: 'The Bassment',
              address: '250 2nd Ave S, Saskatoon, SK S7K 1K9',
              city: 'Saskatoon',
            },
            city,
            source: 'the-bassment',
          });
        } catch (e) { /* skip */ }
      });

      // Check if there's a next page
      const hasNext = response.data.includes('tribe_paged=' + (page + 1)) ||
        $('a.tribe-events-nav-next').length > 0;
      if (!hasNext) break;
      page++;
    }

    console.log(`✅ The Bassment: ${allEvents.length} events`);
    return filterEvents(allEvents);

  } catch (error) {
    console.error('Error scraping The Bassment:', error.message);
    return [];
  }
}

module.exports = scrapeTheBassment;
