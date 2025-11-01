/**
 * The Roxy Events Scraper
 * Scrapes upcoming events from The Roxy
 * Vancouver's iconic nightclub and live music venue
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const TheRoxyEvents = {
  async scrape(city) {
    console.log('🎸 Scraping events from The Roxy with headless browser...');
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto('https://www.roxyvan.com/events', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Extract events from page text
      const events = await page.evaluate(() => {
        const results = [];
        const seen = new Set();
        const bodyText = document.body.innerText;
        
        // Parse events from text format like:
        // WEDNESDAY OCTOBER 1ST
        // THE SKATRONAUTS / VANCOUVER
        const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
        
        const months = {JANUARY:'01',FEBRUARY:'02',MARCH:'03',APRIL:'04',MAY:'05',JUNE:'06',JULY:'07',AUGUST:'08',SEPTEMBER:'09',OCTOBER:'10',NOVEMBER:'11',DECEMBER:'12'};
        const year = new Date().getFullYear();
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Look for date lines like "WEDNESDAY OCTOBER 1ST" or "FRIDAY, OCTOBER 3RD"
          const dateMatch = line.match(/(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)[,\s]+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})(ST|ND|RD|TH)?/i);
          
          if (dateMatch) {
            const month = months[dateMatch[2].toUpperCase()];
            const day = dateMatch[3].padStart(2, '0');
            const eventDate = `${year}-${month}-${day}`;
            
            // Next line should be the event title
            if (i + 1 < lines.length) {
              let title = lines[i + 1];
              
              // Skip if it's a door/price line
              if (title.includes('DOORS @') || title.includes('$') || title.includes('ADV') || title.includes('TICKETS')) {
                continue;
              }
              
              // Clean up title
              title = title.replace(/\s*\/\s*VANCOUVER$/i, '').trim();
              
              if (title && title.length > 2 && !seen.has(title + eventDate)) {
                seen.add(title + eventDate);
                
                results.push({
                  title: title,
                  date: eventDate,
                  url: 'https://www.roxyvan.com/events'
                });
              }
            }
          }
        }
        
        return results;
      });
      
      await browser.close();
      
      // Format events
      const formattedEvents = events.map(event => ({
        id: uuidv4(),
        title: event.title,
        date: event.date,
        url: event.url,
        venue: { name: 'The Roxy', city: 'Vancouver' },
        city: 'Vancouver',
        source: 'The Roxy'
      }));
      
      formattedEvents.forEach(e => {
        console.log(`✓ ${e.title} | ${e.date || 'NO DATE'}`);
      });
      
      console.log(`\n✅ Found ${formattedEvents.length} The Roxy events`);
      return formattedEvents;
      
    } catch (error) {
      if (browser) await browser.close();
      console.error('Error:', error.message);
      return [];
    }
  }
};


module.exports = TheRoxyEvents.scrape;
