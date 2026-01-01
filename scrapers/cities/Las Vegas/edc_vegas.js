/**
 * EDC Las Vegas Events Scraper
 * URL: https://lasvegas.electricdaisycarnival.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeEdcVegas(city = 'Las Vegas') {
  console.log('🎧 Scraping EDC Las Vegas...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://lasvegas.electricdaisycarnival.com/', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      
      // EDC is a single major festival - get main event info
      const title = document.querySelector('h1, .hero-title, [class*="title"]')?.textContent.trim() || 'EDC Las Vegas 2025';
      const dateText = document.body.textContent || '';
      const dateMatch = dateText.match(/(May|June)\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,?\s*(\d{4})/i);

      const img = document.querySelector('img[src*="edc"], .hero img, header img');
      const imageUrl = img?.src || null;

      if (dateMatch) {
        results.push({
          title: 'EDC Las Vegas 2025',
          url: 'https://lasvegas.electricdaisycarnival.com/',
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
        startDate: new Date(isoDate + 'T18:00:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Las Vegas Motor Speedway',
          address: '7000 N Las Vegas Blvd, Las Vegas, NV 89115',
          city: 'Las Vegas'
        },
        latitude: 36.2720,
        longitude: -115.0107,
        city: 'Las Vegas',
        category: 'Festival',
        source: 'EDC Las Vegas'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} EDC events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ EDC error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeEdcVegas;
