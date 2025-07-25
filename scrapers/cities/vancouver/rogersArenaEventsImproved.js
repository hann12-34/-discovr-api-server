/**
 * Rogers Arena Events Scraper (Improved)
 * Scrapes events from Rogers Arena's website using the actual page structure
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class RogersArenaEventsImproved {
  constructor() {
    this.name = 'Rogers Arena Events Improved';
    this.url = 'https://rogersarena.com/events/';
    this.sourceIdentifier = 'rogers-arena-improved'; // Adding a unique source identifier
    this.venue = {
      name: 'Rogers Arena',
      address: '800 Griffiths Way, Vancouver, BC V6B 6G1',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2778, lng: -123.1088 }
    };
  }

  /**
   * Scrape events from Rogers Arena
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log(`Scraping ${this.name}...`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=site-per-process']
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(30000);
    
    try {
      await page.goto(this.url, { waitUntil: 'networkidle2' });
      const events = await this.extractEvents(page);
      
      // Filter out any invalid events (like Buy Now buttons) that got through our filters
      const validEvents = events.filter(event => !event.categories.includes('Invalid'));
      console.log(`Found ${validEvents.length} valid events out of ${events.length} total`);
      
      return validEvents;
    } catch (error) {
      console.error(`Error scraping ${this.name}: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract events from Rogers Arena website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    console.log('Extracting events from Rogers Arena website');
    
    // Wait for content to load
    await page.waitForSelector('a', { timeout: 10000 })
      .catch(err => console.log('Warning: Base page selectors not found, but continuing'));
    
    // We'll focus exclusively on event links approach - no fallbacks or cascading methods
    const events = await page.evaluate((venueInfo) => {
      console.log('Starting direct event extraction');
      const results = [];
      
      // Words that indicate navigation elements rather than actual events
      const navigationWords = ['calendar', 'category', 'filter', 'search', 'navigation', 'view', 'month', 'filters', 'buy now', 'buy tickets', 'tickets', 'more info'];
      
      // Focus specifically on event links - typically containing '/event/' in the URL
      // We'll use this as our primary and only extraction method
      const eventAnchors = document.querySelectorAll('a[href*="/event/"]');
      console.log(`Found ${eventAnchors.length} potential event links`);
      
      eventAnchors.forEach(anchor => {
        try {
          // Extract basic event information
          const title = anchor.textContent.trim();
          const eventUrl = anchor.href;
          
          // Skip navigation elements, empty titles or very short titles
          if (!title || 
              title.length < 5 || 
              title.length > 100 || 
              navigationWords.some(word => title.toLowerCase().includes(word))) {
            return;
          }
          
          // Find event date information
          let dateText = '';
          
          // Check immediate siblings and parents for date info
          let parent = anchor.parentElement;
          let siblings = [];
          
          // Get next siblings
          let nextSibling = parent.nextElementSibling;
          while (nextSibling && siblings.length < 3) {
            siblings.push(nextSibling);
            nextSibling = nextSibling.nextElementSibling;
          }
          
          // Check parent for date content
          if (parent && parent.textContent && 
              (parent.textContent.includes('@') || 
               parent.textContent.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i))) {
            const parentText = parent.textContent.replace(title, '').trim();
            if (parentText) {
              dateText = parentText;
            }
          }
          
          // If no date in parent, check siblings
          if (!dateText) {
            for (const sibling of siblings) {
              if (sibling.textContent && 
                 (sibling.textContent.includes('@') || 
                  sibling.textContent.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i))) {
                dateText = sibling.textContent.trim();
                break;
              }
            }
          }
          
          // Create meaningful description
          const description = `${title} at Rogers Arena`;
          
          // Try to find an image
          let image = '';
          const imgElement = anchor.querySelector('img') || 
                           parent.querySelector('img') || 
                           (siblings[0] && siblings[0].querySelector('img'));
          
          if (imgElement && imgElement.src) {
            image = imgElement.src;
          }
          
          // Add the validated event to our results
          results.push({
            title,
            dateText: dateText || 'Date TBA',  // Use placeholder if no date found
            description,
            image,
            link: eventUrl,
            venue: venueInfo
          });
          
          console.log(`Found event: ${title} - ${dateText || 'Date TBA'}`);
        } catch (error) {
          console.log(`Error processing event link: ${error.message}`);
        }
      });
      
      return results;
    }, this.venue);
    
    console.log(`Extracted ${events.length} events from Rogers Arena`);
    
    // Process dates and create final event objects
    return Promise.all(events.map(async event => {
      const { startDate, endDate } = this.parseDates(event.dateText);
      
      // Generate a unique ID based on title and date
      const uniqueId = slugify(`${event.title}-${startDate.toISOString().split('T')[0]}`, { 
        lower: true,
        strict: true
      });
      
      // Determine categories based on title
      const categories = this.determineCategories(event.title);
      
      return {
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate,
        endDate,
        image: event.image,
        venue: this.venue,
        categories,
        sourceURL: event.link || this.url,
        lastUpdated: new Date()
      };
    }));
  }
  
  /**
   * Determine event categories based on title
   * @param {string} title - Event title
   * @returns {Array} - Array of categories
   */
  determineCategories(title) {
    const lowerTitle = title.toLowerCase();
    
    // Default category is Entertainment
    const categories = ['Entertainment'];
    
    // Check for buy now or ticket buttons that slipped through filtering
    if (lowerTitle === 'buy now' || lowerTitle === 'buy tickets' || lowerTitle === 'tickets') {
      return ['Invalid'];
    }
    
    if (lowerTitle.includes('concert') || 
        lowerTitle.includes('music') || 
        lowerTitle.includes('band') || 
        lowerTitle.includes('tour') ||
        lowerTitle.includes('live') ||
        lowerTitle.includes('singer')) {
      categories.push('Music');
      categories.push('Concert');
    }
    
    if (lowerTitle.includes('hockey') || 
        lowerTitle.includes('canucks') || 
        lowerTitle.includes('nhl')) {
      categories.push('Sports');
      categories.push('Hockey');
    }
    
    if (lowerTitle.includes('basketball') || 
        lowerTitle.includes('wnba') || 
        lowerTitle.includes('nba')) {
      categories.push('Sports');
      categories.push('Basketball');
    }
    
    if (lowerTitle.includes('comedy') || 
        lowerTitle.includes('comedian')) {
      categories.push('Comedy');
    }
    
    if (lowerTitle.includes('family') || 
        lowerTitle.includes('kids') || 
        lowerTitle.includes('children')) {
      categories.push('Family');
    }
    
    return categories;
  }

  /**
   * Parse dates from text
   * @param {string} dateText - Text containing date information
   * @returns {Object} - Object with startDate and endDate
   */
  parseDates(dateText) {
    if (!dateText || dateText === 'Date TBA') {
      // For TBA dates, set to a future date (6 months ahead) to avoid immediate expiration
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      return { startDate: futureDate, endDate: new Date(futureDate.getTime() + 3 * 60 * 60 * 1000) };
    }

    try {
      // Rogers Arena typically uses format like "August 4 @ 7:30 pm"
      // First, look for this specific format
      const arenaPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})\s*@\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
      const arenaMatch = dateText.match(arenaPattern);
      
      if (arenaMatch) {
        const monthStr = arenaMatch[1].toLowerCase();
        const day = parseInt(arenaMatch[2]);
        const year = new Date().getFullYear(); // Use current year as it's not in the pattern
        
        let hours = parseInt(arenaMatch[3]);
        const minutes = arenaMatch[4] ? parseInt(arenaMatch[4]) : 0;
        const isPM = arenaMatch[5].toLowerCase() === 'pm';
        
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        
        const startDate = new Date(year, monthMap[monthStr], day, hours, minutes);
        
        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
        
        return { startDate, endDate };
      }
      
      // Look for variations of the Rogers Arena format
      const monthDayAtTimePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2}).*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
      const mdatMatch = dateText.match(monthDayAtTimePattern);
      
      if (mdatMatch) {
        const monthStr = mdatMatch[1].toLowerCase();
        const day = parseInt(mdatMatch[2]);
        const year = new Date().getFullYear(); // Use current year as it's not in the pattern
        
        let hours = parseInt(mdatMatch[3]);
        const minutes = mdatMatch[4] ? parseInt(mdatMatch[4]) : 0;
        const isPM = mdatMatch[5].toLowerCase() === 'pm';
        
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        
        const startDate = new Date(year, monthMap[monthStr], day, hours, minutes);
        
        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
        
        return { startDate, endDate };
      }
      
      // Look for just month and day without time
      const monthDayPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?/i;
      const monthDayMatch = dateText.match(monthDayPattern);
      
      if (monthDayMatch) {
        const monthStr = monthDayMatch[1].toLowerCase();
        const day = parseInt(monthDayMatch[2]);
        const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : new Date().getFullYear();
        
        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        
        // Default arena events to 7:00 PM
        const startDate = new Date(year, monthMap[monthStr], day, 19, 0);
        
        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
        
        return { startDate, endDate };
      }
      
      // If all else fails, use current date
      console.log(`Could not parse date: ${dateText}`);
      const today = new Date();
      const endDate = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      return { startDate: today, endDate };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const today = new Date();
      const endDate = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      return { startDate: today, endDate };
    }
  }
}

module.exports = RogersArenaEventsImproved;
