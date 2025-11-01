const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

const BASE_URL = 'https://textilemuseum.ca';
const EVENTS_URL = 'https://textilemuseum.ca/exhibitions/';

const getBrowserHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'DNT': '1',
  'Connection': 'keep-alive'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const safeUrl = (url, baseUrl) => {
  if (!url) return baseUrl;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
};

const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  const skipPatterns = [/^(home|about|contact|visit|shop)$/i, /click here|read more/i];
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

async function scrapeEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`🧵 Scraping Textile Museum events for ${city}...`);
  
  try {
    const events = [];
    await delay(1000 + Math.random() * 2000);
    
    const response = await axios.get(EVENTS_URL, { 
      headers: getBrowserHeaders(),
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    let eventCount = 0;

    $('.event, .event-item, .exhibition, .workshop, .program, article, .post').each((index, element) => {
      try {
        const $el = $(element);
        
        const title = $el.find('h1, h2, h3, h4, .title, .event-title, .exhibition-title, .entry-title').first().text().trim() ||
                     $el.find('a').first().text().trim();
        
        const dateText = $el.find('.date, .event-date, .dates, time, .meta-date').text().trim();
        const description = $el.find('.description, .excerpt, .summary, .content, p').first().text().trim();
        const eventUrl = $el.find('a').first().attr('href');
        const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
        const priceText = $el.find('.price, .cost, .admission, .ticket').text().trim();

        if (!isValidEvent(title)) return;

        const dateInfo = parseDateText(dateText);
        
        const event = {
          id: generateEventId(title, 'Textile Museum', dateInfo.startDate),
          title: title,
          description: description && description.length > 20 ? description : `${title} at Textile Museum`,
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: { name: 'Textile Museum', city: 'Toronto' },
          url: safeUrl(eventUrl, BASE_URL),
          sourceUrl: EVENTS_URL,
          image: safeUrl(imageUrl, BASE_URL),
          price: extractPrice(priceText) || 'Contact venue',
          categories: extractCategories('Museum, Textiles, Arts, Crafts'),
          source: 'Textile Museum-Toronto',
          city: city,
          featured: false,
          tags: ['toronto', 'museum', 'textiles', 'arts', 'crafts'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        events.push(event);
        eventCount++;
        
      } catch (error) {
        console.error(`❌ Error parsing event ${index + 1}:`, error.message);
      }
    });


    console.log(`✅ Scraped ${eventCount} events from Textile Museum`);
    return filterEvents(events);

  } catch (error) {
    console.error(`❌ Error scraping Textile Museum events:`, error.message);
    return [];
  }
}

module.exports = scrapeEvents;
