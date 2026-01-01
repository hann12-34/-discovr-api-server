/**
 * Liverpool City Halls (St George's Hall) Events Scraper
 * URL: https://liverpoolcityhalls.co.uk/whats-on/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeLiverpoolCityHalls(city = 'Liverpool') {
  console.log('🏛️ Scraping Liverpool City Halls...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://liverpoolcityhalls.co.uk/whats-on/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/events/event/"]').forEach(link => {
        const url = link.href;
        if (!url || seen.has(url)) return;
        seen.add(url);
        
        let container = link.closest('div, article, li') || link.parentElement;
        for (let i = 0; i < 6 && container; i++) {
          const titleEl = container.querySelector('h2, h3, h4, [class*="title"]');
          const title = titleEl?.textContent?.trim();
          
          if (title && title.length > 3 && title.length < 150) {
            const dateEl = container.querySelector('time, [class*="date"], [datetime]');
            const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
            
            const imgEl = container.querySelector('img');
            const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
            
            results.push({ title, url, dateStr, imageUrl });
            break;
          }
          container = container.parentElement;
        }
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const isoMatch = event.dateStr.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[1];
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
      if (new Date(isoDate) < today) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'St George\'s Hall',
          address: 'St George\'s Place, Liverpool L1 1JJ',
          city: 'Liverpool'
        },
        latitude: 53.4094,
        longitude: -2.9797,
        city: 'Liverpool',
        category: 'Nightlife',
        source: 'Liverpool City Halls'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Liverpool City Halls events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Liverpool City Halls error:', error.message);
    return [];
  }
}

module.exports = scrapeLiverpoolCityHalls;
