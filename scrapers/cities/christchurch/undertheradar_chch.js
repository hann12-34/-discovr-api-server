/**
 * Under the Radar Christchurch Gig Guide Scraper
 * NZ's premier music site for gig listings
 * URL: https://www.undertheradar.co.nz/utr/gigRegion/Christchurch
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeUnderTheRadarChch(city = 'Christchurch') {
  console.log('🎸 Scraping Under the Radar Christchurch gigs...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.undertheradar.co.nz/utr/gigRegion/Christchurch', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Target gig links with format /gig/XXXXX/
      document.querySelectorAll('a[href*="/gig/"]').forEach(link => {
        try {
          const url = link.href;
          if (!url || seen.has(url) || url.includes('addgig')) return;
          seen.add(url);

          // Get the text content which contains date and title
          const text = link.textContent?.trim() || '';
          if (!text || text.length < 5) return;

          // Parse date from format like "Sat 24th Jan:" or "Thu 5th Feb:"
          const dateMatch = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
          
          // Title is after the colon
          const colonIndex = text.indexOf(':');
          let title = colonIndex > -1 ? text.substring(colonIndex + 1).trim() : text;
          title = title.replace(/\s+/g, ' ');
          
          if (!title || title.length < 3) return;

          let dateStr = null;
          if (dateMatch) {
            dateStr = `${dateMatch[1]} ${dateMatch[2]}`;
          }

          results.push({ title, url, dateStr });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const currentYear = now.getFullYear();
    const seenKeys = new Set();

    for (const event of events) {
      let isoDate = null;

      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          // Determine year - if month is before current month, use next year
          let year = currentYear;
          if (parseInt(month) < now.getMonth() + 1) {
            year = currentYear + 1;
          }
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: null,
        venue: {
          name: 'Various Venues',
          address: 'Christchurch',
          city: 'Christchurch'
        },
        city: 'Christchurch',
        category: 'Nightlife',
        source: 'Under the Radar'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Under the Radar Christchurch gigs`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Under the Radar error:', error.message);
    return [];
  }
}

module.exports = scrapeUnderTheRadarChch;
