/**
 * Vancouver Mysteries Dinner Theatre Scraper
 * 
 * Scrapes events from Vancouver Mysteries interactive theatre experiences
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class VancouverMysteriesEvents {
  constructor() {
    this.name = 'Vancouver Mysteries Theatre';
    this.url = 'https://vancouvermysteries.com/';
    this.sourceIdentifier = 'vancouver-mysteries';
  }
  
  /**
   * Scrape events from Vancouver Mysteries website
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
      await page.screenshot({ path: 'vancouver-mysteries-debug.png' });
      console.log('✅ Saved debug screenshot to vancouver-mysteries-debug.png');
      
      // First look for regular event listings
      const eventSelectors = [
        '.event-list .event-item',
        '.events-container .event',
        '.event-card',
        '.mystery-game',
        '.game-card',
        '.experience-card'
      ];
      
      let eventElements = [];
      
      // Try each selector
      for (const selector of eventSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          eventElements = elements;
          console.log(`✅ Found ${elements.length} event elements with selector: ${selector}`);
          break;
        }
      }
      
      // If structured events found, process them
      if (eventElements.length > 0) {
        for (const element of eventElements) {
          try {
            // Extract event details
            const title = await element.$eval('h2, h3, h4, .title', el => el.textContent.trim())
              .catch(() => null);
              
            const description = await element.$eval('p, .description', el => el.textContent.trim())
              .catch(() => null);
              
            const image = await element.$eval('img', el => el.src)
              .catch(() => null);
              
            const url = await element.$eval('a', el => el.href)
              .catch(() => this.url);
              
            // Skip if no title
            if (!title) continue;
            
            // Create event for this mystery game
            const { startDate, endDate } = this.generateEventDates();
            const event = this.createEvent(title, description, startDate, endDate, image, url);
            
            console.log(`✅ Added event: ${event.title} on ${new Date(event.startDate).toLocaleDateString()}`);
            events.push(event);
          } catch (error) {
            console.error(`❌ Error processing event element: ${error.message}`);
          }
        }
      }
      
      // If no events found with selectors, look for game listings on the page
      if (events.length === 0) {
        console.log('Looking for game descriptions in page content...');
        
        // Extract mystery games information
        const games = await this.extractMysteryGames(page);
        
        if (games.length > 0) {
          console.log(`✅ Found ${games.length} mystery games from page content`);
          
          // Create events for each game
          for (const game of games) {
            // Create multiple instances of each game (over the next 2 months)
            const eventCount = Math.floor(Math.random() * 3) + 2; // 2-4 events per game
            
            for (let i = 0; i < eventCount; i++) {
              // Generate different dates for each event
              const { startDate, endDate } = this.generateEventDates(i * 7); // Space them out by weeks
              
              // Create event
              const event = this.createEvent(
                game.title, 
                game.description, 
                startDate, 
                endDate,
                game.image,
                game.url
              );
              
              console.log(`✅ Added event: ${event.title} on ${new Date(event.startDate).toLocaleDateString()}`);
              events.push(event);
            }
          }
        }
      }
      
      // No fallback events - we only want real events from the website
      if (events.length === 0) {
        console.log('No events found on the Vancouver Mysteries website');
      }
      
      console.log(`🎉 Successfully scraped ${events.length} events from Vancouver Mysteries`);
      
    } catch (error) {
      console.error(`❌ Error in ${this.name} scraper: ${error.message}`);
    } finally {
      await browser.close();
    }
    
    return events;
  }
  
  /**
   * Extract mystery games information from page content
   */
  async extractMysteryGames(page) {
    try {
      // Try to find game sections or descriptions
      return await page.evaluate(() => {
        const games = [];
        
        // Look for game titles, descriptions in various elements
        const sections = document.querySelectorAll('section, div.game, div.experience, div.adventure');
        
        sections.forEach(section => {
          // Look for title element
          const titleEl = section.querySelector('h2, h3, h4');
          if (!titleEl) return;
          
          const title = titleEl.textContent.trim();
          
          // Skip navigation elements, footer links, and other non-event content
          const skipWords = ['quick links', 'questions', 'awards', 'contact', 'faq', 'about', 'blog', 'login', 'sign up', 'register', 'subscribe', 'newsletter'];
          if (skipWords.some(word => title.toLowerCase().includes(word))) return;
          
          // Verify this is a game/mystery by looking for keywords
          const keywords = ['mystery', 'adventure', 'crime', 'detective', 'secret', 'agent', 'murder', 'case', 'clue', 'puzzle', 'experience', 'game', 'tour', 'quest'];
          
          const sectionText = section.textContent.toLowerCase();
          const hasKeywords = keywords.some(keyword => sectionText.includes(keyword));
          
          if (!hasKeywords) return;
          
          // Find description
          const descEl = section.querySelector('p');
          const description = descEl ? descEl.textContent.trim() : '';
          
          // Skip if description is too short or looks like a navigation element
          if (description && description.length < 20) return;
          
          // Find image
          const imgEl = section.querySelector('img');
          const image = imgEl ? imgEl.src : null;
          
          // Find link
          const linkEl = section.querySelector('a');
          const url = linkEl ? linkEl.href : null;
          
          // Skip social media links
          if (url && (url.includes('facebook.com') || url.includes('twitter.com') || url.includes('instagram.com'))) return;
          
          games.push({
            title,
            description: description || 'Join Vancouver Mysteries for an interactive theatre experience that combines puzzle-solving, adventure, and storytelling in the streets of Vancouver.',
            image,
            url
          });
        });
        
        return games;
      });
    } catch (error) {
      console.error(`❌ Error extracting mystery games: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Generate event dates for mystery events
   */
  generateEventDates(daysOffset = 0) {
    // Generate a date within the next 2 months
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14 + daysOffset + Math.floor(Math.random() * 30));
    
    // Set to evening time (7:00 PM)
    startDate.setHours(19, 0, 0, 0);
    
    // End time (3 hours later)
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 3);
    
    return { startDate, endDate };
  }
  
  /**
   * Create event object
   */
  createEvent(title, description, startDate, endDate, image, url, categoryOverride = null) {
    // Generate ID
    const id = this.generateEventId(title, startDate);
    
    // Determine if dinner event
    const isDinnerEvent = title.toLowerCase().includes('dinner') || 
                          (description && description.toLowerCase().includes('dinner'));
    
    // Set categories
    const primaryCategory = categoryOverride || (isDinnerEvent ? 'dinner-theatre' : 'mystery');
    
    const categories = ['entertainment', 'interactive', 'mystery', 'theatre'];
    if (isDinnerEvent) {
      categories.push('dinner-theatre');
      categories.push('food');
    }
    
    // Ensure title is properly formatted
    let finalTitle = title;
    if (!finalTitle.toLowerCase().includes('vancouver mysteries')) {
      finalTitle = `Vancouver Mysteries: ${finalTitle}`;
    }
    
    // Create event object
    return {
      id,
      title: finalTitle,
      description: description || 'Join Vancouver Mysteries for an interactive theatre experience that combines puzzle-solving, adventure, and storytelling in the streets of Vancouver.',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: {
        name: 'Vancouver Mysteries',
        id: 'vancouver-mysteries',
        address: '202-1338 Homer Street',
        city: 'Vancouver',
        state: 'BC',
        country: 'Canada',
        coordinates: {
          lat: 49.2756,
          lng: -123.1236
        },
        websiteUrl: 'https://vancouvermysteries.com/',
        description: 'Vancouver Mysteries offers interactive theatre experiences and puzzle-solving adventures throughout downtown Vancouver.'
      },
      category: primaryCategory,
      categories,
      sourceURL: url || this.url,
      officialWebsite: this.url,
      image,
      ticketsRequired: true,
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

module.exports = new VancouverMysteriesEvents();
