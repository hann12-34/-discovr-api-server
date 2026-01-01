/**
 * Stubbs BBQ Austin Events Scraper
 * URL: https://www.stubbsaustin.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeStubbsbbq(city = 'Austin') {
  console.log('🎵 Scraping Stubbs BBQ...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.stubbsaustin.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event, article, [class*="event"], .show, a[href*="/event"]').forEach(item => {
        try {
          const el = item.tagName === 'A' ? item : item.querySelector('a[href]');
          const url = el ? el.href : item.querySelector('a')?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);
          
          const container = item.closest('div, article, li') || item;
          const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3) return;
          
          const dateEl = container.querySelector('time, .date, [class*="date"]');
          const dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          const imgEl = container.querySelector('img');
          const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
      });
      
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
          name: 'Stubbs BBQ',
          address: '801 Red River Street, Austin, TX 78701',
          city: 'Austin'
        },
        latitude: 30.2669,
        longitude: -97.7347,
        city: 'Austin',
        category: 'Nightlife',
        source: 'Stubbs BBQ'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Stubbs BBQ events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Stubbs BBQ error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeStubbsbbq;
