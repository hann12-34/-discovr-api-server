/**
 * Hard Rock Live Hollywood FL Scraper - REAL Puppeteer
 * Major South Florida concert venue
 * URL: https://www.seminolehardrockhollywood.com/entertainment
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeHardRockLive(city = 'Miami') {
  console.log('🎸 Scraping Hard Rock Live Hollywood...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.seminolehardrockhollywood.com/entertainment/hard-rock-live.htm', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

      const items = document.querySelectorAll('.event-card, .show-card, article, [class*="event"], .entertainment-item');
      
      items.forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Get image
        const img = item.querySelector('img');
        let imageUrl = img?.src || null;
        if (imageUrl && (imageUrl.includes('logo') || imageUrl.includes('icon'))) imageUrl = null;
        
        // Get event URL
        const link = item.tagName === 'A' ? item.href : item.querySelector('a')?.href;
        
        let title = null;
        for (const line of lines) {
          if (line.length > 3 && line.length < 100 && 
              !line.match(/^(buy|tickets|more|view|\$|free|on sale|sold out)/i)) {
            title = line;
            break;
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i);
        
        if (title && dateMatch) {
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const day = dateMatch[2];
          const year = dateMatch[3] || currentYear;
          const month = months[monthStr];
          
          if (month) {
            const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
            if (!seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({ title: title.substring(0, 100), date: isoDate, imageUrl, eventUrl: link });
            }
          }
        }
      });
      
      return results;
    });

    // Fetch images from event pages if missing
    for (const event of events) {
      if (!event.imageUrl && event.eventUrl) {
        try {
          await page.goto(event.eventUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await new Promise(r => setTimeout(r, 1500));
          const img = await page.evaluate(() => {
            const og = document.querySelector('meta[property="og:image"]');
            if (og?.content) return og.content;
            const mainImg = document.querySelector('.event-image img, .hero img, article img');
            return mainImg?.src || null;
          });
          if (img) event.imageUrl = img;
        } catch (e) {}
      }
    }

    await browser.close();
    console.log(`  ✅ Found ${events.length} Hard Rock Live events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: event.eventUrl || 'https://www.seminolehardrockhollywood.com/entertainment',
      imageUrl: event.imageUrl || null,
      venue: { name: 'Hard Rock Live', address: '1 Seminole Way, Hollywood, FL', city: 'Miami' },
      latitude: 26.0510,
      longitude: -80.2114,
      city: 'Miami',
      category: 'Festival',
      source: 'HardRockLive'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Hard Rock Live error:', error.message);
    return [];
  }
}

module.exports = scrapeHardRockLive;
