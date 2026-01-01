/**
 * Cadogan Hall London Events Scraper
 * Classical music venue in Chelsea
 * URL: https://www.cadoganhall.com/whats-on/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeCadoganHall(city = 'London') {
  console.log('🎻 Scraping Cadogan Hall London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.cadoganhall.com/whats-on/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/whats-on/"]').forEach(el => {
        const href = el.href;
        if (seen.has(href) || href.endsWith('/whats-on/')) return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 5; i++) {
          container = container.parentElement;
          if (!container) break;
        }
        
        const title = container?.querySelector('h2, h3, h4, .title')?.textContent?.trim()?.replace(/\s+/g, ' ');
        const allText = container?.textContent || '';
        const dateMatch = allText.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        const dateStr = dateMatch ? dateMatch[0] : null;
        const img = container?.querySelector('img')?.src;
        
        if (title && title.length > 3 && title.length < 100 && dateStr) {
          results.push({ title, dateStr, url: href, imageUrl: img });
        }
      });
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const seenKeys = new Set();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase()];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      const key = event.title + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: 'Cadogan Hall',
          address: '5 Sloane Terrace, London SW1X 9DQ',
          city: 'London'
        },
        latitude: 51.4933,
        longitude: -0.1579,
        city: 'London',
        category: 'Nightlife',
        source: 'Cadogan Hall'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Cadogan Hall events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Cadogan Hall error:', error.message);
    return [];
  }
}

module.exports = scrapeCadoganHall;
