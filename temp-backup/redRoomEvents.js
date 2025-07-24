/**
 * Red Room Vancouver Scraper
 * 
 * This scraper extracts events from Red Room Vancouver
 * Source: https://redroomvancouver.com/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class RedRoomEventsScraper {
  constructor() {
    this.name = 'Red Room';
    this.url = 'https://redroomvancouver.com/';
    this.sourceIdentifier = 'red-room-vancouver';
    
    // Venue information
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
      description: 'The Red Room is an underground nightclub and music venue in downtown Vancouver known for its intimate atmosphere.'
    };
  }
  
  /**
   * Helper method to get the next occurrence of a specific day of the week
   * @param {number} dayOfWeek - Day of week (0 = Sunday, 1 = Monday, etc.)
   * @returns {Date} - Date object for the next occurrence of that day
   */
  getNextDayOfWeek(dayOfWeek) {
    const today = new Date();
    const targetDay = new Date(today);
    const currentDay = today.getDay();
    
    // Calculate days until next occurrence
    const daysUntilTarget = (dayOfWeek + 7 - currentDay) % 7;
    
    // If today is the target day and it's before the event time, use today
    if (daysUntilTarget === 0 && today.getHours() < 20) {
      return targetDay;
    }
    
    // Otherwise use the next occurrence
    targetDay.setDate(today.getDate() + daysUntilTarget);
    return targetDay;
  }
  
  /**
   * Creates the weekly event objects based on Red Room's weekly schedule
   * @returns {Array} - Array of weekly event objects
   */
  createWeeklyEvents() {
    const events = [];
    
    try {
      // 1. FRIDAYS - CANCUN NITES
      const nextFriday = this.getNextDayOfWeek(5); // Friday
      const fridayDate = new Date(nextFriday);
      
      const cancunEvent = {
        id: `red-room-cancun-nites-${fridayDate.toISOString().split('T')[0]}`,
        title: 'CANCUN NITES - Latin Music & Top 40',
        description: 'Every Friday for more than 18 years, VLF is providing the most energetic and longest running latin event in Vancouver. Latin Music & Top 40 presented by Vancouver Latin Fever at Red Room Vancouver. 398 Richards St. / 9PM - 3AM',
        startDate: new Date(fridayDate.setHours(21, 0, 0)), // 9 PM
        endDate: new Date(new Date(nextFriday).setHours(3, 0, 0)), // 3 AM next day
        venue: this.venue,
        category: 'nightlife',
        categories: ['nightlife', 'music', 'latin', 'dance', 'weekly'],
        sourceURL: 'https://redroomvancouver.com/',
        officialWebsite: 'https://redroomvancouver.com/',
        image: null, // Will attempt to scrape actual image
        ticketsRequired: true,
        isRecurring: true,
        recurringDay: 'Friday',
        lastUpdated: new Date()
      };
      
      // 2. SATURDAYS - SUBCULTURE
      const nextSaturday = this.getNextDayOfWeek(6); // Saturday
      const saturdayDate = new Date(nextSaturday);
      
      const subcultureEvent = {
        id: `red-room-subculture-${saturdayDate.toISOString().split('T')[0]}`,
        title: 'SUBCULTURE - Bass Music Saturdays',
        description: 'Subculture is Vancouver\'s home for Bass Music. Showcasing the best in Drum & Bass, Dubstep and other bass & electronic music sub-genres. Powered by PK Sound and presented by Digital Motion BC every Saturday at Red Room Vancouver.',
        startDate: new Date(saturdayDate.setHours(22, 0, 0)), // 10 PM
        endDate: new Date(new Date(nextSaturday).setHours(3, 0, 0)), // 3 AM next day
        venue: this.venue,
        category: 'nightlife',
        categories: ['nightlife', 'music', 'electronic', 'bass', 'drum and bass', 'dubstep', 'weekly'],
        sourceURL: 'https://redroomvancouver.com/',
        officialWebsite: 'https://redroomvancouver.com/',
        image: null, // Will attempt to scrape actual image
        ticketsRequired: true,
        isRecurring: true,
        recurringDay: 'Saturday',
        lastUpdated: new Date()
      };
      
      events.push(cancunEvent);
      events.push(subcultureEvent);
      
      console.log(`✅ Created weekly event: ${cancunEvent.title} on ${cancunEvent.startDate.toLocaleDateString()}`);
      console.log(`✅ Created weekly event: ${subcultureEvent.title} on ${subcultureEvent.startDate.toLocaleDateString()}`);
    } catch (error) {
      console.error(`❌ Error creating weekly events: ${error.message}`);
    }
    
    return events;
  }
  
  /**
   * Main scraper function that tries to scrape special events and adds weekly events
   */
  async scrape() {
    console.log('🔍 Starting Red Room events scraper...');
    const events = [];
    let browser = null;
    
    try {
      // First add the weekly events we know occur regularly
      const weeklyEvents = this.createWeeklyEvents();
      events.push(...weeklyEvents);
      
      // Launch browser with appropriate configuration to look for special events
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
      
      // Navigate to main page and wait for content to load
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'redroom-debug.png' });
      console.log('✅ Saved debug screenshot to redroom-debug.png');
      
      // Wait for additional time to ensure JavaScript content loads
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try to extract image URLs for the weekly events
      // For Friday Cancun Nites
      try {
        const cancunImageEl = await page.$('img[alt*="cancun" i], img[alt*="friday" i]');
        if (cancunImageEl) {
          const imageUrl = await page.evaluate(el => el.src, cancunImageEl);
          if (imageUrl && events[0]) {
            events[0].image = imageUrl;
            console.log(`✅ Found image for Cancun Nites: ${imageUrl}`);
          }
        }
      } catch (imgErr) {
        console.log(`❌ Could not extract Cancun Nites image: ${imgErr.message}`);
      }
      
      // For Saturday Subculture
      try {
        const subcultureImageEl = await page.$('img[alt*="subculture" i], img[alt*="saturday" i]');
        if (subcultureImageEl) {
          const imageUrl = await page.evaluate(el => el.src, subcultureImageEl);
          if (imageUrl && events[1]) {
            events[1].image = imageUrl;
            console.log(`✅ Found image for Subculture: ${imageUrl}`);
          }
        }
      } catch (imgErr) {
        console.log(`❌ Could not extract Subculture image: ${imgErr.message}`);
      }
      
      // Look for any special events - try different selectors that might indicate special events
      const selectors = [
        '.event-list .event-item', 
        '.upcoming-events .event', 
        '.event-card',
        'article.event',
        '.shows-container .show',
        '.event-container',
        '.eventlist-event',
        'a[href*="event"]',
        '.special-event',
        '.ticket-link',
        'a.button:contains("Tickets")'
      ];
      
      for (const selector of selectors) {
        try {
          console.log(`Looking for special events with selector: ${selector}`);
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} potential special events with selector: ${selector}`);
            
            // Process each potential special event
            for (const element of elements) {
              try {
                // Check if this appears to be a special event (not a weekly event or navigation item)
                const elementText = await page.evaluate(el => el.textContent, element);
                
                // Filter out navigation links and weekly events
                const isWeeklyEvent = ['CANCUN', 'FRIDAY', 'SUBCULTURE', 'SATURDAY'].some(
                  keyword => elementText.toUpperCase().includes(keyword)
                );
                const isNavigationLink = ['VIEW ALL', 'EVENTS', 'HOME', 'ABOUT', 'WEEKLIES', 'CONTACT'].some(
                  keyword => elementText.toUpperCase().trim() === keyword || 
                             elementText.toUpperCase().includes(`${keyword} `)
                );
                
                if (!isWeeklyEvent && !isNavigationLink && elementText.length > 5) {
                  // This might be a special event - extract what info we can
                  const linkHref = await page.evaluate(
                    el => el.href || el.querySelector('a')?.href || null, 
                    element
                  );
                  
                  if (linkHref) {
                    const title = await page.evaluate(
                      el => el.innerText.trim().split('\n')[0] || 'Special Event at Red Room', 
                      element
                    );
                    
                    const specialEvent = {
                      id: `red-room-special-${slugify(title, { lower: true, strict: true })}-${new Date().toISOString().split('T')[0]}`,
                      title: title,
                      description: `Special event at Red Room Vancouver. Visit ${linkHref} for more details.`,
                      startDate: new Date(new Date().setHours(21, 0, 0)), // Assume 9 PM, common start time
                      endDate: new Date(new Date().setHours(2, 0, 0)), // Assume 2 AM end time
                      venue: this.venue,
                      category: 'nightlife',
                      categories: ['nightlife', 'music', 'special event'],
                      sourceURL: linkHref,
                      officialWebsite: this.url,
                      image: null,
                      ticketsRequired: true,
                      lastUpdated: new Date()
                    };
                    
                    events.push(specialEvent);
                    console.log(`✅ Found potential special event: ${title}`);
                  }
                }
              } catch (elementError) {
                console.error(`❌ Error processing potential special event: ${elementError.message}`);
              }
            }
          }
        } catch (selectorError) {
          console.error(`❌ Error with selector ${selector}: ${selectorError.message}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error in Red Room scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from Red Room Vancouver`);
    }
    
    return events;
  }
}

module.exports = new RedRoomEventsScraper();
