/**
 * District Nightclub Adelaide Events Scraper
 * Premier Hip Hop & RnB nightclub on Hindley Street
 * URL: https://www.districtnight.club/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeDistrictNightclub(city = 'Adelaide') {
  console.log('🎤 Scraping District Nightclub Adelaide...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.districtnight.club/events-in-adelaide', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for event links with specific patterns
      document.querySelectorAll('a[href*="/events-in-adelaide/"]').forEach(el => {
        try {
          const url = el.href;
          if (!url || seen.has(url) || url.includes('format=ical')) return;
          seen.add(url);

          // Get event title from the link or nearby heading
          let title = el.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title === 'View Event →') {
            const heading = el.closest('div')?.querySelector('h1, h2, h3');
            title = heading?.textContent?.trim();
          }
          if (!title || title.length < 3 || title.length > 200) return;

          // Find parent container to get date and image
          let container = el.closest('article') || el.closest('section') || el.closest('div');
          for (let i = 0; i < 5 && container; i++) {
            if (container.querySelector('time, .date') || container.textContent?.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
              break;
            }
            container = container.parentElement;
          }

          // Extract date from Google Calendar link or text
          let dateStr = null;
          const gcalLink = container?.querySelector('a[href*="google.com/calendar"]');
          if (gcalLink) {
            const dateMatch = gcalLink.href.match(/dates=(\d{8})/);
            if (dateMatch) {
              const d = dateMatch[1];
              dateStr = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
            }
          }

          if (!dateStr) {
            const text = container?.textContent || '';
            const dateMatch = text.match(/((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
            if (dateMatch) {
              dateStr = `${dateMatch[2]} ${dateMatch[3]} ${dateMatch[4]}`;
            }
          }

          // Look for image
          const img = container?.querySelector('img:not([src*="logo"])');
          let imageUrl = img?.src || img?.getAttribute('data-src');

          results.push({ title, url, dateStr, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    // Visit each event page to get more details
    const detailedEvents = [];
    for (const event of events.slice(0, 20)) {
      try {
        await page.goto(event.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const details = await page.evaluate(() => {
          let dateStr = null;
          let imageUrl = null;

          // Look for date
          const dateEl = document.querySelector('time[datetime], .eventitem-meta-date');
          if (dateEl) {
            dateStr = dateEl.getAttribute('datetime') || dateEl.textContent?.trim();
          }

          if (!dateStr) {
            const bodyText = document.body.innerText;
            const dateMatch = bodyText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
            if (dateMatch) dateStr = dateMatch[0];
          }

          // Get event image
          const img = document.querySelector('.content-wrapper img, article img, main img');
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
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
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
        }
      }

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
          name: 'District Nightclub',
          address: '15 Hindley Street, Adelaide, SA 5000',
          city: 'Adelaide'
        },
        latitude: -34.9235,
        longitude: 138.5975,
        city: 'Adelaide',
        category: 'Nightlife',
        source: 'District Nightclub'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} District Nightclub events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ District Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeDistrictNightclub;
