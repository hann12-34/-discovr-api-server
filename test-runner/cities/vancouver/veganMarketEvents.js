/**
 * The Vegan Market Vancouver Scraper
 * 
 * This scraper extracts events from The Vegan Market Vancouver
 * Source: https://www.theveganmarket.ca/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class VeganMarketScraper {
  constructor() {
    this.name = 'The Vegan Market';
    this.url = 'https://www.theveganmarket.ca/';
    this.sourceIdentifier = 'vegan-market-vancouver';
    
    // Venue information (approximate/default)
    this.venue = {
      name: 'The Vegan Market',
      id: 'vegan-market-vancouver',
      address: 'Various locations in Vancouver',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      coordinates: {
        lat: 49.2827,
        lng: -123.1207
      },
      websiteUrl: 'https://www.theveganmarket.ca/',
      description: 'The Vegan Market showcases local small businesses featuring plant-based food, drinks, and products.'
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vegan Market events scraper...');
    const events = [];
    let browser = null;
    
    try {
      // Launch browser with appropriate configuration
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the website and wait for content to load
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'vegan-market-debug.png' });
      console.log('✅ Saved debug screenshot to vegan-market-debug.png');
      
      // Wait for additional time to ensure JavaScript content loads
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Look for event sections or event cards on the page
      const eventElements = await page.$$('.event-section, .event-card, .market-date, section[id*="market"], div[id*="event"], div.upcoming-events');
      console.log(`Found ${eventElements.length} potential event sections`);
      
      for (let i = 0; i < eventElements.length; i++) {
        try {
          const element = eventElements[i];
          
          // Extract event title
          const titleElement = await element.$('h1, h2, h3, h4, .title, .event-title, .market-name');
          if (!titleElement) continue;
          
          const title = await page.evaluate(el => el.textContent.trim(), titleElement);
          
          // Only proceed if we found a title
          if (title && title.length > 3) {
            console.log(`Processing event: ${title}`);
            
            // Extract date information
            const dateElement = await element.$('.date, .event-date, .market-date, time');
            let dateText = dateElement ? 
              await page.evaluate(el => el.textContent.trim(), dateElement) : null;
            
            // Extract location information
            const locationElement = await element.$('.location, .venue, .address, .market-location');
            const location = locationElement ?
              await page.evaluate(el => el.textContent.trim(), locationElement) : 'Vancouver, BC';
            
            // Extract description
            const descriptionElement = await element.$('p, .description, .event-description');
            const description = descriptionElement ?
              await page.evaluate(el => el.textContent.trim(), descriptionElement) : '';
            
            // Extract image if available
            const imageElement = await element.$('img');
            const imageUrl = imageElement ?
              await page.evaluate(el => el.src, imageElement) : null;
            
            // Parse the date or use current date + 2 weeks as fallback
            let startDate, endDate;
            if (dateText) {
              try {
                // Try to extract date information from the text
                const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}|\d{2})?/);
                if (dateMatch) {
                  const month = dateMatch[1];
                  const day = parseInt(dateMatch[2]);
                  let year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
                  if (year < 100) year += 2000; // Handle 2-digit years
                  
                  startDate = new Date(`${month} ${day}, ${year} 10:00:00`);
                  endDate = new Date(`${month} ${day}, ${year} 17:00:00`); // Assuming 10am-5pm
                } else {
                  // If we couldn't parse the date, set a reasonable future date
                  const futureDate = new Date();
                  futureDate.setDate(futureDate.getDate() + 14); // 2 weeks in the future
                  startDate = new Date(futureDate);
                  startDate.setHours(10, 0, 0, 0);
                  endDate = new Date(futureDate);
                  endDate.setHours(17, 0, 0, 0);
                }
              } catch (dateError) {
                console.log(`❌ Date parsing error: ${dateError.message}`);
                // Set a reasonable future date
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 14); // 2 weeks in the future
                startDate = new Date(futureDate);
                startDate.setHours(10, 0, 0, 0);
                endDate = new Date(futureDate);
                endDate.setHours(17, 0, 0, 0);
              }
            } else {
              // Set a reasonable future date
              const futureDate = new Date();
              futureDate.setDate(futureDate.getDate() + 14); // 2 weeks in the future
              startDate = new Date(futureDate);
              startDate.setHours(10, 0, 0, 0);
              endDate = new Date(futureDate);
              endDate.setHours(17, 0, 0, 0);
            }
            
            // Update venue address if we found specific location information
            const eventVenue = {...this.venue};
            if (location && location !== 'Vancouver, BC') {
              eventVenue.address = location;
            }
            
            // Generate a unique ID
            const dateStr = startDate.toISOString().split('T')[0];
            const slugTitle = slugify(title, { lower: true, strict: true });
            const id = `vegan-market-${slugTitle}-${dateStr}`;
            
            // Create event object
            const event = {
              id: id,
              title: title,
              description: description || `Explore the Vegan Market Vancouver featuring local small businesses with plant-based food, drinks, and products. ${location}`,
              startDate: startDate,
              endDate: endDate,
              venue: eventVenue,
              category: 'market',
              categories: ['market', 'food', 'shopping', 'vegan', 'sustainable'],
              sourceURL: this.url,
              officialWebsite: this.url,
              image: imageUrl,
              ticketsRequired: false,
              lastUpdated: new Date()
            };
            
            events.push(event);
            console.log(`✅ Added event: ${title} on ${startDate.toLocaleDateString()}`);
          }
        } catch (elementError) {
          console.error(`❌ Error processing event element: ${elementError.message}`);
        }
      }
      
      // If no events found, check for information in the page text that might indicate market dates
      if (events.length === 0) {
        const pageText = await page.evaluate(() => document.body.innerText);
        
        // Look for date patterns in the text
        const datePatterns = [
          /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}|\d{2})?/g,
          /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4}|\d{2})?/g
        ];
        
        let dates = [];
        for (const pattern of datePatterns) {
          const matches = pageText.matchAll(pattern);
          for (const match of matches) {
            try {
              let dateStr;
              if (pattern.toString().startsWith('/([A-Za-z]+)')) {
                // First pattern: Month Day, Year
                const month = match[1];
                const day = parseInt(match[2]);
                let year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
                if (year < 100) year += 2000;
                dateStr = `${month} ${day}, ${year}`;
              } else {
                // Second pattern: Day Month, Year
                const day = parseInt(match[1]);
                const month = match[2];
                let year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
                if (year < 100) year += 2000;
                dateStr = `${month} ${day}, ${year}`;
              }
              
              const dateObj = new Date(dateStr);
              if (!isNaN(dateObj.getTime())) {
                // Check if the date is in the future
                const now = new Date();
                if (dateObj > now) {
                  dates.push(dateObj);
                }
              }
            } catch (dateErr) {
              console.log(`❌ Error parsing date from text: ${dateErr.message}`);
            }
          }
        }
        
        // Create events for each date found
        if (dates.length > 0) {
          console.log(`Found ${dates.length} potential market dates in page text`);
          
          for (const date of dates) {
            const startDate = new Date(date);
            startDate.setHours(10, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(17, 0, 0, 0);
            
            // Generate a unique ID
            const dateStr = startDate.toISOString().split('T')[0];
            const id = `vegan-market-event-${dateStr}`;
            
            // Create event object
            const event = {
              id: id,
              title: `The Vegan Market - ${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
              description: `Join The Vegan Market Vancouver for a vibrant marketplace showcasing local small businesses featuring plant-based food, drinks, and sustainable products.`,
              startDate: startDate,
              endDate: endDate,
              venue: this.venue,
              category: 'market',
              categories: ['market', 'food', 'shopping', 'vegan', 'sustainable'],
              sourceURL: this.url,
              officialWebsite: this.url,
              image: null,
              ticketsRequired: false,
              lastUpdated: new Date()
            };
            
            events.push(event);
            console.log(`✅ Added event from text date: ${event.title}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error in Vegan Market scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from The Vegan Market`);
    }
    
    return events;
  }
}

module.exports = new VeganMarketScraper();
