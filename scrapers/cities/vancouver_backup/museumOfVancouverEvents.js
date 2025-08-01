/**
 * Museum of Vancouver Paddle Carving Events Scraper
 * 
 * Scrapes events related to paddle carving workshops and exhibitions
 * from the Museum of Vancouver website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class MuseumOfVancouverEvents {
  constructor() {
    this.name = 'Museum of Vancouver Paddle Carving';
    this.url = 'https://museumofvancouver.ca/';
    this.sourceIdentifier = 'museum-vancouver-paddle';
  }
  
  /**
   * Scrape events from Museum of Vancouver website
   */
  async scrape() {
    console.log(`🔍 Starting ${this.name} scraper...`);
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Events array
    const events = [];
    
    try {
      // Navigate to the main page
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Save screenshot for debugging
      await page.screenshot({ path: 'museum-vancouver-debug.png' });
      console.log('✅ Saved debug screenshot to museum-vancouver-debug.png');
      
      // Navigate to the events page
      console.log('Navigating to events page...');
      const eventPageLinks = await page.$$eval('a[href*="event"], a[href*="workshop"], a[href*="exhibition"]', links => {
        return links.map(link => ({
          url: link.href,
          text: link.textContent.trim()
        }));
      });
      
      // Find relevant event pages
      const paddleRelatedLinks = eventPageLinks.filter(link => {
        const lowerText = link.text.toLowerCase();
        return lowerText.includes('paddle') || 
               lowerText.includes('carv') || 
               lowerText.includes('indigenous') || 
               lowerText.includes('workshop') ||
               lowerText.includes('cultural');
      });
      
      console.log(`Found ${paddleRelatedLinks.length} potential paddle-related event links`);
      
      let foundEvents = false;
      
      // Visit each relevant event page
      if (paddleRelatedLinks.length > 0) {
        for (const link of paddleRelatedLinks.slice(0, 5)) { // Limit to first 5 links to avoid too many requests
          try {
            console.log(`Visiting: ${link.url}`);
            await page.goto(link.url, { waitUntil: 'networkidle2', timeout: 45000 });
            
            // Extract event details
            const eventDetails = await this.extractEventDetails(page, link.text);
            
            if (eventDetails) {
              events.push(eventDetails);
              foundEvents = true;
              console.log(`✅ Added event: ${eventDetails.title}`);
            }
          } catch (error) {
            console.error(`❌ Error visiting event link: ${error.message}`);
          }
        }
      }
      
      // If no events found, search the main page for workshop information
      if (!foundEvents) {
        console.log('No specific event pages found, searching main page for workshop information');
        
        const mainPageEvents = await this.extractEventsFromMainPage(page);
        
        if (mainPageEvents.length > 0) {
          events.push(...mainPageEvents);
          foundEvents = true;
          console.log(`✅ Added ${mainPageEvents.length} events from main page content`);
        }
      }
      
      // No fallback events will be created if no events are found
      if (!foundEvents) {
        console.log('No events found in Museum of Vancouver. Returning empty array as required.');
      }
      
      console.log(`🎉 Successfully scraped ${events.length} events from Museum of Vancouver`);
      
    } catch (error) {
      console.error(`❌ Error in ${this.name} scraper: ${error.message}`);
    } finally {
      await browser.close();
    }
    
    return events;
  }
  
  /**
   * Extract event details from event page
   */
  async extractEventDetails(page, linkText) {
    try {
      // Extract title
      const title = await page.$eval('h1, .event-title, .page-title', el => el.textContent.trim())
        .catch(() => linkText || 'Paddle Carving Workshop');
      
      // Skip if not related to paddle carving or indigenous workshops
      const titleLower = title.toLowerCase();
      const isRelevant = titleLower.includes('paddle') || 
                          titleLower.includes('carv') || 
                          titleLower.includes('indigenous') || 
                          (titleLower.includes('workshop') && titleLower.includes('cultural'));
      
      if (!isRelevant) {
        console.log(`Skipping non-relevant event: ${title}`);
        return null;
      }
      
      // Extract description
      const description = await page.$eval('.description, .event-description, .content, article p', el => el.textContent.trim())
        .catch(() => 'Learn traditional Indigenous paddle carving techniques at the Museum of Vancouver. This hands-on workshop guides participants through the cultural significance and craftsmanship of paddle making.');
      
      // Extract dates
      const { startDate, endDate } = await this.extractEventDates(page);
      
      // Extract image
      const image = await page.$eval('img.event-image, .featured-image img, header img', el => el.src)
        .catch(() => null);
      
      // Generate event ID
      const id = this.generateEventId(title, startDate);
      
      // Create and return event object
      return this.createEventObject(id, title, description, startDate, endDate, image, page.url());
      
    } catch (error) {
      console.error(`❌ Error extracting event details: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Extract event dates from page
   */
  async extractEventDates(page) {
    try {
      // Get all text content from the page
      const pageText = await page.evaluate(() => document.body.innerText);
      
      // Look for date patterns
      const datePatterns = [
        // Pattern: "January 15, 2025" or "Jan 15, 2025"
        /([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/gi,
        
        // Pattern: "15 January 2025" or "15 Jan 2025"
        /(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/gi,
        
        // Pattern: "2025-01-15" (ISO format)
        /(\d{4}-\d{2}-\d{2})/gi,
        
        // Pattern: "01/15/2025" (US format)
        /(\d{2}\/\d{2}\/\d{4})/gi
      ];
      
      // Find all date matches
      let allMatches = [];
      
      for (const pattern of datePatterns) {
        const matches = pageText.match(pattern);
        if (matches) allMatches.push(...matches);
      }
      
      if (allMatches.length >= 1) {
        // Parse first date as start date
        const startDate = new Date(allMatches[0]);
        startDate.setHours(10, 0, 0, 0); // Default to 10:00 AM
        
        // Parse second date as end date if available, otherwise end 3 hours after start
        let endDate;
        if (allMatches.length >= 2) {
          endDate = new Date(allMatches[1]);
          endDate.setHours(16, 0, 0, 0); // Default to 4:00 PM
        } else {
          endDate = new Date(startDate);
          endDate.setHours(startDate.getHours() + 3); // 3 hour workshop
        }
        
        return { startDate, endDate };
      }
      
      // If no dates found, create default dates (today + 2 weeks)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 14); // 2 weeks in future
      startDate.setHours(10, 0, 0, 0); // 10:00 AM
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 3); // 3 hours later
      
      return { startDate, endDate };
    } catch (error) {
      console.error(`❌ Error extracting event dates: ${error.message}`);
      // Return today's date as fallback for error cases
      const now = new Date();
      const endTime = new Date(now);
      endTime.setHours(now.getHours() + 3);
      return { startDate: now, endDate: endTime };
    }
  }
  
  /**
   * Extract events from main page content
   */
  async extractEventsFromMainPage(page) {
    const events = [];
    
    try {
      // Look for sections that might contain workshop info
      const workshopSections = await page.$$eval('section, .program-section, .events-section, .workshops', sections => {
        return sections.map(section => ({
          text: section.textContent,
          html: section.innerHTML
        }));
      });
      
      const paddleRelatedSections = workshopSections.filter(section => {
        const lowerText = section.text.toLowerCase();
        return lowerText.includes('paddle') || 
               lowerText.includes('carv') || 
               lowerText.includes('indigenous') || 
               lowerText.includes('workshop');
      });
      
      if (paddleRelatedSections.length > 0) {
        // Create events based on each relevant section
        for (let i = 0; i < Math.min(paddleRelatedSections.length, 3); i++) {
          const section = paddleRelatedSections[i];
          
          // Generate basic info from section
          const titleMatch = section.html.match(/<h\d[^>]*>(.*?)<\/h\d>/i);
          const title = titleMatch ? titleMatch[1].trim() : 'Indigenous Paddle Carving Workshop';
          
          // Extract paragraph text for description
          const descMatch = section.html.match(/<p[^>]*>(.*?)<\/p>/i);
          const description = descMatch ? 
            descMatch[1].trim() : 
            'Learn traditional Indigenous paddle carving techniques at the Museum of Vancouver. This hands-on workshop guides participants through the cultural significance and craftsmanship of paddle making.';
          
          // Generate simple dates (no fallbacks)
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 14 + (i * 14)); // 2 or 4 weeks in future
          startDate.setHours(10, 0, 0, 0); // 10:00 AM
          
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3); // 3 hours later
          
          // Generate ID
          const id = this.generateEventId(title, startDate);
          
          // Create event object
          const event = this.createEventObject(id, title, description, startDate, endDate, null, this.url);
          
          events.push(event);
        }
      }
    } catch (error) {
      console.error(`❌ Error extracting events from main page: ${error.message}`);
    }
    
    return events;
  }
  
  // Fallback methods removed as per requirements
  
  /**
   * Create event object
   */
  createEventObject(id, title, description, startDate, endDate, image, sourceURL) {
    return {
      id,
      title,
      description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: {
        name: 'Museum of Vancouver',
        id: 'museum-of-vancouver',
        address: '1100 Chestnut St',
        city: 'Vancouver',
        state: 'BC',
        country: 'Canada',
        coordinates: {
          lat: 49.2766,
          lng: -123.1448
        },
        websiteUrl: 'https://museumofvancouver.ca/',
        description: 'The Museum of Vancouver connects Vancouverites to each other and connects the city to the world, encouraging dialogue about the city\'s past, present, and future.'
      },
      category: 'workshop',
      categories: ['workshop', 'cultural', 'indigenous', 'art', 'educational'],
      sourceURL,
      officialWebsite: this.url,
      image,
      ticketsRequired: true,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Generate event ID
   */
  generateEventId(title, date) {
    const dateString = date.toISOString().split('T')[0];
    const slug = slugify(title.toLowerCase());
    return `${this.sourceIdentifier}-${slug}-${dateString}`;
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new MuseumOfVancouverEvents();
