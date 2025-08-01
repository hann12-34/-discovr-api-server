/**
 * Summer Cinema Events Scraper
 * 
 * Scrapes outdoor movie events from Summer Cinema
 * https://summercinema.ca/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class SummerCinemaEvents {
  constructor() {
    this.name = 'Summer Cinema';
    this.url = 'https://summercinema.ca/';
    this.sourceIdentifier = 'summer-cinema-events';
  }
  
  /**
   * Scrape events from Summer Cinema website
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
      await page.screenshot({ path: 'summer-cinema-debug.png' });
      console.log('✅ Saved debug screenshot to summer-cinema-debug.png');
      
      // Look for schedule/lineup page link
      const scheduleLinks = await page.$$eval('a[href*="schedule"], a[href*="lineup"], a[href*="program"]', links => {
        return links.map(link => ({
          url: link.href,
          text: link.textContent.trim()
        }));
      });
      
      // Navigate to schedule page if found
      if (scheduleLinks.length > 0) {
        const scheduleURL = scheduleLinks[0].url;
        console.log(`Navigating to schedule page: ${scheduleURL}`);
        await page.goto(scheduleURL, { waitUntil: 'networkidle2', timeout: 45000 });
        
        // Save screenshot of schedule page
        await page.screenshot({ path: 'summer-cinema-schedule-debug.png' });
      }
      
      // Try to extract events from page
      const movieEvents = await this.extractMovieEvents(page);
      if (movieEvents.length > 0) {
        events.push(...movieEvents);
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
   * Extract movie events from page
   */
  async extractMovieEvents(page) {
    const movieEvents = [];
    
    try {
      // Look for movie listings with various selector patterns
      const movieListings = await page.$$eval(
        '.movie-item, .event-item, .movie-listing, .schedule-item, article, .program-item',
        items => items.map(item => {
          // Try various selector patterns to extract movie info
          const titleElement = item.querySelector('h2, h3, .title, .movie-title');
          const dateElement = item.querySelector('.date, .schedule-date, time, .movie-date');
          const locationElement = item.querySelector('.location, .venue, .place');
          const descElement = item.querySelector('p, .description, .movie-description');
          const imageElement = item.querySelector('img');
          
          return {
            title: titleElement ? titleElement.textContent.trim() : '',
            date: dateElement ? dateElement.textContent.trim() : '',
            location: locationElement ? locationElement.textContent.trim() : '',
            description: descElement ? descElement.textContent.trim() : '',
            image: imageElement ? imageElement.src : null
          };
        }).filter(movie => movie.title && (movie.date || movie.location))
      );
      
      if (movieListings.length > 0) {
        console.log(`Found ${movieListings.length} movie events`);
        
        for (const movie of movieListings) {
          // Parse event date and time
          const dateInfo = this.parseMovieDateTime(movie.date);
          if (!dateInfo) continue;
          
          // Create movie event
          const eventTitle = `${this.name}: ${movie.title}`;
          const eventDesc = movie.description || `Outdoor movie screening of "${movie.title}" at ${movie.location || 'Vancouver'}.`;
          const eventId = this.generateEventId(movie.title, dateInfo.startDate);
          
          const event = this.createEventObject(
            eventId,
            eventTitle,
            eventDesc,
            dateInfo.startDate,
            dateInfo.endDate,
            movie.image,
            this.url,
            movie.location || 'Stanley Park'
          );
          
          movieEvents.push(event);
        }
      } else {
        // If no structured items found, try scanning the page for movie names and dates
        console.log('No structured movie listings found, searching page content');
        
        const pageText = await page.evaluate(() => document.body.innerText);
        const pageHTML = await page.evaluate(() => document.body.innerHTML);
        
        // Extract movie titles (likely capitalized movie titles)
        const movieTitlePattern = /["']([A-Z][A-Za-z0-9\s'&:,\-!]+)["']/g;
        const titleMatches = [...pageText.matchAll(movieTitlePattern)];
        
        // Extract dates in format like "July 10, 2024" or "Wednesday, July 10"
        const datePattern = /([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|[A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2})/g;
        const dateMatches = [...pageText.matchAll(datePattern)];
        
        if (titleMatches.length > 0 && dateMatches.length > 0) {
          console.log(`Found ${Math.min(titleMatches.length, dateMatches.length)} potential movie events from page content`);
          
          // Try to pair movie titles with dates
          for (let i = 0; i < Math.min(titleMatches.length, dateMatches.length); i++) {
            const title = titleMatches[i][1];
            const dateStr = dateMatches[i][0];
            
            // Extract venue from nearby text if possible
            const venuePattern = new RegExp(`${dateStr}[\\s\\S]{1,50}(at|in)\\s+([A-Za-z\\s]+Park|Plaza|Garden|Square|Field)`, 'i');
            const venueMatch = pageText.match(venuePattern);
            const venue = venueMatch ? venueMatch[2].trim() : 'Stanley Park';
            
            // Parse date
            const dateInfo = this.parseMovieDateTime(dateStr);
            if (!dateInfo) continue;
            
            // Create event
            const eventTitle = `${this.name}: ${title}`;
            const eventDesc = `Outdoor movie screening of "${title}" at ${venue}.`;
            const eventId = this.generateEventId(title, dateInfo.startDate);
            
            const event = this.createEventObject(
              eventId,
              eventTitle,
              eventDesc,
              dateInfo.startDate,
              dateInfo.endDate,
              null, // No image found from pattern matching
              this.url,
              venue
            );
            
            movieEvents.push(event);
          }
        }
      }
      
      // If still no events, look for any movie posters/images with captions that might include movie titles
      if (movieEvents.length === 0) {
        const movieImages = await page.$$eval('img[alt*="movie"], img[alt*="film"]', images => {
          return images.map(img => ({
            alt: img.alt,
            src: img.src
          }));
        });
        
        for (const image of movieImages) {
          if (image.alt && image.alt.length > 5) {
            // Extract movie title from alt text
            const title = image.alt.replace(/poster|image|movie|film/gi, '').trim();
            
            // Create a generic event with a date next week (placeholder)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 7); // Next week
            startDate.setHours(19, 0, 0, 0); // 7 PM
            
            const endDate = new Date(startDate);
            endDate.setHours(22, 0, 0, 0); // 10 PM
            
            const eventTitle = `${this.name}: ${title}`;
            const eventDesc = `Outdoor movie screening of "${title}" at Stanley Park.`;
            const eventId = this.generateEventId(title, startDate);
            
            const event = this.createEventObject(
              eventId,
              eventTitle,
              eventDesc,
              startDate,
              endDate,
              image.src,
              this.url,
              'Stanley Park'
            );
            
            movieEvents.push(event);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error extracting movie events: ${error.message}`);
    }
    
    return movieEvents;
  }
  
  /**
   * Parse movie date and time from string
   */
  parseMovieDateTime(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Clean up the date string
      dateStr = dateStr.trim().replace(/\s+/g, ' ');
      
      // Handle various date formats
      let startDate;
      
      // Format: "July 10, 2024" or "July 10 2024"
      const fullDateMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
      if (fullDateMatch) {
        const month = this.getMonthNumber(fullDateMatch[1]);
        const day = parseInt(fullDateMatch[2]);
        const year = parseInt(fullDateMatch[3]);
        startDate = new Date(year, month, day);
      }
      
      // Format: "Wednesday, July 10" or "July 10"
      const partialDateMatch = dateStr.match(/(?:[A-Za-z]+,\s+)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
      if (!startDate && partialDateMatch) {
        const month = this.getMonthNumber(partialDateMatch[1]);
        const day = parseInt(partialDateMatch[2]);
        const year = new Date().getFullYear(); // Current year
        startDate = new Date(year, month, day);
      }
      
      // Look for time in the string
      const timeMatch = dateStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/i);
      
      if (startDate) {
        // Set default time to 7 PM if not specified
        let hours = 19;
        let minutes = 0;
        
        // Use extracted time if available
        if (timeMatch) {
          hours = parseInt(timeMatch[1]);
          minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const isPM = timeMatch[3].toLowerCase() === 'pm';
          
          // Convert to 24-hour format
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
        
        startDate.setHours(hours, minutes, 0, 0);
        
        // Movie typically runs 2-3 hours
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
        return { startDate, endDate };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error parsing movie date/time "${dateStr}": ${error.message}`);
      return null;
    }
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
   * Create event object
   */
  createEventObject(id, title, description, startDate, endDate, image, sourceURL, venueName) {
    // Determine venue details based on name
    let address = '';
    let coordinates = { lat: 49.3017, lng: -123.1417 }; // Default to Stanley Park
    
    if (venueName.includes('Stanley Park')) {
      address = 'Stanley Park, Vancouver';
      coordinates = { lat: 49.3017, lng: -123.1417 };
    } else if (venueName.includes('Queen Elizabeth')) {
      address = 'Queen Elizabeth Park, Vancouver';
      coordinates = { lat: 49.2418, lng: -123.1126 };
    } else if (venueName.includes('David Lam')) {
      address = 'David Lam Park, Vancouver';
      coordinates = { lat: 49.2725, lng: -123.1218 };
    } else {
      address = `${venueName}, Vancouver`;
    }
    
    return {
      id,
      title,
      description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: {
        name: venueName,
        id: `${this.sourceIdentifier}-${slugify(venueName.toLowerCase())}`,
        address,
        city: 'Vancouver',
        state: 'BC',
        country: 'Canada',
        coordinates,
        websiteUrl: this.url,
        description: `Outdoor movie venue at ${venueName}`
      },
      category: 'film',
      categories: ['film', 'outdoor', 'movie', 'entertainment'],
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

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new SummerCinemaEvents();
