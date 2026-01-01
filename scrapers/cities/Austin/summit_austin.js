/**
 * Summit Austin Nightclub Events Scraper
 * Rooftop nightclub in downtown Austin
 * URL: https://summitaustin.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSummitAustin(city = 'Austin') {
  console.log('🏔️ Scraping Summit Austin...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://summitaustin.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('.event-item, .tribe-events-calendar-list__event, article, [class*="event"]').forEach(el => {
        try {
          const link = el.querySelector('a[href]');
          const url = link?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);

          const titleEl = el.querySelector('h1, h2, h3, h4, .tribe-events-calendar-list__event-title, .title');
          const title = titleEl?.textContent?.trim();
          if (!title || title.length < 3 || title.length > 150) return;
          if (/^(View|More|Read|Click|Book|Buy|Private)/i.test(title)) return;

          const dateEl = el.querySelector('time, .tribe-event-date-start, [class*="date"]');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || '';

          const img = el.querySelector('img');
          const imageUrl = img?.src || img?.getAttribute('data-src');

          results.push({ title, url, dateText, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();

    for (const event of events) {
      let isoDate = null;
      if (event.dateText) {
        const isoMatch = event.dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[1];
        } else {
          const match = event.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          if (match) {
            const month = months[match[1].toLowerCase().substring(0, 3)];
            const day = match[2].padStart(2, '0');
            const year = match[3] || now.getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Summit Austin',
          address: '120 W 5th St, Austin, TX 78701',
          city: 'Austin'
        },
        city: 'Austin',
        category: 'Nightlife',
        source: 'Summit Austin'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Summit Austin events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Summit Austin error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSummitAustin;
