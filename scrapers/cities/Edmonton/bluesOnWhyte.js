/**
 * Blues On Whyte / The Commercial Edmonton Scraper
 * Famous blues bar with live music on Whyte Ave
 * URL: https://bluesonwhyte.com/shows/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBluesOnWhyte(city = 'Edmonton') {
  console.log('🎸 Scraping Blues On Whyte (The Commercial) Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://bluesonwhyte.com/shows/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the shows page
    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Look for event cards/items
      document.querySelectorAll('article, .show, .event, [class*="event"], a[href*="event"]').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a');
          const url = link ? link.href : null;
          if (!url || seen.has(url)) return;
          seen.add(url);
          
          // Get title
          const titleEl = el.querySelector('h2, h3, h4, .title, .artist');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3) return;
          
          // Get date - look for time element or date text
          let dateStr = null;
          const timeEl = el.querySelector('time[datetime]');
          if (timeEl) {
            dateStr = timeEl.getAttribute('datetime');
          } else {
            // Look for date pattern in text
            const text = el.textContent;
            const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
            if (dateMatch) {
              dateStr = `${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3] || new Date().getFullYear()}`;
            }
          }
          
          // Get image
          const img = el.querySelector('img');
          const imageUrl = img && img.src && img.src.startsWith('http') && !img.src.includes('logo') ? img.src : null;
          
          results.push({ title, url, dateStr, imageUrl });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const months = { 
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };

    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Try ISO format
        const isoMatch = event.dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[0];
        } else {
          // Try month day year format
          const mdyMatch = event.dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
          if (mdyMatch) {
            const month = months[mdyMatch[1].toLowerCase()];
            const day = mdyMatch[2].padStart(2, '0');
            isoDate = `${mdyMatch[3]}-${month}-${day}`;
          }
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < today) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T21:00:00'),
        url: event.url.startsWith('http') ? event.url : `https://bluesonwhyte.com${event.url}`,
        imageUrl: (event.imageUrl && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Blues On Whyte (The Commercial)',
          address: '10329 82 Avenue NW, Edmonton, AB T6E 1Z9',
          city: 'Edmonton'
        },
        latitude: 53.5178,
        longitude: -113.4961,
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Blues On Whyte'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Blues On Whyte events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Blues On Whyte error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeBluesOnWhyte;
