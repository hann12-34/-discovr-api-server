/**
 * The Jam House Birmingham Events Scraper
 * URL: https://www.thejamhouse.com/whats-on
 * Live music venue in the Jewellery Quarter, Birmingham
 * Jazz, soul, funk, blues, and special events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const JamHouseBirminghamEvents = {
  async scrape(city = 'Birmingham') {
    console.log('🎵 Scraping The Jam House Birmingham...');

    try {
      const response = await axios.get('https://www.thejamhouse.com/whats-on', {
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

      const currentYear = new Date().getFullYear();

      $('.event-listing__item').each((i, el) => {
        const card = $(el);

        // Extract title
        const title = card.find('.title--secondary[data-mh="event-listing-title"]').text().trim();
        if (!title || title.length < 2) return;

        // Extract URL
        const link = card.find('a[href*="/shop/event/"]').first();
        const url = link.attr('href');
        if (!url) return;

        // Extract date: day number from .event-listing__digit, month from .title--outline-brand
        const dateBlock = card.find('.event-listing__date');
        const dayNum = dateBlock.find('.event-listing__digit').text().trim();
        const dateText = dateBlock.find('.title--outline-brand').text().trim();

        if (!dayNum || !dateText) return;

        // dateText is like "Thu 19 Mar" — extract month
        const monthMatch = dateText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
        if (!monthMatch) return;

        const monthNum = months[monthMatch[1].toLowerCase()];
        if (!monthNum) return;

        let year = currentYear;
        if (parseInt(monthNum) < new Date().getMonth()) year++;
        const isoDate = `${year}-${monthNum}-${dayNum.padStart(2, '0')}`;
        if (new Date(isoDate) < new Date()) return;

        // Deduplicate
        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image
        const img = card.find('img.wp-post-image');
        let imageUrl = img.attr('src') || null;
        if (imageUrl && /placeholder|logo|default|favicon|icon/i.test(imageUrl)) {
          imageUrl = null;
        }

        // Extract description
        const description = card.find('.event-listing__description p').first().text().trim().replace(/\s+/g, ' ') || '';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description,
          venue: {
            name: 'The Jam House',
            address: '12 St Paul\'s Square, Birmingham B3 1RB, UK',
            city: 'Birmingham'
          },
          city: 'Birmingham',
          category: 'Music',
          source: 'The Jam House'
        });
      });

      console.log(`  ✅ Found ${events.length} Jam House Birmingham events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Jam House Birmingham error: ${error.message}`);
      return [];
    }
  }
};

module.exports = JamHouseBirminghamEvents.scrape;
