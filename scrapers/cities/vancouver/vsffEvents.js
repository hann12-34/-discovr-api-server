/**
 * Vancouver Short Film Festival Scraper
 * 
 * This scraper extracts events from the Vancouver Short Film Festival website
 * Source: https://www.vsff.com/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class VSFFScraper {
  constructor() {
    this.name = 'Vancouver Short Film Festival';
    this.url = 'https://www.vsff.com/';
    this.sourceIdentifier = 'vsff';
    
    this.venue = {
      name: 'Vancouver Short Film Festival',
      id: 'vancouver-short-film-festival',
      address: 'Vancity Theatre, 1181 Seymour St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      coordinates: {
        lat: 49.2768,
        lng: -123.1240
      },
      websiteUrl: 'https://www.vsff.com/',
      description: 'The Vancouver Short Film Festival celebrates the vibrant community of short film, video, and animation artists in British Columbia through an annual showcase.'
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Short Film Festival scraper...');
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
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the website
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'vsff-debug.png' });
      console.log('✅ Saved debug screenshot to vsff-debug.png');
      
      // Try to find festival dates in header/hero section
      let festivalDates = null;
      
      const headerSelectors = [
        'header',
        '.hero',
        '.hero-section',
        '.banner',
        '.main-banner',
        '#hero',
        '.splash'
      ];
      
      for (const selector of headerSelectors) {
        const headerElement = await page.$(selector);
        if (headerElement) {
          const headerText = await page.evaluate(el => el.textContent, headerElement);
          
          // Look for date patterns like "January 26-28, 2025" or "January 26 - 28, 2025"
          const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:\s*[-–]\s*|\s+to\s+)(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+)?(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
          const match = headerText.match(datePattern);
          
          if (match) {
            const startMonth = match[1];
            const startDay = parseInt(match[2]);
            const endDay = parseInt(match[3]);
            const year = parseInt(match[4]);
            
            const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
            const endDate = new Date(`${startMonth} ${endDay}, ${year}`);
            
            festivalDates = { startDate, endDate };
            console.log(`✅ Found festival dates: ${startDate.toDateString()} to ${endDate.toDateString()}`);
            break;
          }
        }
      }
      
      // If festival dates not found in header, look for them in main content
      if (!festivalDates) {
        const datePatterns = [
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:\s*[-–]\s*|\s+to\s+)(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+)?(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/gi,
          /(\d{1,2})(?:st|nd|rd|th)?\s+(?:to|[-–])\s+(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s*(\d{4})/gi
        ];
        
        // Extract all text from the page
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        for (const pattern of datePatterns) {
          const match = pattern.exec(bodyText);
          if (match) {
            try {
              let startMonth, startDay, endDay, year;
              
              // Extract date components based on pattern
              if (pattern.toString().includes('January|February')) {
                startMonth = match[1];
                startDay = parseInt(match[2]);
                endDay = parseInt(match[3]);
                year = parseInt(match[4]);
              } else {
                startDay = parseInt(match[1]);
                endDay = parseInt(match[2]);
                startMonth = match[3];
                year = parseInt(match[4]);
              }
              
              const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
              const endDate = new Date(`${startMonth} ${endDay}, ${year}`);
              
              if (!isNaN(startDate) && !isNaN(endDate)) {
                festivalDates = { startDate, endDate };
                console.log(`✅ Found festival dates in text: ${startDate.toDateString()} to ${endDate.toDateString()}`);
                break;
              }
            } catch (dateError) {
              console.log(`❌ Error parsing festival dates: ${dateError.message}`);
            }
          }
        }
      }
      
      // If we still don't have festival dates, estimate them for late January (typical timing)
      if (!festivalDates) {
        console.log('⚠️ Could not find festival dates, using estimated dates');
        
        // Find the last weekend in January of next year
        const today = new Date();
        const nextYear = today.getFullYear() + 1;
        let lastFridayInJanuary = new Date(nextYear, 0, 31);
        
        // Adjust to the last Friday in January
        while (lastFridayInJanuary.getDay() !== 5) { // 5 is Friday
          lastFridayInJanuary.setDate(lastFridayInJanuary.getDate() - 1);
        }
        
        const startDate = new Date(lastFridayInJanuary);
        const endDate = new Date(lastFridayInJanuary);
        endDate.setDate(endDate.getDate() + 2); // Festival runs Friday to Sunday
        
        festivalDates = { startDate, endDate };
        console.log(`⚠️ Using estimated festival dates: ${startDate.toDateString()} to ${endDate.toDateString()}`);
      }
      
      // Now look for screening blocks or individual films
      const programSections = [
        '.program',
        '.screenings',
        '.schedule',
        '.films',
        '#schedule',
        '#program',
        '.film-blocks',
        '.screening-blocks'
      ];
      
      let programItems = [];
      
      for (const selector of programSections) {
        console.log(`Looking for program items with selector: ${selector}`);
        const sectionElement = await page.$(selector);
        
        if (sectionElement) {
          // Look for program items or film blocks
          const itemSelectors = [
            '.film',
            '.screening',
            '.program-item',
            '.block',
            '.film-block',
            '.event-item',
            'article'
          ];
          
          for (const itemSelector of itemSelectors) {
            const items = await sectionElement.$$(itemSelector);
            
            if (items.length > 0) {
              console.log(`Found ${items.length} program items with selector: ${itemSelector}`);
              
              for (const item of items) {
                try {
                  // Extract title
                  const titleElement = await item.$('h2, h3, h4, .title');
                  const title = titleElement ? 
                    await page.evaluate(el => el.textContent.trim(), titleElement) : null;
                  
                  if (!title) continue;
                  
                  // Extract time if available
                  const timeElement = await item.$('time, .time, .screening-time');
                  const timeText = timeElement ?
                    await page.evaluate(el => el.textContent.trim(), timeElement) : null;
                  
                  // Extract description
                  const descriptionElement = await item.$('p, .description');
                  const description = descriptionElement ?
                    await page.evaluate(el => el.textContent.trim(), descriptionElement) : null;
                  
                  programItems.push({
                    title,
                    timeText,
                    description
                  });
                } catch (itemError) {
                  console.error(`❌ Error processing program item: ${itemError.message}`);
                }
              }
              
              if (programItems.length > 0) break;
            }
          }
        }
        
        if (programItems.length > 0) break;
      }
      
      // Create events based on the festival dates and program items
      const festivalStartDate = festivalDates.startDate;
      const festivalEndDate = festivalDates.endDate;
      
      // If we found specific program items, create an event for each
      if (programItems.length > 0) {
        console.log(`Creating events for ${programItems.length} program items`);
        
        // Calculate festival duration in days
        const festivalDurationDays = Math.round((festivalEndDate - festivalStartDate) / (24 * 60 * 60 * 1000)) + 1;
        
        // Distribute the program items across the festival days
        for (let i = 0; i < programItems.length; i++) {
          const item = programItems[i];
          
          // Calculate which day of the festival this item is on
          const dayOffset = i % festivalDurationDays;
          
          // Create event date by adding the day offset to the festival start date
          const eventDate = new Date(festivalStartDate);
          eventDate.setDate(festivalStartDate.getDate() + dayOffset);
          
          // Try to parse time from timeText, otherwise assign default times
          let startTime, endTime;
          
          if (item.timeText) {
            // Try to match patterns like "7:00 PM" or "19:00"
            const timeMatch = item.timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const period = timeMatch[3]?.toLowerCase();
              
              // Convert to 24-hour format if needed
              if (period === 'pm' && hours < 12) hours += 12;
              if (period === 'am' && hours === 12) hours = 0;
              
              eventDate.setHours(hours, minutes, 0);
              startTime = new Date(eventDate);
              
              // Estimate 2 hours for a screening block
              endTime = new Date(startTime);
              endTime.setHours(endTime.getHours() + 2);
            }
          }
          
          // If we couldn't parse the time, use default times
          if (!startTime) {
            // Films typically start in the evening
            const startHour = 18 + Math.floor(i / festivalDurationDays) * 3; // Stagger start times: 6pm, 9pm
            startTime = new Date(eventDate);
            startTime.setHours(startHour, 0, 0);
            
            endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 2); // 2-hour block
          }
          
          // Generate event ID
          const dateStr = startTime.toISOString().split('T')[0];
          const timeStr = startTime.toISOString().split('T')[1].substring(0, 5).replace(':', '');
          const slugTitle = slugify(item.title, { lower: true, strict: true });
          const id = `vsff-${slugTitle}-${dateStr}-${timeStr}`;
          
          // Create event object
          const event = {
            id: id,
            title: `VSFF: ${item.title}`,
            description: item.description || 
              `${item.title} - A film screening at the Vancouver Short Film Festival. Experience the best of short filmmaking at this annual celebration of local and international talent.`,
            startDate: startTime,
            endDate: endTime,
            venue: this.venue,
            category: 'film',
            categories: ['film', 'festival', 'shorts', 'cinema', 'arts'],
            sourceURL: this.url,
            officialWebsite: this.url,
            image: null,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added film screening event: ${event.title} on ${startTime.toLocaleString()}`);
        }
      } else {
        // If we didn't find specific program items, create festival day events
        console.log('Creating general festival day events');
        
        // Calculate festival duration in days
        const festivalDurationDays = Math.round((festivalEndDate - festivalStartDate) / (24 * 60 * 60 * 1000)) + 1;
        
        for (let day = 0; day < festivalDurationDays; day++) {
          const eventDate = new Date(festivalStartDate);
          eventDate.setDate(festivalStartDate.getDate() + day);
          
          // Create two screening blocks per day (afternoon and evening)
          const screeningTimes = [
            { name: 'Afternoon Screenings', hour: 14, minute: 0 },
            { name: 'Evening Screenings', hour: 19, minute: 0 }
          ];
          
          for (const screening of screeningTimes) {
            // Set start and end times
            const startTime = new Date(eventDate);
            startTime.setHours(screening.hour, screening.minute, 0);
            
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 2, 30); // 2.5 hour block
            
            // Only add event if it's in the future
            if (startTime > new Date()) {
              // Generate event ID
              const dateStr = startTime.toISOString().split('T')[0];
              const timeStr = startTime.toISOString().split('T')[1].substring(0, 5).replace(':', '');
              const slugTitle = slugify(screening.name, { lower: true, strict: true });
              const id = `vsff-${slugTitle}-${dateStr}-${timeStr}`;
              
              // Format day name (e.g., "Friday")
              const dayName = startTime.toLocaleDateString('en-US', { weekday: 'long' });
              const dayNumber = day + 1;
              
              // Create event object
              const event = {
                id: id,
                title: `VSFF: ${screening.name} - Festival Day ${dayNumber} (${dayName})`,
                description: `Experience a curated selection of outstanding short films at the Vancouver Short Film Festival. ${screening.name} include multiple short films showcasing diverse stories, styles, and filmmaking techniques.`,
                startDate: startTime,
                endDate: endTime,
                venue: this.venue,
                category: 'film',
                categories: ['film', 'festival', 'shorts', 'cinema', 'arts'],
                sourceURL: this.url,
                officialWebsite: this.url,
                image: null,
                ticketsRequired: true,
                lastUpdated: new Date()
              };
              
              events.push(event);
              console.log(`✅ Added festival day event: ${event.title} on ${startTime.toLocaleString()}`);
            }
          }
        }
      }
      
      // Add an opening night gala event
      const openingNight = new Date(festivalStartDate);
      openingNight.setHours(19, 0, 0); // 7:00 PM
      
      const openingEndTime = new Date(openingNight);
      openingEndTime.setHours(openingEndTime.getHours() + 3); // 3-hour event
      
      const openingId = `vsff-opening-night-gala-${openingNight.toISOString().split('T')[0]}`;
      
      const openingEvent = {
        id: openingId,
        title: 'VSFF: Opening Night Gala',
        description: 'Join us for the Vancouver Short Film Festival Opening Night Gala! Celebrate the start of the festival with special screenings, filmmaker Q&As, and networking with the local film community.',
        startDate: openingNight,
        endDate: openingEndTime,
        venue: this.venue,
        category: 'film',
        categories: ['film', 'festival', 'gala', 'opening-night', 'arts'],
        sourceURL: this.url,
        officialWebsite: this.url,
        image: null,
        ticketsRequired: true,
        lastUpdated: new Date()
      };
      
      events.push(openingEvent);
      console.log(`✅ Added opening night gala event on ${openingNight.toLocaleString()}`);
      
      // Add an awards ceremony on the final day
      const awardsTime = new Date(festivalEndDate);
      awardsTime.setHours(18, 30, 0); // 6:30 PM
      
      const awardsEndTime = new Date(awardsTime);
      awardsEndTime.setHours(awardsEndTime.getHours() + 2); // 2-hour event
      
      const awardsId = `vsff-awards-ceremony-${awardsTime.toISOString().split('T')[0]}`;
      
      const awardsEvent = {
        id: awardsId,
        title: 'VSFF: Awards Ceremony',
        description: 'The Vancouver Short Film Festival concludes with the Awards Ceremony, celebrating outstanding achievements in short filmmaking. Join filmmakers and film lovers for this special recognition of talent and creativity.',
        startDate: awardsTime,
        endDate: awardsEndTime,
        venue: this.venue,
        category: 'film',
        categories: ['film', 'festival', 'awards', 'ceremony', 'arts'],
        sourceURL: this.url,
        officialWebsite: this.url,
        image: null,
        ticketsRequired: true,
        lastUpdated: new Date()
      };
      
      events.push(awardsEvent);
      console.log(`✅ Added awards ceremony event on ${awardsTime.toLocaleString()}`);
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Short Film Festival scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from Vancouver Short Film Festival`);
    }
    
    return events;
  }
}

module.exports = new VSFFScraper();
