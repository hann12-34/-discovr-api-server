/**
 * Rogue & Vagabond Wellington Events Scraper
 * Craft beer bar with live music
 * URL: https://www.rogueandvagabond.co.nz
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeRogueAndVagabond(city = 'Wellington') {
  console.log('🍺 Scraping Rogue & Vagabond Wellington...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.rogueandvagabond.co.nz', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const gigUrls = await page.evaluate(() => {
      const urls = new Set();
      document.querySelectorAll('a[href*="undertheradar.co.nz/gig"]').forEach(link => {
        urls.add(link.href);
      });
      return Array.from(urls);
    });

    console.log(`  Found ${gigUrls.length} gig URLs...`);

    const events = [];
    
    for (const url of gigUrls.slice(0, 15)) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const eventData = await page.evaluate(() => {
          const pageTitle = document.title || '';
          const h1 = document.querySelector('h1')?.textContent?.trim();
          
          if (!h1) return null;

          const titleParts = pageTitle.split(' - ');
          let venue = null;
          let dateText = null;
          
          if (titleParts.length >= 2) {
            const venuePart = titleParts[1];
            const venueMatch = venuePart.match(/^([^,]+)/);
            venue = venueMatch ? venueMatch[1].trim() : null;
          }
          
          if (titleParts.length >= 3) {
            dateText = titleParts[2].trim();
          }

          const img = document.querySelector('img[src*="event"], img[src*="gig"], article img');
          const imageUrl = img?.src;

          return { title: h1, dateText, venue, imageUrl };
        });

        if (eventData && eventData.title) {
          events.push({
            ...eventData,
            sourceUrl: url
          });
        }
      } catch (e) {
        // Skip failed pages
      }
    }

    await browser.close();

    const formattedEvents = [];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const fullDateMatch = event.dateText.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        
        if (fullDateMatch) {
          const day = fullDateMatch[1].padStart(2, '0');
          const monthFull = fullDateMatch[2].toLowerCase();
          const month = months[monthFull];
          const year = fullDateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.sourceUrl,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Rogue & Vagabond',
          address: '18 Garrett Street, Te Aro, Wellington 6011',
          city: 'Wellington'
        },
        city: 'Wellington',
        category: 'Nightlife',
        source: 'Rogue & Vagabond'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Rogue & Vagabond events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Rogue & Vagabond error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeRogueAndVagabond;
