/**
 * Babylon Nightclub Ottawa Events Scraper
 * Major nightclub venue
 * URL: https://www.babylonclub.ca/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBabylon(city = 'Ottawa') {
  console.log('🎧 Scraping Babylon Ottawa...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.babylonclub.ca/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      // Try multiple selectors to find events
      const allLinks = document.querySelectorAll('a[href]');
      
      allLinks.forEach(link => {
        try {
          const href = link.href;
          const text = link.textContent.trim();
          
          // Look for event-like content
          if (text.length > 5 && text.length < 150) {
            let container = link;
            for (let i = 0; i < 3; i++) {
              container = container.parentElement;
              if (!container) break;
            }
            
            const title = text.replace(/\s+/g, ' ');
            if (seenTitles.has(title)) return;
            seenTitles.add(title);
            
            const img = container?.querySelector('img');
            const imageUrl = img ? img.src : null;
            
            // Look for date in surrounding text
            const allText = container?.textContent || text;
            const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
            const dateStr = dateMatch ? dateMatch[0] : null;
            
            results.push({ 
              title, 
              url: href, 
              imageUrl, 
              dateStr 
            });
          }
        } catch (e) {}
      });

      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Babylon events`);

    const formattedEvents = [];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const monthMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
          const dayMatch = event.dateStr.match(/\b(\d{1,2})\b/);
          
          if (monthMatch && dayMatch) {
            const month = (monthNames.indexOf(monthMatch[1].toLowerCase()) + 1).toString().padStart(2, '0');
            const day = dayMatch[1].padStart(2, '0');
            const now = new Date();
            let year = now.getFullYear();
            if (parseInt(month) < now.getMonth() + 1) year++;
            isoDate = `${year}-${month}-${day}`;
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
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Babylon Nightclub', address: '317 Bank Street, Ottawa ON K2P 1X9', city: 'Ottawa' },
        latitude: 45.4161,
        longitude: -75.6934,
        city: 'Ottawa',
        category: 'Nightlife',
        source: 'Babylon'
      });
    }

    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Babylon error:', error.message);
    return [];
  }
}

module.exports = scrapeBabylon;
