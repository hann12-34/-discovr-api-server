/**
 * TEMPO Nightclub Gold Coast Events Scraper
 * Gold Coast's premier techno nightclub in Surfers Paradise
 * URL: https://tempoclub.au/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTempoNightclub(city = 'Gold Coast') {
  console.log('🎧 Scraping TEMPO Nightclub Gold Coast...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://tempoclub.au/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for event cards, articles, or links
      const selectors = [
        'a[href*="/event"]',
        'article',
        '.event',
        '[class*="event"]',
        '.card',
        'a[href*="tickets"]'
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          try {
            const link = el.tagName === 'A' ? el : el.querySelector('a[href]');
            let url = link?.href;
            if (!url) return;
            
            // Make sure it's a valid event URL
            if (url.includes('facebook') || url.includes('instagram') || url.includes('mailto')) return;
            if (seen.has(url)) return;
            seen.add(url);

            // Get container
            let container = el;
            if (el.tagName === 'A') {
              container = el.closest('article, section, div') || el.parentElement?.parentElement;
            }
            if (!container) return;

            // Get title
            const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
            let title = titleEl?.textContent?.trim() || link?.textContent?.trim();
            title = title?.replace(/\s+/g, ' ')?.substring(0, 200);
            
            if (!title || title.length < 3) return;
            if (/^(buy tickets|get tickets|book now|view|more info)$/i.test(title)) return;

            // Get date - look for date patterns in container text
            const containerText = container.textContent || '';
            const datePatterns = [
              /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
              /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
              /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
              /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i
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

            if (title && url) {
              results.push({ title, url, dateStr, imageUrl });
            }
          } catch (e) {}
        });
      }

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
        // Try different date formats
        let dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
        if (!dateMatch) {
          dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
          if (dateMatch) {
            const temp = dateMatch[1];
            dateMatch[1] = dateMatch[2];
            dateMatch[2] = temp;
          }
        }
        if (!dateMatch) {
          const numericMatch = event.dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (numericMatch) {
            const day = numericMatch[1].padStart(2, '0');
            const month = numericMatch[2].padStart(2, '0');
            const year = numericMatch[3];
            isoDate = `${year}-${month}-${day}`;
          }
        }

        if (dateMatch && !isoDate) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      // Skip events without valid dates
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
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'TEMPO Nightclub',
          address: '3173 Surfers Paradise Blvd, Surfers Paradise QLD 4217',
          city: 'Gold Coast'
        },
        latitude: -28.0000,
        longitude: 153.4262,
        city: 'Gold Coast',
        category: 'Nightlife',
        source: 'TEMPO Nightclub'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} TEMPO Nightclub events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  TEMPO Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeTempoNightclub;
