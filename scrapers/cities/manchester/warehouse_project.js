/**
 * Warehouse Project Manchester Events Scraper
 * Major electronic music venue in Manchester
 * URL: https://thewarehouseproject.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeWarehouseProject(city = 'Manchester') {
  console.log('🎧 Scraping Warehouse Project...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://thewarehouseproject.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all event grid items
      document.querySelectorAll('.eventsLayout__gridEvent, a[href*="/event/"]').forEach(item => {
        try {
          // Get event link
          const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href*="/event/"]');
          const url = linkEl?.href;
          if (!url || seen.has(url) || !url.includes('/event/')) return;
          seen.add(url);
          
          // Get title from aria-label or link text
          const ariaLabel = linkEl?.getAttribute('aria-label') || '';
          let title = ariaLabel.replace(/^View event page for\s*/i, '').trim();
          
          if (!title) {
            const titleEl = item.querySelector('h2, h3, h4, .h3, [class*="title"]');
            title = titleEl?.textContent?.trim();
          }
          
          if (!title || title.length < 2) return;
          
          // Get date from eventDate class
          const dateEl = item.querySelector('.eventDate, .h3.eventDate, [class*="date"]');
          const dateStr = dateEl?.textContent?.trim() || '';
          
          // Get image
          const imgEl = item.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Parse dates like "SAT 04 JAN" or "04 Jan 2026"
        const dateMatch = event.dateStr.match(/(\d{1,2})[\s\.]*(?:st|nd|rd|th)?[\s\.]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\.]*(\d{4})?/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          let year = dateMatch[3] || now.getFullYear().toString();
          if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Warehouse Project',
          address: 'Depot Mayfield, Baring Street, Manchester M1 2PY',
          city: 'Manchester'
        },
        latitude: 53.4773,
        longitude: -2.2253,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'Warehouse Project'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Warehouse Project events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Warehouse Project error:', error.message);
    return [];
  }
}

module.exports = scrapeWarehouseProject;
