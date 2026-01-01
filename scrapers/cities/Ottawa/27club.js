/**
 * The 27 Club Ottawa Events Scraper
 * Popular nightclub and live music venue
 * URL: https://www.the27club.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape27Club(city = 'Ottawa') {
  console.log('🎵 Scraping The 27 Club Ottawa...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.the27club.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Look for event cards and links
      document.querySelectorAll('a[href*="/event"], .event-item, .event-card, article').forEach(el => {
        let link = el.tagName === 'A' ? el : el.querySelector('a');
        if (!link) return;
        
        const href = link.href;
        if (!href || seen.has(href) || href.endsWith('/events') || href.endsWith('/events/')) return;
        seen.add(href);
        
        const container = link.closest('.event-item, .event-card, article, li, div[class*="event"]') || link;
        
        const title = container.querySelector('h1, h2, h3, h4, .title, .event-title, [class*="title"]')?.textContent?.trim();
        const img = container.querySelector('img')?.src;
        const fullText = container.textContent || '';
        
        // Look for date patterns
        const dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})/i) ||
                         fullText.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/) ||
                         fullText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        
        if (title && title.length > 2 && title.length < 150) {
          results.push({ 
            title: title.replace(/^Event:\s*/i, '').trim(),
            dateStr: dateMatch ? dateMatch[0] : null,
            url: href, 
            imageUrl: img 
          });
        }
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Try month name format
        let dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})/i);
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        } else {
          // Try YYYY-MM-DD format
          dateMatch = event.dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
          if (dateMatch) {
            const year = dateMatch[1];
            const month = dateMatch[2].padStart(2, '0');
            const day = dateMatch[3].padStart(2, '0');
            isoDate = `${year}-${month}-${day}`;
          } else {
            // Try MM/DD/YYYY format
            dateMatch = event.dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (dateMatch) {
              const month = dateMatch[1].padStart(2, '0');
              const day = dateMatch[2].padStart(2, '0');
              const year = dateMatch[3];
              isoDate = `${year}-${month}-${day}`;
            }
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T21:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'The 27 Club',
          address: '27 York Street, Ottawa, ON K1N 5S7',
          city: 'Ottawa'
        },
        latitude: 45.4292,
        longitude: -75.6917,
        city: 'Ottawa',
        category: 'Nightlife',
        source: 'The 27 Club'
      });
    }

    // Remove duplicates
    const uniqueEvents = [];
    const seenKeys = new Set();
    for (const e of formattedEvents) {
      const key = e.title + e.date;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueEvents.push(e);
      }
    }

    console.log(`  ✅ Found ${uniqueEvents.length} The 27 Club events`);
    return uniqueEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The 27 Club error:', error.message);
    return [];
  }
}

module.exports = scrape27Club;
