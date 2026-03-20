/**
 * Aisle 5 Atlanta Events Scraper
 * URL: https://www.aisle5atl.com/calendar
 * Live music venue in Little Five Points, Atlanta
 * Indie, electronic, hip-hop, rock
 * Uses SeeTickets widget with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const Aisle5AtlantaEvents = {
  async scrape(city = 'Atlanta') {
    console.log('🎵 Scraping Aisle 5 Atlanta...');

    try {
      const response = await axios.get('https://www.aisle5atl.com/calendar', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 20000
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

      $('.seetickets-list-event-container').each((i, el) => {
        const card = $(el);

        const titleLink = card.find('.event-title a');
        const title = titleLink.text().trim();
        if (!title || title.length < 2) return;

        let url = titleLink.attr('href');
        if (!url || !url.startsWith('http')) return;
        if (/eventbrite|songkick|allevents/i.test(url)) return;

        const dateText = card.find('.event-date').text().trim();
        if (!dateText) return;

        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
        if (!dateMatch) return;

        const monthNum = months[dateMatch[1].toLowerCase()];
        if (!monthNum) return;
        const day = dateMatch[2].padStart(2, '0');
        let year = currentYear;
        if (parseInt(monthNum) < new Date().getMonth()) year++;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) return;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        const img = card.find('.seetickets-list-view-event-image');
        let imageUrl = img.attr('src') || null;

        const genre = card.find('.genre').text().trim() || 'Music';
        const price = card.find('.price').text().trim() || '';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: price ? `${genre} - ${price}` : genre,
          venue: {
            name: 'Aisle 5',
            address: '1123 Euclid Ave NE, Atlanta, GA 30307',
            city: 'Atlanta'
          },
          city: 'Atlanta',
          category: genre || 'Music',
          source: 'Aisle 5 Atlanta'
        });
      });

      console.log(`  ✅ Found ${events.length} Aisle 5 Atlanta events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Aisle 5 Atlanta error: ${error.message}`);
      return [];
    }
  }
};

module.exports = Aisle5AtlantaEvents.scrape;
