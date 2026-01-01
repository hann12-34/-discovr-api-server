/**
 * Beat Kitchen Chicago Events Scraper
 * URL: https://beatkitchen.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBeatKitchen(city = 'Chicago') {
  console.log('🎵 Scraping Beat Kitchen...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.beatkitchen.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(a => {
        const url = a.href;
        if (seen.has(url)) return;
        
        const text = a.textContent.trim();
        if (text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),/) || text === 'Tickets' || text.length < 4) return;
        
        seen.add(url);
        
        const container = a.closest('[class*="event"]') || a.parentElement?.parentElement;
        const dateEl = container?.querySelector('.event-date, .the-event-date');
        const dateStr = dateEl?.textContent?.replace(/\s+/g, ' ')?.trim();
        
        const img = container?.querySelector('img')?.src;
        
        results.push({ title: text.substring(0, 80), url, imageUrl: img, dateStr });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const monthMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        const dayMatch = event.dateStr.match(/(\d{1,2})/);
        
        if (monthMatch && dayMatch) {
          const month = (months.indexOf(monthMatch[1].toLowerCase()) + 1).toString().padStart(2, '0');
          const day = dayMatch[1].padStart(2, '0');
          let year = now.getFullYear();
          if (parseInt(month) < now.getMonth() + 1) year++;
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Beat Kitchen',
          address: '2100 W Belmont Avenue, Chicago IL 60618',
          city: 'Chicago'
        },
        latitude: 41.9396,
        longitude: -87.6801,
        city: 'Chicago',
        category: 'Nightlife',
        source: 'Beat Kitchen'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Beat Kitchen events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Beat Kitchen error:', error.message);
    return [];
  }
}

module.exports = scrapeBeatKitchen;
