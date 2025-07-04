/**
 * Fox Cabaret venue scraper for Vancouver
 * Website: https://www.foxcabaret.com/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

/**
 * Fox Cabaret scraper class
 */
class FoxCabaretScraper {
  constructor() {
    this.name = 'Fox Cabaret';
    this.url = 'https://www.foxcabaret.com/'; // Use the homepage which lists upcoming events
    this.sourceIdentifier = 'vancouver-foxcabaret';
  }

  /**
   * Scrape events from Fox Cabaret
   * @returns {Promise<Array>} - Array of events
   */
  async scrape() {
    console.log(`Starting scrape of ${this.name}...`);
    
    try {
      // First try with Axios + Cheerio (faster)
      return await this.scrapeWithAxiosCheerio();
    } catch (error) {
      console.log(`Axios/Cheerio method failed for ${this.name}, falling back to Puppeteer:`, error.message);
      
      // Fallback to Puppeteer for JavaScript-heavy pages
      return await this.scrapeWithPuppeteer();
    }
  }

  /**
   * Scrape with Axios and Cheerio (faster, but may not work with JS-rendered content)
   * @returns {Promise<Array>} - Array of events
   */
  async scrapeWithAxiosCheerio() {
    const events = [];
    
    try {
      // Request the Fox Cabaret homepage
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);
      
      // Look for event links on the homepage - they appear in a specific pattern
      // Each event has a date link followed by title link and description
      const eventLinks = $('a[href*="monthly-calendar-list"]');
      console.log(`Found ${eventLinks.length} potential event links on Fox Cabaret homepage`);
      
      const processedEvents = new Set(); // Track processed events to avoid duplicates
      
      // Each event typically has date + title links, so we need to process them in pairs
      for (let i = 0; i < eventLinks.length; i++) {
        try {
          const element = eventLinks[i];
          const $element = $(element);
          const linkText = $element.text().trim();
          const href = $element.attr('href') || '';
          
          // Skip if no href
          if (!href) continue;
          
          // Check if this is a date link (typically starts with month abbreviation)
          const isDateLink = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+/.test(linkText);
          
          if (isDateLink && i + 1 < eventLinks.length) {
            // Get the event title from the next link
            const $titleElement = $(eventLinks[i + 1]);
            const title = $titleElement.text().trim();
            const titleHref = $titleElement.attr('href') || '';
            
            // Skip if already processed or if title is too short
            if (!title || title.length < 3 || processedEvents.has(title)) continue;
            processedEvents.add(title);
            
            // Get description (usually the text after the title link)
            let description = '';
            if ($titleElement.next().is('p')) {
              description = $titleElement.next().text().trim();
            } else {
              description = `${title} at Fox Cabaret - An exciting event in Vancouver's Mount Pleasant neighborhood.`;
            }
            
            // Parse date from the date link text (e.g., "Jun 27")
            const [monthName, dayStr] = linkText.trim().split(/\s+/);
            const day = parseInt(dayStr, 10);
            const month = this.getMonthIndex(monthName);
            const year = new Date().getFullYear(); // Default to current year
            
            // Create date - default to 8PM if no time specified
            const eventDate = new Date(year, month, day, 20, 0, 0, 0);
            
            // Adjust date if needed - assume events are within the next ~6 months
            const now = new Date();
            
            // If date is in the past, adjust forward, but never more than 6 months ahead
            if (eventDate < now) {
              // First try current year + 1 month (for events next month that might appear past)
              eventDate.setMonth(eventDate.getMonth() + 1);
              
              // If still in the past, set to next available date this year
              if (eventDate < now) {
                eventDate.setMonth(month); // Reset to original month
                eventDate.setDate(day);   // Reset to original day
                
                // Only increment year if we're more than 6 months in the past
                // This avoids putting events too far in the future
                const sixMonthsAgo = new Date(now);
                sixMonthsAgo.setMonth(now.getMonth() - 6);
                
                if (eventDate < sixMonthsAgo) {
                  eventDate.setFullYear(year + 1);
                }
              }
            }
            
            // Create end date (3 hours after start for typical show)
            const endDate = new Date(eventDate.getTime() + (3 * 60 * 60 * 1000));
            
            // Determine categories based on title and description
            const categories = this.determineCategories(title);
            
            // Construct the full event page URL
            const eventUrl = titleHref.startsWith('http') ? titleHref : `https://www.foxcabaret.com${titleHref}`;
            
            // Create event object with iOS app compatibility
            events.push({
              id: `foxcabaret-${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${eventDate.getTime()}`,
              name: title,
              title: title,
              description: description,
              image: 'https://scoutmagazine.ca/wp-content/uploads/2014/11/Fox-Cabaret-Comedy.jpg',
              date: eventDate.toISOString(), // Add ISO date string for iOS compatibility
              startDate: eventDate,
              endDate: endDate,
              season: this.determineSeason(eventDate),
              category: categories[0], // Single category for iOS compatibility
              categories: categories,
              location: this.name,
              venue: {
                name: this.name,
                address: '2321 Main St',
                city: 'Vancouver',
                state: 'BC',
                country: 'Canada',
                coordinates: { lat: 49.2635, lng: -123.1006 }
              },
              sourceURL: this.url,
              officialWebsite: eventUrl
            });
            
            // Skip the next link as we've already processed it as the title
            i++;
          }
        } catch (eventError) {
          console.error(`Error processing Fox Cabaret homepage event:`, eventError);
        }
      }
      
      console.log(`Fox Cabaret: Found ${events.length} events via Axios/Cheerio`);
      return events;
    } catch (error) {
      console.error('Error scraping Fox Cabaret with Axios/Cheerio:', error.message);
      throw error;
    }
  }
  
  /**
   * Get month index from name (0-indexed, where January is 0)
   * @param {string} monthName - Month name
   * @returns {number} - Month index (0-11)
   */
  getMonthIndex(monthName) {
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5, 
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    return months[monthName.toLowerCase()] || 0;
  }

  /**
   * Scrape with Puppeteer (slower but handles JS-rendered content)
   * @returns {Promise<Array>} - Array of events
   */
  async scrapeWithPuppeteer() {
    let browser = null;
    const events = [];
    
    try {
      browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set viewport to ensure proper rendering
      await page.setViewport({ width: 1366, height: 768 });
      
      // Navigate to the Fox Cabaret homepage
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load (using waitForSelector instead of waitForTimeout)
      await page.waitForSelector('a[href*="monthly-calendar-list"]', { timeout: 5000 }).catch(() => {
        console.log('Events selector not found, but continuing anyway');
      });
      
      // Extract the events from the homepage
      const homeEvents = await page.evaluate(() => {
        // Parse month abbreviation to index (0-11)
        function getMonthIndex(monthAbbr) {
          const months = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };
          return months[monthAbbr.toLowerCase()] || 0;
        }
        
        const events = [];
        const processedTitles = new Set();
        
        // Get all event links
        const eventLinks = document.querySelectorAll('a[href*="monthly-calendar-list"]');
        
        // Process event links as pairs (date link + title link)
        for (let i = 0; i < eventLinks.length; i++) {
          try {
            const link = eventLinks[i];
            const linkText = link.innerText.trim();
            const href = link.getAttribute('href') || '';
            
            // Skip if no href
            if (!href) continue;
            
            // Check if this is a date link (e.g., "Jun 27")
            const isDateLink = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+/.test(linkText);
            
            if (isDateLink && i + 1 < eventLinks.length) {
              // Get event title from the next link
              const titleLink = eventLinks[i + 1];
              const title = titleLink.innerText.trim();
              const titleHref = titleLink.getAttribute('href') || '';
              
              // Skip if already processed or title is too short
              if (!title || title.length < 3 || processedTitles.has(title)) continue;
              processedTitles.add(title);
              
              // Parse date (e.g., "Jun 27")
              const [monthName, dayStr] = linkText.trim().split(/\s+/);
              const day = parseInt(dayStr, 10);
              const month = getMonthIndex(monthName);
              
              // Get the description (paragraph after the title link) if available
              let description = '';
              const nextElement = titleLink.nextElementSibling;
              if (nextElement && nextElement.tagName === 'P') {
                description = nextElement.innerText.trim();
              } else {
                description = `${title} at Fox Cabaret - An exciting event in Vancouver's Mount Pleasant neighborhood.`;
              }
              
              // Create event object
              events.push({
                title,
                dateText: linkText,
                day,
                month,
                description,
                url: titleHref,
                // Look for nearby images
                imageUrl: ''
              });
              
              // Skip the next link as we've already processed it as the title
              i++;
            }
          } catch (err) {
            console.error('Error parsing event:', err);
          }
        }
        
        return { eventsList: events };
      });
      
      console.log(`Found ${homeEvents.eventsList.length} events on Fox Cabaret homepage`); 
      
      // Process each event from the homepage
      for (const item of homeEvents.eventsList) {
        try {
          // Create date object for the event
          const year = new Date().getFullYear(); // Default to current year
          const eventDate = new Date(year, item.month, item.day, 20, 0, 0, 0); // Default to 8PM
          
          // Adjust date if needed - assume events are within the next ~6 months
          const now = new Date();
          
          // If date is in the past, adjust forward, but never more than 6 months ahead
          if (eventDate < now) {
            // First try current year + 1 month (for events next month that might appear past)
            eventDate.setMonth(eventDate.getMonth() + 1);
            
            // If still in the past, set to next available date this year
            if (eventDate < now) {
              eventDate.setMonth(item.month); // Reset to original month
              eventDate.setDate(item.day);   // Reset to original day
              
              // Only increment year if we're more than 6 months in the past
              // This avoids putting events too far in the future
              const sixMonthsAgo = new Date(now);
              sixMonthsAgo.setMonth(now.getMonth() - 6);
              
              if (eventDate < sixMonthsAgo) {
                eventDate.setFullYear(year + 1);
              }
            }
          }
          
          // Create end date (3 hours after start for typical show)
          const endDate = new Date(eventDate.getTime() + (3 * 60 * 60 * 1000));
          
          // Determine categories based on title
          const categories = this.determineCategories(item.title);
          
          // Create event object with iOS app compatibility
          events.push({
            id: `foxcabaret-${item.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${eventDate.getTime()}`,
            name: item.title,
            title: item.title,
            description: item.description || `${item.title} at Fox Cabaret - Join us for an exciting event in Vancouver's Mount Pleasant neighborhood.`,
            image: item.imageUrl || 'https://scoutmagazine.ca/wp-content/uploads/2014/11/Fox-Cabaret-Comedy.jpg',
            date: eventDate.toISOString(),
            startDate: eventDate,
            endDate: endDate,
            season: this.determineSeason(eventDate),
            category: categories[0],
            categories: categories,
            location: this.name,
            venue: {
              name: this.name,
              address: '2321 Main St',
              city: 'Vancouver',
              state: 'BC',
              country: 'Canada',
              coordinates: { lat: 49.2635, lng: -123.1006 }
            },
            sourceURL: this.url,
            officialWebsite: item.url ? (item.url.startsWith('http') ? item.url : `https://www.foxcabaret.com${item.url.startsWith('/') ? '' : '/'}${item.url}`) : 'https://www.foxcabaret.com'
          });
        } catch (eventError) {
          console.error(`Error processing calendar event:`, eventError);
        }
      }
      
      // If the calendar parsing didn't work, try for individual event links
      if (events.length === 0) {
        console.log('No events found in calendar, trying to find individual event links...');
        
        // Extract all links that might be events
        const eventLinks = await page.evaluate(() => {
          const links = [];
          const aElements = document.querySelectorAll('a[href*="event"], a[href*="shows"]');
          
          aElements.forEach(link => {
            if (!link.href.includes('#') && !link.href.includes('mailto:')) {
              links.push({
                url: link.href,
                title: link.innerText.trim() || link.getAttribute('title') || ''
              });
            }
          });
          
          return links;
        });
        
        console.log(`Found ${eventLinks.length} potential event links`);
        
        // Process a limited number of event links to avoid excessive navigation
        const maxLinksToProcess = 5;
        let processedCount = 0;
        
        for (const link of eventLinks) {
          try {
            // Skip links without meaningful titles or URLs
            if (!link.url || !link.title || link.title.length < 3) continue;
            
            // Filter out navigation links and non-event content
            const lowerTitle = link.title.toLowerCase();
            const nonEventTitles = ['home', 'about', 'contact', 'tickets', 'menu', 'private events',
                                'upcoming events', 'book now', 'book a table', 'social', 'instagram', 'facebook',
                                'twitter', 'news', 'blog', 'food', 'drinks', 'hours', 'location',
                                'directions', 'calendar', 'events', 'archive', 'sitemap', 'faq', 'donate',
                                'terms', 'privacy policy', 'subscribe', 'newsletter', 'sign up'];
            
            // Skip generic navigation items
            if (nonEventTitles.includes(lowerTitle) || lowerTitle.length < 5) continue;
            
            // Skip items that look like navigation elements
            if (lowerTitle.includes('view all') || lowerTitle.includes('see more') ||
                lowerTitle.includes('learn more') || lowerTitle.includes('read more')) continue;
            
            // Only process a limited number of links
            if (processedCount >= maxLinksToProcess) break;
            
            // Navigate to the event page
            console.log(`Navigating to event page: ${link.url}`);
            await page.goto(link.url, { waitUntil: 'networkidle2', timeout: 15000 });
            
            // Extract event details from the page
            const eventDetails = await page.evaluate(() => {
              const title = document.querySelector('h1, h2, .title, .event-title')?.innerText?.trim() ||
                            document.title.replace('Fox Cabaret', '').replace('|', '').trim();
              
              const dateEl = document.querySelector('.date, time, .meta, .info');
              const dateText = dateEl?.innerText?.trim() || '';
              
              const imgEl = document.querySelector('main img, .event img, article img');
              const imageSrc = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : '';
              
              const description = document.querySelector('.description, .content, p')?.innerText?.trim() || '';
              
              return { title, dateText, imageSrc, description };
            });
            
            // Use the more detailed title if it exists
            const eventTitle = eventDetails.title || link.title;
            
            // Try to parse the date
            let eventDate = this.parseTextForDate(eventDetails.dateText || '');
            
            // If no date found, create a future date based on the index
            if (!eventDate) {
              eventDate = new Date();
              eventDate.setDate(eventDate.getDate() + processedCount + 1); // Add days to spread out events
              eventDate.setHours(20, 0, 0, 0); // Default to 8pm for events
            }
            
            // Create end date (3 hours after start for typical show)
            const endDate = new Date(eventDate.getTime() + (3 * 60 * 60 * 1000));
            
            // Determine categories based on title
            const categories = this.determineCategories(eventTitle);
            
            // Create event object with iOS app compatibility
            events.push({
              id: `foxcabaret-${eventTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${eventDate.getTime()}`,
              name: eventTitle,
              title: eventTitle,
              description: eventDetails.description || `${eventTitle} at Fox Cabaret - A unique venue in Vancouver's Mount Pleasant neighborhood featuring live music, comedy, film screenings, and more.`,
              image: eventDetails.imageSrc || 'https://scoutmagazine.ca/wp-content/uploads/2014/11/Fox-Cabaret-Comedy.jpg',
              date: eventDate.toISOString(),
              startDate: eventDate,
              endDate: endDate,
              season: this.determineSeason(eventDate),
              category: categories[0],
              categories: categories,
              location: this.name,
              venue: {
                name: this.name,
                address: '2321 Main St',
                city: 'Vancouver',
                state: 'BC',
                country: 'Canada',
                coordinates: { lat: 49.2635, lng: -123.1006 }
              },
              sourceURL: this.url,
              officialWebsite: link.url || 'https://www.foxcabaret.com'
            });
            
            processedCount++;
          } catch (linkError) {
            console.error(`Error processing event link: ${link.url}`, linkError.message);
          }
        }
      }
      
      // Log if we couldn't find any real events or found only non-event links
      if (events.length === 0 || events.every(e => e.title.toLowerCase().includes('private events') || e.title.toLowerCase().includes('upcoming events'))) {
        console.log('No valid Fox Cabaret events found via Puppeteer scraper');
        // Clear out any non-event items we might have found
        events.length = 0;
        
        // Note: We no longer need to add sample events as the main scrapers are working reliably
      }
      
      console.log(`Fox Cabaret: Created ${events.length} events via Puppeteer`);
      return events;
    } catch (error) {
      console.error('Error scraping Fox Cabaret with Puppeteer:', error);
      return []; // Return empty array on error
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Parse date and time strings into a Date object
   * @param {string} dateStr - Date string from the website
   * @param {string} timeStr - Time string from the website
   * @returns {Date} - JavaScript Date object
   */
  parseDateTime(dateStr, timeStr) {
    try {
      // Example format: "Jul 20, 2025" and "7:30pm"
      const dateTimeParts = {
        date: dateStr,
        time: timeStr
      };
      
      // Default to current date/time if parsing fails
      const now = new Date();
      
      // Try to parse date
      let dateObj = new Date(dateTimeParts.date);
      
      // If date is valid, try to add time
      if (!isNaN(dateObj.getTime()) && dateTimeParts.time) {
        const timeParts = dateTimeParts.time.match(/(\d+):(\d+)(am|pm)?/i);
        
        if (timeParts) {
          let hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);
          const ampm = timeParts[3]?.toLowerCase();
          
          // Handle 12-hour format with am/pm
          if (ampm === 'pm' && hours < 12) {
            hours += 12;
          } else if (ampm === 'am' && hours === 12) {
            hours = 0;
          }
          
          dateObj.setHours(hours, minutes, 0, 0);
        }
      } else {
        // Fallback to current date
        dateObj = now;
      }
      
      return dateObj;
    } catch (error) {
      console.error('Error parsing date/time:', error);
      return new Date(); // Return current date/time on error
    }
  }
  
  /**
   * Parse date and time from various text formats
   * @param {string} text - Text that might contain date information
   * @returns {Date|null} - JavaScript Date object or null if no date found
   */
  parseTextForDate(text) {
    try {
      if (!text) return null;
      
      const lowerText = text.toLowerCase();
      const now = new Date();
      const result = new Date();
      
      // Extract month names or numbers
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december'];
      const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      
      // Try to find a month in the text
      let foundMonth = false;
      let month = -1;
      
      // Check for month names
      for (let i = 0; i < months.length; i++) {
        if (lowerText.includes(months[i]) || lowerText.includes(monthAbbr[i])) {
          month = i;
          foundMonth = true;
          break;
        }
      }
      
      // Check for numeric month (MM/DD format)
      if (!foundMonth) {
        const dateMatch = lowerText.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
        if (dateMatch) {
          month = parseInt(dateMatch[1], 10) - 1; // 0-indexed month
          const day = parseInt(dateMatch[2], 10);
          let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
          
          // Handle 2-digit years
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
          }
          
          result.setFullYear(year, month, day);
          
          // Look for time information after the date
          const timeAfterDate = lowerText.substring(lowerText.indexOf(dateMatch[0]) + dateMatch[0].length);
          const timeMatch = timeAfterDate.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
          
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const ampm = timeMatch[3]?.toLowerCase();
            
            if (ampm === 'pm' && hours < 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;
            
            result.setHours(hours, minutes, 0, 0);
          }
          
          return result;
        }
      }
      
      // If we found a month
      if (foundMonth) {
        // Look for a day
        const dayMatch = lowerText.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
        const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;
        
        // Look for a year
        const yearMatch = lowerText.match(/\b(20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear();
        
        // Look for time
        const timeMatch = lowerText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
        
        result.setFullYear(year, month, day);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const ampm = timeMatch[3]?.toLowerCase();
          
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;
          
          result.setHours(hours, minutes, 0, 0);
        }
        
        return result;
      }
      
      // Handle relative dates
      const relativeTerms = {
        'today': 0,
        'tonight': 0,
        'tomorrow': 1,
        'this week': 3,
        'next week': 7,
        'this weekend': 5,
        'next weekend': 12
      };
      
      for (const [term, daysToAdd] of Object.entries(relativeTerms)) {
        if (lowerText.includes(term)) {
          result.setDate(now.getDate() + daysToAdd);
          
          // Set evening time for 'tonight'
          if (term === 'tonight') {
            result.setHours(20, 0, 0, 0);
          }
          
          return result;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing text for date:', error);
      return null;
    }
  }

  /**
   * Determine event categories based on event title
   * @param {string} title - Event title
   * @returns {Array<string>} - Array of category strings
   */
  determineCategories(title) {
    const text = title.toLowerCase();
    
    if (text.includes('concert') || text.includes('music') || 
        text.includes('band') || text.includes('dj') || 
        text.includes('live music') || text.includes('singer') ||
        text.includes('show')) {
      return ['Music', 'Entertainment'];
    }
    
    if (text.includes('comedy') || text.includes('comedian') || 
        text.includes('stand-up') || text.includes('laugh')) {
      return ['Comedy', 'Entertainment'];
    }
    
    if (text.includes('dance') || text.includes('dancing') || 
        text.includes('party')) {
      return ['Dance', 'Nightlife'];
    }
    
    if (text.includes('film') || text.includes('movie') || 
        text.includes('cinema') || text.includes('screening')) {
      return ['Film', 'Arts & Culture'];
    }
    
    if (text.includes('art') || text.includes('exhibition') || 
        text.includes('gallery') || text.includes('culture')) {
      return ['Arts & Culture'];
    }
    
    // Fox Cabaret often hosts cabaret and performance art
    if (text.includes('cabaret') || text.includes('burlesque') || 
        text.includes('performance art') || text.includes('drag')) {
      return ['Performance Art', 'Nightlife'];
    }
    
    // Default category
    return ['Entertainment', 'Nightlife'];
  }

  /**
   * Determine season based on date
   * @param {Date} date - Date object
   * @returns {string} - Season name
   */
  determineSeason(date) {
    if (!date || isNaN(date.getTime())) return 'Unknown';
    
    const month = date.getMonth();
    
    if (month >= 2 && month <= 4) return 'Spring'; // March to May
    if (month >= 5 && month <= 7) return 'Summer'; // June to August
    if (month >= 8 && month <= 10) return 'Fall';  // September to November
    return 'Winter';                               // December to February
  }
}

// Export the scraper class
module.exports = new FoxCabaretScraper();
