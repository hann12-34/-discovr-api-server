/**
 * The Common Edmonton Events Scraper
 * Nightclub located above 99ten on Whyte Ave
 * URL: https://www.thecommon.ca/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTheCommon(city = 'Edmonton') {
  console.log('🎧 Scraping The Common Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thecommon.ca/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract event URLs from the events page
    const eventUrls = await page.evaluate(() => {
      const urls = new Set();
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        const url = link.href;
        // Filter for individual event pages (have date in URL like /2025/12/31/)
        if (url && url.match(/\/events\/\d{4}\/\d{1,2}\/\d{1,2}\//)) {
          urls.add(url);
        }
      });
      return Array.from(urls);
    });

    console.log(`  📋 Found ${eventUrls.length} event URLs to process`);

    const formattedEvents = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Visit each event page to get details
    for (const eventUrl of eventUrls) {
      try {
        // Extract date from URL pattern /events/YYYY/MM/DD/
        const urlMatch = eventUrl.match(/\/events\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
        if (!urlMatch) continue;
        
        const year = urlMatch[1];
        const month = urlMatch[2].padStart(2, '0');
        const day = urlMatch[3].padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;
        
        // Skip past events
        if (new Date(isoDate) < today) continue;

        await page.goto(eventUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const eventData = await page.evaluate(() => {
          // Get title from h1 - may be in second h1 if first is empty
          let title = null;
          const h1s = document.querySelectorAll('h1');
          for (const h1 of h1s) {
            const text = h1.textContent.trim();
            if (text && text.length > 2) {
              title = text;
              break;
            }
          }
          
          // Get image
          let imageUrl = null;
          const img = document.querySelector('.eventitem-image img, .event-image img, article img');
          if (img && img.src && img.src.startsWith('http') && !img.src.includes('logo')) {
            imageUrl = img.src;
          }
          
          return { title, imageUrl };
        });

        if (!eventData.title) continue;

        formattedEvents.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          startDate: new Date(isoDate + 'T22:00:00'),
          url: eventUrl,
          imageUrl: (eventData.imageUrl && !eventData.imageUrl.includes('placeholder') && !eventData.imageUrl.includes('data:image')) ? eventData.imageUrl : null,
          venue: {
            name: 'The Common',
            address: '9910 82 Avenue NW, Edmonton, AB T6E 2A3',
            city: 'Edmonton'
          },
          latitude: 53.5194,
          longitude: -113.4987,
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'The Common'
        });

      } catch (err) {
        continue;
      }
    }

    await browser.close();

    console.log(`  ✅ Found ${formattedEvents.length} valid The Common events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Common error:', error.message);
    return [];
  }
}

module.exports = scrapeTheCommon;
