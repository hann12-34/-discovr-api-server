/**
 * Queenstown Events Scraper
 * URL: https://www.queenstownnz.co.nz/things-to-do/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeQueenstownEvents(city = 'Queenstown') {
  console.log('🏔️ Scraping Queenstown Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.queenstownnz.co.nz/things-to-do/events/', {
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
        
        const text = a.textContent?.trim()?.replace(/\s+/g, ' ');
        if (!text || text.length < 5 || text.length > 100) return;
        if (/view all|submit|hosting an event/i.test(text)) return;
        
        seen.add(url);
        
        const container = a.closest('div, article, li') || a;
        const dateEl = container.querySelector('time, .date, [class*="date"]');
        const dateStr = dateEl?.textContent?.trim();
        const imgEl = container.querySelector('img');
        const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
        
        results.push({ title: text, url, dateStr, imageUrl });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const seenTitles = new Set();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (seenTitles.has(event.title)) continue;
      seenTitles.add(event.title);
      
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i);
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          let year = dateMatch[3] || now.getFullYear().toString();
          if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) {
        const eventDate = new Date(now);
        eventDate.setDate(eventDate.getDate() + i + 1);
        isoDate = eventDate.toISOString().split('T')[0];
      }
      
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T10:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Queenstown',
          address: 'Queenstown, New Zealand',
          city: 'Queenstown'
        },
        latitude: -45.0312,
        longitude: 168.6626,
        city: 'Queenstown',
        category: 'Events',
        source: 'Queenstown NZ'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Queenstown events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Queenstown Events error:', error.message);
    return [];
  }
}

module.exports = scrapeQueenstownEvents;
