/**
 * House of Yes Events Scraper
 * Brooklyn's most creative nightclub and performance venue
 * URL: https://www.houseofyes.org/calendar
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHouseOfYes(city = 'New York') {
  console.log('🎭 Scraping House of Yes...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.houseofyes.org/calendar', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // House of Yes uses event cards/items
      document.querySelectorAll('a[href*="/event/"], .eventlist-event, .summary-item, [data-item-id]').forEach(item => {
        try {
          const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href*="/event/"]');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);
          
          // Get title
          const titleEl = item.querySelector('h1, h2, h3, .eventlist-title, .summary-title, [class*="title"]');
          const title = titleEl?.textContent?.trim();
          if (!title || title.length < 3) return;
          
          // Get date - look for time element or date text
          const timeEl = item.querySelector('time');
          let dateStr = timeEl?.getAttribute('datetime') || '';
          
          if (!dateStr) {
            const dateEl = item.querySelector('.eventlist-datetag, .summary-metadata, [class*="date"]');
            dateStr = dateEl?.textContent?.trim() || '';
          }
          
          // Get image
          const imgEl = item.querySelector('img');
          let imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-lazy-src');
          if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const seenKeys = new Set();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Try ISO format first (2026-01-15)
        const isoMatch = event.dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          isoDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        } else {
          // Try "Jan 15, 2026" or "January 15" format
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{1,2})(?:[a-z]*)?[\s,]*(\d{4})?/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
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
      
      const key = event.title + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'House of Yes',
          address: '2 Wyckoff Ave, Brooklyn, NY 11237',
          city: 'New York'
        },
        latitude: 40.7054,
        longitude: -73.9232,
        city: 'New York',
        category: 'Nightlife',
        source: 'House of Yes'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} House of Yes events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  House of Yes error:', error.message);
    return [];
  }
}

module.exports = scrapeHouseOfYes;
