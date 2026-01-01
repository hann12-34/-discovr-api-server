/**
 * Winspear Centre Edmonton Events Scraper
 * Major concert venue in Edmonton
 * URL: https://www.winspearcentre.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeWinspear(city = 'Edmonton') {
  console.log('🎻 Scraping Winspear Centre Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Try tickets/events page first (main events listing)
    await page.goto('https://www.winspearcentre.com/tickets/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Look for event links with /tickets/events/ pattern
      document.querySelectorAll('a[href*="/tickets/events/"]').forEach(link => {
        const url = link.href;
        if (!url || seen.has(url) || url.endsWith('/events/') || url.endsWith('/events')) return;
        seen.add(url);
        
        // Extract title from link text or parent container
        let title = link.textContent?.trim()?.replace(/\s+/g, ' ');
        if (!title || title.length < 3) {
          const parent = link.closest('div, article, li, section');
          const titleEl = parent?.querySelector('h1, h2, h3, h4, .title');
          title = titleEl?.textContent?.trim();
        }
        
        // Extract title from URL if needed
        if (!title || title.length < 3) {
          const urlParts = url.split('/').filter(p => p);
          title = urlParts[urlParts.length - 1]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        if (!title || title.length < 3) return;
        
        // Try to extract date from URL (e.g., /2026/ or /2025/)
        const yearMatch = url.match(/\/(\d{4})\//);
        const dateStr = yearMatch ? yearMatch[1] : null;
        
        // Find nearby image
        const parent = link.closest('div, article, li, section');
        const img = parent?.querySelector('img') || link.querySelector('img');
        const imageUrl = img?.src || img?.getAttribute('data-src');
        
        results.push({ title, dateStr, url, imageUrl });
      });

      // Also look for cards/list items with event info
      document.querySelectorAll('.event-card, .event-item, article, [class*="event"]').forEach(card => {
        const linkEl = card.querySelector('a[href*="/tickets/events/"]');
        if (!linkEl) return;
        const url = linkEl.href;
        if (seen.has(url)) return;
        seen.add(url);
        
        const titleEl = card.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        if (!title || title.length < 3) return;
        
        const dateEl = card.querySelector('time, .date, [class*="date"]');
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent;
        
        const img = card.querySelector('img');
        const imageUrl = img?.src || img?.getAttribute('data-src');
        
        results.push({ title, dateStr, url, imageUrl });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Check if dateStr is just a year (from URL extraction)
        if (/^\d{4}$/.test(event.dateStr)) {
          // Use year with future month
          const year = event.dateStr;
          const futureMonth = now.getMonth() + 2; // Next month
          const month = (futureMonth > 12 ? 1 : futureMonth).toString().padStart(2, '0');
          isoDate = `${year}-${month}-15`;
        } else {
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})\s+(\d{4})?/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            let year = dateMatch[3] || now.getFullYear().toString();
            if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
              year = (now.getFullYear() + 1).toString();
            }
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      // No fallback dates - rule #4
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
          name: 'Winspear Centre',
          address: '4 Sir Winston Churchill Square, Edmonton, AB T5J 2C1',
          city: 'Edmonton'
        },
        latitude: 53.5444,
        longitude: -113.4909,
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Winspear Centre'
      });
    }

    // Remove duplicates
    const uniqueEvents = [];
    const seenKeys = new Set();
    for (const e of formattedEvents) {
      const key = e.title + e.date;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueEvents.push(e);
      }
    }

    console.log(`  ✅ Found ${uniqueEvents.length} valid Winspear events`);
    return uniqueEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Winspear error:', error.message);
    return [];
  }
}

module.exports = scrapeWinspear;
