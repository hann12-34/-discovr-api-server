/**
 * Adams Avenue Street Fair San Diego Events Scraper
 * URL: https://www.adamsavenuebusiness.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeAdamsAveFair(city = 'San Diego') {
  console.log('🎪 Scraping Adams Avenue Fair...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.adamsavenuebusiness.com', {
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
        const href = linkEl?.href || 'https://www.adamsavenuebusiness.com';
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
        startDate: new Date(isoDate + 'T10:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Adams Avenue',
          address: 'Adams Avenue, San Diego CA 92116',
          city: 'San Diego'
        },
        latitude: 32.7640,
        longitude: -117.1147,
        city: 'San Diego',
        category: 'Festival',
        source: 'Adams Avenue Fair'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Adams Avenue Fair events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Adams Avenue Fair error:', error.message);
    return [];
  }
}

module.exports = scrapeAdamsAveFair;
