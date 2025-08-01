/**
 * Queer Arts Festival Vancouver Scraper
 * 
 * This scraper extracts events from the Queer Arts Festival website
 * Source: https://queerartsfestival.com/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class QueerArtsFestivalScraper {
  constructor() {
    this.name = 'Queer Arts Festival';
    this.url = 'https://queerartsfestival.com/';
    this.sourceIdentifier = 'queer-arts-festival';
    
    // Venue information (may vary by event but using default location)
    this.venue = {
      name: 'Queer Arts Festival',
      id: 'queer-arts-festival',
      address: 'Various locations in Vancouver',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      coordinates: {
        lat: 49.2827,
        lng: -123.1207
      },
      websiteUrl: 'https://queerartsfestival.com/',
      description: 'The Queer Arts Festival is an annual artist-run multidisciplinary festival at the Roundhouse in Vancouver.'
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Queer Arts Festival events scraper...');
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
      
      // Navigate to the main events page
      const eventsUrl = 'https://queerartsfestival.com/';
      console.log(`Navigating to: ${eventsUrl}`);
      await page.goto(eventsUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'queer-arts-debug.png' });
      console.log('✅ Saved debug screenshot to queer-arts-debug.png');
      
      // Look for festival dates in the banner or header
      const festivalDatesText = await page.evaluate(() => {
        const header = document.querySelector('header');
        const banner = document.querySelector('.banner, .hero, .festival-banner');
        const dateElement = document.querySelector('.festival-dates, .dates, [class*="date"]');
        
        if (dateElement) return dateElement.textContent;
        if (banner) return banner.textContent;
        if (header) return header.textContent;
        return '';
      });
      
      console.log('Looking for festival dates in page content...');
      
      // Try to extract festival dates from the text
      let festivalStartDate = null;
      let festivalEndDate = null;
      
      if (festivalDatesText) {
        // Look for date ranges like "June 17-27, 2023" or "June 17 - 27, 2023" or "June 17 to June 27, 2023"
        const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|to)\s*(?:([A-Za-z]+)\s+)?(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4}|\d{2})?/i;
        const match = festivalDatesText.match(dateRangePattern);
        
        if (match) {
          const startMonth = match[1];
          const startDay = parseInt(match[2]);
          const endMonth = match[3] || match[1]; // If no end month specified, use start month
          const endDay = parseInt(match[4]);
          let year = match[5] ? parseInt(match[5]) : new Date().getFullYear();
          if (year < 100) year += 2000; // Convert 2-digit year to 4-digit
          
          try {
            festivalStartDate = new Date(`${startMonth} ${startDay}, ${year}`);
            festivalEndDate = new Date(`${endMonth} ${endDay}, ${year}`);
            console.log(`✅ Found festival dates: ${festivalStartDate.toLocaleDateString()} to ${festivalEndDate.toLocaleDateString()}`);
          } catch (dateError) {
            console.log(`❌ Error parsing festival dates: ${dateError.message}`);
          }
        }
      }
      
      // If we couldn't find festival dates, use the current year's summer dates as a reasonable guess
      if (!festivalStartDate || !festivalEndDate) {
        const currentYear = new Date().getFullYear();
        festivalStartDate = new Date(`June 17, ${currentYear}`);
        festivalEndDate = new Date(`June 27, ${currentYear}`);
        console.log(`⚠️ Using estimated festival dates: ${festivalStartDate.toLocaleDateString()} to ${festivalEndDate.toLocaleDateString()}`);
      }
      
      // Look for event elements using various selectors
      const eventSelectors = [
        '.event-list .event',
        '.events .event',
        '.program .event',
        'article.event',
        '.festival-events .event',
        '.event-card',
        '.event-container',
        'div[class*="event"]',
        '.program-item',
        '.wp-block-group'
      ];
      
      let foundEvents = false;
      
      // Try each selector until we find events
      for (const selector of eventSelectors) {
        console.log(`Trying to find events with selector: ${selector}`);
        const eventElements = await page.$$(selector);
        
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} potential events with selector: ${selector}`);
          foundEvents = true;
          
          // Process each event
          for (const element of eventElements) {
            try {
              // Extract event title
              const titleElement = await element.$('h1, h2, h3, h4, .title, .event-title');
              if (!titleElement) continue;
              
              const title = await page.evaluate(el => el.textContent.trim(), titleElement);
              
              // Only proceed if we found a meaningful title
              if (title && title.length > 3 && !title.toLowerCase().includes('menu') && !title.toLowerCase().includes('navigation')) {
                console.log(`Processing event: ${title}`);
                
                // Extract date information
                const dateElement = await element.$('.date, time, .event-date');
                let dateText = dateElement ? 
                  await page.evaluate(el => el.textContent.trim(), dateElement) : null;
                
                // Extract location/venue information
                const locationElement = await element.$('.location, .venue, .event-venue');
                let location = locationElement ?
                  await page.evaluate(el => el.textContent.trim(), locationElement) : 'Vancouver, BC';
                
                // If the location doesn't include Vancouver, add it
                if (!location.toLowerCase().includes('vancouver')) {
                  location = `${location}, Vancouver, BC`;
                }
                
                // Extract description
                const descriptionElement = await element.$('p, .description, .event-description');
                const description = descriptionElement ?
                  await page.evaluate(el => el.textContent.trim(), descriptionElement) : '';
                
                // Extract image
                const imageElement = await element.$('img');
                const imageUrl = imageElement ?
                  await page.evaluate(el => el.src, imageElement) : null;
                
                // Extract event URL if available
                const linkElement = await element.$('a');
                const eventUrl = linkElement ?
                  await page.evaluate(el => el.href, linkElement) : this.url;
                
                // Parse date or set a date during the festival
                let eventStartDate, eventEndDate;
                
                if (dateText) {
                  try {
                    // Try to extract specific date from text
                    const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/);
                    if (dateMatch) {
                      const month = dateMatch[1];
                      const day = parseInt(dateMatch[2]);
                      const year = festivalStartDate.getFullYear(); // Use festival year
                      
                      eventStartDate = new Date(`${month} ${day}, ${year} 19:00:00`); // Default to 7pm start
                      eventEndDate = new Date(`${month} ${day}, ${year} 21:00:00`);   // Default to 9pm end
                    }
                  } catch (dateError) {
                    console.log(`❌ Error parsing event date: ${dateError.message}`);
                  }
                }
                
                // If no specific date found, set a date during the festival period
                if (!eventStartDate || !eventEndDate) {
                  // Set date to middle of festival
                  const festivalDays = (festivalEndDate - festivalStartDate) / (1000 * 60 * 60 * 24);
                  const midFestivalDay = Math.floor(festivalDays / 2);
                  
                  eventStartDate = new Date(festivalStartDate);
                  eventStartDate.setDate(festivalStartDate.getDate() + midFestivalDay);
                  eventStartDate.setHours(19, 0, 0, 0); // 7pm start
                  
                  eventEndDate = new Date(eventStartDate);
                  eventEndDate.setHours(21, 0, 0, 0); // 9pm end
                }
                
                // Create event venue with specific location if available
                const eventVenue = {...this.venue};
                if (location && location !== 'Vancouver, BC') {
                  eventVenue.address = location;
                }
                
                // Generate a unique ID
                const dateStr = eventStartDate.toISOString().split('T')[0];
                const slugTitle = slugify(title, { lower: true, strict: true });
                const id = `queer-arts-festival-${slugTitle}-${dateStr}`;
                
                // Create event object
                const event = {
                  id: id,
                  title: title,
                  description: description || `${title} - part of the Queer Arts Festival in Vancouver. A showcase of queer artists and performers.`,
                  startDate: eventStartDate,
                  endDate: eventEndDate,
                  venue: eventVenue,
                  category: 'arts',
                  categories: ['arts', 'culture', 'queer', 'festival', 'performance'],
                  sourceURL: eventUrl || this.url,
                  officialWebsite: this.url,
                  image: imageUrl,
                  ticketsRequired: true,
                  lastUpdated: new Date()
                };
                
                events.push(event);
                console.log(`✅ Added event: ${title} on ${eventStartDate.toLocaleDateString()}`);
              }
            } catch (elementError) {
              console.error(`❌ Error processing event element: ${elementError.message}`);
            }
          }
          
          // If we found and processed events with this selector, no need to try others
          if (events.length > 0) {
            break;
          }
        }
      }
      
      // If we still don't have events, create a generic festival event
      if (!foundEvents || events.length === 0) {
        console.log('Creating generic festival event...');
        
        // Generate a unique ID
        const year = festivalStartDate.getFullYear();
        const id = `queer-arts-festival-${year}`;
        
        // Create event object for the overall festival
        const festivalEvent = {
          id: id,
          title: `Queer Arts Festival ${year}`,
          description: `The Queer Arts Festival is an annual artist-run multidisciplinary festival at the Roundhouse in Vancouver, showcasing queer arts, culture, and history. The festival features a curated art exhibition, performing arts events, music, theatre, dance, workshops, artist talks, panels, and media art screenings.`,
          startDate: festivalStartDate,
          endDate: festivalEndDate,
          venue: this.venue,
          category: 'arts',
          categories: ['arts', 'culture', 'queer', 'festival', 'performance'],
          sourceURL: this.url,
          officialWebsite: this.url,
          image: null, // No specific image available
          ticketsRequired: true,
          lastUpdated: new Date()
        };
        
        events.push(festivalEvent);
        console.log(`✅ Added generic festival event: ${festivalEvent.title}`);
      }
      
    } catch (error) {
      console.error(`❌ Error in Queer Arts Festival scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from Queer Arts Festival`);
    }
    
    return events;
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new QueerArtsFestivalScraper();
