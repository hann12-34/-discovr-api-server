/**
 * National Arts Centre Ottawa Events Scraper
 * Major performing arts venue in Ottawa
 * URL: https://nac-cna.ca/en/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeNAC(city = 'Ottawa') {
  console.log('🎭 Scraping NAC Ottawa...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://nac-cna.ca/en/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"], a[href*="/events/"]').forEach(el => {
        const href = el.href;
        if (seen.has(href) || href.endsWith('/events') || href.endsWith('/events/')) return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 6; i++) {
          container = container.parentElement;
          if (!container) break;
          
          const title = container.querySelector('h2, h3, h4, .title, [class*="title"]')?.textContent?.trim()?.replace(/\s+/g, ' ');
          const fullText = container.textContent || '';
          const img = container.querySelector('img')?.src;
          
          // Extract date from text - look for patterns like "Jan 5, 2026"
          const dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2}),?\s*(\d{4})/i);
          
          if (title && title.length > 3 && title.length < 100) {
            results.push({ 
              title: title.replace(/^Event:\s*/i, '').trim(),
              dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}` : null,
              url: href, 
              imageUrl: img 
            });
            break;
          }
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
        const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2}),?\s*(\d{4})/i);
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'National Arts Centre',
          address: '1 Elgin Street, Ottawa, ON K1P 5W1',
          city: 'Ottawa'
        },
        latitude: 45.4231,
        longitude: -75.6931,
        city: 'Ottawa',
        category: 'Nightlife',
        source: 'NAC Ottawa'
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

    console.log(`  ✅ Found ${uniqueEvents.length} valid NAC Ottawa events`);
    return uniqueEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  NAC Ottawa error:', error.message);
    return [];
  }
}

module.exports = scrapeNAC;
