/**
 * Robust Commodore Ballroom Venue Scraper
 * Uses multiple scraping techniques for enhanced reliability
 * Last updated: 2025-06-19
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');
const { parseEventDate, determineSeason } = require('../utils/dateParsing');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const retry = require('async-retry');

// Configure puppeteer with stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 30000; // 30 seconds
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
];

// Note: parseEventDate function is now imported from the shared dateParsing utility

/**
 * Determine if an event is upcoming
 * @param {Date} eventDate - Date of the event
 * @returns {boolean} True if event is in the future
 */
function isUpcomingEvent(eventDate) {
  if (!eventDate) return false;
  const now = new Date();
  return eventDate >= now;
}

/**
 * Auto-scroll page to load lazy-loaded content
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        // Add random pauses to mimic human behavior
        if (Math.random() > 0.8) {
          clearInterval(timer);
          setTimeout(() => {
            timer;
          }, 500 + Math.floor(Math.random() * 1000));
        }

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100 + Math.floor(Math.random() * 50)); // Randomized scroll timing
    });
  });
}

/**
 * Extract events from HTML using multiple strategies
 * @param {Object} $ - Cheerio instance
 * @param {Object} logger - Logger instance
 * @returns {Array} Array of event objects
 */
const processEventAsync = async (element, $, logger) => {
  try {
    const $element = $(element);
    let title = $element.find('.event-title, .show-title, h2, h3').first().text().trim();
    let dateText = '';
    const dateSelectors = [
      '.date',
      '.event-date',
      'time',
      '.datetime',
      '.calendar-date',
      '.meta-date',
      'span:contains("Date")',
      '.date-display-single',
      '.date-display-start',
      '.date-display-end',
      '.field--name-field-date',
      '.field--name-field-event-date',
      '.field--name-field-event-start-date',
      '.field--name-field-event-end-date'
    ];
    
    // Try different date selectors with fallback
    for (const dateSelector of dateSelectors) {
      try {
        dateText = $element.find(dateSelector).first().text().trim();
        if (dateText) break;
      } catch (error) {
        logger.warn(`Error trying selector ${dateSelector}: ${error.message}`);
      }
    }
    
    // Try to parse date with retry
    const date = await retry(
      async () => {
        return parseEventDate(dateText, logger, 'Commodore Ballroom');
      },
      { retries: 2, factor: 2, minTimeout: 1000 }
    );
    
    // Skip if we don't have the minimal required information
    if (!title || !date) {
      logger.debug(`Skipping element - missing title or date: [${title}] [${dateText}]`);
      return null;
    }
    
    // Find link with retry
    let link = '';
    try {
      const linkElement = await retry(
        async () => $element.find('a').first(),
        { retries: 2, factor: 2, minTimeout: 500 }
      );
      if (linkElement.length > 0) {
        link = linkElement.attr('href') || '';
      }
    } catch (error) {
      logger.warn(`Error finding link element: ${error.message}`);
    }
    
    const fullLink = link.startsWith('http') ? link : `https://www.commodoreballroom.com${link}`;
    
    // Find image with retry
    let imageUrl = '';
    try {
      const imgElement = await retry(
        async () => $element.find('img').first(),
        { retries: 2, factor: 2, minTimeout: 500 }
      );
      if (imgElement.length > 0) {
        imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://www.commodoreballroom.com${imageUrl}`;
        }
      }
    } catch (error) {
      logger.warn(`Error finding image element: ${error.message}`);
    }
    
    // Find description with multiple fallbacks
    let description = '';
    const descriptionSelectors = [
      '.event-description',
      '.event-details',
      '.event-info',
      'p',
      '.description',
      'div:contains("Description") + div',
      'div:contains("About") + div',
      '.event-content',
      '.event-text',
      '.event-summary',
      '.event-details-wrapper',
      '.event-excerpt',
      '.event-body',
      '.field--name-body',
      '.field--name-field-description',
      '.field--name-field-event-description',
      '.field--name-field-event-content'
    ];
    
    // Try different description selectors with retry
    for (const descSelector of descriptionSelectors) {
      try {
        const descElement = await retry(
          async () => $element.find(descSelector).first(),
          { retries: 2, factor: 2, minTimeout: 500 }
        );
        if (descElement.length > 0) {
          description = descElement.text().trim();
          if (description) {
            logger.debug(`Found description using selector: ${descSelector}`);
            break;
          }
        }
      } catch (error) {
        logger.warn(`Error trying description selector ${descSelector}: ${error.message}`);
      }
    }
    
    // If no description found, try to extract from the event page
    if (!description && link) {
      try {
        // Use random user agent for event page fetch
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        
        // Fetch event page with retry
        const eventPage = await retry(
          async () => axios.get(fullLink, {
            headers: {
              'User-Agent': userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            timeout: TIMEOUT
          }),
          { retries: MAX_RETRIES, factor: 2, minTimeout: RETRY_DELAY }
        );
        
        const eventHtml = cheerio.load(eventPage.data);
        
        // Try different selectors on the event page with retry
        const pageDescSelectors = [
          '.event-description',
          '.event-content',
          '.event-info',
          'p',
          '.description',
          '.event-details',
          '.event-excerpt',
          '.event-body',
          '.field--name-body',
          '.field--name-field-description',
          '.field--name-field-event-description',
          '.field--name-field-event-content'
        ];
        
        for (const selector of pageDescSelectors) {
          try {
            const descElement = await retry(
              async () => eventHtml(selector).first(),
              { retries: 2, factor: 2, minTimeout: 500 }
            );
            if (descElement.length > 0) {
              description = descElement.text().trim();
              if (description) {
                logger.debug(`Found description on event page using selector: ${selector}`);
                break;
              }
            }
          } catch (error) {
            logger.warn(`Error trying event page selector ${selector}: ${error.message}`);
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch event page for description: ${error.message}`);
      }
    }
    
    // If still no description, create a default one
    if (!description) {
      description = `${title} at the Commodore Ballroom in Vancouver. Join us for this exciting event in one of Vancouver's most iconic venues.`;
      logger.debug(`Using default description for event: ${title}`);
    }
    
    // Create event object with consistent venue data
    const event = {
      title,
      description,
      startDate: date,
      endDate: null,
      venue: {
        name: "Commodore Ballroom",
        address: "868 Granville St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6Z 1L2",
        website: "https://www.commodoreballroom.com",
        phone: "(604) 688-5555",
        capacity: 1000,
        type: "concert venue",
        features: [
          "standing room only",
          "general admission",
          "full bar",
          "food service",
          "wheelchair accessible",
          "all ages"
        ],
        amenities: [
          "full bar",
          "food service",
          "VIP seating",
          "ticket office"
        ]
      },
      location: {
        name: "Commodore Ballroom",
        address: "868 Granville St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6Z 1L2",
        coordinates: {
          latitude: 49.2827,
          longitude: -123.1168
        },
        timezone: "America/Vancouver",
        transport: {
          nearbyStations: [
            "Granville SkyTrain Station",
            "Burrard SkyTrain Station"
          ],
          busRoutes: [
            "99 B-Line",
            "14 Granville"
          ]
        }
      },
      url: fullLink,
      imageUrl,
      categories: ['music', 'concert', 'live music', 'vancouver', 'downtown'],
      tags: ['commodore ballroom', 'live music', 'concert venue', 'music venue'],
      source: 'commodoreballroom.com',
      metadata: {
        lastUpdated: new Date().toISOString(),
        scraperVersion: '2025-06-19',
        confidenceScore: 0.95,
        venueFeatures: {
          capacity: 1000,
          type: "concert venue",
          features: [
            "standing room only",
            "general admission",
            "full bar",
            "food service",
            "wheelchair accessible",
            "all ages"
          ]
        },
        transport: {
          nearbyStations: [
            "Granville SkyTrain Station",
            "Burrard SkyTrain Station"
          ],
          busRoutes: [
            "99 B-Line",
            "14 Granville"
          ]
        },
        retryAttempts: {
          dateParsing: date ? 0 : 2,
          description: description ? 0 : 2,
          image: imageUrl ? 0 : 2,
          link: link ? 0 : 2
        }
      }
    };
    
    // Add season information
    if (date) {
      event.season = determineSeason(date);
    }
    
    // Add additional metadata
    event.metadata = {
      ...event.metadata,
      isUpcoming: isUpcomingEvent(date),
      daysUntil: date ? Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24)) : null,
      transport: {
        nearbyStations: [
          "Granville SkyTrain Station",
          "Burrard SkyTrain Station"
        ],
        busRoutes: [
          "99 B-Line",
          "14 Granville"
        ]
      },
      retryAttempts: {
        dateParsing: date ? 0 : 2,
        description: description ? 0 : 2,
        image: imageUrl ? 0 : 2,
        link: link ? 0 : 2
      }
    };
    
    logger.debug(`Extracted event: ${title} on ${date}`);
    return event;
  } catch (error) {
    logger.error({ error }, `Error processing event`);
    return null;
  }
};

function extractEvents($, logger) {
  const eventElements = $('.event, .show, .event-item');
  
  // Process all events in parallel using Promise.all with retry
  const processAllEvents = async () => {
    const processEventAsyncs = eventElements.map(element => processEventAsync(element, $, logger));
    return Promise.all(processEventAsyncs);
  };

  return retry(
    processAllEvents,
    { retries: 2, factor: 2, minTimeout: 1000 }
  ).then(events => {
    // Filter out null events and events without valid dates
    const validEvents = events.filter(event => event && event.startDate);
    
    // Sort events by date
    return validEvents.sort((a, b) => a.startDate - b.startDate);
  });
}

/**
 * Main scraping function with retry logic
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in milliseconds
 * @returns {Promise<Array>} Array of events
 */
async function scrape(maxRetries = 3, retryDelay = 2000) {
  const logger = scrapeLogger.child({ scraper: 'Commodore Ballroom Shows' });
  logger.info("Starting robust Commodore Ballroom scraper...");

  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      logger.info(`Attempt ${retryCount + 1} of ${maxRetries}`);

      // First attempt: Try Axios with enhanced headers
      logger.info("Attempt 1: Using Axios with enhanced headers");
      try {
        const response = await axios.get('https://www.commodoreballroom.com/shows', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
          },
          timeout: 30000,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          }
        });

        if (response.status === 200) {
          const $ = cheerio.load(response.data);
          
          // Extract events from JSON-LD data
          const eventScripts = $('script[type="application/ld+json"]');
          const events = [];
          
          logger.info(`Found ${eventScripts.length} JSON-LD script tags`);
          
          eventScripts.each((index, script) => {
            try {
              // Extract the text content directly from the script element
              const scriptContent = $(script).html();
              const json = JSON.parse(scriptContent);
              
              logger.debug(`Parsed JSON script ${index}: ${json['@type']}`);
              
              if (json && json['@type'] === 'MusicEvent') {
                const eventDate = new Date(json.startDate);
                
                events.push({
                  title: json.name,
                  startDate: eventDate,
                  venue: {
                    name: 'Commodore Ballroom',
                    city: 'Vancouver',
                    country: 'Canada'
                  },
                  url: json.url,
                  description: json.description || `${json.name} at Commodore Ballroom in Vancouver`,
                  image: json.image,
                  categories: ['music', 'concert', 'live music', 'vancouver', 'downtown'],
                  tags: ['commodore ballroom', 'live music', 'concert venue', 'music venue'],
                  location: {
                    city: 'Vancouver',
                    state: 'BC',
                    country: 'Canada'
                  }
                });
                logger.debug(`Added event: ${json.name} on ${eventDate}`);
              }
            } catch (error) {
              logger.warn(`Error parsing JSON-LD script ${index}: ${error.message}`);
            }
          });
          
          if (events.length > 0) {
            logger.info(`Successfully scraped ${events.length} events using JSON-LD`);
            return events;
          }
        } else {
          logger.warn(`Request failed with status ${response.status}`);
        }
      } catch (axiosError) {
        logger.warn(`Axios request error: ${axiosError.message}`);
      }

      // Second attempt: Try Puppeteer with stealth
      logger.info("Attempt 2: Using Puppeteer with stealth plugin");
      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920x1080',
            '--disable-popup-blocking',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
          ignoreHTTPSErrors: true,
          defaultViewport: { width: 1920, height: 1080 },
          timeout: 60000,
          slowMo: 50,
          handleSIGINT: true,
          handleSIGTERM: true,
          handleSIGHUP: true
        });
        
        const page = await browser.newPage();
        
        // Add stealth measures
        await page.evaluateOnNewDocument(() => {
          // Override navigator properties
          Object.defineProperties(navigator, {
            webdriver: { get: () => false },
            platform: { get: () => 'Win32' },
            languages: { get: () => ['en-US', 'en'] },
            plugins: { get: () => [1, 2, 3, 4, 5] },
            userAgent: { get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36' },
            appVersion: { get: () => '5.0 (Windows NT 10.0; Win64; x64)' },
            hardwareConcurrency: { get: () => 4 },
            deviceMemory: { get: () => 8 },
            maxTouchPoints: { get: () => 0 },
            userAgentData: { get: () => ({
              brands: [{brand: 'Chromium', version: '98'}, {brand: 'Google Chrome', version: '98'}, {brand: 'Not A;Brand', version: '99'}],
              mobile: false,
              platform: 'Windows'
            })}
          });

          // Override window properties
          window.chrome = {
            runtime: {},
            loadTimes: () => ({
              requestTime: 1583973648.234,
              startLoadTime: 1583973648.234,
              firstPaintTime: 1583973648.234,
              firstContentfulPaintTime: 1583973648.234,
              firstMeaningfulPaintTime: 1583973648.234
            })
          };

          // Override media devices
          window.MediaRecorder = undefined;
          window.webkitMediaRecorder = undefined;
          window.navigator.mediaDevices = {
            getUserMedia: () => Promise.reject(new Error('Permission denied')),
            enumerateDevices: () => Promise.resolve([]),
            getSupportedConstraints: () => ({
              width: true,
              height: true,
              aspectRatio: true,
              frameRate: true,
              facingMode: true,
              deviceId: true,
              groupId: true,
              volume: true,
              sampleRate: true,
              sampleSize: true,
              echoCancellation: true,
              latency: true,
              channelCount: true
            })
          };

          // Override geolocation
          window.navigator.geolocation = {
            getCurrentPosition: () => Promise.resolve({
              coords: {
                latitude: 49.2827,
                longitude: -123.1207,
                accuracy: 100,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
              },
              timestamp: Date.now()
            }),
            watchPosition: () => 1,
            clearWatch: () => {}
          };

          // Override permissions
          window.navigator.permissions = {
            query: () => Promise.resolve({ state: 'granted' })
          };

          // Override connection
          window.navigator.connection = {
            downlink: 10,
            effectiveType: '4g',
            rtt: 50,
            saveData: false
          };
        });
        
        // Select random user agent
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(userAgent);
        await page.setViewport({ width: 1280, height: 1024 });
        
        // Add additional headers
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        });
        
        logger.info('Starting page navigation...');
        
        // Define navigation retry logic
        const navigateWithRetry = async (url, maxAttempts = 3) => {
          let attempt = 1;
          while (attempt <= maxAttempts) {
            try {
              logger.info(`Navigation attempt ${attempt} of ${maxAttempts}`);
              
              // Add small random delay before each attempt
              const delay = Math.random() * 2000;
              await page.waitForTimeout(delay);
              
              // Navigate with multiple wait conditions
              await page.goto(url, {
                waitUntil: ['networkidle2', 'domcontentloaded', 'networkidle0'],
                timeout: 60000,
                referer: 'https://www.google.com/'
              });
              
              // Wait for main content to be visible
              await page.waitForSelector('body', { timeout: 10000 });
              
              // Wait for events container
              await page.waitForFunction(() => {
                const eventsContainer = document.querySelector('.events-container, .shows-container, .events-list');
                return eventsContainer && eventsContainer.style.display !== 'none';
              }, { timeout: 30000 });
              
              // Wait for at least one event to be visible
              await page.waitForFunction(() => {
                const events = document.querySelectorAll('.event, .show, .event-item');
                return events.length > 0 && Array.from(events).some(event => {
                  const rect = event.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0;
                });
              }, { timeout: 30000 });
              
              // If we got here, navigation was successful
              return true;
            } catch (error) {
              logger.error(`Navigation attempt ${attempt} failed: ${error.message}`);
              if (attempt === maxAttempts) {
                throw error;
              }
              attempt++;
              
              // Add exponential backoff between retries
              const retryDelay = Math.pow(2, attempt - 1) * 1000;
              logger.info(`Waiting ${retryDelay}ms before retrying...`);
              await page.waitForTimeout(retryDelay);
            }
          }
          return false;
        };
        
        // Execute navigation with retry
        await navigateWithRetry("https://www.commodoreballroom.com/shows");
        
        // Wait for main content to be visible
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Wait for events container
        await page.waitForFunction(() => {
          const eventsContainer = document.querySelector('.events-container, .shows-container, .events-list');
          return eventsContainer && eventsContainer.style.display !== 'none';
        }, { timeout: 30000 });
        
        // Wait for at least one event to be visible
        await page.waitForFunction(() => {
          const events = document.querySelectorAll('.event, .show, .event-item');
          return events.length > 0 && Array.from(events).some(event => {
            const rect = event.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        }, { timeout: 30000 });
        
        // Log navigation status
        const status = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            status: document.readyState,
            hasEvents: document.querySelectorAll('.event, .show, .event-item').length > 0
          };
        });
        logger.info('Page status:', status);
        
        if (!status.hasEvents) {
          throw new Error('No events found on page');
        }
        
        // Wait for main content to be visible
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Add small delay to ensure content is fully loaded
        await page.waitForTimeout(2000);
        
        // Check if we're on the right page
        const title = await page.title();
        if (!title.includes('Commodore Ballroom')) {
          throw new Error('Failed to load shows page');
        }
        
        // Try multiple approaches to extract events
        const extractEventsWithMultipleApproaches = async () => {
          try {
            // First try: JSON data extraction
            const content = await page.content();
            
            // Try multiple JSON patterns
            const jsonPatterns = [
              /"shows":\[.*?\]/,
              /"events":\[.*?\]/,
              /"shows":\{.*?\}/,
              /"events":\{.*?\}/
            ];
            
            let eventsData;
            for (const pattern of jsonPatterns) {
              const match = content.match(pattern);
              if (match) {
                try {
                  const jsonData = JSON.parse(`{${match[0]}}`);
                  if (jsonData.shows || jsonData.events) {
                    eventsData = jsonData;
                    break;
                  }
                } catch (e) {
                  logger.debug(`Failed to parse JSON with pattern ${pattern}: ${e.message}`);
                }
              }
            }
            
            if (eventsData) {
              const events = (eventsData.shows || eventsData.events).map(event => ({
                title: event.name || event.title || 'Unknown Event',
                startDate: event.date ? new Date(event.date) : null,
                venue: {
                  name: 'Commodore Ballroom',
                  city: 'Vancouver',
                  country: 'Canada'
                },
                url: event.url || event.link || `https://www.commodoreballroom.com${event.path || ''}`,
                description: event.description || event.summary || event.details,
                image: event.image || event.poster || event.thumbnail,
                categories: event.categories || event.tags || [],
                location: {
                  city: 'Vancouver',
                  state: 'BC',
                  country: 'Canada'
                }
              }));
              
              const validEvents = events.filter(event => event.startDate && event.title);
              if (validEvents.length > 0) {
                logger.info(`Successfully extracted ${validEvents.length} events from JSON data`);
                return validEvents;
              }
            }
            
            // Second try: DOM parsing
            const $ = cheerio.load(content);
            const eventElements = $('.event, .show, .event-item');
            
            if (eventElements.length > 0) {
              const events = eventElements.map((i, element) => {
                const $element = $(element);
                const title = $element.find('.title, .event-title, h2, h3').text().trim() || 'Unknown Event';
                const dateText = $element.find('.date, .event-date, .show-date').text().trim();
                const startDate = dateText ? new Date(dateText) : null;
                const url = $element.find('a').attr('href') || `https://www.commodoreballroom.com${$element.attr('data-url') || ''}`;
                
                return {
                  title,
                  startDate,
                  venue: {
                    name: 'Commodore Ballroom',
                    city: 'Vancouver',
                    country: 'Canada'
                  },
                  url,
                  description: $element.find('.description, .event-description, .show-description').text().trim(),
                  image: $element.find('img').attr('src'),
                  location: {
                    city: 'Vancouver',
                    state: 'BC',
                    country: 'Canada'
                  }
                };
              }).get();
              
              const validEvents = events.filter(event => event.startDate && event.title);
              if (validEvents.length > 0) {
                logger.info(`Successfully extracted ${validEvents.length} events from DOM`);
                return validEvents;
              }
            }
            
            // Third try: API endpoint
            try {
              const response = await axios.get('https://www.commodoreballroom.com/api/events', {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
                  'Accept': 'application/json',
                  'Referer': 'https://www.commodoreballroom.com/shows'
                },
                timeout: 10000
              });
              
              if (response.data && Array.isArray(response.data.events)) {
                const events = response.data.events.map(event => ({
                  title: event.name || event.title || 'Unknown Event',
                  startDate: event.date ? new Date(event.date) : null,
                  venue: {
                    name: 'Commodore Ballroom',
                    city: 'Vancouver',
                    country: 'Canada'
                  },
                  url: event.url || `https://www.commodoreballroom.com${event.path || ''}`,
                  description: event.description || event.summary,
                  image: event.image || event.poster,
                  location: {
                    city: 'Vancouver',
                    state: 'BC',
                    country: 'Canada'
                  }
                }));
                
                const validEvents = events.filter(event => event.startDate && event.title);
                if (validEvents.length > 0) {
                  logger.info(`Successfully extracted ${validEvents.length} events from API`);
                  return validEvents;
                }
              }
            } catch (error) {
              logger.error(`Error in API request: ${error.message}`);
            }
            
            // If all approaches failed
            return [];
          } catch (error) {
            logger.error(`Error in event extraction: ${error.message}`);
            throw error;
          }
        }

        const events = await extractEventsWithMultipleApproaches();
        if (events.length > 0) {
          return events;
        } else {
          logger.warn('No events found');
          return [];
        }
      } catch (error) {
        logger.error(`Error in Puppeteer attempt: ${error.message}`);
        throw error;
      }
    } catch (error) {
      logger.error(`Fatal error in main scraper: ${error.message}`);
      return [];
    }
  }
}

module.exports = {
  name: "Commodore Ballroom",
  url: "https://www.commodoreballroom.com/shows",
  urls: ["https://www.commodoreballroom.com/shows", "https://www.commodoreballroom.com"],
  scrape
};

module.exports = {
  name: "Commodore Ballroom",
  url: "https://www.commodoreballroom.com/shows",
  urls: ["https://www.commodoreballroom.com/shows", "https://www.commodoreballroom.com"],
  scrape
};
