/**
 * Neumos Events Scraper (Seattle)
 * Major indie/rock venue in Capitol Hill
 * URL: https://neumos.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeNeumos(city = 'Seattle') {
  console.log('🎸 Scraping Neumos...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://neumos.com/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      // Month mapping
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      // Date pattern: "DEC 2" or "JAN 15"
      const datePattern = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})$/i;
      
      const seen = new Set();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1].toUpperCase();
          const day = dateMatch[2].padStart(2, '0');
          const month = months[monthStr];
          
          // Determine year
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          const eventMonth = parseInt(month);
          const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Look backwards for the title (skip presenter lines and tour names)
          let title = null;
          for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
            const candidate = lines[j];
            
            // Skip presenter lines
            if (candidate.match(/PRESENTS$/i) || 
                candidate === 'NEUMOS PRESENTS' ||
                candidate === 'SEATTLE THEATRE GROUP PRESENTS' ||
                candidate.includes('TOUR')) {
              continue;
            }
            
            // Skip navigation/headers
            if (candidate === 'UPCOMING EVENTS' ||
                candidate === 'BUY TICKETS' ||
                candidate.includes('DOORS:') ||
                candidate.match(/^\d+\s*&\s*Over/i) ||
                candidate.length < 3) {
              continue;
            }
            
            // Found the title!
            title = candidate;
            break;
          }
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({
              title: title,
              date: isoDate
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Neumos events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://neumos.com/events/',
      imageUrl: null,
      venue: {
        name: 'Neumos',
        address: '925 E Pike St, Seattle, WA 98122',
        city: 'Seattle'
      },
      latitude: 47.6143,
      longitude: -122.3194,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Neumos'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Neumos error:', error.message);
    return [];
  }
}

module.exports = scrapeNeumos;
