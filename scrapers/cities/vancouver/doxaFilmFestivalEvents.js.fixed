/**
 * DOXA Documentary Film Festival Events Scraper
 * 
 * This scraper extracts events from the DOXA Documentary Film Festival website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class DoxaFilmFestivalEvents {
  constructor() {
    this.name = 'DOXA Documentary Film Festival';
    this.url = 'https://www.doxafestival.ca';
    this.sourceIdentifier = 'doxa-film-festival';
    this.venue = {
      name: 'DOXA Documentary Film Festival',
      address: 'Various Venues in Vancouver',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2827, lng: -123.1207 } // Downtown Vancouver coordinates
    };
  }
  
  /**
   * Scrape events from DOXA Film Festival website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping DOXA Film Festival Events...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    let events = [];
    
    try {
      const page = await browser.newPage();
      
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set higher timeout for slow sites
      await page.setDefaultNavigationTimeout(45000);
      
      // Block unnecessary resources to speed up scraping
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      // First try to find the films/schedule page
      console.log('Looking for films/schedule page...');
      await page.goto(this.url, { waitUntil: 'networkidle2' });
      
      // Look for schedule/film links in the navigation
      const filmLinks = await page.evaluate(() => {
        const links = [];
        // Look for links containing keywords
        const keywords = ['film', 'schedule', 'program', 'festival', 'lineup'];
        
        document.querySelectorAll('a').forEach(link => {
          const href = link.getAttribute('href');
          const text = link.textContent.toLowerCase();
          
          if (href && keywords.some(keyword => text.includes(keyword) || (href.includes(keyword)))) {
            links.push({
              url: link.href, // Full URL
              text: link.textContent.trim()
            });
          }
        });
        
        return links;
      });
      
      console.log(`Found ${filmLinks.length} potential film/schedule links`);
      
      // Explore each potential film link
      for (const link of filmLinks) {
        if (!link.url.includes('javascript:') && !link.url.includes('mailto:')) {
          console.log(`Exploring link: ${link.text} (${link.url})`);
          
          try {
            await page.goto(link.url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Check if this page has film listings
            const filmInfo = await page.evaluate(() => {
              const films = [];
              const filmElements = document.querySelectorAll('.film, .movie, .event, .program-item, article');
              
              filmElements.forEach(el => {
                // Try to extract film title
                let title = '';
                const titleElement = el.querySelector('h1, h2, h3, h4, .title, .name');
                if (titleElement) {
                  title = titleElement.textContent.trim();
                }
                
                // Try to extract description
                let description = '';
                const descElement = el.querySelector('p, .description, .synopsis');
                if (descElement) {
                  description = descElement.textContent.trim();
                }
                
                // Try to extract image
                let imageUrl = '';
                const imgElement = el.querySelector('img');
                if (imgElement && imgElement.src) {
                  imageUrl = imgElement.src;
                }
                
                // Try to extract date
                let dateText = '';
                const dateElement = el.querySelector('.date, .time, .schedule');
                if (dateElement) {
                  dateText = dateElement.textContent.trim();
                }
                
                // Only add if we have at least a title
                if (title) {
                  films.push({
                    title,
                    description,
                    imageUrl,
                    dateText
                  });
                }
              });
              
              return {
                films,
                pageTitle: document.title,
                url: window.location.href
              };
            });
            
            console.log(`Found ${filmInfo.films.length} potential films on ${link.text}`);
            
            // Process each film
            for (const film of filmInfo.films) {
              if (film.title) {
                // Generate a unique ID for the film
                const eventId = this.generateEventId(film.title);
                
                // Parse the date text if available
                const dateInfo = film.dateText ? 
                  this.parseFestivalDateRange(film.dateText) : 
                  this.inferFestivalDates();
                
                // Create event object
                const event = this.createEventObject(
                  eventId,
                  film.title,
                  film.description,
                  dateInfo.startDate,
                  dateInfo.endDate,
                  film.imageUrl,
                  link.url
                );
                
                events.push(event);
                console.log(`✅ Added film event from link: ${film.title}`);
              }
            }
          } catch (error) {
            console.error(`Error processing film link ${link.url}: ${error.message}`);
          }
        }
      }
      
      // Check for any specific "Festival Dates" mention on homepage
      if (events.length === 0) {
        console.log('Checking for festival dates on homepage...');
        try {
          await page.goto(this.url, { waitUntil: 'networkidle2' });
          
          const festivalInfo = await page.evaluate(() => {
            // Look for festival dates
            const datePattern = /(\d{1,2}(?:st|nd|rd|th)?\s+(?:to|through|–|-)\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{4})?)/i;
            const bodyText = document.body.innerText;
            const dateMatch = bodyText.match(datePattern);
            
            // Look for description of the festival
            const descElements = document.querySelectorAll('p, .description, .about, .content');
            let description = '';
            
            for (const el of descElements) {
              const text = el.textContent.trim();
              if (text && text.length > 100 && (text.length > description.length || description === '')) {
                description = text;
              }
            }
            
            return {
              festivalDateText: dateMatch ? dateMatch[0] : null,
              festivalDescription: description
            };
          });
          
          if (festivalInfo.festivalDateText) {
            console.log(`Found festival date information: ${festivalInfo.festivalDateText}`);
            
            // Parse the festival date range
            const dateInfo = this.parseFestivalDateRange(festivalInfo.festivalDateText);
            
            if (dateInfo) {
              // Create a general festival event
              const eventId = this.generateEventId("DOXA Documentary Film Festival", dateInfo.startDate);
              
              const event = this.createEventObject(
                eventId,
                "DOXA Documentary Film Festival",
                festivalInfo.festivalDescription || "DOXA Documentary Film Festival showcases innovative and thought-provoking documentary films from Canada and around the world.",
                dateInfo.startDate,
                dateInfo.endDate,
                null,
                this.url
              );
              
              events.push(event);
              console.log('✅ Added main festival event');
            }
          }
        } catch (error) {
          console.error(`Error checking festival homepage: ${error.message}`);
        }
      }
      
      // Close the browser
      await browser.close();
      console.log(`🎉 Successfully scraped ${events.length} events from ${this.name}`);
      
      return events;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);
      
      try {
        await browser.close();
      } catch (e) {
        // Browser might already be closed
      }
      
      return [];
    }
  }
  
  /**
   * Parse a festival date range
   * Example: "May 4th to May 14th, 2023"
   */
  parseFestivalDateRange(dateString) {
    try {
      // Current year for reference
      const currentYear = new Date().getFullYear();
      
      // Extract the month names
      const months = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
      };
      
      // Look for month names in the date string
      let startMonth, startDay, endMonth, endDay, year;
      
      // Extract year if present
      const yearMatch = dateString.match(/\d{4}/);
      if (yearMatch) {
        year = parseInt(yearMatch[0]);
      } else {
        year = currentYear; // Default to current year
      }
      
      // Try to parse dates in various formats
      // Format: "Month Day-Day, Year" (e.g., "May 4-14, 2023")
      const singleMonthMatch = dateString.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|through|–|-)\s*(\d{1,2})(?:st|nd|rd|th)?/i);
      
      if (singleMonthMatch) {
        const monthName = singleMonthMatch[1].toLowerCase();
        startMonth = months[monthName];
        endMonth = startMonth; // Same month for both
        startDay = parseInt(singleMonthMatch[2]);
        endDay = parseInt(singleMonthMatch[3]);
      } else {
        // Format: "Month Day to Month Day, Year" (e.g., "May 4th to May 14th, 2023")
        const twoMonthMatch = dateString.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|through|–|-)\s*(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
        
        if (twoMonthMatch) {
          const startMonthName = twoMonthMatch[1].toLowerCase();
          const endMonthName = twoMonthMatch[3].toLowerCase();
          startMonth = months[startMonthName];
          endMonth = months[endMonthName];
          startDay = parseInt(twoMonthMatch[2]);
          endDay = parseInt(twoMonthMatch[4]);
        } else {
          // Couldn't parse the date format
          return null;
        }
      }
      
      // Create date objects
      if (startMonth !== undefined && startDay && endMonth !== undefined && endDay) {
        const startDate = new Date(year, startMonth, startDay);
        const endDate = new Date(year, endMonth, endDay);
        
        // Make sure end date is after start date
        // Handle case where festival might span from December to January
        if (endDate < startDate) {
          endDate.setFullYear(year + 1);
        }
        
        return {
          startDate,
          endDate
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error parsing date range: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Infer festival dates when not available
   * Most film festivals run for about a week, so default to a week from now
   */
  inferFestivalDates() {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Default to a week from now
    
    return { startDate, endDate };
  }
  
  /**
   * Generate a unique event ID
   */
  generateEventId(title, date = new Date()) {
    const baseString = `${this.sourceIdentifier}-${title}-${date.getTime()}`;
    return slugify(baseString, {
      lower: true,
      strict: true
    });
  }
  
  /**
   * Create standardized event object
   */
  createEventObject(id, title, description, startDate, endDate, image, link) {
    // Determine categories based on title
    const categories = this.determineCategories(title);
    
    return {
      id,
      title,
      description: description || `Film screening at ${this.name}`,
      startDate,
      endDate,
      image,
      link,
      venue: this.venue,
      categories,
      sourceIdentifier: this.sourceIdentifier,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Determine event categories based on title
   */
  determineCategories(title) {
    const categories = ['Film', 'Festival', 'Entertainment'];
    
    // Add more specific categories based on the title
    const lowercaseTitle = title.toLowerCase();
    
    if (lowercaseTitle.includes('documentary')) {
      categories.push('Documentary');
    }
    
    if (lowercaseTitle.includes('short')) {
      categories.push('Short Film');
    }
    
    if (lowercaseTitle.includes('panel') || lowercaseTitle.includes('discussion')) {
      categories.push('Discussion');
    }
    
    if (lowercaseTitle.includes('workshop')) {
      categories.push('Workshop');
    }
    
    if (lowercaseTitle.includes('opening') || lowercaseTitle.includes('premiere')) {
      categories.push('Premiere');
    }
    
    if (lowercaseTitle.includes('award')) {
      categories.push('Award Ceremony');
    }
    
    return categories;
  }
}

module.exports = DoxaFilmFestivalEvents;
