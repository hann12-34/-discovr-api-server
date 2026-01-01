/**
 * Austin Urban Music Festival Events Scraper
 * URL: https://www.austinurbanmusicfestival.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeAustinUrbanFest(city = 'Austin') {
  console.log('🎤 Scraping Austin Urban Music Fest...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.austinurbanmusicfestival.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      document.querySelectorAll('.event-card, article, .event-item, .show, a[href*="event"]').forEach(el => {
        const titleEl = el.querySelector('h2, h3, h4, .title') || el;
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        const linkEl = el.closest('a') || el.querySelector('a');
        const href = linkEl?.href || 'https://www.austinurbanmusicfestival.com';
        const imgEl = el.querySelector('img');
        const img = imgEl?.src;
        const dateEl = el.querySelector('time, .date, [datetime]');
        const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        if (title && title.length > 3 && !seen.has(title)) {
          seen.add(title);
          results.push({ title, url: href, imageUrl: img, dateStr: dateText });
        }
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
        startDate: new Date(isoDate + 'T14:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Austin Urban Music Festival',
          address: 'Fiesta Gardens, Austin TX 78702',
          city: 'Austin'
        },
        latitude: 30.2584,
        longitude: -97.7115,
        city: 'Austin',
        category: 'Festival',
        source: 'Austin Urban Music Fest'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Urban Music Fest events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Urban Music Fest error:', error.message);
    return [];
  }
}

module.exports = scrapeAustinUrbanFest;
