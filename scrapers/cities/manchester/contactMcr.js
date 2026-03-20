/**
 * Contact Manchester Events Scraper
 * URL: https://www.contactmcr.com/whats-on
 * Contemporary theatre and performance venue in Manchester
 * Theatre, dance, comedy, music, spoken word
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const ContactMcrEvents = {
  async scrape(city = 'Manchester') {
    console.log('🎭 Scraping Contact Manchester...');

    try {
      const response = await axios.get('https://www.contactmcr.com/whats-on', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      $('.c-media--event').each((i, el) => {
        const card = $(el);

        // Extract title from spans
        const titleSpans = card.find('.c-media__title .c-media__title-word');
        let title = '';
        titleSpans.each((j, span) => {
          title += $(span).text().trim() + ' ';
        });
        title = title.trim();
        if (!title || title.length < 2) return;

        // Extract URL
        const infoLink = card.find('a[href*="/events/"]').first();
        const href = infoLink.attr('href');
        if (!href) return;
        const url = href.startsWith('http') ? href : 'https://contactmcr.com' + href;

        // Extract start date from datetime attribute
        const startTime = card.find('time[itemprop="startDate"]');
        const dt = startTime.attr('datetime');
        if (!dt) return;

        const isoDate = dt.substring(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return;
        if (new Date(isoDate) < new Date()) return;

        // Deduplicate
        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image
        const img = card.find('img[itemprop="image"]');
        let imageUrl = img.attr('src') || null;

        // Extract description
        const description = card.find('.c-media__summary').text().trim().replace(/\s+/g, ' ') || '';

        // Extract category from flag
        const category = card.find('.c-media__flag').text().trim() || 'Theatre';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description,
          venue: {
            name: 'Contact',
            address: 'Oxford Rd, Manchester M15 6JA, UK',
            city: 'Manchester'
          },
          city: 'Manchester',
          category,
          source: 'Contact Manchester'
        });
      });

      console.log(`  ✅ Found ${events.length} Contact Manchester events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Contact Manchester error: ${error.message}`);
      return [];
    }
  }
};

module.exports = ContactMcrEvents.scrape;
