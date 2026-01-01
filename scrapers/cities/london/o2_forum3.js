/**
 * O2 Forum Kentish Town London Events Scraper v3
 * URL: https://www.academymusicgroup.com/o2forumkentishtown/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeO2Forum3(city = 'London') {
  console.log('🎵 Scraping O2 Forum Kentish Town...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.academymusicgroup.com/o2forumkentishtown/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event"]').forEach(el => {
        const href = el.href;
        if (!href || seen.has(href)) return;
        seen.add(href);
        
        const container = el.closest('div, article, li') || el;
        
        const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"]') || el.querySelector('h1, h2, h3, h4');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        
        const dateEl = container.querySelector('time, .date, [class*="date"]') || el.querySelector('time, .date');
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        
        const imgEl = container.querySelector('img') || el.querySelector('img');
        const img = imgEl?.src || imgEl?.getAttribute('data-src');
        
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
          const dateMatch = event.dateStr.match(/(\d{1,2})[\/\-\.\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\-\.\s]*(\d{4})?/i);
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
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: 'O2 Forum Kentish Town',
          address: '9-17 Highgate Rd, London NW5 1JY',
          city: 'London'
        },
        latitude: 51.5514,
        longitude: -0.1422,
        city: 'London',
        category: 'Concert',
        source: 'O2 Forum'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} O2 Forum events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  O2 Forum error:', error.message);
    return [];
  }
}

module.exports = scrapeO2Forum3;
