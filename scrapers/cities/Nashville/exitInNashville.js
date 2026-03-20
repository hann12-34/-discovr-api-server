/**
 * Exit/In Nashville Events Scraper
 * URL: https://www.exitin.com/calendar
 * Iconic live music venue in Nashville's Elliston Place
 * Rock, indie, country, alternative
 * Uses TicketWeb plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const ExitInNashvilleEvents = {
  async scrape(city = 'Nashville') {
    console.log('🎸 Scraping Exit/In Nashville...');

    try {
      const response = await axios.get('https://www.exitin.com/calendar', {
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

      $('.tw-plugin-upcoming-event-list .tw-section').each((i, el) => {
        const section = $(el);

        // Title from tw-name link
        const nameLink = section.find('.tw-name a');
        const title = nameLink.text().trim();
        if (!title || title.length < 2) return;

        // URL - prefer exitin.com event page
        let url = nameLink.attr('href') || '';
        if (!url) return;
        if (!url.startsWith('http')) url = 'https://exitin.com' + url;

        // Date from tw-event-date
        const dateText = section.find('.tw-event-date').text().trim();
        if (!dateText) return;

        const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
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

        // Image
        const img = section.find('img.event-img');
        let imageUrl = img.attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: '',
          venue: {
            name: 'Exit/In',
            address: '2208 Elliston Pl, Nashville, TN 37203',
            city: 'Nashville'
          },
          city: 'Nashville',
          category: 'Music',
          source: 'Exit/In Nashville'
        });
      });

      // Fallback: if tw-section not found, parse directly
      if (events.length === 0) {
        $('.tw-name').each((i, el) => {
          const link = $(el).find('a');
          const title = link.text().trim();
          if (!title || title.length < 2) return;

          let url = link.attr('href') || '';
          if (!url) return;
          if (!url.startsWith('http')) url = 'https://exitin.com' + url;

          const parent = $(el).closest('.row').parent();
          const dateText = parent.find('.tw-event-date').text().trim();
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
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

          const img = parent.find('img.event-img');
          let imageUrl = img.attr('src') || null;

          events.push({
            id: uuidv4(),
            title,
            date: isoDate,
            url,
            imageUrl,
            description: '',
            venue: {
              name: 'Exit/In',
              address: '2208 Elliston Pl, Nashville, TN 37203',
              city: 'Nashville'
            },
            city: 'Nashville',
            category: 'Music',
            source: 'Exit/In Nashville'
          });
        });
      }

      console.log(`  ✅ Found ${events.length} Exit/In Nashville events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Exit/In Nashville error: ${error.message}`);
      return [];
    }
  }
};

module.exports = ExitInNashvilleEvents.scrape;
