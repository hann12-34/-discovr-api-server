/**
 * Smart Bar Chicago Events Scraper
 * Legendary underground dance club
 * URL: https://smartbarchicago.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSmartBar(city = 'Chicago') {
  console.log('🎧 Scraping Smart Bar Chicago...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://smartbarchicago.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(a => {
        const url = a.href;
        if (seen.has(url)) return;
        seen.add(url);
        
        const container = a.closest('article, .tribe-events-calendar-list__event, div') || a.parentElement?.parentElement?.parentElement;
        if (!container) return;
        
        const titleEl = container.querySelector('h2, h3, h4, .tribe-events-calendar-list__event-title, [class*="title"]');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        
        const timeEl = container.querySelector('time, .tribe-event-date-start, [class*="date"]');
        const dateStr = timeEl?.getAttribute('datetime') || timeEl?.textContent?.trim();
        
        const imgEl = container.querySelector('img');
        const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
        
        results.push({ title, dateStr, url, imageUrl });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(\d{1,2})[\/\.\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\.\s]*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const year = dateMatch[3] || new Date().getFullYear().toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.description || null,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Smart Bar',
          address: '3730 N Clark Street, Chicago IL 60613',
          city: 'Chicago'
        },
        latitude: 41.9497,
        longitude: -87.6545,
        city: 'Chicago',
        category: 'Nightlife',
        source: 'Smart Bar'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Smart Bar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Smart Bar error:', error.message);
    return [];
  }
}

module.exports = scrapeSmartBar;
