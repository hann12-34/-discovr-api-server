const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const DataQualityFilter = require('../../../enhanced-data-quality-filter');

async function scrapePlaceDesArtsEvents(city) {
    console.log('🔍 Scraping events from Place des Arts (Montreal)...');
    const filter = new DataQualityFilter();

    try {
      const response = await axios.get('https://www.placedesarts.com/en/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      const eventSelectors = [
        '.event-item',
        '.event-card',
        'a[href*="/event"]',
        'a[href*="/spectacle"]',
        '.show-item',
        '.performance'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            let title = $event.find('h1, h2, h3, h4, .title, .event-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0].trim();

            let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://www.placedesarts.com' + url;
            }

            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            const skipTerms = ['menu', 'contact', 'about', 'home', 'events', 'tickets'];
            if (skipTerms.some(term => title.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);
            console.log(`✓ Event: ${title}`);

            events.push({
              id: uuidv4(),
              title: title,
              date: dateText || 'Date TBA',  // FIXED: Extract date from page
              time: null,
              url: url,
              venue: { name: 'Place des Arts', address: '175 Rue Sainte-Catherine Ouest, Montreal, QC H2X 1Z8', city: 'Montreal' },
              location: 'Montreal, QC',
              description: description && description.length > 20 ? description : `${title} in Montreal`,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Place des Arts`);
    
    // Apply data quality filtering
    const cleanedEvents = filter.filterEvents(events);
    return cleanedEvents;

    } catch (error) {
      console.error('Error scraping Place des Arts events:', error.message);
      return [];
    }
}

module.exports = scrapePlaceDesArtsEvents;
