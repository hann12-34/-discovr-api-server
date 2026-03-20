/**
 * The Old Market (TOM) Brighton Events Scraper
 * URL: https://www.theoldmarket.com/whats-on
 * Arts and live music venue in Hove/Brighton
 * Music, theatre, comedy, dance, spoken word
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const TheOldMarketEvents = {
  async scrape(city = 'Brighton') {
    console.log('🎵 Scraping The Old Market Brighton...');

    try {
      const response = await axios.get('https://www.theoldmarket.com/whats-on', {
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

        const title = container.find('.eventlist-title-link').text().trim();
        if (!title || title.length < 2) return;

        const href = container.find('.eventlist-title-link').attr('href');
        if (!href) return;
        const url = href.startsWith('http') ? href : 'https://www.theoldmarket.com' + href;

        // Extract date from datetime attribute
        const isoDate = container.find('time.event-date').attr('datetime');
        if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return;
        const dateStr = isoDate.substring(0, 10);

        if (new Date(dateStr) < new Date()) return;

        // Deduplicate
        const key = `${title}|${dateStr}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract time
        const timeText = container.find('.event-time-12hr-start').text().trim() || '';

        // Extract image
        let imageUrl = container.find('.eventlist-thumbnail img').attr('data-src')
          || container.find('.eventlist-thumbnail img').attr('src')
          || null;

        // Extract description
        const description = container.find('.eventlist-description').text().trim().replace(/\s+/g, ' ') || '';

        events.push({
          id: uuidv4(),
          title,
          date: dateStr,
          url,
          imageUrl,
          description,
          venue: {
            name: 'The Old Market',
            address: '11A Upper Market St, Hove BN3 1AS, UK',
            city: 'Brighton'
          },
          city: 'Brighton',
          category: 'Concert',
          source: 'The Old Market'
        });
      });

      console.log(`  ✅ Found ${events.length} Old Market Brighton events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Old Market Brighton error: ${error.message}`);
      return [];
    }
  }
};

module.exports = TheOldMarketEvents.scrape;
