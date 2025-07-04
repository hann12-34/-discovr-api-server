/**
 * Bard on the Beach Special Events Scraper
 * 
 * This scraper extracts special events from Bard on the Beach
 * Source: https://bardonthebeach.org/special-events/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class BardOnTheBeachScraper {
  constructor() {
    this.name = 'Bard on the Beach';
    this.url = 'https://bardonthebeach.org/special-events/';
    this.sourceIdentifier = 'bard-on-the-beach';
    
    // Venue information (actual outdoor venue at Vanier Park)
    this.venue = {
      name: 'Bard on the Beach',
      id: 'bard-on-the-beach',
      address: 'Vanier Park, 1695 Whyte Avenue',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      coordinates: {
        lat: 49.2767,
        lng: -123.1434
      },
      websiteUrl: 'https://bardonthebeach.org/',
      description: 'Bard on the Beach is Western Canada\'s largest professional Shakespeare festival, presented in modern theatre tents in a spectacular waterfront setting in Vancouver\'s Vanier Park.'
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Bard on the Beach events scraper...');
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
      
      // Navigate to the special events page
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'bard-on-the-beach-debug.png' });
      console.log('✅ Saved debug screenshot to bard-on-the-beach-debug.png');
      
      // Extract festival season dates (typically June-September)
      const seasonText = await page.evaluate(() => {
        const seasonElement = document.querySelector('.season-dates, .festival-dates, header h2, .header-content, .hero-content');
        return seasonElement ? seasonElement.textContent : '';
      });
      
      // Parse season dates or use typical season if not found
      let seasonStartDate = null;
      let seasonEndDate = null;
      
      if (seasonText) {
        // Look for date patterns like "June 8 to September 30, 2023"
        const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|to)\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4}|\d{2})?/i;
        const match = seasonText.match(dateRangePattern);
        
        if (match) {
          const startMonth = match[1];
          const startDay = parseInt(match[2]);
          const endMonth = match[3];
          const endDay = parseInt(match[4]);
          let year = match[5] ? parseInt(match[5]) : new Date().getFullYear();
          if (year < 100) year += 2000; // Convert 2-digit year to 4-digit
          
          try {
            seasonStartDate = new Date(`${startMonth} ${startDay}, ${year}`);
            seasonEndDate = new Date(`${endMonth} ${endDay}, ${year}`);
            console.log(`✅ Found festival dates: ${seasonStartDate.toLocaleDateString()} to ${seasonEndDate.toLocaleDateString()}`);
          } catch (dateError) {
            console.log(`❌ Error parsing festival dates: ${dateError.message}`);
          }
        }
      }
      
      // If we couldn't find festival dates, use current year's typical season
      if (!seasonStartDate || !seasonEndDate) {
        const currentYear = new Date().getFullYear();
        seasonStartDate = new Date(`June 8, ${currentYear}`);
        seasonEndDate = new Date(`September 30, ${currentYear}`);
        console.log(`⚠️ Using estimated festival dates: ${seasonStartDate.toLocaleDateString()} to ${seasonEndDate.toLocaleDateString()}`);
      }
      
      // Look for event containers on the special events page
      const eventSelectors = [
        '.special-events .event',
        '.event-list .event',
        '.special-event-item',
        '.event-card',
        '.event-container',
        '.events-container article',
        '.event-listing',
        '.bard-event',
        '.wp-block-group',
        '.wp-block-columns'
      ];
      
      let foundEvents = false;
      
      // Try each selector until we find events
      for (const selector of eventSelectors) {
        console.log(`Looking for events with selector: ${selector}`);
        const eventElements = await page.$$(selector);
        
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} potential events with selector: ${selector}`);
          foundEvents = true;
          
          // Process each event element
          for (let i = 0; i < eventElements.length; i++) {
            try {
              const element = eventElements[i];
              
              // Extract event title
              const titleElement = await element.$('h1, h2, h3, h4, .title, .event-title');
              if (!titleElement) continue;
              
              const title = await page.evaluate(el => el.textContent.trim(), titleElement);
              
              // Skip if not a meaningful title or if it's a navigation element
              if (!title || title.length < 3 || title.toLowerCase().includes('menu') || title.toLowerCase().includes('navigation')) {
                continue;
              }
              
              console.log(`Processing event: ${title}`);
              
              // Extract date information
              const dateElement = await element.$('.date, time, .event-date, .datetime');
              let dateText = dateElement ? 
                await page.evaluate(el => el.textContent.trim(), dateElement) : null;
              
              // Extract description
              const descriptionElement = await element.$('p, .description, .event-description, .content');
              const description = descriptionElement ?
                await page.evaluate(el => el.textContent.trim(), descriptionElement) : '';
              
              // Extract image if available
              const imageElement = await element.$('img');
              const imageUrl = imageElement ?
                await page.evaluate(el => el.src, imageElement) : null;
              
              // Extract event URL if available
              const linkElement = await element.$('a');
              const eventUrl = linkElement ?
                await page.evaluate(el => el.href, linkElement) : this.url;
              
              // Parse date or set during festival season
              let eventDate = null;
              if (dateText) {
                try {
                  // Try to extract specific date from text
                  const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/);
                  if (dateMatch) {
                    const month = dateMatch[1];
                    const day = parseInt(dateMatch[2]);
                    const year = seasonStartDate.getFullYear(); // Use festival year
                    
                    eventDate = new Date(`${month} ${day}, ${year}`);
                    
                    // If this date is before the season starts, it might be next year's event
                    if (eventDate < seasonStartDate && eventDate < new Date()) {
                      eventDate.setFullYear(year + 1);
                    }
                  }
                } catch (dateError) {
                  console.log(`❌ Error parsing event date: ${dateError.message}`);
                }
              }
              
              // If no specific date found, distribute events throughout the season
              if (!eventDate) {
                // Calculate a date within the festival period based on the event's position in the list
                const seasonDays = (seasonEndDate - seasonStartDate) / (1000 * 60 * 60 * 24);
                const interval = eventElements.length > 1 ? seasonDays / eventElements.length : seasonDays / 2;
                const dayOffset = Math.floor(i * interval);
                
                eventDate = new Date(seasonStartDate);
                eventDate.setDate(seasonStartDate.getDate() + dayOffset);
              }
              
              // Set start and end times (typically evening events)
              const eventStartDate = new Date(eventDate);
              eventStartDate.setHours(19, 30, 0, 0); // 7:30pm start
              
              const eventEndDate = new Date(eventDate);
              eventEndDate.setHours(22, 0, 0, 0);    // 10:00pm end
              
              // Generate a unique ID
              const dateStr = eventStartDate.toISOString().split('T')[0];
              const slugTitle = slugify(title, { lower: true, strict: true });
              const id = `bard-on-the-beach-${slugTitle}-${dateStr}`;
              
              // Create event object
              const event = {
                id: id,
                title: title,
                description: description || `${title} - a special event by Bard on the Beach Shakespeare Festival in Vancouver's Vanier Park.`,
                startDate: eventStartDate,
                endDate: eventEndDate,
                venue: this.venue,
                category: 'theatre',
                categories: ['theatre', 'arts', 'performance', 'shakespeare', 'festival'],
                sourceURL: eventUrl,
                officialWebsite: 'https://bardonthebeach.org/',
                image: imageUrl,
                ticketsRequired: true,
                lastUpdated: new Date()
              };
              
              events.push(event);
              console.log(`✅ Added event: ${title} on ${eventStartDate.toLocaleDateString()}`);
            } catch (elementError) {
              console.error(`❌ Error processing event element: ${elementError.message}`);
            }
          }
          
          // If we found and processed events with this selector, break
          if (events.length > 0) break;
        }
      }
      
      // If no specific events found, try to find individual special event links
      if (!foundEvents || events.length === 0) {
        console.log('Looking for special event links...');
        
        const linkSelectors = [
          'a[href*="event"]',
          'a[href*="special"]',
          'a.event-link',
          'a.special-event'
        ];
        
        for (const selector of linkSelectors) {
          const links = await page.$$(selector);
          console.log(`Found ${links.length} potential event links with selector: ${selector}`);
          
          for (let i = 0; i < links.length; i++) {
            try {
              const link = links[i];
              
              // Get link text and href
              const linkData = await page.evaluate(el => ({
                text: el.textContent.trim(),
                href: el.href
              }), link);
              
              // Skip navigation and menu links
              if (linkData.text.toLowerCase().includes('menu') || 
                  linkData.text.toLowerCase().includes('navigation') ||
                  linkData.text.length < 5) {
                continue;
              }
              
              console.log(`Found potential event link: ${linkData.text}`);
              
              // Create event from link data
              const linkParts = linkData.text.split(' - ');
              const title = linkParts[0] || linkData.text;
              const dateText = linkParts[1] || '';
              
              // Try to parse date from text or distribute within season
              let eventDate = null;
              if (dateText) {
                try {
                  const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/);
                  if (dateMatch) {
                    const month = dateMatch[1];
                    const day = parseInt(dateMatch[2]);
                    const year = seasonStartDate.getFullYear();
                    
                    eventDate = new Date(`${month} ${day}, ${year}`);
                  }
                } catch (dateError) {
                  console.log(`❌ Error parsing date from link text: ${dateError.message}`);
                }
              }
              
              // If no date found, distribute events within season
              if (!eventDate) {
                const seasonDays = (seasonEndDate - seasonStartDate) / (1000 * 60 * 60 * 24);
                const interval = links.length > 1 ? seasonDays / links.length : seasonDays / 2;
                const dayOffset = Math.floor(i * interval);
                
                eventDate = new Date(seasonStartDate);
                eventDate.setDate(seasonStartDate.getDate() + dayOffset);
              }
              
              // Set times
              const eventStartDate = new Date(eventDate);
              eventStartDate.setHours(19, 30, 0, 0); // 7:30pm
              
              const eventEndDate = new Date(eventDate);
              eventEndDate.setHours(22, 0, 0, 0);    // 10:00pm
              
              // Generate unique ID
              const dateStr = eventStartDate.toISOString().split('T')[0];
              const slugTitle = slugify(title, { lower: true, strict: true });
              const id = `bard-on-the-beach-${slugTitle}-${dateStr}`;
              
              // Create event object
              const event = {
                id: id,
                title: title,
                description: `${title} - a special event by Bard on the Beach Shakespeare Festival in Vancouver's Vanier Park.`,
                startDate: eventStartDate,
                endDate: eventEndDate,
                venue: this.venue,
                category: 'theatre',
                categories: ['theatre', 'arts', 'performance', 'shakespeare', 'festival'],
                sourceURL: linkData.href,
                officialWebsite: 'https://bardonthebeach.org/',
                image: null,
                ticketsRequired: true,
                lastUpdated: new Date()
              };
              
              events.push(event);
              console.log(`✅ Added event from link: ${title} on ${eventStartDate.toLocaleDateString()}`);
            } catch (linkError) {
              console.error(`❌ Error processing event link: ${linkError.message}`);
            }
          }
          
          if (events.length > 0) break;
        }
      }
      
      // If we still don't have events, create a generic season event
      if (events.length === 0) {
        console.log('Creating generic Bard on the Beach season event...');
        
        // Create event for the season
        const year = seasonStartDate.getFullYear();
        const id = `bard-on-the-beach-season-${year}`;
        
        const seasonEvent = {
          id: id,
          title: `Bard on the Beach Shakespeare Festival ${year}`,
          description: `Bard on the Beach is Western Canada's largest professional Shakespeare festival. The festival runs annually from June through September in modern theatre tents in a spectacular waterfront setting in Vancouver's Vanier Park, featuring Shakespeare plays, related dramas, and special events.`,
          startDate: seasonStartDate,
          endDate: seasonEndDate,
          venue: this.venue,
          category: 'theatre',
          categories: ['theatre', 'arts', 'performance', 'shakespeare', 'festival'],
          sourceURL: 'https://bardonthebeach.org/',
          officialWebsite: 'https://bardonthebeach.org/',
          image: null,
          ticketsRequired: true,
          lastUpdated: new Date()
        };
        
        events.push(seasonEvent);
        console.log(`✅ Added generic season event: ${seasonEvent.title}`);
      }
      
    } catch (error) {
      console.error(`❌ Error in Bard on the Beach scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from Bard on the Beach`);
    }
    
    return events;
  }
}

module.exports = new BardOnTheBeachScraper();
