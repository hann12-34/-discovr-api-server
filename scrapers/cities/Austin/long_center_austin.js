/**
 * Long Center Austin Events Scraper
 * URL: https://thelongcenter.org/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeLongCenter(city = 'Austin') {
  console.log('🎭 Scraping Long Center...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://thelongcenter.org/events', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event-item, .event-card, article, [class*="event"], a[href*="/event"]').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
          const href = linkEl?.href;
          if (!href || seen.has(href)) return;
          seen.add(href);
          
          const titleEl = el.querySelector('h2, h3, h4, .title, .event-title');
          const text = titleEl?.textContent?.trim() || linkEl?.textContent?.trim();
          if (!text || text.length < 3 || text.length > 150) return;
          
          // Try multiple image sources
          let container = el;
          for (let i = 0; i < 3 && container; i++) container = container.parentElement;
          
          const imgEl = el.querySelector('img') || container?.querySelector('img');
          let imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-lazy-src');
          
          // Check background image
          if (!imageUrl) {
            const bgEl = el.querySelector('[style*="background"]');
            const bgMatch = bgEl?.style?.backgroundImage?.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (bgMatch) imageUrl = bgMatch[1];
          }
          
          const allText = container?.textContent || el.textContent || text;
          const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
          
          if (href.startsWith('http')) {
            results.push({
              title: text.replace(/\s+/g, ' '),
              url: href,
              imageUrl: imageUrl,
              dateStr: dateMatch ? dateMatch[0] : null
            });
          }
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const monthMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        const dayMatch = event.dateStr.match(/(\d{1,2})/);
        
        if (monthMatch && dayMatch) {
          const month = (months.indexOf(monthMatch[1].toLowerCase()) + 1).toString().padStart(2, '0');
          const day = dayMatch[1].padStart(2, '0');
          let year = now.getFullYear();
          if (parseInt(month) < now.getMonth() + 1) year++;
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Long Center',
          address: '701 W Riverside Drive, Austin TX 78704',
          city: 'Austin'
        },
        latitude: 30.2630,
        longitude: -97.7544,
        city: 'Austin',
        category: 'Festival',
        source: 'Long Center'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Long Center events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Long Center error:', error.message);
    return [];
  }
}

module.exports = scrapeLongCenter;
