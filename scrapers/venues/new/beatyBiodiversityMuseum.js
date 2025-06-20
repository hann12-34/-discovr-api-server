/**
 * Beaty Biodiversity Museum Scraper
 * URL: https://beatymuseum.ubc.ca/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Beaty Biodiversity Museum';
const url = 'https://beatymuseum.ubc.ca/';
const eventsUrl = 'https://beatymuseum.ubc.ca/visit/events/';
const exhibitsUrl = 'https://beatymuseum.ubc.ca/visit/exhibitions/';
const venueAddress = '2212 Main Mall';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6T 1Z4';
const venueCountry = 'Canada';

/**
 * Parse date strings from various formats
 */
function parseDate(dateStr) {
  if (!dateStr) return '';
  
  // Handle date ranges
  const dateRangeRegex = /([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?)\s*[-–—]\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
  const match = dateStr.match(dateRangeRegex);
  if (match) return `${match[1]} - ${match[2]}`;
  
  // Handle single dates
  const singleDateRegex = /([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
  const singleMatch = dateStr.match(singleDateRegex);
  if (singleMatch) return singleMatch[0];
  
  return dateStr;
}

/**
 * Extract events from HTML using cheerio
 */
function extractEvents($, selector, isExhibition = false) {
  const events = [];
  const items = $(selector);
  
  items.each((i, element) => {
    try {
      // Extract title
      const title = $(element).find('h2, h3, h4, .title').first().text().trim();
      if (!title) return;
      
      // Extract URL
      let detailUrl = $(element).find('a').attr('href');
      const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
        detailUrl : 
        detailUrl ? 
          `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
          isExhibition ? exhibitsUrl : eventsUrl;
      
      // Extract date
      let dateText = $(element).find('.date, .dates, time').text().trim();
      if (!dateText) {
        const text = $(element).text();
        const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})|(\d{1,2}\s+[A-Za-z]+,?\s*\d{4})/i);
        if (dateMatch) dateText = dateMatch[0];
      }
      
      // For permanent exhibitions
      if (isExhibition && (!dateText || dateText.toLowerCase().includes('permanent'))) {
        dateText = 'Permanent Exhibition';
      }
      
      // Extract description
      let description = $(element).find('.description, p, .excerpt').text().trim();
      if (!description || description.length < 10) {
        description = `${title} at the Beaty Biodiversity Museum. Visit ${fullUrl} for more information.`;
      }
      
      // Extract image
      let imageUrl = $(element).find('img').attr('src') || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
      }
      
      events.push({
        title,
        date: parseDate(dateText) || (isExhibition ? 'Permanent Exhibition' : 'Check website for dates'),
        url: fullUrl,
        venue: name,
        address: venueAddress,
        city: venueCity,
        region: venueRegion,
        postalCode: venuePostalCode,
        country: venueCountry,
        description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
        image: imageUrl
      });
    } catch (error) {
      // Skip any items that cause errors
    }
  });
  
  return events;
}

/**
 * Scrape events from Beaty Biodiversity Museum
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Beaty Biodiversity Museum scraper');

  try {
    // Configure axios with headers to mimic a browser
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 30000
    };

    const events = [];
    
    // Scrape events page
    logger.info('Fetching events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (eventsResponse.data) {
      const events$ = cheerio.load(eventsResponse.data);
      
      // Try different selectors for events
      const eventSelectors = [
        '.event, .events-list article', 
        '.post, .entry', 
        '.card, .card-item', 
        '.event-item, .event-listing'
      ];
      
      for (const selector of eventSelectors) {
        const extractedEvents = extractEvents(events$, selector);
        if (extractedEvents.length > 0) {
          events.push(...extractedEvents);
          break;
        }
      }
      
      // If no events found with specific selectors, try general content sections
      if (events.length === 0) {
        events$.each(('section, .section, .content-section'), (i, section) => {
          const heading = events$(section).find('h2, h3').first().text().toLowerCase();
          if (heading.includes('event') || heading.includes('workshop') || heading.includes('program')) {
            const sectionEvents = extractEvents(events$, `${section} article, ${section} .item, ${section} .card`);
            events.push(...sectionEvents);
          }
        });
      }
    }
    
    // Scrape exhibitions page
    logger.info('Fetching exhibitions page');
    const exhibitionsResponse = await axios.get(exhibitsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (exhibitionsResponse.data) {
      const exhibitions$ = cheerio.load(exhibitionsResponse.data);
      
      // Try different selectors for exhibitions
      const exhibitionSelectors = [
        '.exhibition, .exhibit', 
        '.exhibition-item, .exhibit-item', 
        '.post, .entry', 
        '.card, .card-item'
      ];
      
      for (const selector of exhibitionSelectors) {
        const extractedExhibitions = extractEvents(exhibitions$, selector, true);
        if (extractedExhibitions.length > 0) {
          // Filter out duplicates
          const newExhibitions = extractedExhibitions.filter(exhibition => 
            !events.some(event => event.title === exhibition.title)
          );
          events.push(...newExhibitions);
          break;
        }
      }
      
      // If no exhibitions found with specific selectors, try general content sections
      if (events.length === 0) {
        exhibitions$.each(('section, .section, .content-section'), (i, section) => {
          const heading = exhibitions$(section).find('h2, h3').first().text().toLowerCase();
          if (heading.includes('exhibition') || heading.includes('exhibit') || heading.includes('gallery')) {
            const sectionExhibitions = extractEvents(
              exhibitions$, 
              `${section} article, ${section} .item, ${section} .card`, 
              true
            );
            events.push(...sectionExhibitions);
          }
        });
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Beaty Biodiversity Museum, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Beaty Biodiversity Museum');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
