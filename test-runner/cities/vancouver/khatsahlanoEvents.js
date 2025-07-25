/**
 * Khatsahlano Street Party Events Scraper
 * 
 * Scrapes events from the Khatsahlano Street Party website
 * https://www.khatsahlano.ca/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class KhatsahlanoEvents {
  constructor() {
    this.name = 'Khatsahlano Street Party';
    this.url = 'https://www.khatsahlano.ca/';
    this.sourceIdentifier = 'khatsahlano-events';
  }
  
  /**
   * Scrape events from Khatsahlano Street Party website
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
      await page.screenshot({ path: 'khatsahlano-debug.png' });
      console.log('✅ Saved debug screenshot to khatsahlano-debug.png');
      
      // Extract festival date information from the page
      const dateInfo = await this.extractFestivalDate(page);
      
      if (dateInfo) {
        // Create main festival event
        const mainEvent = this.createMainFestivalEvent(dateInfo);
        events.push(mainEvent);
        
        // Extract and add music lineup events
        const lineupEvents = await this.extractLineupEvents(page, dateInfo);
        if (lineupEvents.length > 0) {
          events.push(...lineupEvents);
        }
      } else {
        console.log('No date information found for Khatsahlano Street Party. No events created.');
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
   * Extract festival date information
   */
  async extractFestivalDate(page) {
    try {
      // Get all text content from the page
      const pageText = await page.evaluate(() => document.body.innerText);
      
      // Look for date patterns in text
      // Common formats: "July 6, 2024", "July 6th 2024", "July 6 2024"
      const datePatterns = [
        /([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/gi,  // "July 6th, 2024" or "July 6, 2024"
        /(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})/gi   // "6th July, 2024" or "6 July 2024"
      ];
      
      // Extract date matches
      let dateMatches = [];
      for (const pattern of datePatterns) {
        const matches = pageText.match(pattern);
        if (matches) dateMatches.push(...matches);
      }
      
      // If date found, parse it
      if (dateMatches.length > 0) {
        // Clean up the date string (remove ordinals like "th", "st", etc.)
        const cleanDateStr = dateMatches[0].replace(/(\d+)(st|nd|rd|th)/g, '$1');
        
        // Parse the date
        const festivalDate = new Date(cleanDateStr);
        
        // Default time: 11am to 9pm (common for Khatsahlano)
        festivalDate.setHours(11, 0, 0, 0);  // 11:00 AM
        const endDate = new Date(festivalDate);
        endDate.setHours(21, 0, 0, 0);  // 9:00 PM
        
        return {
          startDate: festivalDate,
          endDate: endDate
        };
      }
      
      // If no specific date found, look for year + month references
      const yearMatch = pageText.match(/\b(202\d)\b/);  // Match years like 2023, 2024, etc.
      const monthMatch = pageText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
      
      if (yearMatch && monthMatch) {
        const year = parseInt(yearMatch[1]);
        const month = this.getMonthNumber(monthMatch[1]);
        
        // Khatsahlano is typically on a Saturday in July
        const date = new Date(year, month, 1);
        
        // Find the first Saturday in the month
        while (date.getDay() !== 6) {
          date.setDate(date.getDate() + 1);
        }
        
        // Set festival hours (11am - 9pm)
        date.setHours(11, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(21, 0, 0, 0);
        
        return {
          startDate: date,
          endDate: endDate
        };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error extracting festival date: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Extract lineup events
   */
  async extractLineupEvents(page, dateInfo) {
    const lineupEvents = [];
    
    try {
      // Extract artist/lineup information
      const artists = await page.$$eval('.artist-item, .lineup-item, .performer, .music-lineup li', 
        items => items.map(item => {
          const name = item.querySelector('h3, h4, .name, strong')?.textContent.trim() || 
                      item.textContent.trim();
          const time = item.querySelector('.time')?.textContent.trim() || '';
          const stage = item.querySelector('.stage, .venue')?.textContent.trim() || '';
          const description = item.querySelector('p, .description')?.textContent.trim() || '';
          const image = item.querySelector('img')?.src || '';
          
          return { name, time, stage, description, image };
        }).filter(artist => artist.name && artist.name.length > 1)
      );
      
      if (artists && artists.length > 0) {
        console.log(`Found ${artists.length} artists/performers in lineup`);
        
        for (const artist of artists) {
          // Parse performance time if available
          const startTime = this.parsePerformanceTime(artist.time, dateInfo.startDate);
          const endTime = startTime ? new Date(startTime.getTime() + (45 * 60000)) : null; // Default 45 min set
          
          // Use festival start/end times if specific times not available
          const eventStartDate = startTime || dateInfo.startDate;
          const eventEndDate = endTime || dateInfo.endDate;
          
          // Create event for this artist
          const eventTitle = `${artist.name} at ${this.name}`;
          const eventDesc = artist.description || 
                           `${artist.name} performing at the ${this.name} festival` +
                           (artist.stage ? ` on the ${artist.stage} stage.` : '.');
          
          const eventId = this.generateEventId(eventTitle, eventStartDate);
          
          // Create event object
          const event = this.createEventObject(
            eventId,
            eventTitle,
            eventDesc,
            eventStartDate,
            eventEndDate,
            artist.image,
            this.url,
            artist.stage || 'Main Stage'
          );
          
          lineupEvents.push(event);
        }
      } else {
        // Try alternative selectors if no artists found
        const mainContent = await page.evaluate(() => document.body.innerText);
        const artistMatches = mainContent.match(/[A-Z][a-z]+\s+[A-Z][a-z]+\s+[\d:]+\s*(PM|AM)/g);
        
        if (artistMatches && artistMatches.length > 0) {
          for (const match of artistMatches) {
            const parts = match.split(/\s+/);
            if (parts.length >= 4) {
              const name = `${parts[0]} ${parts[1]}`;
              const timeStr = `${parts[2]} ${parts[3]}`;
              
              // Parse the time
              const startTime = this.parsePerformanceTime(timeStr, dateInfo.startDate);
              const endTime = startTime ? new Date(startTime.getTime() + (45 * 60000)) : null;
              
              // Create event
              const eventTitle = `${name} at ${this.name}`;
              const eventDesc = `${name} performing at the ${this.name} festival.`;
              const eventId = this.generateEventId(eventTitle, startTime || dateInfo.startDate);
              
              // Create event object
              const event = this.createEventObject(
                eventId,
                eventTitle,
                eventDesc,
                startTime || dateInfo.startDate,
                endTime || dateInfo.endDate,
                null,
                this.url,
                'Main Stage'
              );
              
              lineupEvents.push(event);
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error extracting lineup events: ${error.message}`);
    }
    
    return lineupEvents;
  }
  
  /**
   * Parse performance time from string
   */
  parsePerformanceTime(timeStr, festivalDate) {
    if (!timeStr) return null;
    
    try {
      // Clean up the time string
      timeStr = timeStr.trim();
      
      // Match patterns like "8:30PM", "8:30 PM", "8PM", "8 PM"
      const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/i);
      
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        
        // Create a new date based on the festival date
        const date = new Date(festivalDate);
        
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
      console.error(`❌ Error parsing performance time "${timeStr}": ${error.message}`);
      return null;
    }
  }
  
  /**
   * Create main festival event object
   */
  createMainFestivalEvent(dateInfo) {
    const title = `${this.name} ${dateInfo.startDate.getFullYear()}`;
    const description = 'Khatsahlano Street Party is Vancouver\'s largest free music and arts festival. Taking place on West 4th Avenue, this event features multiple stages with live music performances, art installations, street performers, and local food vendors.';
    
    const id = this.generateEventId(title, dateInfo.startDate);
    
    return this.createEventObject(
      id,
      title,
      description,
      dateInfo.startDate,
      dateInfo.endDate,
      null,
      this.url,
      'West 4th Avenue'
    );
  }
  
  /**
   * Get month number from name
   */
  getMonthNumber(monthName) {
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    return months[monthName.toLowerCase()];
  }
  
  /**
   * Create event object
   */
  createEventObject(id, title, description, startDate, endDate, image, sourceURL, stageName = null) {
    return {
      id,
      title,
      description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: {
        name: stageName ? `${this.name} - ${stageName}` : this.name,
        id: this.sourceIdentifier,
        address: '4th Avenue between Burrard St and MacDonald St',
        city: 'Vancouver',
        state: 'BC',
        country: 'Canada',
        coordinates: {
          lat: 49.2682,
          lng: -123.1696
        },
        websiteUrl: this.url,
        description: 'Khatsahlano Street Party spans 10 blocks along West 4th Avenue in Kitsilano.'
      },
      category: 'festival',
      categories: ['festival', 'music', 'art', 'food', 'street-party'],
      sourceURL,
      officialWebsite: this.url,
      image,
      ticketsRequired: false,
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

module.exports = new KhatsahlanoEvents();
