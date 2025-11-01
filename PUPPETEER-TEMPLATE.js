const puppeteer = require('puppeteer');
const { parseDateText } = require('../../utils/city-util');
const { filterEvents } = require('../../utils/eventFilter');

// Puppeteer-based scraper template for JavaScript-rendered sites

function createPuppeteerScraper(eventsUrl, venueName, venueAddress) {
  return async function scrape(city = 'Toronto') {
    if (city !== 'Toronto') {
      throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
    }
    
    console.log(`🎪 Scraping ${venueName} events for ${city}...`);
    
    const events = [];
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto(eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for content to load
      await page.waitForTimeout(3000);
      
      // Extract events using page.evaluate
      const scrapedEvents = await page.evaluate(() => {
        const eventElements = [];
        
        // Try multiple selectors for events
        const selectors = [
          '.event',
          '[class*="event"]',
          'article',
          '.show',
          '[class*="show"]',
          '.listing',
          '.card',
          '[class*="card"]',
          '.performance',
          '.program',
          'li.entry',
          '.post'
        ];
        
        const foundElements = new Set();
        
        for (const selector of selectors) {
          document.querySelectorAll(selector).forEach(el => {
            foundElements.add(el);
          });
        }
        
        // Also find elements containing dates
        document.querySelectorAll('[datetime], time, .date, [class*="date"]').forEach(el => {
          let parent = el.parentElement;
          while (parent && parent !== document.body) {
            foundElements.add(parent);
            parent = parent.parentElement;
            if (parent.tagName === 'ARTICLE' || parent.classList.contains('event')) break;
          }
        });
        
        foundElements.forEach(el => {
          // Extract title
          const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '[class*="title"]', '.name', '[class*="name"]', 'strong', 'b', 'a'];
          let title = '';
          for (const sel of titleSelectors) {
            const titleEl = el.querySelector(sel);
            if (titleEl && titleEl.textContent.trim()) {
              title = titleEl.textContent.trim();
              break;
            }
          }
          
          if (!title || title.length < 3 || title.length > 200) return;
          if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|About|Contact|Privacy|Terms)/i)) return;
          
          // Extract date
          let dateText = '';
          const dateEl = el.querySelector('[datetime]');
          if (dateEl) {
            dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          } else {
            const dateSelectors = ['time', '.date', '[class*="date"]', '.when', '.schedule', '[class*="time"]'];
            for (const sel of dateSelectors) {
              const dEl = el.querySelector(sel);
              if (dEl) {
                dateText = dEl.getAttribute('datetime') || dEl.textContent.trim();
                if (dateText && dateText.length > 4) break;
              }
            }
          }
          
          if (!dateText) {
            const allText = el.textContent;
            const patterns = [
              /\d{4}-\d{2}-\d{2}/,
              /\d{1,2}\/\d{1,2}\/\d{4}/,
              /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
              /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i
            ];
            for (const pattern of patterns) {
              const match = allText.match(pattern);
              if (match) {
                dateText = match[0];
                break;
              }
            }
          }
          
          if (!dateText || dateText.length < 4) return;
          
          // Extract description
          const descEl = el.querySelector('.description, .desc, [class*="desc"], p');
          const description = descEl ? descEl.textContent.trim().substring(0, 500) : title;
          
          // Extract URL
          const linkEl = el.querySelector('a');
          const url = linkEl ? linkEl.href : '';
          
          eventElements.push({
            title,
            dateText,
            description,
            url
          });
        });
        
        return eventElements;
      });
      
      console.log(`   ✅ Extracted ${scrapedEvents.length} events`);
      
      // Parse dates and create event objects
      for (const evt of scrapedEvents) {
        const parsedDate = parseDateText(evt.dateText);
        if (!parsedDate || !parsedDate.startDate) continue;
        
        events.push({
          title: evt.title,
          date: parsedDate.startDate.toISOString(),
          venue: { name: venueName, address: venueAddress, city: 'Toronto' },
          location: 'Toronto, ON',
          description: evt.description,
          url: evt.url || eventsUrl,
          source: 'Web Scraper (Puppeteer)'
        });
      }
      
    } catch (error) {
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED') || 
          error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        return filterEvents([]);
      }
      console.log(`   ⚠️ Error: ${error.message.substring(0, 50)}...`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return filterEvents(events);
  };
}

module.exports = { createPuppeteerScraper };
