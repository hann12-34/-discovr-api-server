/**
 * Constellation Chicago Events Scraper
 * URL: https://constellation-chicago.com/calendar
 * Experimental music venue in Roscoe Village, Chicago
 * Jazz, experimental, electronic, classical, avant-garde
 * Uses SeeTickets widget with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const ConstellationChicagoEvents = {
  async scrape(city = 'Chicago') {
    console.log('🎵 Scraping Constellation Chicago...');

    try {
      const response = await axios.get('https://constellation-chicago.com/calendar', {
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

      $('.seetickets-list-event-container').each((i, el) => {
        const card = $(el);

        // Extract title from .title a
        const titleLink = card.find('.title a');
        const title = titleLink.text().trim();
        if (!title || title.length < 2) return;

        // Extract URL from the title link
        let url = titleLink.attr('href');
        if (!url || !url.startsWith('http')) return;
        // Skip if URL is a competitor
        if (/eventbrite|songkick|allevents/i.test(url)) return;

        // Extract date from .date element: "Fri Mar 20"
        const dateText = card.find('.date').text().trim();
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

        // Deduplicate
        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image
        const img = card.find('.seetickets-list-view-event-image');
        let imageUrl = img.attr('src') || null;

        // Extract genre
        const genre = card.find('.genre').text().trim() || 'Music';

        // Extract price
        const price = card.find('.price').text().trim() || '';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: price ? `${genre} - ${price}` : genre,
          venue: {
            name: 'Constellation',
            address: '3111 N Western Ave, Chicago, IL 60618',
            city: 'Chicago'
          },
          city: 'Chicago',
          category: genre || 'Music',
          source: 'Constellation Chicago'
        });
      });

      console.log(`  ✅ Found ${events.length} Constellation Chicago events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Constellation Chicago error: ${error.message}`);
      return [];
    }
  }
};

module.exports = ConstellationChicagoEvents.scrape;
