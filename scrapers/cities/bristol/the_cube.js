/**
 * The Cube Microplex Bristol Events Scraper
 * URL: https://cubecinema.com/programme
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeCube(city = 'Bristol') {
  console.log('🎬 Scraping The Cube...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://cubecinema.com/programme', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/programme/"]').forEach(el => {
        const href = el.href;
        if (seen.has(href) || href.endsWith('/programme/') || href === 'https://cubecinema.com/programme') return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 8; i++) {
          container = container.parentElement;
          if (!container) break;
          
          const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          
          const dateEl = container.querySelector('time, .date, [class*="date"]');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          const img = container.querySelector('img')?.src;
          
          if (title && title.length > 3 && title.length < 150) {
            results.push({ title, dateStr, url: href, imageUrl: img });
            break;
          }
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
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'The Cube Microplex',
          address: 'Dove St S, Bristol BS2 8JD',
          city: 'Bristol'
        },
        latitude: 51.4560,
        longitude: -2.5830,
        city: 'Bristol',
        category: 'Arts',
        source: 'The Cube'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Cube events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Cube error:', error.message);
    return [];
  }
}

module.exports = scrapeCube;
