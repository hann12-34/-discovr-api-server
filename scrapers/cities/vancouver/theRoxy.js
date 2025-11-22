/**
 * The Roxy Events Scraper
 * Scrapes upcoming events from The Roxy
 * Vancouver's iconic nightclub and live music venue
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

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
        
        // Try to find event images - collect all images with their context
        const eventImages = [];
        document.querySelectorAll('img').forEach(img => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
          if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('background')) {
            // Get nearby text to match with events later
            const parent = img.closest('[class*="event"], article, .card, section, div') || img.parentElement;
            if (parent) {
              const text = parent.textContent.trim().toUpperCase();
              eventImages.push({ src, text });
            }
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
              
              // Try to find associated image by matching event title with image context
              let imageUrl = null;
              const titleUpper = title.toUpperCase();
              const titleWords = titleUpper.split(/[\s\/]+/).filter(w => w.length > 3);
              
              for (const imgData of eventImages) {
                // Check if image context contains significant words from title
                let matches = 0;
                for (const word of titleWords) {
                  if (imgData.text.includes(word)) {
                    matches++;
                  }
                }
                // If most words match, use this image
                if (matches >= Math.min(2, titleWords.length)) {
                  imageUrl = imgData.src;
                  break;
                }
              }
              
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
      const formattedEvents = events.map(event => ({
        id: uuidv4(),
        title: event.title,
        date: event.date,
        url: event.url,
        imageUrl: event.imageUrl || null,
        venue: { 
          name: 'The Roxy', 
          address: '932 Granville Street, Vancouver, BC V6Z 1K3', 
          city: 'Vancouver',
          lat: 49.279091,
          lng: -123.121086
        },
        city: 'Vancouver',
        category: 'Nightlife',
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
