/**
 * The Rex Hotel Jazz & Blues Bar Events Scraper
 * URL: https://www.therex.ca/events
 * Toronto's longest running jazz club - 19 shows per week
 * 194 Queen St W, Toronto (Squarespace event list)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const TheRexEvents = {
  async scrape(city = 'Toronto') {
    console.log('🎷 Scraping The Rex...');

    try {
      const response = await axios.get('https://www.therex.ca/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      $('.eventlist-event').each((i, el) => {
        const container = $(el);

        // Extract title
        const titleEl = container.find('.eventlist-title-link');
        const title = titleEl.text().trim();
        if (!title || title.length < 2) return;

        // Extract event URL
        const href = titleEl.attr('href');
        if (!href) return;
        const url = href.startsWith('http') ? href : 'https://www.therex.ca' + href;

        // Extract date from datetime attribute
        const dateEl = container.find('time.event-date[datetime]');
        const isoDate = dateEl.attr('datetime');
        if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return;
        if (new Date(isoDate) < new Date()) return;

        // Deduplicate by title + date
        const key = `${title}|${isoDate}`;
        if (seen.has(key)) return;
        seen.add(key);

        // Extract time
        const startTime = container.find('time.event-time-localized-start').text().trim();
        const endTime = container.find('time.event-time-localized-end').text().trim();
        const timeStr = startTime && endTime ? `${startTime} - ${endTime}` : startTime || null;

        // Extract image from thumbnail
        const img = container.find('.eventlist-column-thumbnail img');
        let imageUrl = img.attr('data-src') || img.attr('src') || null;
        if (imageUrl && /logo|placeholder|default|favicon|icon/i.test(imageUrl)) {
          imageUrl = null;
        }

        // Extract description from eventlist-description
        const descEl = container.find('.eventlist-description');
        const description = descEl.text().trim().replace(/\s+/g, ' ') || '';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          time: timeStr,
          url,
          imageUrl,
          description,
          venue: {
            name: 'The Rex Hotel Jazz & Blues Bar',
            address: '194 Queen St W, Toronto, ON M5V 1Z1',
            city: 'Toronto'
          },
          latitude: 43.6506,
          longitude: -79.3884,
          city: 'Toronto',
          category: 'Music',
          source: 'The Rex'
        });
      });

      console.log(`  ✅ Found ${events.length} Rex events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ The Rex error: ${error.message}`);
      return [];
    }
  }
};

module.exports = TheRexEvents.scrape;
