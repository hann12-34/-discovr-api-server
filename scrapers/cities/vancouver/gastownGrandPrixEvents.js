/**
 * Global Relay Gastown Grand Prix Events Scraper
 * 
 * Scrapes events from the Global Relay Gastown Grand Prix website
 * https://globalrelayggp.org/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class GastownGrandPrixEvents {
  constructor() {
    this.name = 'Global Relay Gastown Grand Prix';
    this.url = 'https://globalrelayggp.org/';
    this.sourceIdentifier = 'gastown-grand-prix';
  }
  
  /**
   * Scrape events from Gastown Grand Prix website
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
      await page.screenshot({ path: 'gastown-grand-prix-debug.png' });
      console.log('✅ Saved debug screenshot to gastown-grand-prix-debug.png');
      
      // Look for race schedule/information
      await this.navigateToSchedule(page);
      
      // Extract event information
      const raceEvents = await this.extractRaceEvents(page);
      
      if (raceEvents.length > 0) {
        events.push(...raceEvents);
      }
      
      console.log(`🎉 Successfully scraped ${events.length} events from ${this.name}`);
      
    } catch (error) {
      console.error(`❌ Error in ${this.name} scraper: ${error.message}`);
    } finally {
      await browser.close();
    }
    
    return events;
  }
  
  /**
   * Navigate to schedule page if available
   */
  async navigateToSchedule(page) {
    try {
      const scheduleLinks = await page.$$eval('a[href*="schedule"], a[href*="races"], a[href*="events"], a[href*="program"]', links => {
        return links.map(link => ({
          url: link.href,
          text: link.textContent.trim().toLowerCase()
        })).filter(link => 
          link.text.includes('schedule') || 
          link.text.includes('race') || 
          link.text.includes('event') ||
          link.text.includes('program')
        );
      });
      
      if (scheduleLinks.length > 0) {
        const scheduleUrl = scheduleLinks[0].url;
        console.log(`Navigating to schedule page: ${scheduleUrl}`);
        await page.goto(scheduleUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await page.screenshot({ path: 'gastown-grand-prix-schedule-debug.png' });
      } else {
        console.log('No dedicated schedule page found, using main page');
      }
    } catch (error) {
      console.error(`❌ Error navigating to schedule page: ${error.message}`);
    }
  }
  
  /**
   * Extract race events from page
   */
  async extractRaceEvents(page) {
    const events = [];
    
    try {
      // Get race date
      const raceDate = await this.extractRaceDate(page);
      
      if (!raceDate) {
        console.log('Could not determine race date, no events created');
        return [];
      }
      
      // Try to extract race schedule items
      const raceSchedule = await this.extractRaceSchedule(page, raceDate);
      
      if (raceSchedule.length > 0) {
        // Create individual race events
        for (const race of raceSchedule) {
          const event = this.createRaceEvent(race);
          events.push(event);
        }
      } else {
        // Create main event if no individual races found
        const mainEvent = this.createMainEvent(raceDate);
        events.push(mainEvent);
      }
      
    } catch (error) {
      console.error(`❌ Error extracting race events: ${error.message}`);
    }
    
    return events;
  }
  
  /**
   * Extract the race date from the page
   */
  async extractRaceDate(page) {
    try {
      // Get all text content from the page
      const pageText = await page.evaluate(() => document.body.innerText);
      
      // Look for date patterns
      // Format: "July 10, 2024" or "July 10th, 2024" or "10 July 2024"
      const datePatterns = [
        /([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/gi,
        /(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})/gi,
        /(\d{4}\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?)/gi  // 2024 July 10
      ];
      
      // Find all date matches
      let allMatches = [];
      
      for (const pattern of datePatterns) {
        const matches = pageText.match(pattern);
        if (matches) allMatches.push(...matches);
      }
      
      if (allMatches.length >= 1) {
        // Parse date
        const dateStr = allMatches[0].replace(/(\d+)(st|nd|rd|th)/g, '$1');
        const raceDate = new Date(dateStr);
        
        // Set default time to 5:00 PM (races typically start in the evening)
        raceDate.setHours(17, 0, 0, 0);
        
        return raceDate;
      }
      
      // If no full date found, look for year and month
      const yearMatch = pageText.match(/\b(202\d)\b/);  // Match years like 2023, 2024
      const monthMatch = pageText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
      
      if (yearMatch && monthMatch) {
        const year = parseInt(yearMatch[1]);
        const month = this.getMonthNumber(monthMatch[1]);
        
        // Gastown Grand Prix is typically held on a Tuesday in July
        const date = new Date(year, month, 1);
        
        // Find the second Tuesday in the month
        let tuesdayCount = 0;
        while (tuesdayCount < 2) {
          if (date.getDay() === 2) {  // Tuesday
            tuesdayCount++;
          }
          if (tuesdayCount < 2) {
            date.setDate(date.getDate() + 1);
          }
        }
        
        // Set to 5:00 PM
        date.setHours(17, 0, 0, 0);
        
        return date;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error extracting race date: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Extract race schedule from page
   */
  async extractRaceSchedule(page, raceDate) {
    const raceSchedule = [];
    
    try {
      // Look for schedule items in tables, lists, or structured divs
      const scheduleItems = await page.$$eval(
        'table tr, .schedule-item, li, .race-item, .event-item', 
        items => {
          return items.map(item => {
            const text = item.textContent.trim();
            
            // Try to match time and category patterns
            const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/);
            const categoryMatch = text.match(/\b(Youth|Junior|Elite|Masters|Women|Men|Amateur|Pro|Cat)\b/i);
            
            return {
              fullText: text,
              time: timeMatch ? `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}` : null,
              category: categoryMatch ? categoryMatch[0] : null
            };
          }).filter(item => 
            // Keep items that have either time or category information
            (item.time || item.category) &&
            // And don't have ceremony, registration, etc. keywords
            !item.fullText.match(/\b(ceremony|registration|sign|setup|course|close)\b/i)
          );
        }
      );
      
      if (scheduleItems.length > 0) {
        console.log(`Found ${scheduleItems.length} schedule items`);
        
        for (const item of scheduleItems) {
          // Parse the race time
          let startTime;
          let endTime;
          
          if (item.time) {
            startTime = this.parseRaceTime(item.time, raceDate);
            // Races typically last 30-60 minutes
            endTime = startTime ? new Date(startTime.getTime() + 60 * 60 * 1000) : null;
          } else {
            // If no time found, generate sequential times starting from 5:00 PM
            const baseTime = new Date(raceDate);
            baseTime.setHours(17 + scheduleItems.indexOf(item), 0, 0, 0);
            startTime = baseTime;
            endTime = new Date(baseTime.getTime() + 60 * 60 * 1000);
          }
          
          // Generate race title and description
          let title = item.category ? 
            `${this.name}: ${item.category} Race` : 
            `${this.name} Race ${scheduleItems.indexOf(item) + 1}`;
          
          let description = item.fullText || 
            `Part of the ${this.name}, a professional cycling race taking place in the historic Gastown neighborhood of Vancouver.`;
          
          // Create race entry
          raceSchedule.push({
            title,
            description,
            startDate: startTime || raceDate,
            endDate: endTime || new Date(raceDate.getTime() + 60 * 60 * 1000)
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Error extracting race schedule: ${error.message}`);
    }
    
    return raceSchedule;
  }
  
  /**
   * Parse race time from string
   */
  parseRaceTime(timeStr, raceDate) {
    if (!timeStr) return null;
    
    try {
      // Match patterns like "8:30PM", "8:30 PM", "8PM", "8 PM"
      const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)/i);
      
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        
        // Create a new date based on the race date
        const date = new Date(raceDate);
        
        // Set the hours (12-hour format to 24-hour format conversion)
        date.setHours(
          isPM ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours),
          minutes,
          0,
          0
        );
        
        return date;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error parsing race time "${timeStr}": ${error.message}`);
      return null;
    }
  }
  
  /**
   * Create a race event object
   */
  createRaceEvent(race) {
    const id = this.generateEventId(race.title, race.startDate);
    
    return {
      id,
      title: race.title,
      description: race.description,
      startDate: race.startDate.toISOString(),
      endDate: race.endDate.toISOString(),
      venue: {
        name: 'Gastown',
        id: 'gastown-vancouver',
        address: 'Water Street, Gastown',
        city: 'Vancouver',
        state: 'BC',
        country: 'Canada',
        coordinates: {
          lat: 49.2846,
          lng: -123.1086
        },
        websiteUrl: this.url,
        description: 'Historic Gastown district in downtown Vancouver'
      },
      category: 'sports',
      categories: ['sports', 'cycling', 'race', 'outdoor'],
      sourceURL: this.url,
      officialWebsite: this.url,
      image: null,
      ticketsRequired: false,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Create main event object
   */
  createMainEvent(raceDate) {
    const startDate = raceDate;
    const endDate = new Date(raceDate);
    endDate.setHours(endDate.getHours() + 6);  // Typically lasts about 6 hours
    
    const title = `${this.name} ${startDate.getFullYear()}`;
    const description = 'The Global Relay Gastown Grand Prix is part of BC Superweek, featuring professional cycling races in the historic Gastown neighborhood of Vancouver. This prestigious event attracts top cyclists from around the world to compete on a challenging 1.2km circuit.';
    
    const id = this.generateEventId(title, startDate);
    
    return {
      id,
      title,
      description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: {
        name: 'Gastown',
        id: 'gastown-vancouver',
        address: 'Water Street, Gastown',
        city: 'Vancouver',
        state: 'BC',
        country: 'Canada',
        coordinates: {
          lat: 49.2846,
          lng: -123.1086
        },
        websiteUrl: this.url,
        description: 'Historic Gastown district in downtown Vancouver'
      },
      category: 'sports',
      categories: ['sports', 'cycling', 'race', 'outdoor'],
      sourceURL: this.url,
      officialWebsite: this.url,
      image: null,
      ticketsRequired: false,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get month number from name
   */
  getMonthNumber(monthName) {
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    return months[monthName.toLowerCase()];
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

module.exports = new GastownGrandPrixEvents();
