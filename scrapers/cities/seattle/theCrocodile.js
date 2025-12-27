/**
 * The Crocodile Scraper - REAL Puppeteer
 * Legendary live music venue in Seattle
 * URL: https://www.thecrocodile.com/calendar
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTheCrocodile(city = 'Seattle') {
  console.log('🐊 Scraping The Crocodile...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thehotelcrocodile.com/hotel-events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      // NO new Date() - year must come from page
      
      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 150);
      
      const datePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(datePattern);
        
        if (match) {
          const parts = match[0].match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          if (parts) {
            const monthStr = parts[1].toLowerCase().slice(0, 3);
            const day = parts[2];
            if (!parts[3]) continue; // Skip if no year found
            const year = parts[3];
            const month = months[monthStr];
            
            if (month) {
              const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
              
              for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                const potentialTitle = lines[j];
                if (potentialTitle && 
                    potentialTitle.length > 4 && 
                    !potentialTitle.match(/^(mon|tue|wed|thu|fri|sat|sun)/i) &&
                    !potentialTitle.match(/^\d/) &&
                    !potentialTitle.match(/tickets|buy|menu|home|about|rsvp/i)) {
                  if (!seen.has(potentialTitle + isoDate)) {
                    seen.add(potentialTitle + isoDate);
                    results.push({ title: potentialTitle.substring(0, 100), date: isoDate });
                  }
                  break;
                }
              }
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} The Crocodile events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: 'https://www.thecrocodile.com/calendar',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'The Crocodile',
        address: '2505 1st Ave, Seattle, WA 98121',
        city: 'Seattle'
      },
      latitude: 47.6138,
      longitude: -122.3479,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'TheCrocodile'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Crocodile error:', error.message);
    return [];
  }
}

module.exports = scrapeTheCrocodile;
