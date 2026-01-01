/**
 * Metropolis Fremantle Perth Events Scraper
 * URL: https://www.metropolisfremantle.com.au/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMetropolis(city = 'Perth') {
  console.log('🎵 Scraping Metropolis Fremantle...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.metropolisfremantle.com.au/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Look for event links
      document.querySelectorAll('a[href*="/events/"]').forEach(el => {
        try {
          const url = el.href;
          if (!url || seen.has(url) || url === 'https://www.metropolisfremantle.com.au/events') return;
          seen.add(url);
          
          // Get title from heading or link text
          let title = null;
          const heading = el.querySelector('h1, h2, h3, h4');
          if (heading) {
            title = heading.textContent?.trim()?.replace(/\s+/g, ' ');
          } else {
            title = el.textContent?.trim()?.replace(/\s+/g, ' ');
          }
          
          if (!title || title.length < 3 || title.length > 150 || title === 'More Info') return;
          
          // Look for image in parent
          const container = el.closest('div, section');
          const imgEl = container?.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
          
          results.push({ title, url, imageUrl });
        } catch (e) {}
      });
      
      return results;
    });

    // Visit each event page to get dates
    const detailedEvents = [];
    for (const event of events.slice(0, 15)) {
      try {
        await page.goto(event.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const details = await page.evaluate(() => {
          const text = document.body.innerText || '';
          
          // Look for date patterns
          const datePatterns = [
            /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i
          ];
          
          let dateStr = null;
          for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
              dateStr = match[0];
              break;
            }
          }

          // Get image
          const img = document.querySelector('img[src*="event"], img[src*="upload"], .event-image img, article img');
          const imageUrl = img?.src;

          return { dateStr, imageUrl };
        });

        if (details.dateStr) {
          detailedEvents.push({
            ...event,
            dateStr: details.dateStr,
            imageUrl: details.imageUrl || event.imageUrl
          });
        }
      } catch (e) {}
    }

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const seenKeys = new Set();
    
    for (const event of detailedEvents) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Try "day month year" format
        let dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        } else {
          // Try "month day year" format
          dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
          if (dateMatch) {
            const day = dateMatch[2].padStart(2, '0');
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const year = dateMatch[3];
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date(now.toISOString().split('T')[0])) continue;

      const key = event.title.toLowerCase() + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Metropolis Fremantle',
          address: '58 South Terrace, Fremantle WA 6160',
          city: 'Perth'
        },
        latitude: -32.0565,
        longitude: 115.7505,
        city: 'Perth',
        category: 'Nightlife',
        source: 'Metropolis'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Metropolis events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Metropolis error:', error.message);
    return [];
  }
}

module.exports = scrapeMetropolis;
