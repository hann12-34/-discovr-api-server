/**
 * Citadel Theatre Edmonton Events Scraper
 * URL: https://citadeltheatre.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeCitadeltheatre(city = 'Edmonton') {
  console.log('🎵 Scraping Citadel Theatre Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.citadeltheatre.com/shows/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Citadel Theatre uses show cards
      document.querySelectorAll('.show-card, .production-card, .season-show, article.show, [class*="production"]').forEach(item => {
        try {
          const linkEl = item.querySelector('a[href]');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);
          
          const titleEl = item.querySelector('h2, h3, .show-title, .production-title');
          const title = titleEl?.textContent?.trim();
          if (!title || title.length < 3) return;
          
          const dateEl = item.querySelector('.dates, .show-dates, [class*="date"], time');
          const dateStr = dateEl?.textContent?.trim() || '';
          
          const imgEl = item.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
      });

      // Fallback: look for show links
      if (results.length === 0) {
        document.querySelectorAll('a[href*="/show"], a[href*="/production"], a[href*="whats-on"] img').forEach(el => {
          const link = el.tagName === 'A' ? el : el.closest('a');
          if (!link) return;
          const url = link.href;
          if (seen.has(url)) return;
          seen.add(url);
          const title = link.textContent?.trim() || link.getAttribute('title');
          if (title && title.length > 3) {
            results.push({ title, dateStr: '', url, imageUrl: el.tagName === 'IMG' ? el.src : null });
          }
        });
      }
      
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
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            isoDate = `${year}-${month}-${day}`;
          }
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
          name: 'Citadel Theatre',
          address: '9828 101A Avenue NW, Edmonton, AB T5J 3C6',
          city: 'Edmonton'
        },
        latitude: 53.5444,
        longitude: -113.4989,
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Citadel Theatre'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Citadel Theatre events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Citadel Theatre error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCitadeltheatre;
