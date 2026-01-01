/**
 * Geisha Bar Perth Events Scraper
 * Premium nightclub in Northbridge with electronic/underground music
 * URL: https://www.geishabar.com.au/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeGeishaBar(city = 'Perth') {
  console.log('🎎 Scraping Geisha Bar Perth...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.geishabar.com.au/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for event links on the What's On section
      document.querySelectorAll('a[href*="/whaton/"]').forEach(el => {
        try {
          const url = el.href;
          if (!url || seen.has(url)) return;
          seen.add(url);

          // Get parent container for more context
          let container = el.closest('div') || el.parentElement;
          
          // Try to get title from the link text or nearby heading
          let title = el.textContent?.trim();
          if (!title || title.length < 3) {
            const heading = container?.querySelector('h1, h2, h3, h4');
            title = heading?.textContent?.trim();
          }
          
          if (!title || title.length < 3 || title.length > 200) return;
          if (title.toLowerCase() === 'closed') return;

          // Look for image
          const img = container?.querySelector('img') || el.querySelector('img');
          let imageUrl = img?.src || img?.getAttribute('data-src');
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = 'https://www.geishabar.com.au' + imageUrl;
          }

          // Look for date text
          let dateStr = null;
          const dateEl = container?.querySelector('time, .date, [class*="date"]');
          if (dateEl) {
            dateStr = dateEl.getAttribute('datetime') || dateEl.textContent?.trim();
          }

          results.push({ title, url, imageUrl, dateStr });
        } catch (e) {}
      });

      return results;
    });

    // Now visit each event page to get more details
    const detailedEvents = [];
    
    for (const event of events.slice(0, 20)) {
      try {
        await page.goto(event.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const details = await page.evaluate(() => {
          let dateStr = null;
          let imageUrl = null;
          
          // Look for date in various formats
          const datePatterns = [
            /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
            /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/
          ];

          const bodyText = document.body.innerText;
          for (const pattern of datePatterns) {
            const match = bodyText.match(pattern);
            if (match) {
              dateStr = match[0];
              break;
            }
          }

          // Get main image
          const img = document.querySelector('article img, .content img, main img');
          if (img && img.src && !img.src.includes('logo')) {
            imageUrl = img.src;
          }

          return { dateStr, imageUrl };
        });

        if (details.dateStr) event.dateStr = details.dateStr;
        if (details.imageUrl && !event.imageUrl) event.imageUrl = details.imageUrl;
        
        detailedEvents.push(event);
      } catch (e) {
        detailedEvents.push(event);
      }
    }

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const seenKeys = new Set();

    for (const event of detailedEvents) {
      if (!event.url) continue;

      let isoDate = null;
      if (event.dateStr) {
        // Try DD Month YYYY
        let dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          let year = dateMatch[3] || now.getFullYear().toString();
          if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
        
        // Try Month DD, YYYY
        if (!isoDate) {
          dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
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

      // Skip events without dates or past events
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date(now.toISOString().split('T')[0])) continue;

      const key = event.title.toLowerCase() + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Geisha Bar',
          address: '135A James Street, Northbridge, WA 6003',
          city: 'Perth'
        },
        latitude: -31.9468,
        longitude: 115.8613,
        city: 'Perth',
        category: 'Nightlife',
        source: 'Geisha Bar'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Geisha Bar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Geisha Bar error:', error.message);
    return [];
  }
}

module.exports = scrapeGeishaBar;
