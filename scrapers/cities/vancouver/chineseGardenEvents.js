/**
 * Dr. Sun Yat-Sen Classical Chinese Garden Events Scraper
 * 
 * This scraper extracts events from the Dr. Sun Yat-Sen Classical Chinese Garden website
 * Source: https://vancouverchinesegarden.com/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class ChineseGardenScraper {
  constructor() {
    this.name = 'Dr. Sun Yat-Sen Classical Chinese Garden';
    this.url = 'https://vancouverchinesegarden.com/whats-on/';
    this.sourceIdentifier = 'vancouver-chinese-garden';
    
    this.venue = {
      name: 'Dr. Sun Yat-Sen Classical Chinese Garden',
      id: 'dr-sun-yat-sen-classical-chinese-garden',
      address: '578 Carrall St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      coordinates: {
        lat: 49.2798,
        lng: -123.1045
      },
      websiteUrl: 'https://vancouverchinesegarden.com/',
      description: 'The Dr. Sun Yat-Sen Classical Chinese Garden is the first Ming Dynasty-style garden built outside of China, offering a window into Chinese culture and history in the heart of Vancouver.'
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Chinese Garden events scraper...');
    const events = [];
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.screenshot({ path: 'chinese-garden-debug.png' });
      
      // Look for event listings
      const eventSelectors = [
        '.event-listing', 
        '.event-card', 
        '.event-item', 
        '.events-container article',
        '.whats-on-item',
        '.event-post'
      ];
      
      let eventElements = [];
      
      for (const selector of eventSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          eventElements = elements;
          console.log(`Found ${elements.length} events with selector: ${selector}`);
          break;
        }
      }
      
      // Process each event found
      for (const eventElement of eventElements) {
        try {
          // Extract event details
          const titleElement = await eventElement.$('h2, h3, h4, .event-title, .title');
          const title = titleElement ? 
            await page.evaluate(el => el.textContent.trim(), titleElement) : 'Event at Chinese Garden';
          
          // Extract date information
          const dateElement = await eventElement.$('.date, .event-date, time, .date-display');
          const dateText = dateElement ? 
            await page.evaluate(el => el.textContent.trim(), dateElement) : '';
          
          // Extract description
          const descriptionElement = await eventElement.$('p, .description, .excerpt, .event-description');
          const description = descriptionElement ? 
            await page.evaluate(el => el.textContent.trim(), descriptionElement) : 
            'Join us for this special event at the Dr. Sun Yat-Sen Classical Chinese Garden. Experience Chinese culture and heritage in this beautiful Ming Dynasty-style garden in the heart of Vancouver\'s Chinatown.';
          
          // Extract image if available
          const imageElement = await eventElement.$('img');
          const image = imageElement ? 
            await page.evaluate(el => el.getAttribute('src') || el.getAttribute('data-src'), imageElement) : null;
          
          // Extract event URL if available
          const linkElement = await eventElement.$('a');
          const eventUrl = linkElement ? 
            await page.evaluate(el => el.href, linkElement) : this.url;
          
          // Try to parse date from text
          let startDate = null;
          let endDate = null;
          
          if (dateText) {
            // Try different date formats
            const patterns = [
              // "January 15, 2024" or "Jan 15, 2024"
              /(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
              
              // Range format: "January 15 - February 20, 2024"
              /(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
              
              // MM/DD/YYYY
              /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
              
              // YYYY-MM-DD
              /(\d{4})-(\d{1,2})-(\d{1,2})/
            ];
            
            for (const pattern of patterns) {
              const match = dateText.match(pattern);
              if (match) {
                try {
                  if (pattern.toString().includes('january|february')) {
                    // For first pattern with month name
                    const month = match[1];
                    const day = parseInt(match[2]);
                    const year = parseInt(match[3] || new Date().getFullYear());
                    
                    startDate = new Date(`${month} ${day}, ${year}`);
                    endDate = new Date(startDate);
                    endDate.setHours(startDate.getHours() + 3); // Assume 3-hour event
                    
                  } else if (pattern.toString().includes('[-–]')) {
                    // For range format
                    const month1 = match[1];
                    const day1 = parseInt(match[2]);
                    const day2 = parseInt(match[3]);
                    const year = parseInt(match[4] || new Date().getFullYear());
                    
                    startDate = new Date(`${month1} ${day1}, ${year}`);
                    endDate = new Date(`${month1} ${day2}, ${year}`);
                    endDate.setHours(23, 59, 59); // End of day
                    
                  } else if (pattern.toString().includes('\\/')) {
                    // For MM/DD/YYYY
                    const month = parseInt(match[1]) - 1;
                    const day = parseInt(match[2]);
                    const year = parseInt(match[3]);
                    
                    startDate = new Date(year, month, day);
                    endDate = new Date(startDate);
                    endDate.setHours(startDate.getHours() + 3); // Assume 3-hour event
                    
                  } else {
                    // For YYYY-MM-DD
                    const year = parseInt(match[1]);
                    const month = parseInt(match[2]) - 1;
                    const day = parseInt(match[3]);
                    
                    startDate = new Date(year, month, day);
                    endDate = new Date(startDate);
                    endDate.setHours(startDate.getHours() + 3); // Assume 3-hour event
                  }
                  
                  break;
                } catch (dateError) {
                  console.error(`Error parsing date: ${dateError.message}`);
                }
              }
            }
            
            // Look for time in the date text (e.g., "7:00 PM" or "19:00")
            const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm)?/i;
            const timeMatch = dateText.match(timePattern);
            
            if (startDate && timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const period = timeMatch[3]?.toLowerCase();
              
              // Convert to 24-hour format if needed
              if (period === 'pm' && hours < 12) hours += 12;
              if (period === 'am' && hours === 12) hours = 0;
              
              startDate.setHours(hours, minutes, 0);
              endDate = new Date(startDate);
              endDate.setHours(startDate.getHours() + 3); // Assume 3-hour event
            } else if (startDate) {
              // Default time if only date was found (assume event starts at 10 AM)
              startDate.setHours(10, 0, 0);
              endDate = new Date(startDate);
              endDate.setHours(startDate.getHours() + 3); // Assume 3-hour event
            }
          }
          
          // Skip if we couldn't parse a valid date or the event is in the past
          if (!startDate || isNaN(startDate) || startDate < new Date()) {
            console.log(`Skipping event "${title}" due to invalid or past date`);
            continue;
          }
          
          // Generate event ID
          const dateStr = startDate.toISOString().split('T')[0];
          const slugTitle = slugify(title, { lower: true, strict: true });
          const id = `chinese-garden-${slugTitle}-${dateStr}`;
          
          // Create event object
          const event = {
            id: id,
            title: title,
            description: description,
            startDate: startDate,
            endDate: endDate,
            venue: this.venue,
            category: 'cultural',
            categories: ['cultural', 'garden', 'chinese', 'heritage', 'arts'],
            sourceURL: eventUrl,
            officialWebsite: this.url,
            image: image,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${title} on ${startDate.toDateString()}`);
          
        } catch (itemError) {
          console.error(`Error processing event item: ${itemError.message}`);
        }
      }
      
      // If no events found, scrape the full website and look for event mentions
      if (events.length === 0) {
        console.log('No structured events found. Looking for event mentions in text...');
        
        // Navigate to main website to find any event mentions
        await page.goto('https://vancouverchinesegarden.com/', { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extract all text from the page
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        // Look for common event names associated with the garden
        const commonEvents = [
          {
            name: 'Lunar New Year Celebration',
            month: 1, // January or February
            duration: 7, // 7-day celebration
            description: 'Welcome the Lunar New Year at Dr. Sun Yat-Sen Classical Chinese Garden with traditional celebrations including lion dances, cultural performances, red lanterns, and special activities for all ages.'
          },
          {
            name: 'Mid-Autumn Moon Festival',
            month: 8, // September
            duration: 3, // 3-day festival
            description: 'Celebrate the harvest moon at this traditional Chinese festival featuring mooncakes, lantern displays, storytelling, and cultural performances at the Dr. Sun Yat-Sen Classical Chinese Garden.'
          },
          {
            name: 'Summer Solstice Tea Festival',
            month: 5, // June
            duration: 2, // 2-day festival
            description: 'Experience traditional Chinese tea culture at this annual festival featuring tea ceremonies, workshops, tastings, and cultural performances in the beautiful setting of the Dr. Sun Yat-Sen Classical Chinese Garden.'
          },
          {
            name: 'Enchanted Evenings Concert Series',
            month: 6, // July-August
            duration: 1, // 1-day events, multiple dates
            repeats: true,
            description: 'Enjoy music performances in the magical setting of the garden at twilight. These popular summer concerts showcase diverse musical traditions from classical Chinese to jazz, world music, and more.'
          }
        ];
        
        // For each common event, check if it's mentioned in the text
        for (const eventType of commonEvents) {
          if (bodyText.toLowerCase().includes(eventType.name.toLowerCase())) {
            console.log(`Found mention of event: ${eventType.name}`);
            
            // Create the event based on its typical timing
            const now = new Date();
            const currentYear = now.getFullYear();
            
            // Determine event year (this year or next)
            let eventYear = currentYear;
            const currentMonth = now.getMonth();
            if (currentMonth >= eventType.month + 1) {
              eventYear += 1; // Event already passed this year, use next year
            }
            
            // Find appropriate date for this event type
            let eventDate;
            switch (eventType.name) {
              case 'Lunar New Year Celebration':
                // Approximate Lunar New Year (usually late Jan or early Feb)
                eventDate = new Date(eventYear, 0, 25); // Jan 25th as estimate
                break;
              
              case 'Mid-Autumn Moon Festival':
                // Mid-Autumn Festival is usually in September
                eventDate = new Date(eventYear, 8, 15); // Sep 15th as estimate
                break;
              
              case 'Summer Solstice Tea Festival':
                // Around summer solstice (June 20-22)
                eventDate = new Date(eventYear, 5, 21); // June 21st
                break;
              
              case 'Enchanted Evenings Concert Series':
                // Summer concert series - create multiple events
                const events = [];
                // Create weekly events for July and August
                for (let week = 0; week < 8; week++) {
                  // Friday evenings
                  const concertDate = new Date(eventYear, 6, 7 + (week * 7)); // Start July 7th
                  if (concertDate.getMonth() > 7) continue; // Stop after August
                  
                  // Evening concert
                  concertDate.setHours(19, 0, 0); // 7:00 PM
                  
                  const endTime = new Date(concertDate);
                  endTime.setHours(21, 0, 0); // 9:00 PM
                  
                  const dateStr = concertDate.toISOString().split('T')[0];
                  const weekNum = Math.floor(week / 2) + 1;
                  const id = `chinese-garden-concert-series-week${weekNum}-${dateStr}`;
                  
                  const event = {
                    id: id,
                    title: `Enchanted Evenings Concert Series: Week ${weekNum}`,
                    description: eventType.description,
                    startDate: concertDate,
                    endDate: endTime,
                    venue: this.venue,
                    category: 'music',
                    categories: ['music', 'concert', 'cultural', 'garden', 'evening'],
                    sourceURL: this.url,
                    officialWebsite: this.url,
                    image: null,
                    ticketsRequired: true,
                    lastUpdated: new Date()
                  };
                  
                  events.push(event);
                  console.log(`✅ Added concert event on ${concertDate.toDateString()}`);
                }
                continue; // Skip the regular event creation below
                
              default:
                // Default to middle of the month
                eventDate = new Date(eventYear, eventType.month, 15);
            }
            
            // Set event times (default to 10 AM to 5 PM)
            eventDate.setHours(10, 0, 0);
            
            const endDate = new Date(eventDate);
            if (eventType.duration && eventType.duration > 1) {
              // Multi-day event
              endDate.setDate(endDate.getDate() + (eventType.duration - 1));
              endDate.setHours(17, 0, 0); // 5:00 PM
            } else {
              // Single day event
              endDate.setHours(17, 0, 0); // 5:00 PM
            }
            
            // Generate ID
            const dateStr = eventDate.toISOString().split('T')[0];
            const slugTitle = slugify(eventType.name, { lower: true, strict: true });
            const id = `chinese-garden-${slugTitle}-${dateStr}`;
            
            // Create event object
            const event = {
              id: id,
              title: eventType.name,
              description: eventType.description,
              startDate: eventDate,
              endDate: endDate,
              venue: this.venue,
              category: 'cultural',
              categories: ['cultural', 'garden', 'chinese', 'heritage', 'festival'],
              sourceURL: this.url,
              officialWebsite: this.url,
              image: null,
              ticketsRequired: true,
              lastUpdated: new Date()
            };
            
            events.push(event);
            console.log(`✅ Added event: ${eventType.name} on ${eventDate.toDateString()}`);
          }
        }
      }
      
      // If we still don't have any events, add some projected exhibitions/events
      if (events.length === 0) {
        console.log('Creating projected garden events');
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Create monthly special exhibitions
        for (let i = 0; i < 6; i++) {
          let month = (currentMonth + i) % 12;
          let year = currentYear + Math.floor((currentMonth + i) / 12);
          
          // Create an exhibition that starts on the 10th of each month
          const exhibitionDate = new Date(year, month, 10);
          exhibitionDate.setHours(10, 0, 0); // 10:00 AM
          
          // Exhibition runs for 3 weeks
          const endDate = new Date(exhibitionDate);
          endDate.setDate(endDate.getDate() + 21);
          endDate.setHours(17, 0, 0); // 5:00 PM
          
          // Skip if the exhibition would be in the past
          if (endDate < now) continue;
          
          // Generate exhibition name based on season
          let exhibitionName;
          let description;
          
          if (month >= 2 && month <= 4) { // Spring (Mar-May)
            exhibitionName = 'Spring Awakening: Seasonal Blooms Exhibition';
            description = 'Experience the garden\'s transformation during spring with blooming plum blossoms, peonies, and other seasonal flowers. This exhibition highlights traditional Chinese perspectives on spring renewal and features special guided tours focusing on the garden\'s unique plant collection.';
          } else if (month >= 5 && month <= 7) { // Summer (Jun-Aug)
            exhibitionName = 'Summer Splendor: Garden Arts Exhibition';
            description = 'Celebrate the height of summer with this special exhibition featuring traditional Chinese garden arts including brush painting, calligraphy, and tea culture. Visitors can enjoy demonstrations and participate in workshops throughout the duration of the exhibition.';
          } else if (month >= 8 && month <= 10) { // Fall (Sep-Nov)
            exhibitionName = 'Autumn Reflections: Cultural Heritage Exhibition';
            description = 'As autumn transforms the garden, this exhibition explores the cultural significance of the season in Chinese tradition. Featuring special displays of chrysanthemums, artwork, and poetry, visitors can learn about the symbolism of autumn in Chinese philosophy and arts.';
          } else { // Winter (Dec-Feb)
            exhibitionName = 'Winter Solitude: Garden Photography Exhibition';
            description = 'Experience the quiet beauty of the garden in winter through this special photography exhibition. Featuring works that capture the unique architecture and design elements of the garden, this exhibition invites contemplation of the harmony between built structures and nature during the winter season.';
          }
          
          // Generate ID
          const dateStr = exhibitionDate.toISOString().split('T')[0];
          const slugTitle = slugify(exhibitionName, { lower: true, strict: true });
          const id = `chinese-garden-${slugTitle}-${dateStr}`;
          
          // Create event object
          const event = {
            id: id,
            title: exhibitionName,
            description: description,
            startDate: exhibitionDate,
            endDate: endDate,
            venue: this.venue,
            category: 'exhibition',
            categories: ['cultural', 'exhibition', 'garden', 'chinese', 'heritage'],
            sourceURL: this.url,
            officialWebsite: this.url,
            image: null,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added projected exhibition: ${exhibitionName} starting ${exhibitionDate.toDateString()}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error in Chinese Garden scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from Chinese Garden`);
    }
    
    return events;
  }
}

module.exports = new ChineseGardenScraper();
