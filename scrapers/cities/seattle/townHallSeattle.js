/**
 * Town Hall Seattle Events Scraper
 * URL: https://www.townhallseattle.org/events/
 * Historic community gathering place in Seattle
 * Talks, music, comedy, civic events, arts
 * Uses WordPress Tribe Events plugin with datetime attributes
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const TownHallSeattleEvents = {
  async scrape(city = 'Seattle') {
    console.log('🎤 Scraping Town Hall Seattle...');

    try {
      const response = await axios.get('https://www.townhallseattle.org/events/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      $('.tribe-events-calendar-list__event-row').each((i, el) => {
        const row = $(el);

        // Extract title and URL from the event title link
        const titleLink = row.find('.tribe-events-calendar-list__event-title a');
        const title = titleLink.text().trim();
        if (!title || title.length < 2) return;

        let url = titleLink.attr('href');
        if (!url) return;
        if (!url.startsWith('http')) {
          url = 'https://www.townhallseattle.org' + url;
        }

        // Extract date from datetime attribute
        const dateTag = row.find('time[datetime]').first();
        const isoDate = dateTag.attr('datetime');
        if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return;

        const dateOnly = isoDate.substring(0, 10);
        if (new Date(dateOnly) < new Date()) return;

        // Deduplicate
        const key = `${title}|${dateOnly}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image
        const img = row.find('.tribe-events-calendar-list__event-featured-image img');
        let imageUrl = img.attr('src') || img.attr('data-src') || null;

        // Extract description
        const description = row.find('.tribe-events-calendar-list__event-description').text().trim().replace(/\s+/g, ' ') || '';

        events.push({
          id: uuidv4(),
          title,
          date: dateOnly,
          url,
          imageUrl,
          description,
          venue: {
            name: 'Town Hall Seattle',
            address: '1119 8th Ave, Seattle, WA 98101',
            city: 'Seattle'
          },
          city: 'Seattle',
          category: 'Arts',
          source: 'Town Hall Seattle'
        });
      });

      console.log(`  ✅ Found ${events.length} Town Hall Seattle events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Town Hall Seattle error: ${error.message}`);
      return [];
    }
  }
};

module.exports = TownHallSeattleEvents.scrape;
