const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

const BASE_URL = 'https://elginandwintergarden.ca';
const EVENTS_URL = 'https://elginandwintergarden.ca/events-tickets';

const getBrowserHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'DNT': '1',
  'Connection': 'keep-alive'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isValidEvent = (title) => {
  if (!title || typeof title !== 'string' || title.length < 3) return false;
  const lowercaseTitle = title.toLowerCase();
  const skipWords = ['error', 'loading', 'search', 'no events', 'coming soon'];
  return !skipWords.some(word => lowercaseTitle.includes(word));
};

async function scrapeEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }

  console.log('🎭 Scraping Elgin Theatre events for Toronto...');

  try {
    await delay(Math.random() * 1000 + 500);
    
    const response = await axios.get(EVENTS_URL, {
      headers: getBrowserHeaders(),
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];

    $('.event, .event-item, .show, .performance, [class*="event"]').each((index, element) => {
      try {
        const $elem = $(element);
        
        const title = $elem.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
        if (!isValidEvent(title)) return;

        const description = $elem.find('.description, .summary, .excerpt, p').first().text().trim() || `${title} at Elgin Theatre`;
        const dateText = $elem.find('.date, .event-date, .when, time, [class*="date"]').first().text().trim();
        const priceText = $elem.find('.price, .cost, .ticket-price, [class*="price"]').first().text().trim();
        
        let eventUrl = $elem.find('a').first().attr('href');
        if (eventUrl && !eventUrl.startsWith('http')) {
          eventUrl = BASE_URL + (eventUrl.startsWith('/') ? '' : '/') + eventUrl;
        }

        const event = {
          id: generateEventId(title, 'Elgin Theatre'),
          title,
          description: description && description.length > 20 ? description.substring(0, 300) : `${title} in Toronto`,
          date: parseDateText(dateText),
          startDate: parseDateText(dateText),
          venue: {
            name: 'Elgin and Winter Garden Theatre Centre',
            address: '189 Yonge St, Toronto, ON M5B 1M4',
            city: 'Toronto'
          },
          city: 'Toronto',
          categories: [...extractCategories(title, description), 'theater', 'entertainment', 'performing arts'],
          price: extractPrice(priceText) || 'Check website for pricing',
          tags: ['Elgin Theatre', 'Winter Garden', 'theater', 'Toronto', 'historic theater'],
          url: eventUrl,
          source: 'elginandwintergarden.ca',
          scrapedAt: new Date().toISOString()
        };

        events.push(event);
      } catch (error) {
        console.error(`Error processing event element ${index}:`, error.message);
      }
    });


    console.log(`✅ Scraped ${events.length} events from Elgin Theatre`);
    return filterEvents(events);

  } catch (error) {
    console.error('❌ Error scraping Elgin Theatre events:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
