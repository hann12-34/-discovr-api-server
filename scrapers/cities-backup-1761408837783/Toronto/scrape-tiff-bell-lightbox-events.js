const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

const BASE_URL = 'https://www.tiff.net';
const EVENTS_URL = 'https://www.tiff.net/events/';

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
  const skipPatterns = [/^(home|about|contact|membership|shop)$/i, /click here|read more/i];
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

async function scrapeEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`🎬 Scraping TIFF Bell Lightbox events for ${city}...`);
  
  try {
    const events = [];
    await delay(1000 + Math.random() * 2000);
    
    const response = await axios.get(EVENTS_URL, { 
      headers: getBrowserHeaders(),
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    let eventCount = 0;

    $('.screening, .film, .event, .festival, .premiere, article, .post').each((index, element) => {
      try {
        const $el = $(element);
        
        const title = $el.find('h1, h2, h3, h4, .title, .film-title, .screening-title, .entry-title').first().text().trim() ||
                     $el.find('a').first().text().trim();
        
        const dateText = $el.find('.date, .dates, .screening-date, time, .showtime, .when').text().trim();
        const description = $el.find('.description, .excerpt, .summary, .content, p').first().text().trim();
        const eventUrl = $el.find('a').first().attr('href');
        const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
        const priceText = $el.find('.price, .cost, .ticket, .admission').text().trim();

        if (!isValidEvent(title)) return;

        const dateInfo = parseDateText(dateText);
        
        const event = {
          id: generateEventId(title, 'TIFF Bell Lightbox', dateInfo.startDate),
          title: title,
          description: description && description.length > 20 ? description : `Film screening at TIFF Bell Lightbox`,
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: { name: 'TIFF Bell Lightbox', address: 'Toronto', city: 'Toronto' },
          url: safeUrl(eventUrl, BASE_URL),
          sourceUrl: EVENTS_URL,
          image: safeUrl(imageUrl, BASE_URL),
          price: extractPrice(priceText) || 'Contact venue',
          categories: extractCategories('Film, Cinema, Festival, Screening'),
          source: 'TIFF Bell Lightbox-Toronto',
          city: city,
          featured: false,
          tags: ['toronto', 'film', 'cinema', 'festival', 'screening'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        events.push(event);
        eventCount++;
        
      } catch (error) {
        console.error(`❌ Error parsing event ${index + 1}:`, error.message);
      }
    });


    console.log(`✅ Scraped ${eventCount} events from TIFF Bell Lightbox`);
    return filterEvents(events);

  } catch (error) {
    console.error(`❌ Error scraping TIFF Bell Lightbox events:`, error.message);
    return [];
  }
}

module.exports = scrapeEvents;
