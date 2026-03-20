/**
 * Tipitina's New Orleans Events Scraper
 * URL: https://www.tipitinas.com/calendar
 * Legendary live music venue in Uptown New Orleans
 * Jazz, funk, blues, rock, brass band, zydeco
 * Uses TicketWeb plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const TipitinasNolaEvents = {
  async scrape(city = 'New Orleans') {
    console.log('🎸 Scraping Tipitina\'s New Orleans...');

    try {
      const response = await axios.get('https://www.tipitinas.com/calendar', {
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

      const allNames = [];
      const allDates = [];
      const allImgs = [];

      $('.tw-name').each((i, el) => {
        const link = $(el).find('a');
        allNames.push({ title: link.text().trim(), url: link.attr('href') || '' });
      });

      $('.tw-event-date').each((i, el) => {
        allDates.push($(el).text().trim());
      });

      $('img.event-img').each((i, el) => {
        allImgs.push($(el).attr('src') || '');
      });

      for (let i = 0; i < allNames.length; i++) {
        let title = allNames[i].title;
        if (!title || title.length < 2) continue;
        title = title.replace(/&#039;/g, "'").replace(/&amp;/g, '&');

        let url = allNames[i].url;
        if (!url) continue;
        if (!url.startsWith('http')) url = 'https://tipitinas.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) continue;

        const dateText = allDates[i] || '';
        const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i);
        if (!dateMatch) continue;

        const monthNum = months[dateMatch[1].toLowerCase()];
        if (!monthNum) continue;
        const day = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) continue;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl: allImgs[i] || null,
          description: '',
          venue: {
            name: "Tipitina's",
            address: '501 Napoleon Ave, New Orleans, LA 70115',
            city: 'New Orleans'
          },
          city: 'New Orleans',
          category: 'Music',
          source: "Tipitina's New Orleans"
        });
      }

      console.log(`  ✅ Found ${events.length} Tipitina's events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Tipitina's error: ${error.message}`);
      return [];
    }
  }
};

module.exports = TipitinasNolaEvents.scrape;
