/**
 * Roxy Nightclub Vancouver Events Scraper
 * Scrapes events from https://www.roxyvan.com/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');
const { parseEventDate, determineSeason } = require('../utils/dateParsing');

/**
 * Extract price from string
 * @param {string} priceString - String containing price information
 * @returns {string|null} - Extracted price string or null if not found
 */
function extractPrice(priceString) {
  if (!priceString) return null;
  
  try {
    // Look for common patterns in the Roxy website's price format
    const advDoorPattern = /(\$\d+)\s*(?:ADV|advance)?\s*\/\s*(\$\d+)\s*(?:@\s*DOOR|door)/i;
    const advDoorMatch = priceString.match(advDoorPattern);
    
    if (advDoorMatch) {
      return `${advDoorMatch[1]} advance / ${advDoorMatch[2]} door`;
    }
    
    // Fall back to finding any price
    const pricePattern = /\$(\d+(?:\.\d{2})?)/g;
    const prices = [];
    let match;
    
    while ((match = pricePattern.exec(priceString)) !== null) {
      prices.push(`$${match[1]}`);
    }
    
    if (prices.length > 0) {
      if (prices.length === 1) {
        return prices[0];
      } else {
        return prices.join(' - ');
      }
    }
    
    // Check for explicit SOLD OUT message
    if (priceString.toUpperCase().includes('SOLD OUT')) {
      return 'SOLD OUT';
    }
  } catch (error) {
    console.error(`Error extracting price: ${error.message}`);
  }
  
  return 'Check website for ticket prices';
}

/**
 * Scrapes events from The Roxy Vancouver website
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Roxy Vancouver' });
  logger.info('Starting Roxy Vancouver scraper');
  
  const events = [];
  const url = 'https://www.roxyvan.com/events';
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    logger.info('Page loaded successfully');
    
    // The Roxy's event page has events as blocks of text
    // We'll look for date patterns to identify event blocks
    const contentText = $('body').text();
    const eventBlocks = contentText.split(/(?=(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+[A-Z]+\s+\d{1,2}(?:ST|ND|RD|TH)?)/i);
    
    logger.info(`Found ${eventBlocks.length} potential event blocks`);
    
    for (const blockText of eventBlocks) {
      if (!blockText.trim()) continue;
      
      // Skip navigation menu items and page headers
      if (blockText.includes('Home') && blockText.includes('Welcome') && blockText.includes('Entertainment')) {
        continue;
      }
      
      // Parse event data
      const eventDate = parseEventDate(blockText);
      if (!eventDate) continue;
      
      // Extract title (usually band names)
      let title = '';
      
      // Detect specific events like LINE DANCING which have a consistent title
      if (blockText.includes('LINE DANCING')) {
        title = 'LINE DANCING';
      } else if (blockText.includes('BINGO LOCO')) {
        title = 'BINGO LOCO';
      } else if (blockText.includes('MIDNIGHT CRUISER / SOURS / BARON')) {
        title = 'MIDNIGHT CRUISER / SOURS / BARON';
      } else if (blockText.includes('GIFTSHOP')) {
        title = 'GIFTSHOP';
      } else if (blockText.includes('THAT ELVIS')) {
        title = 'THAT ELVIS';
      } else {
        // First look for a band lineup format pattern (BAND1 / BAND2 / BAND3)
        const bandLineupPattern = /([A-Z][A-Z0-9\s,'&\-]+(?:\s*\/\s*[A-Z][A-Z0-9\s,'&\-]+)+)/;
        const bandLineupMatch = blockText.match(bandLineupPattern);
        
        if (bandLineupMatch && bandLineupMatch[1] && !bandLineupMatch[1].includes('DOOR') && 
            !bandLineupMatch[1].includes('ADV') && !bandLineupMatch[1].includes('$')) {
          title = bandLineupMatch[1].trim();
        } else {
          // Try another approach - look for lines following a day of the week
          const dayPattern = /(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+[A-Z]+\s+\d{1,2}(?:ST|ND|RD|TH)?\s*(?:\d{4})?\s*\n\s*([A-Z][A-Z0-9\s,'&\-\/]+)\n/i;
          const dayMatch = blockText.match(dayPattern);
          
          if (dayMatch && dayMatch[1] && dayMatch[1].length > 3) {
            title = dayMatch[1].trim();
          } else {
            // Try looking for a standalone all caps text that might be a band name
            const lines = blockText.split(/\r?\n/).map(line => line.trim()).filter(line => line);
            
            // Skip the first line which is usually the date
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              if (line.toUpperCase() === line && 
                  line.length > 3 && 
                  !line.includes('DOOR') && 
                  !line.includes('TICKETS') && 
                  !line.match(/^\$\d+/) &&
                  !line.match(/SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY/) &&
                  !line.match(/^SOLD OUT/i) &&
                  !line.match(/^EVENT/i)) {
                title = line;
                break;
              }
            }
          }
        }
        
        // Clean specific prefixes
        if (title && title.includes('THE ROXY AND LIVE ACTS CANADA PRESENT')) {
          title = title.replace('THE ROXY AND LIVE ACTS CANADA PRESENT', '').trim();
        }
      }
      
      // If still no title, use a generic one
      if (!title || title.length < 3 || title.includes('ADV') || title.match(/^\$\d+/)) {
        title = 'Live Music at The Roxy';
      }
      
      // Clean up title
      if (title) {
        // Remove date info if it got included
        title = title.replace(/(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+[A-Z]+\s+\d{1,2}(?:ST|ND|RD|TH)?/gi, '').trim();
        
        // Remove month/day references like "JUNE 14TH" from title
        title = title.replace(/\b(?:JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\s+\d{1,2}(?:ST|ND|RD|TH)?\b/gi, '').trim();
        
        // Remove ticket info if it got included
        title = title.replace(/\$\d+(?:\s*ADV|\s*@\s*DOOR)?/gi, '').trim();
        
        // Remove "DOORS @" text if it got included
        title = title.replace(/DOORS\s*@\s*\d+(?::\d+)?\s*(?:PM|AM)?/gi, '').trim();
        
        // Remove DOORS at end of title
        title = title.replace(/\s*DOORS$/i, '').trim();
        
        // Remove any year references
        title = title.replace(/\b20\d{2}\b/g, '').trim();
        
        // Replace multiple spaces/slashes with nice formatting
        title = title.replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ');
        
        // If title got mangled, use "Live Music at The Roxy"
        if (!title || title.length < 3) {
          title = 'Live Music at The Roxy';
        }
      } else {
        title = 'Live Music at The Roxy';
      }
      
      // Extract start time
      let startTime = null;
      const doorTimePattern = /DOORS\s*@\s*(\d+(?::\d+)?\s*(?:PM|AM)?)/i;
      const doorTimeMatch = blockText.match(doorTimePattern);
      
      if (doorTimeMatch) {
        startTime = doorTimeMatch[1];
      }
      
      // Extract description - create a cleaner event description
      let description = '';
      
      // If we have a good title, use that
      if (title && title !== 'Live Music at The Roxy') {
        description = `${title} performing live at The Roxy Nightclub in Vancouver.`;
      } else {
        description = 'Live music event at The Roxy Nightclub in Vancouver.';
      }
      
      // Add date/time info if available
      if (startTime) {
        description += ` Doors open at ${startTime}.`;
      }
      
      // Add any additional interesting details from the block
      if (blockText.includes('LINE DANCING')) {
        description = 'Line dancing event at The Roxy Nightclub. Learn to line dance with instructors and a live band!';
      } else if (blockText.toUpperCase().includes('SOLD OUT')) {
        description += ' This event is currently SOLD OUT.';
      }
      
      // If it's a special event like BINGO LOCO, create a custom description
      if (blockText.includes('BINGO LOCO')) {
        description = 'BINGO LOCO event at The Roxy Nightclub. A high-energy, interactive bingo party experience with music and entertainment.';
      }
      
      // Extract price
      const price = extractPrice(blockText);
      
      // Create the event object
      const eventObj = {
        title,
        date: eventDate,
        url: 'https://www.roxyvan.com/events',
        venue: {
          name: "Roxy Nightclub",
          address: "2195 Granville St",
          city: "Vancouver",
          state: "BC",
          country: "Canada",
          postalCode: "V6J 4K4"
        },
        location: {
          name: "Roxy Nightclub",
          address: "2195 Granville St",
          city: "Vancouver",
          state: "BC",
          country: "Canada",
          postalCode: "V6J 4K4"
        },
        description,
        imageUrl: 'https://images.squarespace-cdn.com/content/v1/5cf6cf2c01a5e20001a48050/1591893675438-MPC2ICDGPXH0NWYR57GI/Roxy_Logo_crop.png',
        price: price || 'Check website for ticket prices',
        categories: ['Music', 'Entertainment', 'Nightlife', 'Live Performance'],
        tags: ['nightclub', 'live music', 'performance', 'vancouver', 'downtown'],
        latitude: 49.2803,
        longitude: -123.1214
      };
      
      // Add event-specific categories and tags
      if (title.toLowerCase().includes('line dancing')) {
        eventObj.categories.push('Dance');
        eventObj.tags.push('line dancing', 'country');
      } else if (blockText.includes('BINGO LOCO')) {
        eventObj.categories.push('Entertainment', 'Game');
        eventObj.tags.push('bingo', 'party');
      }
      
      // Check if we already have an event with the same title and date
      const isDuplicate = events.some(e => 
        e.title === eventObj.title && 
        e.date.toDateString() === eventObj.date.toDateString()
      );
      
      if (!isDuplicate) {
        logger.info(`Added event: ${eventObj.title} on ${eventObj.date.toDateString()}`);
        events.push(eventObj);
      }
    }
    
    logger.info(`Finished scraping, found ${events.length} events`);
    return events;
  } catch (error) {
    logger.error(`Error scraping Roxy Vancouver: ${error.message}`);
    return []; // No fallbacks, return empty array on error
  }
}

module.exports = {
  name: 'Roxy Vancouver',
  urls: ['https://www.roxyvan.com/events'],
  scrape
};
