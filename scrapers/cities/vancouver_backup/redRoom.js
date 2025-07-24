/**
 * Red Room Vancouver Scraper
 * 
 * This scraper extracts events from Red Room Vancouver
 * Source: https://redroomvancouver.com/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class RedRoomScraper {
  constructor() {
    this.name = 'Red Room';
    this.url = 'https://redroomvancouver.com/';
    this.sourceIdentifier = 'red-room-vancouver';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Red Room',
      id: 'red-room-vancouver',
      address: '398 Richards St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6B 2Z3',
      coordinates: {
        lat: 49.2839,
        lng: -123.1126
      },
      websiteUrl: 'https://redroomvancouver.com/',
      description: 'The Red Room is an underground nightclub and music venue in downtown Vancouver known for its intimate atmosphere, powerful sound system, and diverse programming.'
    };
  }

  /**
   * Generate a unique ID based on event title and date
   * @param {string} title - Event title
   * @param {Date} date - Event date object
   * @returns {string} - Formatted ID
   */
  generateEventId(title, date) {
    const safeTitleSlug = slugify(title, { lower: true, strict: true });
    const datePart = date instanceof Date ? date.toISOString().split('T')[0] : 'unknown-date';
    return `red-room-${safeTitleSlug}-${datePart}`;
  }

  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Red Room events scraper...');
    const events = [];
    let browser = null;

    try {
      // Launch browser with SSL error handling
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
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Go to events page
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // For debugging, take a screenshot
      await page.screenshot({ path: 'redroom-debug.png' });
      
      // Find the events section
      const eventElements = await page.$$('.event-list .event-item, .upcoming-events .event, .content-section article.event');
      
      console.log(`Found ${eventElements.length} event elements on the page`);
      
      // Process each event
      for (const eventElement of eventElements) {
        try {
          // Extract basic event info
          const titleElement = await eventElement.$('h2, .event-title, .title');
          const title = titleElement ? await page.evaluate(el => el.textContent.trim(), titleElement) : 'Untitled Event';
          
          // Extract date info
          const dateElement = await eventElement.$('.event-date, .date, time');
          let dateText = dateElement ? await page.evaluate(el => el.textContent.trim(), dateElement) : '';
          let dateObj = null;
          
          // Try to parse the date from text
          if (dateText) {
            try {
              // Handle common date formats
              const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
              if (dateMatch) {
                const monthName = dateMatch[1];
                const day = parseInt(dateMatch[2]);
                const year = parseInt(dateMatch[3]);
                
                const months = {
                  'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
                  'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
                  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7,
                  'sep': 8, 'sept': 8, 'oct': 9, 'nov': 10, 'dec': 11
                };
                
                const monthIndex = months[monthName.toLowerCase()];
                if (monthIndex !== undefined) {
                  dateObj = new Date(year, monthIndex, day);
                  // Default event time to 9 PM if not specified
                  dateObj.setHours(21, 0, 0, 0);
                }
              }
              
              // If the above didn't work, try another common format
              if (!dateObj) {
                const altMatch = dateText.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
                if (altMatch) {
                  // Note: This assumes month/day/year format
                  const month = parseInt(altMatch[1]) - 1;
                  const day = parseInt(altMatch[2]);
                  const year = parseInt(altMatch[3]);
                  dateObj = new Date(year, month, day, 21, 0, 0, 0); // Default to 9 PM
                }
              }
            } catch (dateError) {
              console.error(`Error parsing date "${dateText}": ${dateError.message}`);
            }
          }
          
          // If we couldn't parse the date, use current date + 30 days as a fallback
          if (!dateObj) {
            dateObj = new Date();
            dateObj.setDate(dateObj.getDate() + 30);
            dateObj.setHours(21, 0, 0, 0); // Default to 9 PM
            console.log(`⚠️ Using fallback date for event "${title}"`);
          }
          
          // Create end date (3 hours after start)
          const endDate = new Date(dateObj);
          endDate.setHours(endDate.getHours() + 3);
          
          // Try to get the description
          const descElement = await eventElement.$('.event-description, .description, .content');
          let description = descElement ? 
            await page.evaluate(el => el.textContent.trim(), descElement) : 
            `Check out ${title} at Red Room Vancouver. Visit the website for more details.`;
          
          // Try to get the event URL
          const linkElement = await eventElement.$('a.event-link, a.more-info, .title a');
          const eventUrl = linkElement ? 
            await page.evaluate(el => el.getAttribute('href'), linkElement) : 
            this.url;
            
          // Make sure URL is absolute
          const fullEventUrl = eventUrl.startsWith('http') ? 
            eventUrl : 
            new URL(eventUrl, this.url).toString();
          
          // Try to get the image
          const imageElement = await eventElement.$('img.event-image, .event-img img, .image img');
          let imageUrl = null;
          if (imageElement) {
            imageUrl = await page.evaluate(el => el.getAttribute('src') || el.getAttribute('data-src'), imageElement);
            // Make absolute URL if needed
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = new URL(imageUrl, this.url).toString();
            }
          }
          
          // Determine event categories
          const categories = ['nightlife', 'music', 'entertainment'];
          const titleLower = title.toLowerCase();
          
          if (titleLower.includes('dj') || titleLower.includes('electronic') || titleLower.includes('edm')) {
            categories.push('electronic', 'dj');
          }
          
          if (titleLower.includes('hip hop') || titleLower.includes('hip-hop') || titleLower.includes('rap')) {
            categories.push('hip-hop', 'rap');
          }
          
          if (titleLower.includes('rock') || titleLower.includes('band') || titleLower.includes('live')) {
            categories.push('rock', 'live music');
          }
          
          // Generate unique ID for the event
          const eventId = this.generateEventId(title, dateObj);
          
          // Create the event object
          const event = {
            id: eventId,
            title: title,
            description: description,
            startDate: dateObj,
            endDate: endDate,
            venue: this.venue,
            category: 'nightlife', // Primary category
            categories: categories, // All applicable categories
            sourceURL: this.url,
            officialWebsite: fullEventUrl,
            image: imageUrl,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${title} on ${dateObj.toLocaleDateString()}`);
          
        } catch (eventError) {
          console.error(`Error extracting event details: ${eventError.message}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error in Red Room scraper: ${error.message}`);
    } finally {
      // Close browser
      if (browser) {
        await browser.close();
      }
    }
    
    console.log(`🎉 Successfully scraped ${events.length} events from Red Room Vancouver`);
    return events;
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new RedRoomScraper();
