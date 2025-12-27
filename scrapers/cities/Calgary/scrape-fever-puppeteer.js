/**
 * Fever Calgary Events Scraper (Puppeteer)
 * URL: https://feverup.com/calgary
 * Has real event images - needs Puppeteer for JS rendering
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎟️ Scraping Fever Calgary events (Puppeteer)...');
  let browser;

  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://feverup.com/calgary', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForSelector('img[data-src], img[src*="feverup"]', { timeout: 10000 }).catch(() => {});

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      // Find all event cards/links
      document.querySelectorAll('a[href*="/plan/"], [class*="card"], [class*="event"]').forEach(el => {
        const titleEl = el.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"]');
        const title = titleEl ? titleEl.textContent.trim() : '';
        
        if (!title || title.length < 5 || seenTitles.has(title.toLowerCase())) return;
        if (/menu|login|sign|filter|search|cookie|more/i.test(title)) return;
        seenTitles.add(title.toLowerCase());

        // Get URL
        let url = el.href || el.querySelector('a')?.href || '';
        if (!url.includes('/plan/')) return;

        // Get image
        const img = el.querySelector('img');
        let imageUrl = img ? (img.dataset.src || img.src) : '';
        if (!imageUrl || imageUrl.startsWith('data:') || !imageUrl.includes('feverup')) return;
        
        // Make image larger
        imageUrl = imageUrl.replace(/w_\d+,h_\d+/, 'w_800,h_600');

        results.push({
          title,
          url,
          imageUrl
        });
      });

      return results;
    });

    await browser.close();

    // Process and add metadata
    const processedEvents = events.slice(0, 30).map(e => ({
      id: uuidv4(),
      title: e.title,
      date: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Placeholder - will fetch actual date
      url: e.url,
      image: e.imageUrl,
      imageUrl: e.imageUrl,
      venue: {
        name: 'Various Calgary Venues',
        address: 'Calgary, AB',
        city: 'Calgary'
      },
      city: 'Calgary',
      category: 'Entertainment',
      source: 'Fever'
    }));

    console.log(`✅ Fever Calgary: ${processedEvents.length} events with images`);
    return processedEvents;

  } catch (error) {
    console.error('  ⚠️ Fever Calgary error:', error.message);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrape;
