/**
 * Life Is Beautiful Festival Las Vegas Scraper
 * URL: https://lifeisbeautiful.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeLifeIsBeautiful(city = 'Las Vegas') {
  console.log('🎭 Scraping Life Is Beautiful Festival...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://lifeisbeautiful.com/', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      
      const dateText = document.body.textContent || '';
      const dateMatch = dateText.match(/(September|October)\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,?\s*(\d{4})/i);

      const img = document.querySelector('img[src*="lib"], .hero img');
      const imageUrl = img?.src || null;

      if (dateMatch) {
        results.push({
          title: 'Life Is Beautiful Festival 2025',
          url: 'https://lifeisbeautiful.com/',
          dateStr: `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2025'}`,
          imageUrl
        });
      }

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        const match = event.dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(\d{4})/i);
        if (match) {
          const month = months[match[1].toLowerCase()];
          const day = match[2].padStart(2, '0');
          isoDate = `${match[3]}-${month}-${day}`;
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T14:00:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Downtown Las Vegas',
          address: 'Fremont Street, Las Vegas, NV 89101',
          city: 'Las Vegas'
        },
        latitude: 36.1699,
        longitude: -115.1398,
        city: 'Las Vegas',
        category: 'Festival',
        source: 'Life Is Beautiful'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Life Is Beautiful events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Life Is Beautiful error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeLifeIsBeautiful;
