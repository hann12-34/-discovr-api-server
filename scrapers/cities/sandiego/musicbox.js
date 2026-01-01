/**
 * Music Box San Diego Events Scraper
 * Live music venue in Little Italy
 * URL: https://www.musicboxsd.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMusicBox(city = 'San Diego') {
  console.log('🎸 Scraping Music Box San Diego...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.musicboxsd.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(a => {
        const url = a.href;
        if (seen.has(url) || url.includes('ticketweb')) return;
        
        const text = a.textContent.trim();
        if (text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),/) || text === 'Tickets' || text.length < 4) return;
        
        seen.add(url);
        
        const article = a.closest('article');
        let dateStr = null;
        article?.querySelectorAll('a[href*="/event/"]').forEach(link => {
          const t = link.textContent.trim();
          if (t.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),/)) dateStr = t;
        });
        
        const imgEl = article?.querySelector('img');
        const img = imgEl?.src;
        
        results.push({ title: text, dateStr, url, imageUrl: img });
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
        const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          let year = now.getFullYear().toString();
          if (parseInt(month) < now.getMonth() + 1) {
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
        startDate: new Date(isoDate + 'T21:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Music Box',
          address: '1337 India St, San Diego, CA 92101',
          city: 'San Diego'
        },
        latitude: 32.7229,
        longitude: -117.1689,
        city: 'San Diego',
        category: 'Nightlife',
        source: 'Music Box'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Music Box events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Music Box error:', error.message);
    return [];
  }
}

module.exports = scrapeMusicBox;
