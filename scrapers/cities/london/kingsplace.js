/**
 * Kings Place London Events Scraper
 * Arts and music venue in Kings Cross
 * URL: https://www.kingsplace.co.uk/whats-on/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeKingsPlace(city = 'London') {
  console.log('🎵 Scraping Kings Place London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.kingsplace.co.uk/whats-on/', {
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
        const dateMatch = allText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        const dateStr = dateMatch ? dateMatch[0] : null;
        const img = container?.querySelector('img')?.src;
        
        if (title && title.length > 3 && title.length < 100 && !title.includes('Genres')) {
          results.push({ title, dateStr, url: href, imageUrl: img });
        }
      });
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const seenKeys = new Set();
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
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
          name: 'Kings Place',
          address: '90 York Way, London N1 9AG',
          city: 'London'
        },
        latitude: 51.5358,
        longitude: -0.1238,
        city: 'London',
        category: 'Nightlife',
        source: 'Kings Place'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Kings Place events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Kings Place error:', error.message);
    return [];
  }
}

module.exports = scrapeKingsPlace;
