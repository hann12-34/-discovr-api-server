/**
 * O2 Academy Brixton London Events Scraper v3
 * URL: https://www.academymusicgroup.com/o2academybrixton/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeO2AcademyBrixton3(city = 'London') {
  console.log('🎵 Scraping O2 Academy Brixton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.academymusicgroup.com/o2academybrixton/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href]').forEach(el => {
        const href = el.href;
        if (!href || seen.has(href)) return;
        if (!href.includes('/event/')) return;
        seen.add(href);
        
        let container = el;
        let title = null;
        let dateStr = null;
        let img = null;
        
        for (let i = 0; i < 10; i++) {
          if (!container) break;
          
          if (!title) {
            const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"]');
            title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          }
          
          if (!dateStr) {
            const dateEl = container.querySelector('time, .date, [class*="date"]');
            dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          }
          
          if (!img) {
            const imgEl = container.querySelector('img');
            img = imgEl?.src || imgEl?.getAttribute('data-src');
          }
          
          if (title && dateStr) break;
          container = container.parentElement;
        }
        
        if (!title) {
          const urlParts = href.split('/');
          const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
          title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        
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
          const dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
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
        imageUrl: null,
        venue: {
          name: 'O2 Academy Brixton',
          address: '211 Stockwell Rd, London SW9 9SL',
          city: 'London'
        },
        latitude: 51.4656,
        longitude: -0.1152,
        city: 'London',
        category: 'Concert',
        source: 'O2 Academy Brixton'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} O2 Academy Brixton events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  O2 Academy Brixton error:', error.message);
    return [];
  }
}

module.exports = scrapeO2AcademyBrixton3;
