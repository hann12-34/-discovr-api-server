/**
 * Celebrities Nightclub Events Scraper
 * Scrapes events from Celebrities Nightclub Vancouver
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const CelebritiesNightclubEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Celebrities Nightclub...');

    try {
      const response = await axios.get('https://www.celebritiesnightclub.com/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenTitles = new Set();

      console.log('Parsing Celebrities events from new Squarespace structure...');

      // New structure: Each event is in a .sqs-html-content block
      // with h3 containing date and title like "11.6.25 • ODD MOB"
      $('.sqs-html-content').each((i, block) => {
        const $block = $(block);
        
        // Find h3 with date and title
        const h3 = $block.find('h3').first().text().trim();
        if (!h3) return;
        
        // Parse format: "11.6.25 • ODD MOB" or "11.7.25 • Jessica Audiffred"
        const match = h3.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})\s*[•·]\s*(.+)$/i);
        if (!match) return;
        
        const [, month, day, year, title] = match;
        const fullYear = `20${year}`; // 25 -> 2025
        const dateText = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // ISO format YYYY-MM-DD
        
        if (!title || title.length < 2) return;
        if (seenTitles.has(title)) return;
        seenTitles.add(title);
        
        // Find ticket link
        let url = 'https://www.celebritiesnightclub.com/events';
        const ticketLink = $block.find('a[href*="celebritiesnightclub.com"]').first().attr('href');
        if (ticketLink) {
          url = ticketLink.startsWith('http') ? ticketLink : `https://www.celebritiesnightclub.com${ticketLink}`;
        }

        events.push({
          id: uuidv4(),
          title: title,
          url: url,
          venue: {
            name: 'Celebrities Nightclub',
            address: '1022 Davie Street, Vancouver, BC V6E 1M3',
            city: 'Vancouver'
          },
          latitude: 49.2808,
          longitude: -123.1184,
          city: city,
          date: dateText,
          startDate: new Date(dateText + 'T00:00:00'), // Add T00:00:00 for timezone fix
          source: 'Celebrities Nightclub',
          category: 'Nightlife'
        });
      });

      console.log(`Found ${events.length} total events from Celebrities Nightclub`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Celebrities Nightclub events:', error.message);
      return [];
    }
  }
};


module.exports = CelebritiesNightclubEvents.scrape;
