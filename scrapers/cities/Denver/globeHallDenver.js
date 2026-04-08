/**
 * Globe Hall Denver Events Scraper
 * URL: https://www.globehall.com/events
 * Independent music venue in Denver, CO
 * Uses RockHouse Events plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const GlobeHallDenverEvents = {
  async scrape(city = 'Denver') {
    console.log('🏔️ Scraping Globe Hall Denver...');

    try {
      const response = await axios.get('https://www.globehall.com/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 20000,
        validateStatus: (status) => status < 500
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      $('.eventWrapper').each((i, el) => {
        const container = $(el);

        let title = container.find('[class*="rhp-event__title"]').first().text().trim();
        if (!title || title.length < 2) return;

        let url = container.find('a.url').first().attr('href') || '';
        if (!url) return;
        if (!url.startsWith('http')) url = 'https://globehall.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) return;

        const dateText = container.find('.eventMonth').first().text().trim();
        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
        if (!dateMatch) return;

        const monthNum = months[dateMatch[1].toLowerCase()];
        if (!monthNum) return;
        const day = dateMatch[2].padStart(2, '0');
        const eventMonth = parseInt(monthNum);
        const year = eventMonth < currentMonth - 1 ? currentYear + 1 : currentYear;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < now) return;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        const imgSrc = container.find('img.eventListImage').attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl: imgSrc,
          description: '',
          venue: {
            name: 'Globe Hall',
            address: '4483 Logan St, Denver, CO 80216',
            city: 'Denver'
          },
          city: 'Denver',
          category: 'Music',
          source: 'Globe Hall Denver'
        });
      });

      console.log(`  ✅ Found ${events.length} Globe Hall events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Globe Hall error: ${error.message}`);
      return [];
    }
  }
};

module.exports = GlobeHallDenverEvents.scrape;
