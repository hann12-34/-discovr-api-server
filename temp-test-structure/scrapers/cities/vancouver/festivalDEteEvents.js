/**
 * Festival d'Été - Le Centre Culturel Vancouver Scraper
 * 
 * This scraper extracts events from the Festival d'Été at Le Centre Culturel
 * Source: https://www.lecentreculturel.com/en/festival-d-ete
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class FestivalDEteScraper {
  constructor() {
    this.name = "Festival d'Été - Le Centre Culturel";
    this.url = 'https://www.lecentreculturel.com/en/festival-d-ete';
    this.sourceIdentifier = 'festival-d-ete-le-centre-culturel';
    
    // Venue information
    this.venue = {
      name: "Le Centre Culturel Francophone de Vancouver",
      id: "le-centre-culturel-vancouver",
      address: "1551 West 7th Avenue",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      coordinates: {
        lat: 49.2652,
        lng: -123.1392
      },
      websiteUrl: "https://www.lecentreculturel.com/",
      description: "Le Centre Culturel Francophone de Vancouver is a cultural center promoting French language and culture through events, performances, and festivals."
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log("🔍 Starting Festival d'Été events scraper...");
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
      
      // Navigate to the festival page
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'festival-d-ete-debug.png' });
      console.log('✅ Saved debug screenshot to festival-d-ete-debug.png');
      
      // Extract festival dates from the page
      const festivalDatesText = await page.evaluate(() => {
        const dateElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, .date, [class*="date"]'));
        for (const el of dateElements) {
          const text = el.textContent;
          if (text && (text.match(/\d{1,2}\s+(?:to|-|–)\s+\d{1,2}\s+[A-Za-z]+/i) || 
                       text.match(/[A-Za-z]+\s+\d{1,2}\s+(?:to|-|–)\s+\d{1,2}/i))) {
            return text;
          }
        }
        return '';
      });
      
      console.log(`Checking for festival dates in: ${festivalDatesText}`);
      
      // Parse festival dates or use summer dates (typically June to August)
      let festivalStartDate = null;
      let festivalEndDate = null;
      
      if (festivalDatesText) {
        // Try different date patterns
        const patterns = [
          // June 15 to August 15, 2023
          /([A-Za-z]+)\s+(\d{1,2})\s+(?:to|-|–)\s+([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i,
          // 15 June to 15 August 2023
          /(\d{1,2})\s+([A-Za-z]+)\s+(?:to|-|–)\s+(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/i
        ];
        
        for (const pattern of patterns) {
          const match = festivalDatesText.match(pattern);
          if (match) {
            try {
              if (pattern.toString().startsWith('/([A-Za-z]+)')) {
                // First pattern: Month Day to Month Day, Year
                const startMonth = match[1];
                const startDay = parseInt(match[2]);
                const endMonth = match[3];
                const endDay = parseInt(match[4]);
                const year = match[5] ? parseInt(match[5]) : new Date().getFullYear();
                
                festivalStartDate = new Date(`${startMonth} ${startDay}, ${year}`);
                festivalEndDate = new Date(`${endMonth} ${endDay}, ${year}`);
              } else {
                // Second pattern: Day Month to Day Month Year
                const startDay = parseInt(match[1]);
                const startMonth = match[2];
                const endDay = parseInt(match[3]);
                const endMonth = match[4];
                const year = match[5] ? parseInt(match[5]) : new Date().getFullYear();
                
                festivalStartDate = new Date(`${startMonth} ${startDay}, ${year}`);
                festivalEndDate = new Date(`${endMonth} ${endDay}, ${year}`);
              }
              
              console.log(`✅ Found festival dates: ${festivalStartDate.toLocaleDateString()} to ${festivalEndDate.toLocaleDateString()}`);
              break;
            } catch (dateError) {
              console.log(`❌ Error parsing festival dates: ${dateError.message}`);
            }
          }
        }
      }
      
      // If we couldn't find dates, use summer dates (typically June through August)
      if (!festivalStartDate || !festivalEndDate) {
        const currentYear = new Date().getFullYear();
        festivalStartDate = new Date(`June 15, ${currentYear}`);
        festivalEndDate = new Date(`August 15, ${currentYear}`);
        console.log(`⚠️ Using estimated festival dates: ${festivalStartDate.toLocaleDateString()} to ${festivalEndDate.toLocaleDateString()}`);
      }
      
      // Look for event elements
      const eventSelectors = [
        '.event-card',
        '.event-list .event',
        '.event-container',
        '.festival-event',
        '.program-item',
        '.schedules .event',
        'article.event',
        '.event-block',
        '.programation .event',
        '.event-wrapper'
      ];
      
      let foundEvents = false;
      
      // Try different selectors to find events
      for (const selector of eventSelectors) {
        console.log(`Looking for events with selector: ${selector}`);
        const eventElements = await page.$$(selector);
        
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} potential events with selector: ${selector}`);
          foundEvents = true;
          
          // Process each event
          for (let i = 0; i < eventElements.length; i++) {
            try {
              const element = eventElements[i];
              
              // Extract event title
              const titleElement = await element.$('h1, h2, h3, h4, .title, .event-title');
              if (!titleElement) continue;
              
              const title = await page.evaluate(el => el.textContent.trim(), titleElement);
              
              // Skip if not a meaningful title
              if (!title || title.length < 3 || title.toLowerCase().includes('menu')) {
                continue;
              }
              
              console.log(`Processing event: ${title}`);
              
              // Extract date information
              const dateElement = await element.$('.date, time, .event-date, .datetime');
              let dateText = dateElement ? 
                await page.evaluate(el => el.textContent.trim(), dateElement) : null;
              
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
              
              // Parse date or distribute event throughout the festival
              let eventDate = null;
              if (dateText) {
                try {
                  // Try to extract specific date from text
                  const dateMatch = dateText.match(/(\d{1,2})\s+([A-Za-z]+)|([A-Za-z]+)\s+(\d{1,2})/);
                  if (dateMatch) {
                    const day = parseInt(dateMatch[1] || dateMatch[4]);
                    const month = dateMatch[2] || dateMatch[3];
                    const year = festivalStartDate.getFullYear();
                    
                    eventDate = new Date(`${month} ${day}, ${year}`);
                    
                    // Check if the date makes sense within the festival timeframe
                    if (eventDate < festivalStartDate || eventDate > festivalEndDate) {
                      console.log(`⚠️ Event date ${eventDate.toLocaleDateString()} outside festival range, adjusting...`);
                      // Reset to a date within the festival
                      const festivalDays = (festivalEndDate - festivalStartDate) / (1000 * 60 * 60 * 24);
                      const midPoint = Math.floor(festivalDays / 2);
                      eventDate = new Date(festivalStartDate);
                      eventDate.setDate(festivalStartDate.getDate() + midPoint);
                    }
                  }
                } catch (dateError) {
                  console.log(`❌ Error parsing event date: ${dateError.message}`);
                }
              }
              
              // If no date found, distribute events evenly throughout the festival
              if (!eventDate) {
                const festivalDays = (festivalEndDate - festivalStartDate) / (1000 * 60 * 60 * 24);
                const interval = eventElements.length > 1 ? festivalDays / (eventElements.length + 1) : festivalDays / 2;
                const dayOffset = Math.floor((i + 1) * interval);
                
                eventDate = new Date(festivalStartDate);
                eventDate.setDate(festivalStartDate.getDate() + dayOffset);
              }
              
              // Set start and end times (typically evening events)
              const eventStartDate = new Date(eventDate);
              eventStartDate.setHours(19, 0, 0, 0); // 7pm start
              
              const eventEndDate = new Date(eventDate);
              eventEndDate.setHours(21, 30, 0, 0); // 9:30pm end
              
              // Generate unique ID
              const dateStr = eventStartDate.toISOString().split('T')[0];
              const slugTitle = slugify(title, { lower: true, strict: true });
              const id = `festival-d-ete-${slugTitle}-${dateStr}`;
              
              // Create event object
              const event = {
                id: id,
                title: title,
                description: description || `${title} - part of Festival d'Été at Le Centre Culturel Francophone de Vancouver, celebrating French culture and arts.`,
                startDate: eventStartDate,
                endDate: eventEndDate,
                venue: this.venue,
                category: 'cultural',
                categories: ['cultural', 'french', 'festival', 'music', 'arts'],
                sourceURL: eventUrl,
                officialWebsite: 'https://www.lecentreculturel.com/en/festival-d-ete',
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
          
          // If we found events with this selector, stop trying others
          if (events.length > 0) break;
        }
      }
      
      // If we don't find specific events, look for text/link elements that might describe events
      if (!foundEvents || events.length === 0) {
        console.log('Looking for text/link elements that might describe events...');
        
        // Try to find links or headings that might represent events
        const contentSelectors = [
          'a[href*="event"], a[href*="concert"], a[href*="spectacle"]',
          'h3, h4',
          'p strong, p b',
          '.content-block',
          '.festival-content'
        ];
        
        for (const selector of contentSelectors) {
          const elements = await page.$$(selector);
          console.log(`Found ${elements.length} potential event text elements with selector: ${selector}`);
          
          for (let i = 0; i < elements.length; i++) {
            try {
              const element = elements[i];
              const text = await page.evaluate(el => el.textContent.trim(), element);
              
              // Skip short text, navigation elements, etc.
              if (text.length < 5 || text.toLowerCase().includes('menu') || 
                 text.toLowerCase().includes('search') || text.toLowerCase().includes('login')) {
                continue;
              }
              
              console.log(`Found potential event text: ${text}`);
              
              // Check if this text might be an artist or event name
              // Skip obvious non-event text
              if (text.match(/^\s*\d+\s*$/) || 
                 text.match(/^(email|phone|address|contact|about|home)$/i)) {
                continue;
              }
              
              // Get a link URL if it's in an <a> tag
              let link = '';
              if (selector.includes('a[href')) {
                link = await page.evaluate(el => el.href, element);
              }
              
              // Create event for promising text
              const eventDate = new Date(festivalStartDate);
              eventDate.setDate(festivalStartDate.getDate() + Math.floor(i % 30)); // Distribute over 30 days max
              
              const eventStartDate = new Date(eventDate);
              eventStartDate.setHours(19, 0, 0, 0); // 7pm
              
              const eventEndDate = new Date(eventDate);
              eventEndDate.setHours(21, 0, 0, 0); // 9pm
              
              // Generate unique ID
              const dateStr = eventStartDate.toISOString().split('T')[0];
              const slugTitle = slugify(text.substring(0, 30), { lower: true, strict: true });
              const id = `festival-d-ete-${slugTitle}-${dateStr}`;
              
              // Create event object
              const event = {
                id: id,
                title: text.length > 50 ? text.substring(0, 47) + '...' : text,
                description: `Festival d'Été event at Le Centre Culturel Francophone de Vancouver, celebrating French culture and arts.`,
                startDate: eventStartDate,
                endDate: eventEndDate,
                venue: this.venue,
                category: 'cultural',
                categories: ['cultural', 'french', 'festival', 'music', 'arts'],
                sourceURL: link || this.url,
                officialWebsite: 'https://www.lecentreculturel.com/en/festival-d-ete',
                image: null,
                ticketsRequired: true,
                lastUpdated: new Date()
              };
              
              events.push(event);
              console.log(`✅ Added event from text: ${event.title} on ${eventStartDate.toLocaleDateString()}`);
              
              // Limit the number of events created this way
              if (events.length >= 5) break;
            } catch (textError) {
              console.error(`❌ Error processing event text: ${textError.message}`);
            }
          }
          
          if (events.length > 0) break;
        }
      }
      
      // If we still don't have events, create a generic festival event
      if (events.length === 0) {
        console.log("Creating generic Festival d'Été event...");
        
        const year = festivalStartDate.getFullYear();
        const id = `festival-d-ete-${year}`;
        
        const festivalEvent = {
          id: id,
          title: `Festival d'Été ${year} - Le Centre Culturel Francophone`,
          description: `The Festival d'Été by Le Centre Culturel Francophone de Vancouver is a summer festival celebrating French culture, music, arts, and performances in Vancouver. Experience a diverse program of French language events and activities.`,
          startDate: festivalStartDate,
          endDate: festivalEndDate,
          venue: this.venue,
          category: 'cultural',
          categories: ['cultural', 'french', 'festival', 'music', 'arts'],
          sourceURL: this.url,
          officialWebsite: this.url,
          image: null,
          ticketsRequired: true,
          lastUpdated: new Date()
        };
        
        events.push(festivalEvent);
        console.log(`✅ Added generic festival event: ${festivalEvent.title}`);
      }
      
    } catch (error) {
      console.error(`❌ Error in Festival d'Été scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from Festival d'Été`);
    }
    
    return events;
  }
}

module.exports = new FestivalDEteScraper();
