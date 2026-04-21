const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

function parseDate(dateText) {
  const m = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const day = m[2].padStart(2, '0');
  return `${m[3]}-${month}-${day}`;
}

async function scrapeEvents(city = 'Toronto') {
  console.log('🐴 Scraping Horseshoe Tavern events...');

  try {
    const response = await axios.get('https://www.horseshoetavern.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 20000,
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    // Webflow CMS: same structure as Lee's Palace
    $('.schedule-event').each((i, el) => {
      try {
        const $el = $(el);

        const title = $el.find('.schedule-speaker-name').first().text().trim();
        if (!title || title.length < 3) return;

        const titleKey = title.toLowerCase();
        if (seenTitles.has(titleKey)) return;
        seenTitles.add(titleKey);

        // External ticket URL (showclix or other)
        const eventUrl = $el.find('a[href^="http"]').first().attr('href') || '';
        if (!eventUrl) return;

        const dateText = $el.find('.schedule-event-time').first().text().trim();
        const dateStr = parseDate(dateText);
        if (!dateStr) return;

        const imageUrl = $el.find('img').first().attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description: '',
          imageUrl: imageUrl && !imageUrl.includes('logo') ? imageUrl : null,
          venue: {
            name: 'Horseshoe Tavern',
            address: '370 Queen St W, Toronto, ON M5V 2A2',
            city: 'Toronto',
          },
          city,
          source: 'horseshoe-tavern',
        });
      } catch (e) { /* skip */ }
    });

    console.log(`✅ Horseshoe Tavern: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping Horseshoe Tavern:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
