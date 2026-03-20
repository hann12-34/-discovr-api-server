/**
 * Destination Toronto Events Scraper (with Puppeteer)
 * Official Toronto tourism site - SAFE & LEGAL
 * Non-profit destination marketing organization (City-funded)
 * Purpose: Promote Toronto tourism (they WANT event distribution)
 * URL: https://www.destinationtoronto.com/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🏙️ Scraping Destination Toronto (with Puppeteer)...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    const events = [];
    const seenUrls = new Set();
    
    // Scrape multiple event pages
    const urls = [
      'https://www.destinationtoronto.com/events/',
      'https://www.destinationtoronto.com/events/annual-festivals-and-events/'
    ];
    
    for (const url of urls) {
      try {
        console.log(`  Fetching: ${url}`);
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Wait for events to load (give JS time to render)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract event data
        const pageEvents = await page.evaluate(() => {
          const events = [];
          
          // Try multiple selectors
          const selectors = [
            '.event-item',
            '.event-card',
            '.event',
            '[class*="event-"]',
            'article',
            '.listing-item',
            '[data-event]'
          ];
          
          let eventElements = [];
          for (const selector of selectors) {
            eventElements = document.querySelectorAll(selector);
            if (eventElements.length > 0) break;
          }
          
          eventElements.forEach(el => {
            // Extract title
            const titleEl = el.querySelector('h1, h2, h3, h4, .title, .name, [class*="title"]');
            const title = titleEl ? titleEl.textContent.trim() : '';
            
            // Extract URL
            const linkEl = el.querySelector('a');
            const url = linkEl ? linkEl.href : '';
            
            // Extract date - try multiple methods
            let dateText = '';
            
            // Method 1: datetime attribute
            const timeEl = el.querySelector('time[datetime]');
            if (timeEl) {
              dateText = timeEl.getAttribute('datetime');
            }
            
            // Method 2: data attribute
            if (!dateText) {
              const dataDate = el.getAttribute('data-date') || el.getAttribute('data-event-date');
              if (dataDate) dateText = dataDate;
            }
            
            // Method 3: text content
            if (!dateText) {
              const dateEl = el.querySelector('time, .date, [class*="date"]');
              if (dateEl) dateText = dateEl.textContent.trim();
            }
            
            // Extract venue/location
            const venueEl = el.querySelector('.venue, .location, [class*="venue"], [class*="location"]');
            const venue = venueEl ? venueEl.textContent.trim() : '';
            
            if (title && url) {
              events.push({ title, url, dateText, venue });
            }
          });
          
          return events;
        });
        
        console.log(`    Found ${pageEvents.length} events on page`);
        
        // Process events
        for (const event of pageEvents) {
          if (seenUrls.has(event.url)) continue;
          seenUrls.add(event.url);
          
          // Parse date
          let eventDate = null;
          if (event.dateText) {
            try {
              const parsed = new Date(event.dateText);
              if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
                eventDate = parsed.toISOString().split('T')[0];
              }
            } catch (e) {
              // Try pattern matching for various formats
              const patterns = [
                /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})/i,
                /(\\d{1,2})\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+(\\d{4})/i,
                /(\\d{4})-(\\d{2})-(\\d{2})/
              ];
              
              for (const pattern of patterns) {
                const match = event.dateText.match(pattern);
                if (match) {
                  try {
                    const testParsed = new Date(event.dateText);
                    if (!isNaN(testParsed.getTime())) {
                      eventDate = testParsed.toISOString().split('T')[0];
                      break;
                    }
                  } catch (e2) {}
                }
              }
            }
          }
          
          // Categorize by title
          let category = 'Events';
          const titleLower = event.title.toLowerCase();
          if (titleLower.includes('festival') || titleLower.includes('fest')) {
            category = 'Festival';
          } else if (titleLower.includes('night') || titleLower.includes('club') || 
                     titleLower.includes('bar') || titleLower.includes('dj')) {
            category = 'Nightlife';
          } else if (titleLower.includes('concert') || titleLower.includes('music') ||
                     titleLower.includes('live')) {
            category = 'Concert';
          }
          
          // Only add if we have at least title and URL
          if (event.title.length > 3 && event.url) {
            events.push({
              id: uuidv4(),
              title: event.title,
            description: '',
              date: eventDate,
              url: event.url,
              venue: {
                name: event.venue || 'Various Venues',
                city: 'Toronto'
              },
              city: city,
              category: category,
              source: 'Destination Toronto'
            });
          }
        }
        
      } catch (err) {
        console.log(`    ⚠️  Error on ${url}: ${err.message}`);
      }
    }
    
    await browser.close();

      // Fetch descriptions from event detail pages
      for (const event of events) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }

    
    console.log(`✅ Destination Toronto: ${events.length} events found`);
    return filterEvents(events);
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('Error scraping Destination Toronto:', error.message);
    return [];
  }
}

module.exports = scrape;
