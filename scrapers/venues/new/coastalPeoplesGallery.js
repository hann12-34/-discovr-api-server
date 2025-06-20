/**
 * Coastal Peoples Fine Arts Gallery Scraper
 * URL: https://coastalpeoples.com/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Coastal Peoples Fine Arts Gallery';
const url = 'https://coastalpeoples.com/';
const exhibitionsUrl = 'https://coastalpeoples.com/exhibitions/';
const galleryUrl = 'https://coastalpeoples.com/gallery/';
const venueAddress = '200-332 Water Street';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6B 1B6';
const venueCountry = 'Canada';

/**
 * Parse date strings from various formats
 * @param {string} dateStr - Date string to parse
 * @returns {string} - Formatted date string
 */
function parseDate(dateStr) {
  if (!dateStr) return '';
  
  try {
    // Handle various date formats
    const dateRangeRegex = /([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?)\s*[-–—]\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const dateRangeMatch = dateStr.match(dateRangeRegex);
    if (dateRangeMatch) {
      return `${dateRangeMatch[1]} - ${dateRangeMatch[2]}`;
    }
    
    // Handle single dates with year
    const standardDateRegex = /([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const standardDateMatch = dateStr.match(standardDateRegex);
    if (standardDateMatch) {
      return standardDateMatch[0];
    }
    
    // Handle month and day only
    const monthDayRegex = /([A-Za-z]+\s+\d{1,2})/i;
    const monthDayMatch = dateStr.match(monthDayRegex);
    if (monthDayMatch) {
      // Add current year if only month and day
      const currentYear = new Date().getFullYear();
      return `${monthDayMatch[0]}, ${currentYear}`;
    }
    
    return dateStr;
  } catch (error) {
    scrapeLogger.error({ error: error.message }, 'Error parsing date');
    return dateStr;
  }
}

/**
 * Scrape events from Coastal Peoples Fine Arts Gallery
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Coastal Peoples Fine Arts Gallery scraper');

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
    
    // Scrape exhibitions
    logger.info('Fetching exhibitions');
    const exhibitionsResponse = await axios.get(exhibitionsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching exhibitions page');
      return { data: '' };
    });
    
    if (exhibitionsResponse.data) {
      const $ = cheerio.load(exhibitionsResponse.data);
      logger.info('Processing exhibitions');
      
      // Process exhibition listings
      $('.exhibition, .post, article, .entry, .exhibition-item, .exhibition-card, .event-item, .exhibition, .art-item').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h1, h2, h3, h4, .entry-title, .title').first().text().trim();
          if (!title) return;
          
          // Extract URL
          let exhibitUrl = $(element).find('a').attr('href');
          const fullUrl = exhibitUrl && exhibitUrl.startsWith('http') ? 
            exhibitUrl : 
            exhibitUrl ? 
              `${url}${exhibitUrl.startsWith('/') ? exhibitUrl.substring(1) : exhibitUrl}` : 
              exhibitionsUrl;
          
          // Extract date
          let dateText = $(element).find('.date, time, .event-date, .meta, .exhibition-date, .dates').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText) || 'Current exhibition';
          
          // Extract description
          let description = $(element).find('.description, .excerpt, .summary, p, .entry-content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} exhibition at Coastal Peoples Fine Arts Gallery. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
                       $(element).find('img').attr('data-src') ||
                       $(element).find('.image, .featured-image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
          }
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
          }
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          const exhibition = {
            title,
            date: formattedDate,
            url: fullUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
            image: imageUrl
          };
          
          logger.info({ event: { title, date: formattedDate } }, 'Found exhibition');
          events.push(exhibition);
        } catch (exhibitError) {
          logger.error({ error: exhibitError.message }, 'Error processing exhibition');
        }
      });
    }
    
    // Scrape gallery page for featured works
    logger.info('Fetching gallery page');
    const galleryResponse = await axios.get(galleryUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching gallery page');
      return { data: '' };
    });
    
    if (galleryResponse.data) {
      const gallery$ = cheerio.load(galleryResponse.data);
      logger.info('Processing gallery page');
      
      // Process featured artists or collections
      gallery$('.featured-artist, .artist-profile, .collection, .gallery-item, .artist').each((i, element) => {
        try {
          // Extract title
          const title = gallery$(element).find('h1, h2, h3, h4, .entry-title, .title, .artist-name').first().text().trim();
          if (!title) return;
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          // Extract URL
          let itemUrl = gallery$(element).find('a').attr('href');
          const fullUrl = itemUrl && itemUrl.startsWith('http') ? 
            itemUrl : 
            itemUrl ? 
              `${url}${itemUrl.startsWith('/') ? itemUrl.substring(1) : itemUrl}` : 
              galleryUrl;
          
          // Extract description
          let description = gallery$(element).find('.description, .excerpt, .summary, p, .bio, .artist-bio').text().trim();
          if (!description || description.length < 10) {
            description = `${title} featured at Coastal Peoples Fine Arts Gallery. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = gallery$(element).find('img').attr('src') || 
                       gallery$(element).find('img').attr('data-src') ||
                       gallery$(element).find('.image, .featured-image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
          }
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
          }
          
          const galleryItem = {
            title: `Featured: ${title}`,
            date: 'Current feature',
            url: fullUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
            image: imageUrl
          };
          
          logger.info({ event: { title } }, 'Found featured gallery item');
          events.push(galleryItem);
        } catch (galleryError) {
          logger.error({ error: galleryError.message }, 'Error processing gallery item');
        }
      });
    }
    
    // Scrape main page for featured content
    logger.info('Checking main page for featured content');
    const mainResponse = await axios.get(url, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching main page');
      return { data: '' };
    });
    
    if (mainResponse.data) {
      const main$ = cheerio.load(mainResponse.data);
      
      // Look for featured content
      main$('.featured, .highlight, .banner, .hero, .slider, .featured-exhibition, .current-exhibition, .featured-artist').each((i, element) => {
        try {
          const title = main$(element).find('h1, h2, h3, h4, .title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title || event.title === `Featured: ${title}`);
          if (isDuplicate) return;
          
          let contentUrl = main$(element).find('a').attr('href');
          const fullUrl = contentUrl && contentUrl.startsWith('http') ? 
            contentUrl : 
            contentUrl ? 
              `${url}${contentUrl.startsWith('/') ? contentUrl.substring(1) : contentUrl}` : 
              url;
          
          let dateText = main$(element).find('.date, time, .event-date, .meta, .dates').text().trim();
          
          let description = main$(element).find('p, .description, .content').text().trim();
          if (!description) {
            description = `${title} at Coastal Peoples Fine Arts Gallery. Visit website for details.`;
          }
          
          let imageUrl = main$(element).find('img').attr('src') || 
                         main$(element).find('.image').attr('style');
          
          // Extract image from style if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const match = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match) imageUrl = match[1];
          }
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
          }
          
          events.push({
            title: `Featured: ${title}`,
            date: parseDate(dateText) || 'Current feature',
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
          
          logger.info({ event: { title } }, 'Found featured content from main page');
        } catch (featureError) {
          logger.error({ error: featureError.message }, 'Error processing featured content');
        }
      });
    }
    
    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for events and exhibitions');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (!events[i].url || events[i].url === exhibitionsUrl || events[i].url === galleryUrl || events[i].url === url) {
            continue;
          }
          
          const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
          
          if (detailResponse.data) {
            const detail$ = cheerio.load(detailResponse.data);
            
            // Get better description
            const betterDescription = detail$('.entry-content, .content, article p, .description, .single-content, .artist-bio').text().trim();
            if (betterDescription && betterDescription.length > events[i].description.length) {
              events[i].description = betterDescription.substring(0, 300) + (betterDescription.length > 300 ? '...' : '');
            }
            
            // Get better date information
            const betterDate = detail$('.date, time, .event-date, .meta, .dates').first().text().trim();
            if (betterDate && betterDate.length > 5) {
              events[i].date = parseDate(betterDate) || events[i].date;
            }
            
            // Get better image
            const betterImage = detail$('.featured-image img, .main-image img, .wp-post-image, .artwork-image img').attr('src');
            if (betterImage) {
              events[i].image = betterImage.startsWith('http') ? 
                betterImage : 
                `${url}${betterImage.startsWith('/') ? betterImage.substring(1) : betterImage}`;
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Coastal Peoples Fine Arts Gallery, returning empty array');
    } else {
      logger.info(`Found ${events.length} events and exhibitions`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Coastal Peoples Fine Arts Gallery');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
