/**
 * Elsewhere Gold Coast Events Scraper
 * Premier live music venue in Surfers Paradise
 * URL: https://www.elsewherebar.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeElsewhere(city = 'Gold Coast') {
  console.log('🎵 Scraping Elsewhere Bar Gold Coast...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.elsewherebar.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Target event cards/items with links to /events/
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        try {
          const url = link.href;
          if (!url || seen.has(url) || url === 'https://www.elsewherebar.com/events' || url.includes('format=ical')) return;
          seen.add(url);

          // Get the event container
          let container = link.closest('article, section, div');
          if (!container) container = link.parentElement?.parentElement?.parentElement;
          if (!container) return;

          // Get title from h1, h2 or link text
          const titleEl = container.querySelector('h1 a, h2 a, h1, h2');
          let title = titleEl?.textContent?.trim() || link.textContent?.trim();
          title = title?.replace(/\s+/g, ' ')?.replace(/View Event →/gi, '')?.trim();
          
          if (!title || title.length < 3 || title.length > 200) return;
          if (/^(view event|google calendar|ics|map|nights)$/i.test(title)) return;

          // Get date from text content - look for date patterns
          const containerText = container.textContent || '';
          
          // Pattern: "Sat, Dec 20, 2025" or "Saturday, January 17, 2026"
          const datePatterns = [
            /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
            /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{4})/i
          ];

          let dateStr = null;
          for (const pattern of datePatterns) {
            const match = containerText.match(pattern);
            if (match) {
              dateStr = match[0];
              break;
            }
          }

          // Get image
          const imgEl = container.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');

          results.push({ title, url, dateStr, imageUrl });
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
        // Try multiple date patterns
        let dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
        if (!dateMatch) {
          dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{4})/i);
          if (dateMatch) {
            // Swap day and month positions
            const temp = dateMatch[1];
            dateMatch[1] = dateMatch[2];
            dateMatch[2] = temp;
          }
        }

        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      const key = event.title.toLowerCase() + isoDate;
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
          name: 'Elsewhere Bar',
          address: '23 Cavill Avenue, Surfers Paradise QLD 4217',
          city: 'Gold Coast'
        },
        latitude: -28.0017,
        longitude: 153.4266,
        city: 'Gold Coast',
        category: 'Nightlife',
        source: 'Elsewhere Bar'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Elsewhere Bar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Elsewhere Bar error:', error.message);
    return [];
  }
}

module.exports = scrapeElsewhere;
