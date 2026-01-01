/**
 * Lion Arts Factory Adelaide Events Scraper
 * Premier live music venue in Adelaide
 * URL: https://lionartsfactory.com.au/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeLionArtsFactory(city = 'Adelaide') {
  console.log('🦁 Scraping Lion Arts Factory Adelaide...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://lionartsfactory.com.au/whats-on/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll to load more content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for Moshtix links which are the primary ticket source
      document.querySelectorAll('a[href*="moshtix.com.au"]').forEach(el => {
        try {
          const url = el.href;
          if (seen.has(url)) return;
          seen.add(url);

          // Find parent container
          let container = el.closest('div') || el.parentElement;
          for (let i = 0; i < 3; i++) {
            if (container?.parentElement) container = container.parentElement;
          }

          // Look for title in headings
          const titleEl = container?.querySelector('h1, h2, h3, h4');
          const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 200) return;

          // Look for image
          const img = container?.querySelector('img:not([src*="logo"])');
          let imageUrl = img?.src || img?.getAttribute('data-src');

          results.push({ title, url, imageUrl, dateStr: null });
        } catch (e) {}
      });

      // Also look for event cards/items
      const selectors = ['.event', '.show', 'article', '[class*="event"]'];
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          try {
            const link = el.querySelector('a[href*="moshtix"], a[href*="event"]');
            const url = link?.href;
            if (!url || seen.has(url)) return;
            seen.add(url);

            const titleEl = el.querySelector('h1, h2, h3, h4, .title');
            const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
            if (!title || title.length < 3) return;

            const img = el.querySelector('img:not([src*="logo"])');
            let imageUrl = img?.src;

            results.push({ title, url, imageUrl, dateStr: null });
          } catch (e) {}
        });
      }

      return results;
    });

    // Visit each Moshtix event page to get date
    const detailedEvents = [];
    for (const event of events.slice(0, 50)) {
      if (!event.url.includes('moshtix')) {
        detailedEvents.push(event);
        continue;
      }

      try {
        await page.goto(event.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const details = await page.evaluate(() => {
          let dateStr = null;
          let imageUrl = null;

          // Moshtix typically shows dates in specific formats
          const dateEl = document.querySelector('.event-date, .date, time, [class*="date"]');
          if (dateEl) {
            dateStr = dateEl.getAttribute('datetime') || dateEl.textContent?.trim();
          }

          // Look for date in page text
          if (!dateStr) {
            const bodyText = document.body.innerText;
            const dateMatch = bodyText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
            if (dateMatch) dateStr = dateMatch[0];
          }

          // Get event image
          const img = document.querySelector('.event-image img, .hero img, main img');
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Lion Arts Factory',
          address: '68 North Terrace, Adelaide, SA 5000',
          city: 'Adelaide'
        },
        latitude: -34.9205,
        longitude: 138.5950,
        city: 'Adelaide',
        category: 'Nightlife',
        source: 'Lion Arts Factory'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Lion Arts Factory events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Lion Arts Factory error:', error.message);
    return [];
  }
}

module.exports = scrapeLionArtsFactory;
