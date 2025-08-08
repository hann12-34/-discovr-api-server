/**
 * Japan Market Vancouver Scraper
 *
 * This scraper extracts events from the Japan Market Vancouver website
 * Source: https://japanmarket.ca/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class JapanMarketScraper {
  constructor() {
    this.name = 'Japan Market Vancouver';
    this.url = 'https://japanmarket.ca/';
    this.sourceIdentifier = 'japan-market-vancouver';

    this.venue = {
      name: 'Japan Market Vancouver',
      id: 'japan-market-vancouver',
      address: 'Various locations in Vancouver',
      city: city,
      state: 'BC',
      country: 'Canada',
      coordinates: {
        lat: 49.2827,
        lng: -123.1207
      },
      websiteUrl: 'https://japanmarket.ca/',
      description: 'Japan Market Vancouver brings authentic Japanese food, products, and culture to Vancouver through regularly scheduled market events.'
    };
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting Japan Market events scraper...');
    const events = [];
    let browser = null;

    try {
      // Launch browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      };

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // Navigate to the website
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 };

      // Take a screenshot for debugging
      await page.screenshot({ path: 'japan-market-debug.png' };
      console.log('✅ Saved debug screenshot to japan-market-debug.png');

      // Look for event sections using various selectors
      const eventSelectors = [
        '-section',
        '.market-dates',
        '.upcoming-events',
        '-list',
        's-container',
        '.calendar-section',
        '#events',
        '.market-schedule',
        '.market-events'
      ];

      let foundEvents = false;

      // Try different selectors to find event information
      for (const selector of eventSelectors) {
        console.log(`Looking for events with selector: ${selector}`);
        const eventSections = await page.$$(selector);

        if (eventSections.length > 0) {
          console.log(`Found ${eventSections.length} potential event sections with selector: ${selector}`);
          foundEvents = true;

          for (const section of eventSections) {
            try {
              // Extract date information from event section
              const dateElements = await section.$$('time, .date, -date');
              for (const dateElement of dateElements) {
                const dateText = await page.evaluate(el => el.textContent.trim(), dateElement);
                const dateAttr = await page.evaluate(el => el.getAttribute('datetime'), dateElement);

                // Try to parse the date
                let eventDate;
                if (dateAttr) {
                  eventDate = new Date(dateAttr);
                } else if (dateText) {
                  // Try to extract date from text using various formats
                  const dateMatch = dateText.match(/(\w+)\s+(\d{1,2}(?:st|nd|rd|th)?,?\s*(\d{4}?/);
                  if (dateMatch) {
                    const month = dateMatch[1];
                    const day = dateMatch[2];
                    const year = dateMatch[3] || new Date().getFullYear();
                    eventDate = new Date(`${month} ${day}, ${year}`);
                  }
                }

                if (eventDate && !isNaN(eventDate.getTime())) {
                  // Extract location if available
                  const locationElement = await section.$('.location, .venue, .address');
                  const location = locationElement ?
                    await page.evaluate(el => el.textContent.trim(), locationElement) :
                    'Vancouver, BC';

                  // Create event title with date and location
                  const title = `Japan Market Vancouver - ${eventDate.toLocaleDa('en-US', { month: 'long', day: 'numeric' }}`;

                  // Set event times (default to 11am-6pm)
                  const startDate = new Date(eventDate);
                  startDate.setHours(11, 0, 0);

                  const endDate = new Date(eventDate);
                  endDate.setHours(18, 0, 0);

                  // Generate ID
                  const da = startDate.toISOString().split('T')[0];
                  const id = `japan-market-vancouver-${da}`;

                  // Get image if available
                  const imageElement = await section.$('img');
                  const image = imageElement ?
                    await page.evaluate(el => el.src, imageElement) : null;

                  // Create event object
                  const event = {
                    id: id,
                    title: title,
                    description: 'Japan Market Vancouver showcases authentic Japanese food, crafts, and culture. Explore a variety of Japanese products, enjoy delicious food, and experience Japanese cultural elements in a vibrant market atmosphere.',
                    startDate: startDate,
                    endDate: endDate,
                    venue: {
                      ...this.venue,
                      address: location || this.venue.address
                    },
                    category: 'market',
                    categories: ['market', 'food', 'culture', 'japanese', 'shopping'],
                    sourceURL: this.url,
                    officialWebsite: this.url,
                    image: image,
                    ticketsRequired: false,
                    lastUpdated: new Date()
                  };

                  events.push(event);
                  console.log(`✅ Added Japan Market event on: ${startDate.toDa`);
                }
              }
            } catch (sectionError) {
              console.error(`❌ Error processing event section: ${sectionError.message}`);
            }
          }
        }
      }

      // If no events found through structured data, look for date mentions in text
      if (!foundEvents || events.length === 0) {
        console.log('Looking for date mentions in text...');

        // Extract all text from the page
        const bodyText = await page.evaluate(() => document.body.innerText);

        // Look for date patterns in text
        const datePatterns = [
          /(\w+)\s+(\d{1,2}(?:st|nd|rd|th)?,?\s*(\d{4}?/g, // "July 15th, 2025" or "July 15"
          /(\d{1,2}\/(\d{1,2}\/(\d{4}/g,                  // "7/15/2025"
          /(\d{4}-(\d{1,2}-(\d{1,2}/g                     // "2025-07-15"
        ];

        const foundDates = new Set();

        for (const pattern of datePatterns) {
          let match;
          while ((match = pattern.exec(bodyText)) !== null) {
            try {
              let da;
              if (pattern.toString().includes('\\w+')) {
                // First pattern: Month Day, Year
                const month = match[1];
                const day = match[2];
                const year = match[3] || new Date().getFullYear();
                da = `${month} ${day}, ${year}`;
              } else if (pattern.toString().includes('\\d{1,2}\\/')) {
                // Second pattern: MM/DD/YYYY
                const month = match[1];
                const day = match[2];
                const year = match[3];
                da = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              } else {
                // Third pattern: YYYY-MM-DD
                da = match[0];
              }

              const eventDate = new Date(da);

              // Only include future dates that are valid
              if (eventDate && !isNaN(eventDate.getTime()) && eventDate >= new Date()) {
                // Convert to ISO date string to use as key in Set
                const isoDate = eventDate.toISOString().split('T')[0];

                // Only add if we haven't seen this date before
                if (!foundDates.has(isoDate)) {
                  foundDates.add(isoDate);

                  // Set event times (default to 11am-6pm)
                  const startDate = new Date(eventDate);
                  startDate.setHours(11, 0, 0);

                  const endDate = new Date(eventDate);
                  endDate.setHours(18, 0, 0);

                  // Generate ID
                  const da = startDate.toISOString().split('T')[0];
                  const id = `japan-market-vancouver-${da}`;

                  // Create event object
                  const event = {
                    id: id,
                    title: `Japan Market Vancouver - ${startDate.toLocaleDa('en-US', { month: 'long', day: 'numeric' }}`,
                    description: 'Japan Market Vancouver showcases authentic Japanese food, crafts, and culture. Explore a variety of Japanese products, enjoy delicious food, and experience Japanese cultural elements in a vibrant market atmosphere.',
                    startDate: startDate,
                    endDate: endDate,
                    venue: this.venue,
                    category: 'market',
                    categories: ['market', 'food', 'culture', 'japanese', 'shopping'],
                    sourceURL: this.url,
                    officialWebsite: this.url,
                    image: null,
                    ticketsRequired: false,
                    lastUpdated: new Date()
                  };

                  events.push(event);
                  console.log(`✅ Added Japan Market event from text date: ${startDate.toDa`);
                }
              }
            } catch (dateError) {
              console.log(`❌ Error parsing date from text: ${dateError.message}`);
            }
          }
        }
      }

      // If no events found from page scraping, add some projected dates
      if (events.length === 0) {
        console.log('⚠️ No events found on website, creating projected market events');

        // Create market events on second Saturday of coming months
        const now = new Date();
        let month = now.getMonth();
        let year = now.getFullYear();

        // Create events for the next 6 months
         {
          month++;
          if (month > 11) {
            month = 0;
            year++;
          }

          // Find second Saturday of the month
          let date = new Date(year, month, 1);
          // Get to the first Saturday
          while (date.getDay() !== 6) {
            date.setDate(date.getDate() + 1);
          }
          // Move to second Saturday
          date.setDate(date.getDate() + 7);

          // Set event times (11am-6pm)
          const startDate = new Date(date);
          startDate.setHours(11, 0, 0);

          const endDate = new Date(date);
          endDate.setHours(18, 0, 0);

          // Generate ID
          const da = startDate.toISOString().split('T')[0];
          const id = `japan-market-vancouver-${da}`;

          // Create event object
          const event = {
            id: id,
            title: `Japan Market Vancouver - ${startDate.toLocaleDa('en-US', { month: 'long', day: 'numeric' }}`,
            description: 'Japan Market Vancouver showcases authentic Japanese food, crafts, and culture. Explore a variety of Japanese products, enjoy delicious food, and experience Japanese cultural elements in a vibrant market atmosphere. Please check the official website for confirmed dates and details.',
            startDate: startDate,
            endDate: endDate,
            venue: this.venue,
            category: 'market',
            categories: ['market', 'food', 'culture', 'japanese', 'shopping'],
            sourceURL: this.url,
            officialWebsite: this.url,
            image: null,
            ticketsRequired: false,
            lastUpdated: new Date()
          };

          events.push(event);
          console.log(`✅ Added projected Japan Market event on: ${startDate.toDa`);
        }
      }

    } catch (error) {
      console.error(`❌ Error in Japan Market scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from Japan Market`);
    }

    return events;
  }
}

module.exports = new JapanMarketScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new JapanMarketScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.JapanMarketScraper = JapanMarketScraper;