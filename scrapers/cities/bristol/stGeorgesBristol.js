/**
 * St George's Bristol Events Scraper
 * URL: https://www.stgeorgesbristol.co.uk/whats-on/
 * Grade I listed concert hall in Bristol
 * Classical, jazz, folk, world music, comedy, talks
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const StGeorgesBristolEvents = {
  async scrape(city = 'Bristol') {
    console.log('🎵 Scraping St George\'s Bristol...');

    try {
      const response = await axios.get('https://www.stgeorgesbristol.co.uk/whats-on/', {
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
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      $('.c-col-card--event').each((i, el) => {
        const card = $(el);

        // Extract title
        const title = card.find('.c-col-card__title').text().trim();
        if (!title || title.length < 2) return;

        // Extract URL
        const link = card.find('a.c-col-card__link');
        const url = link.attr('href');
        if (!url) return;

        // Extract date from <time> element: "Thu 19 March 2026"
        const timeEl = card.find('.c-col-card__date time');
        const dateText = timeEl.text().trim();
        if (!dateText) return;

        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i);
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
        const img = card.find('.c-col-card__fig img');
        let imageUrl = img.attr('data-srcset') || img.attr('src') || null;
        if (imageUrl && imageUrl.includes(',')) {
          // Get first srcset image
          imageUrl = imageUrl.split(',')[0].trim().split(/\s+/)[0];
        }

        // Extract subtitle
        const subtitle = card.find('.c-col-card__subtitle').text().trim() || '';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: subtitle,
          venue: {
            name: "St George's Bristol",
            address: 'Great George St, Bristol BS1 5RR, UK',
            city: 'Bristol'
          },
          city: 'Bristol',
          category: 'Concert',
          source: "St George's Bristol"
        });
      });

      console.log(`  ✅ Found ${events.length} St George's Bristol events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ St George's Bristol error: ${error.message}`);
      return [];
    }
  }
};

module.exports = StGeorgesBristolEvents.scrape;
