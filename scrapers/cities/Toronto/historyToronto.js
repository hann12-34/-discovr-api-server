/**
 * History Toronto Events Scraper
 * URL: https://www.historytoronto.com/events
 * Major 2,500-capacity concert venue at 1663 Queen St E, Toronto
 * Live Nation venue hosting major artists, EDM, rock, pop
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const HistoryTorontoEvents = {
  async scrape(city = 'Toronto') {
    console.log('🎤 Scraping History Toronto...');

    try {
      const response = await axios.get('https://www.historytoronto.com/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      // Each event is in a .eventItem container
      $('.eventItem').each((i, el) => {
        const container = $(el);

        // Extract title from h3.title a
        const titleEl = container.find('h3.title a');
        const title = titleEl.text().trim();
        if (!title || title.length < 2) return;

        // Extract event detail URL
        const detailUrl = titleEl.attr('href') || '';
        if (!detailUrl) return;

        // Extract ticket URL from the buy tickets link
        const ticketLink = container.find('a.tickets');
        const ticketUrl = ticketLink.attr('href') || '';
        // Must have a real ticket URL — skip events without one
        if (!ticketUrl || !ticketUrl.includes('ticketmaster')) return;

        // Extract date from m-date__ elements
        const dateContainer = container.find('.date');
        const day = dateContainer.find('.m-date__day').first().text().trim();
        const monthRaw = dateContainer.find('.m-date__month').first().text().trim().replace('.', '').toLowerCase();
        const year = dateContainer.find('.m-date__year').first().text().trim();

        if (!day || !monthRaw || !year) return;

        const monthNum = months[monthRaw.substring(0, 3)];
        if (!monthNum) return;

        const isoDate = `${year}-${monthNum}-${day.padStart(2, '0')}`;
        if (new Date(isoDate) < new Date()) return;

        // Deduplicate
        const key = `${title}|${isoDate}`;
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image from .thumb img
        const img = container.find('.thumb img');
        let imageUrl = img.attr('src') || null;
        if (imageUrl && /logo|placeholder|default|favicon|icon/i.test(imageUrl)) {
          imageUrl = null;
        }

        // Extract time
        const timeText = container.find('.start').text().trim();

        // Extract tagline/supporting act
        const tagline = container.find('.tagline').text().trim();

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          time: timeText || null,
          url: ticketUrl,
          imageUrl,
          description: tagline || '',
          venue: {
            name: 'History',
            address: '1663 Queen St E, Toronto, ON M4L 1G5',
            city: 'Toronto'
          },
          latitude: 43.6629,
          longitude: -79.3192,
          city: 'Toronto',
          category: 'Concert',
          source: 'History Toronto'
        });
      });

      console.log(`  ✅ Found ${events.length} History Toronto events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ History Toronto error: ${error.message}`);
      return [];
    }
  }
};

module.exports = HistoryTorontoEvents.scrape;
