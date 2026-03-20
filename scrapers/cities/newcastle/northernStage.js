/**
 * Northern Stage Newcastle Events Scraper
 * URL: https://www.northernstage.co.uk/whats-on
 * Major theatre and performance venue in Newcastle upon Tyne
 * Theatre, comedy, music, dance, spoken word
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const NorthernStageEvents = {
  async scrape(city = 'Newcastle') {
    console.log('🎭 Scraping Northern Stage Newcastle...');

    try {
      const response = await axios.get('https://www.northernstage.co.uk/whats-on', {
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

      $('.c-event-card').each((i, el) => {
        const card = $(el);

        // Extract title
        const title = card.find('.c-event-card__title').text().trim();
        if (!title || title.length < 2) return;

        // Extract URL
        const linkEl = card.find('a.c-event-card__link');
        const url = linkEl.attr('href');
        if (!url) return;

        // Extract date: "20 Mar 2026" or "20 Mar – 4 Apr 2026" (use start date)
        const dateText = card.find('.c-event-card__date').text().trim();
        if (!dateText) return;

        // Match single date or start of range: "20 Mar 2026"
        const dateMatch = dateText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const monthNum = months[dateMatch[2].toLowerCase()];
        const year = dateMatch[3];
        if (!monthNum) return;

        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) return;

        // Deduplicate
        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image
        const img = card.find('.c-event-card__image img');
        let imageUrl = null;
        const srcset = img.attr('data-srcset') || '';
        if (srcset) {
          // Get the largest image from srcset
          const srcs = srcset.split(',').map(s => s.trim().split(/\s+/));
          const largest = srcs.filter(s => s.length >= 2).pop();
          if (largest) imageUrl = largest[0];
        }
        if (!imageUrl) imageUrl = img.attr('src') || null;
        if (imageUrl && /resize=16|placeholder|logo|default|favicon/i.test(imageUrl)) {
          imageUrl = null;
        }

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: '',
          venue: {
            name: 'Northern Stage',
            address: 'Barras Bridge, Newcastle upon Tyne NE1 7RH, UK',
            city: 'Newcastle'
          },
          city: 'Newcastle',
          category: 'Theatre',
          source: 'Northern Stage'
        });
      });

      console.log(`  ✅ Found ${events.length} Northern Stage Newcastle events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Northern Stage Newcastle error: ${error.message}`);
      return [];
    }
  }
};

module.exports = NorthernStageEvents.scrape;
