/**
 * Royal Alberta Museum Edmonton Events Scraper
 * Museum with cultural events
 * URL: https://royalalbertamuseum.ca/programs-events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeRoyalAlbertaMuseum(city = 'Edmonton') {
  console.log('🏛️ Scraping Royal Alberta Museum Edmonton...');

  try {
    const response = await axios.get('https://royalalbertamuseum.ca/visit/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('.event-card, .program-card, article, .views-row, [class*="event"]').each((i, el) => {
      try {
        const $el = $(el);
        const linkEl = $el.find('a[href]').first();
        const url = linkEl.attr('href');
        if (!url || seen.has(url) || url.includes('#')) return;
        seen.add(url);

        const title = $el.find('h2, h3, h4, .title, .field--name-title').first().text().trim();
        if (!title || title.length < 3) return;

        const dateText = $el.find('.date, time, [class*="date"]').first().text().trim() || $el.text();
        const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        
        let isoDate = null;
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || new Date().getFullYear().toString();
          isoDate = `${year}-${month}-${day}`;
        }

        if (!isoDate || new Date(isoDate) < new Date()) return;

        events.push({
          id: uuidv4(),
          title,
          description: 'Event at Royal Alberta Museum',
          date: isoDate,
          startDate: new Date(isoDate + 'T10:00:00'),
          url: url.startsWith('http') ? url : `https://royalalbertamuseum.ca${url}`,
          imageUrl: $el.find('img').first().attr('src') || null,
          venue: {
            name: 'Royal Alberta Museum',
            address: '9810 103a Ave NW, Edmonton, AB T5J 0G2',
            city: 'Edmonton'
          },
          latitude: 53.5461,
          longitude: -113.4938,
          city: 'Edmonton',
          category: 'Festivals',
          source: 'Royal Alberta Museum'
        });
      } catch (e) {}
    });

    console.log(`  ✅ Found ${events.length} Royal Alberta Museum events`);
    return events;

  } catch (error) {
    console.error(`  ⚠️ Royal Alberta Museum error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeRoyalAlbertaMuseum;
