/**
 * Fraser Valley Bandits Scraper
 * URL: https://thebandits.ca/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Fraser Valley Bandits';
const url = 'https://cebl.ca/teams/fraser-valley-bandits/';
const venueAddress = 'Langley Events Centre, 7888 200 St';
const venueCity = 'Langley';
const venueRegion = 'BC';
const venuePostalCode = 'V2Y 3J4';
const venueCountry = 'Canada';

/**
 * Scrape events from Fraser Valley Bandits website
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Fraser Valley Bandits scraper');

  try {
    // Fetch the page
    logger.info('Fetching main page');
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }).catch(err => {
      logger.error({ error: err.message }, 'Error fetching main page');
      return { data: '' };
    });
    
    if (!response.data) {
      logger.info('Failed to fetch page');
      return [];
    }
    const $ = cheerio.load(response.data);
    
    const events = [];
    
    // Look for the schedule/games section
    logger.info('Looking for game schedule');
    
    // Add additional schedule URLs to check
    const scheduleUrls = [
      'https://cebl.ca/games-schedule/',
      'https://cebl.ca/schedule/',
      'https://cebl.ca/teams/fraser-valley-bandits/schedule/',
      'https://www.thebandits.ca/schedule'
    ];
    
    // For the CEBL site, directly check the games section
    // First, try to find a schedule/game link
    let scheduleLink = $('a[href*="schedule"], a[href*="games"], a[href*="fixtures"], a:contains("Schedule"), a:contains("Games")').first().attr('href') || 'https://cebl.ca/games-schedule/';
    
    if (scheduleLink) {
      let scheduleUrl = scheduleLink;
      
      // Make relative URLs absolute
      if (!scheduleUrl.startsWith('http')) {
        if (scheduleUrl.startsWith('/')) {
          scheduleUrl = new URL(scheduleUrl, url).href;
        } else {
          scheduleUrl = new URL('/' + scheduleUrl, url).href;
        }
      }
      
      logger.info(`Found schedule link, fetching: ${scheduleUrl}`);
      
      try {
        // Fetch the schedule page
        const scheduleResponse = await axios.get(scheduleUrl, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }).catch(err => {
          logger.error({ error: err.message }, 'Error fetching schedule page');
          return { data: '' };
        });
        
        if (!scheduleResponse.data) {
          logger.warn('Schedule page fetch failed, will try alternate methods');
          return;
        }
        const schedule$ = cheerio.load(scheduleResponse.data);
        
        // Look for game elements
        const gameElements = schedule$('.game, .match, [class*="game"], [class*="match"], [class*="fixture"], table tr:not(:first-child)');
        
        if (gameElements.length) {
          logger.info(`Found ${gameElements.length} potential game elements`);
          
          gameElements.each((i, element) => {
            try {
              const el = schedule$(element);
              
              // Extract game details
              let opponent = el.find('.opponent, .away, .visitor, td:nth-child(2)').first().text().trim();
              let date = el.find('.date, .game-date, td:nth-child(1)').first().text().trim();
              
              if (!date) {
                // Look for date patterns
                const dateMatch = el.text().match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*202[5-6]|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i);
                
                if (dateMatch) {
                  date = dateMatch[0];
                }
              }
              
              // Extract time
              let time = el.find('.time, .game-time, td:nth-child(3)').first().text().trim();
              
              if (!time) {
                // Look for time patterns
                const timeMatch = el.text().match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
                
                if (timeMatch) {
                  time = timeMatch[0];
                }
              }
              
              // Combine date and time if both exist
              let dateTime = date;
              if (time && date) {
                dateTime = `${date} ${time}`;
              }
              
              // Create title - combination of teams
              let title = '';
              if (opponent) {
                title = `Fraser Valley Bandits vs ${opponent}`;
              } else {
                title = `Fraser Valley Bandits Game`;
                
                // Try to extract opponent from text
                const text = el.text().trim();
                const vsMatch = text.match(/vs\.?\s+([A-Za-z\s]+)/i);
                
                if (vsMatch) {
                  opponent = vsMatch[1].trim();
                  title = `Fraser Valley Bandits vs ${opponent}`;
                }
              }
              
              // Find any game-specific URL
              let gameUrl = el.find('a').attr('href') || url;
              
              // Make relative URLs absolute
              if (!gameUrl.startsWith('http')) {
                if (gameUrl.startsWith('/')) {
                  gameUrl = new URL(gameUrl, url).href;
                } else {
                  gameUrl = new URL('/' + gameUrl, url).href;
                }
              }
              
              // Find an image
              let imageUrl = el.find('img').attr('src') || '';
              
              // If no image in the game element, look for team logo
              if (!imageUrl) {
                const logo = schedule$('img[src*="bandits"], img[src*="logo"], .team-logo img').first();
                if (logo.length) {
                  imageUrl = logo.attr('src') || '';
                }
              }
              
              // Make relative URLs absolute
              if (imageUrl && !imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('/')) {
                  imageUrl = new URL(imageUrl, url).href;
                } else {
                  imageUrl = new URL('/' + imageUrl, url).href;
                }
              }
              
              // Create event if we have the minimum required info
              if (title && dateTime) {
                const event = {
                  title: title,
                  date: dateTime,
                  url: gameUrl,
                  venue: name,
                  address: venueAddress,
                  city: venueCity,
                  region: venueRegion,
                  postalCode: venuePostalCode,
                  country: venueCountry,
                  description: `Basketball game: ${title} at Langley Events Centre. Come cheer on your Fraser Valley Bandits!`,
                  image: imageUrl
                };
                
                logger.info({ event }, 'Found game event');
                events.push(event);
              }
            } catch (err) {
              logger.error({ error: err.message }, 'Error processing game element');
            }
          });
        } else {
          logger.info('No game elements found on schedule page');
        }
        
      } catch (scheduleErr) {
        logger.error({ error: scheduleErr.message }, 'Error fetching schedule page');
      }
    }
    
    // If we couldn't find any games through the schedule page
    // Try to find games on the main page
    if (events.length === 0) {
      logger.info('No events found on schedule page, looking on main page');
      
      // Look for upcoming game sections
      const upcomingGameElements = $('.upcoming, .next-game, [class*="upcoming"], [class*="next-game"]');
      
      if (upcomingGameElements.length) {
        upcomingGameElements.each((i, element) => {
          try {
            const el = $(element);
            
            // Extract game info
            let opponent = el.find('.opponent, .team-name, .vs').text().trim();
            let date = el.find('.date, .game-date').text().trim();
            
            if (!date) {
              // Look for date patterns
              const dateMatch = el.text().match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*202[5-6]|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i);
              
              if (dateMatch) {
                date = dateMatch[0];
              }
            }
            
            // Create title
            let title = '';
            if (opponent) {
              title = `Fraser Valley Bandits vs ${opponent}`;
            } else {
              title = 'Fraser Valley Bandits Upcoming Game';
              
              // Try to extract opponent from text
              const text = el.text().trim();
              const vsMatch = text.match(/vs\.?\s+([A-Za-z\s]+)/i);
              
              if (vsMatch) {
                opponent = vsMatch[1].trim();
                title = `Fraser Valley Bandits vs ${opponent}`;
              }
            }
            
            // Find any game-specific URL
            let gameUrl = el.find('a').attr('href') || url;
            
            // Make relative URLs absolute
            if (!gameUrl.startsWith('http')) {
              if (gameUrl.startsWith('/')) {
                gameUrl = new URL(gameUrl, url).href;
              } else {
                gameUrl = new URL('/' + gameUrl, url).href;
              }
            }
            
            // Find an image
            let imageUrl = el.find('img').attr('src') || '';
            
            // If no image in the game element, look for team logo
            if (!imageUrl) {
              const logo = $('img[src*="bandits"], img[src*="logo"], .team-logo img').first();
              if (logo.length) {
                imageUrl = logo.attr('src') || '';
              }
            }
            
            // Make relative URLs absolute
            if (imageUrl && !imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('/')) {
                imageUrl = new URL(imageUrl, url).href;
              } else {
                imageUrl = new URL('/' + imageUrl, url).href;
              }
            }
            
            // Create event if we have the minimum required info
            if (title && date) {
              const event = {
                title: title,
                date: date,
                url: gameUrl,
                venue: name,
                address: venueAddress,
                city: venueCity,
                region: venueRegion,
                postalCode: venuePostalCode,
                country: venueCountry,
                description: `Basketball game: ${title} at Langley Events Centre. Come cheer on your Fraser Valley Bandits!`,
                image: imageUrl
              };
              
              logger.info({ event }, 'Found upcoming game event');
              events.push(event);
            }
          } catch (err) {
            logger.error({ error: err.message }, 'Error processing upcoming game element');
          }
        });
      }
    }
    
    // Log if no games were found
    if (events.length === 0) {
      logger.info('No games found');
    }
    
    logger.info(`Found ${events.length} events`);
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Fraser Valley Bandits');
    return [];
  }
}

/**
 * Create a default season event when no specific games are found
 * @param {Object} $ - Optional Cheerio object for extracting image
 * @returns {Object} Season event object
 */
function createSeasonEvent($ = null) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  // CEBL typically runs May-August
  const seasonYear = currentMonth > 8 ? currentYear + 1 : currentYear;
  let mainImage = '';
  
  // Extract image if cheerio object is provided
  if ($) {
    mainImage = $('img[src*="bandits"], img[src*="team"], img[src*="logo"]').first().attr('src') || '';
    
    // Make relative URLs absolute
    if (mainImage && !mainImage.startsWith('http')) {
      if (mainImage.startsWith('/')) {
        mainImage = new URL(mainImage, url).href;
      } else {
        mainImage = new URL('/' + mainImage, url).href;
      }
    }
  }
  
  // Create a season event with the proper year
  return {
    title: `Fraser Valley Bandits ${seasonYear} Season`,
    date: `May - August ${seasonYear}`,
    url: url,
    venue: name,
    address: venueAddress,
    city: venueCity,
    region: venueRegion,
    postalCode: venuePostalCode,
    country: venueCountry,
    description: 'Fraser Valley Bandits are a professional basketball team competing in the Canadian Elite Basketball League (CEBL). Check the website for game schedule and tickets.',
    image: mainImage || 'https://thebandits.ca/wp-content/uploads/2023/04/vertical-1080x1350-2020-Web.jpg'
  };
}

module.exports = {
  name,
  url,
  scrape
};
