const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

class VancouverCivicTheatresEvents {
  constructor() {
    this.name = 'Vancouver Civic Theatres Events';
    this.url = 'https://vancouvercivictheatres.com/events/';
    this.venue = {
      name: "Vancouver Civic Theatres",
      id: "vancouver-civic-theatres",
      address: "630 Hamilton St",
      city: "Vancouver",
      state: "BC", 
      country: "Canada",
      postalCode: "V6B 5N6",
      location: {
        coordinates: [-123.1178014, 49.2813118]
      }
    };
  }

  async scrape() {
    console.log('🔍 Starting Vancouver Civic Theatres Events scraper...');
    const events = [];
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for the page to fully load
      console.log('Waiting for page to load completely...');
      await page.waitForSelector('body', { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Look for any "Load More" or pagination buttons and click them
      try {
        const loadMoreButtons = await page.$$('button[class*="load"], .load-more, .show-more, .pagination a, .next');
        console.log(`Found ${loadMoreButtons.length} potential load more buttons`);
        
        for (let i = 0; i < Math.min(loadMoreButtons.length, 3); i++) {
          try {
            await loadMoreButtons[i].click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`Clicked load more button ${i + 1}`);
          } catch (e) {
            console.log(`Could not click button ${i + 1}:`, e.message);
          }
        }
      } catch (e) {
        console.log('No load more buttons found');
      }
      
      // Scroll down to trigger any lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to get page content and find events with a simpler approach
      const pageContent = await page.content();
      const eventCount = (pageContent.match(/event/gi) || []).length;
      const showCount = (pageContent.match(/show/gi) || []).length;
      console.log(`Page contains ${eventCount} instances of 'event' and ${showCount} instances of 'show'`);
      
      // Extract events using a more comprehensive approach
      const extractedEvents = await page.evaluate(() => {
        const events = [];
        
        // Get all elements and filter for potential events
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
          try {
            const classList = element.className || '';
            const dataAttrs = Array.from(element.attributes || [])
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => attr.name + '=' + attr.value)
              .join(' ');
            
            // Check if element looks like an event
            const isEventLike = 
              classList.includes('event') ||
              classList.includes('show') ||
              classList.includes('performance') ||
              classList.includes('card') ||
              dataAttrs.includes('event') ||
              dataAttrs.includes('show') ||
              dataAttrs.includes('title');
            
            if (isEventLike) {
              // Try to extract title
              let title = element.getAttribute('data-title') ||
                         element.getAttribute('title') ||
                         element.querySelector('h1, h2, h3, h4, .title')?.textContent?.trim() ||
                         element.textContent?.trim()?.split('\n')[0];
              
              if (title && title.length > 3 && title.length < 200) {
                // Extract date
                let dateStr = element.getAttribute('data-date') ||
                             element.querySelector('.date, time')?.textContent?.trim() || '';
                
                // Extract link
                let link = element.getAttribute('href') ||
                          element.querySelector('a')?.href || '';
                
                // Extract description
                let description = element.getAttribute('data-description') ||
                                element.querySelector('p, .description')?.textContent?.trim() || '';
                
                events.push({
                  title: title.trim(),
                  dateStr: dateStr,
                  link: link,
                  description: description
                });
              }
            }
          } catch (err) {
            // Skip errors and continue
          }
        });
        
        // Remove duplicates based on title
        const uniqueEvents = [];
        const seenTitles = new Set();
        
        events.forEach(event => {
          if (!seenTitles.has(event.title)) {
            seenTitles.add(event.title);
            uniqueEvents.push(event);
          }
        });
        
        return uniqueEvents;
      });

      // Process extracted events
      for (const eventData of extractedEvents) {
        try {
          const event = {
            id: uuidv4(),
            title: eventData.title,
            description: eventData.description || '',
            date: eventData.dateStr || 'Date TBA',
            time: '7:30 PM',
            venue: this.venue,
            category: 'Theatre',
            price: 'Check website',
            ticketUrl: eventData.link && eventData.link.startsWith('/') ? 
                      'https://vancouvercivictheatres.com' + eventData.link : 
                      (eventData.link || this.url),
            sourceUrl: this.url,
            imageUrl: eventData.imageUrl || '',
            organizer: this.venue.name,
            tags: ['Theatre', 'Live Performance', 'Vancouver'],
            source: 'vancouver-civic-theatres',
            scrapedAt: new Date().toISOString()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${event.title}`);
          
        } catch (error) {
          console.log(`Error processing event: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('Error scraping Vancouver Civic Theatres:', error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    console.log(`🎉 Scraped ${events.length} events from Vancouver Civic Theatres`);
    return events;
  }
}

module.exports = new VancouverCivicTheatresEvents();
