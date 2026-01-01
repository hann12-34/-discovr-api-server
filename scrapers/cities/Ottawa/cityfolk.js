/**
 * Ottawa CityFolk Festival Scraper
 * Major music festival in Ottawa
 * URL: https://ottawacityfolk.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeCityFolk(city = 'Ottawa') {
  console.log('🎵 Scraping Ottawa CityFolk Festival...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://ottawacityfolk.com/lineup/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Look for artist/event cards
      document.querySelectorAll('a[href*="/artist/"], a[href*="/lineup/"], .artist-card, .lineup-item').forEach(el => {
        let container = el.tagName === 'A' ? el : el.querySelector('a');
        if (!container) container = el;
        
        const href = container.href || container.querySelector('a')?.href;
        if (!href || seen.has(href)) return;
        seen.add(href);
        
        const title = container.querySelector('h2, h3, h4, .name, .artist-name, .title')?.textContent?.trim();
        const img = container.querySelector('img')?.src;
        const fullText = container.textContent || '';
        
        // Look for date patterns
        const dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})/i) ||
                         fullText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        
        if (title && title.length > 2 && title.length < 100 && href) {
          results.push({ 
            title,
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
          // Try numeric format
          dateMatch = event.dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dateMatch) {
            const month = dateMatch[1].padStart(2, '0');
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      // Default to summer festival dates if no date found
      if (!isoDate) {
        const currentYear = new Date().getFullYear();
        isoDate = `${currentYear}-09-12`; // September festival dates
      }
      
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T18:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Ottawa CityFolk Festival',
          address: 'Lansdowne Park, 1015 Bank Street, Ottawa, ON K1S 3W7',
          city: 'Ottawa'
        },
        latitude: 45.3978,
        longitude: -75.6839,
        city: 'Ottawa',
        category: 'Festivals',
        source: 'Ottawa CityFolk'
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

    console.log(`  ✅ Found ${uniqueEvents.length} CityFolk events`);
    return uniqueEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  CityFolk error:', error.message);
    return [];
  }
}

module.exports = scrapeCityFolk;
