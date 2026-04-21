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
  console.log('🎵 Scraping Lee\'s Palace events...');

  try {
    const response = await axios.get('https://www.leespalace.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 20000,
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();

    // Webflow CMS structure: div.schedule-event each has two anchors
    // - First anchor: image link
    // - Second anchor (.div-block-14): title + date + venue details
    $('.schedule-event').each((i, el) => {
      try {
        const $el = $(el);

        // Title from .schedule-speaker-name
        const title = $el.find('.schedule-speaker-name').first().text().trim();
        if (!title || title.length < 3) return;

        // URL from anchor href
        const relUrl = $el.find('a[href^="/event/"]').first().attr('href');
        if (!relUrl) return;
        const eventUrl = `https://www.leespalace.com${relUrl}`;
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);

        // Date: first .schedule-event-time element (e.g. "Thursday, April 16, 2026")
        const dateText = $el.find('.schedule-event-time').first().text().trim();
        const dateStr = parseDate(dateText);
        if (!dateStr) return;

        // Image from img alt matching title or first img in card
        const imgEl = $el.find('img').first();
        const imageUrl = imgEl.attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description: '',
          imageUrl: imageUrl && !imageUrl.includes('logo') ? imageUrl : null,
          venue: {
            name: "Lee's Palace",
            address: '529 Bloor St W, Toronto, ON M5S 1Y5',
            city: 'Toronto',
          },
          city,
          source: "lee's-palace",
        });
      } catch (e) { /* skip bad card */ }
    });

    console.log(`✅ Lee's Palace: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping Lee\'s Palace:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
