/**
 * EartH (Evolutionary Arts Hackney) London Events Scraper
 * URL: https://earthackney.co.uk/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeEartH(city = 'London') {
  console.log('🎵 Scraping EartH Hackney London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://earthackney.co.uk/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('[class*="event"], article, .card, a[href*="event"]').forEach(el => {
        const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href]');
        const href = linkEl?.href;
        if (!href || seen.has(href)) return;
        seen.add(href);
        
        const container = el.closest('div, article') || el;
        const titleEl = container.querySelector('h2, h3, h4, [class*="title"]');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        
        const dateEl = container.querySelector('time, [class*="date"]');
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        
        const imgEl = container.querySelector('img');
        const img = imgEl?.src;
        
        if (title && title.length > 2) {
          results.push({ title, dateStr, url: href, imageUrl: img });
        }
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
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(\d{1,2})[\/\-\.\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            let year = now.getFullYear().toString();
            if (parseInt(month) < now.getMonth() + 1) year = (now.getFullYear() + 1).toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: null,
        venue: {
          name: 'EartH',
          address: '11-17 Stoke Newington Rd, London N16 8BH',
          city: 'London'
        },
        latitude: 51.5475,
        longitude: -0.0764,
        city: 'London',
        category: 'Nightlife',
        source: 'EartH'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} EartH events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  EartH error:', error.message);
    return [];
  }
}

module.exports = scrapeEartH;
