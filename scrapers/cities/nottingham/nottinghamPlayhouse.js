/**
 * Nottingham Playhouse Events Scraper
 * URL: https://www.nottinghamplayhouse.co.uk/whats-on/
 * Major theatre venue in Nottingham
 * Drama, comedy, music, dance, family shows
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const NottinghamPlayhouseEvents = {
  async scrape(city = 'Nottingham') {
    console.log('🎭 Scraping Nottingham Playhouse...');

    try {
      const response = await axios.get('https://www.nottinghamplayhouse.co.uk/whats-on/', {
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

      $('.event-block.image-text-card').each((i, el) => {
        const card = $(el);

        // Extract title
        const titleEl = card.find('.image-text-card-title a');
        const title = titleEl.text().trim();
        if (!title || title.length < 2) return;

        // Extract URL
        const url = titleEl.attr('href');
        if (!url) return;

        // Extract date from .image-text-card-date (not the "below" one which is subtitle)
        const dateEls = card.find('.image-text-card-date').not('.below');
        let dateText = '';
        dateEls.each((j, d) => {
          const t = $(d).text().trim();
          if (t) dateText = t;
        });
        if (!dateText) return;

        // Parse "Thu 19 Mar", "Sat 21 Mar", "Thu 19 Mar – Sat 4 Apr"
        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const monthNum = months[dateMatch[2].toLowerCase()];
        if (!monthNum) return;

        let year = currentYear;
        if (parseInt(monthNum) < new Date().getMonth()) year++;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) return;

        // Deduplicate
        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image
        const img = card.find('img');
        let imageUrl = img.attr('data-lazy-src') || img.attr('src') || null;

        // Extract description
        const description = card.find('.image-text-card-read-more').text().trim().replace(/\s+/g, ' ') || '';

        // Extract category
        const category = card.find('.image-text-card-type').text().trim() || 'Theatre';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description,
          venue: {
            name: 'Nottingham Playhouse',
            address: 'Wellington Circus, Nottingham NG1 5AF, UK',
            city: 'Nottingham'
          },
          city: 'Nottingham',
          category,
          source: 'Nottingham Playhouse'
        });
      });

      console.log(`  ✅ Found ${events.length} Nottingham Playhouse events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Nottingham Playhouse error: ${error.message}`);
      return [];
    }
  }
};

module.exports = NottinghamPlayhouseEvents.scrape;
