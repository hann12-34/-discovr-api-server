/**
 * Mississippi Studios Portland Scraper
 * URL: https://www.mississippistudios.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMississippiNew(city = 'Portland') {
  console.log('🎸 Scraping Mississippi Studios New...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.mississippistudios.com/calendar', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/event"], .event-item, .event-card, article, .tw-event, [class*="event"], .seetickets-list-event').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);

          const title = el.querySelector('h2, h3, h4, .title, .headliners, .tw-name, .seetickets-list-event-title')?.textContent?.trim() ||
                       linkEl?.textContent?.trim();
          if (!title || title.length < 3 || title.length > 150) return;

          const dateEl = el.querySelector('time, .date, .tw-date, [class*="date"], .seetickets-list-event-date');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || el.textContent || '';
          
          const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i) ||
                           dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);

          const img = el.querySelector('img');
          const imageUrl = img?.src && !img.src.includes('data:') ? img.src : null;

          results.push({
            title,
            url,
            dateText: dateMatch ? dateMatch[0] : null,
            imageUrl
          });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12', jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const monthMatch = event.dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        if (monthMatch) {
          const monthKey = monthMatch[1].toLowerCase().substring(0, 3);
          const month = months[monthKey] || months[monthMatch[1].toLowerCase()];
          const day = monthMatch[2].padStart(2, '0');
          let year = monthMatch[3] || now.getFullYear().toString();
          if (!monthMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Mississippi Studios',
          address: '3939 N Mississippi Ave, Portland, OR 97227',
          city: 'Portland'
        },
        city: 'Portland',
        category: 'Nightlife',
        source: 'Mississippi Studios'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Mississippi Studios events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Mississippi Studios error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMississippiNew;
