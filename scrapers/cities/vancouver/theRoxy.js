/**
 * The Roxy Events Scraper
 * Scrapes upcoming events from The Roxy
 * Vancouver's iconic nightclub and live music venue
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');
const { sanitizeDescription } = require('../../utils/sanitizeDescription');

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
        
        // Collect all event poster images in order (Squarespace gallery images)
        const eventImages = [];
        document.querySelectorAll('img[data-src], img[srcset], .sqs-image img, .gallery-block img').forEach(img => {
          const src = img.src || img.getAttribute('data-src');
          if (src && src.includes('squarespace-cdn') && !src.includes('logo')) {
            eventImages.push(src);
          }
        });
        
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
            
            // Find the actual event title (skip generic headers)
            let title = null;
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
              const candidate = lines[j];
              
              // Skip generic headers
              if (candidate.match(/THE ROXY (AND LIVE ACTS CANADA )?PRESENT(S)?/i)) {
                continue;
              }
              
              // Skip door/price/ticket lines
              if (candidate.includes('DOORS @') || 
                  candidate.includes('ADV /') || 
                  candidate.includes('@ DOOR') ||
                  candidate.includes('ALL PROCEEDS') ||
                  candidate.includes('ADMISSION IS') ||
                  candidate.includes('+19 FOR') ||
                  candidate.match(/TICKETS$/i)) {
                continue;
              }
              
              // Found a real title!
              title = candidate.replace(/\s*\/\s*VANCOUVER$/i, '').trim();
              if (title && title.length > 2) {
                break;
              }
            }
            
            if (title && !seen.has(title + eventDate)) {
              seen.add(title + eventDate);
              
              // Use the main events page URL since there are no individual event pages
              const url = 'https://www.roxyvan.com/events';
              
              // Match image by position - events and images are in the same order
              const eventIndex = results.length;
              const imageUrl = eventImages[eventIndex] || null;
              
              results.push({
                title: title,
                date: eventDate,
                url: url,
                imageUrl: imageUrl
              });
            }
          }
        }
        
        return results;
      });
      
      await browser.close();
      
      // Format events - NO FALLBACKS, only real poster images
      const formattedEvents = events.map(event => {
        // Generate clean description using sanitizer
        const description = sanitizeDescription(
          null, // No scraped description available
          event.title,
          'The Roxy',
          'Vancouver'
        );
        
        return {
          id: uuidv4(),
          title: event.title,
          date: event.date,
          startDate: event.date ? new Date(event.date + 'T12:00:00') : null,
          description: description,
          url: event.url,
          imageUrl: event.imageUrl || null,
          venue: { 
            name: 'The Roxy', 
            address: '932 Granville Street, Vancouver, BC V6Z 1K3', 
            city: 'Vancouver'
          },
          latitude: 49.279091,
          longitude: -123.121086,
          city: 'Vancouver',
          category: 'Nightlife',
          source: 'The Roxy'
        };
      });
      
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
