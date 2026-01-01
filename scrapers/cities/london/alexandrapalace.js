/**
 * Alexandra Palace Events Scraper (London)
 * Major entertainment venue in North London
 * URL: https://www.alexandrapalace.com/whats-on/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeAlexandraPalace(city = 'London') {
  console.log('🏰 Scraping Alexandra Palace London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.alexandrapalace.com/whats-on/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/whats-on/"]').forEach(el => {
        const href = el.href;
        if (seen.has(href) || href.endsWith('/whats-on/')) return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 6; i++) {
          container = container.parentElement;
          if (!container) break;
          
          const title = container.querySelector('h2, h3, h4, .title')?.textContent?.trim()?.replace(/\s+/g, ' ');
          const dateEl = container.querySelector('time, .date, [class*="date"]');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          const img = container.querySelector('img')?.src;
          
          if (title && title.length > 3 && title.length < 100 && !title.includes('looking for')) {
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
    const seenKeys = new Set();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Look for year anywhere in the string first
        const yearMatch = event.dateStr.match(/(\d{4})/);
        const foundYear = yearMatch ? yearMatch[1] : null;
        
        // Handle formats like "21 Nov - 4 Dec 2025" or "6 Dec 2025"
        const dateMatch = event.dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const now = new Date();
          let year = foundYear || now.getFullYear().toString();
          if (!foundYear && parseInt(month) < now.getMonth() + 1) {
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
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: 'Alexandra Palace',
          address: 'Alexandra Palace Way, London N22 7AY',
          city: 'London'
        },
        latitude: 51.5944,
        longitude: -0.1303,
        city: 'London',
        category: 'Nightlife',
        source: 'Alexandra Palace'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Alexandra Palace events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Alexandra Palace error:', error.message);
    return [];
  }
}

module.exports = scrapeAlexandraPalace;
