/**
 * Roundhouse London Events Scraper
 * URL: https://www.roundhouse.org.uk/whats-on/
 * Iconic 3,300-capacity venue in Camden, London
 * Live music, comedy, theatre, spoken word
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const RoundhouseEvents = {
  async scrape(city = 'London') {
    console.log('🎵 Scraping Roundhouse London...');

    try {
      const response = await axios.get('https://www.roundhouse.org.uk/whats-on/', {
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
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      const currentYear = new Date().getFullYear();

      $('.event-card').each((i, el) => {
        const card = $(el);
        const link = card.find('a.event-card__link');
        const url = link.attr('href');
        if (!url || !url.includes('/whats-on/')) return;

        const title = card.find('.event-card__title').first().text().trim();
        if (!title || title.length < 2) return;

        const dateText = card.find('.event-card__date').text().trim();
        if (!dateText) return;

        // Parse dates like "Thu 19 Mar 26", "Fri 20 Mar 26", "Sat 21 March"
        // Skip recurring/range dates like "Thursdays, 15 January-19 March"
        const singleDateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(\w+)(?:\s+(\d{2,4}))?/i);
        if (!singleDateMatch) return;

        const day = singleDateMatch[1].padStart(2, '0');
        const monthStr = singleDateMatch[2].toLowerCase().substring(0, 3);
        const monthNum = months[monthStr];
        if (!monthNum) return;

        let year = singleDateMatch[3] || '';
        if (year.length === 2) year = '20' + year;
        if (!year) year = String(currentYear);

        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) return;

        const key = `${title}|${isoDate}`;
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image
        const img = card.find('.event-card__image img');
        let imageUrl = img.attr('src') || null;
        if (imageUrl && /placeholder|logo|default|favicon|icon/i.test(imageUrl)) {
          imageUrl = null;
        }

        // Extract subtitle (supporting act)
        const subtitle = card.find('.event-card__subtitle').text().trim();

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: subtitle || '',
          venue: {
            name: 'Roundhouse',
            address: 'Chalk Farm Rd, London NW1 8EH, UK',
            city: 'London'
          },
          city: 'London',
          category: 'Concert',
          source: 'Roundhouse'
        });
      });

      console.log(`  ✅ Found ${events.length} Roundhouse events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Roundhouse error: ${error.message}`);
      return [];
    }
  }
};

module.exports = RoundhouseEvents.scrape;
