/**
 * The Casbah San Diego Events Scraper
 * URL: https://www.casbahmusic.com/calendar
 * Iconic indie rock venue in San Diego
 * Uses SeeTickets widget with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const CasbahSanDiegoEvents = {
  async scrape(city = 'San Diego') {
    console.log('🎸 Scraping Casbah San Diego...');

    try {
      const response = await axios.get('https://www.casbahmusic.com/calendar', {
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

      $('.seetickets-list-event-container').each((i, el) => {
        const container = $(el);

        const titleLink = container.find('a[href*="wl.seetickets.us/event"]').filter((i, a) => $(a).text().trim().length > 1).first();
        const title = titleLink.text().trim();
        if (!title || title.length < 2) return;

        let url = titleLink.attr('href') || '';
        if (!url) return;

        const dateText = container.find('[class*="date"]').first().text().trim();
        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s,]+([A-Za-z]{3})\s+(\d{1,2})/i);
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

        const imgSrc = container.find('img[class*="seetickets"]').attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl: imgSrc,
          description: '',
          venue: {
            name: 'The Casbah',
            address: '2501 Kettner Blvd, San Diego, CA 92101',
            city: 'San Diego'
          },
          city: 'San Diego',
          category: 'Music',
          source: 'Casbah San Diego'
        });
      });

      console.log(`  ✅ Found ${events.length} Casbah events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Casbah error: ${error.message}`);
      return [];
    }
  }
};

module.exports = CasbahSanDiegoEvents.scrape;
