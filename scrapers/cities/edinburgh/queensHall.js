/**
 * Queen's Hall Edinburgh Events Scraper
 * URL: https://www.thequeenshall.net/whats-on
 * Historic concert venue in Edinburgh's Southside
 * Classical, jazz, folk, rock, comedy, and spoken word
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const QueensHallEvents = {
  async scrape(city = 'Edinburgh') {
    console.log('🎵 Scraping Queen\'s Hall Edinburgh...');

    try {
      const response = await axios.get('https://www.thequeenshall.net/whats-on', {
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

      $('.node__event').each((i, el) => {
        const card = $(el);

        // Extract title
        const title = card.find('.teaser__content h3').text().trim();
        if (!title || title.length < 2) return;

        // Extract URL
        const linkHref = card.find('a.event-link').attr('href');
        if (!linkHref) return;
        const url = linkHref.startsWith('http') ? linkHref : 'https://www.thequeenshall.net' + linkHref;

        // Extract date: "Fri 20 Mar 2026 AT 7:30PM"
        const dateText = card.find('.dates').text().trim();
        if (!dateText) return;

        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
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
        const img = card.find('.teaser__thumb img');
        let imageUrl = img.attr('data-src') || img.attr('src') || null;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = 'https://www.thequeenshall.net' + imageUrl;
        }

        // Extract description/strapline
        const description = card.find('.strapline').text().trim() || '';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description,
          venue: {
            name: "Queen's Hall",
            address: '85-89 Clerk St, Edinburgh EH8 9JG, UK',
            city: 'Edinburgh'
          },
          city: 'Edinburgh',
          category: 'Concert',
          source: "Queen's Hall"
        });
      });

      console.log(`  ✅ Found ${events.length} Queen's Hall Edinburgh events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Queen's Hall Edinburgh error: ${error.message}`);
      return [];
    }
  }
};

module.exports = QueensHallEvents.scrape;
