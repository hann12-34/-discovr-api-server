/**
 * HOME Manchester Manchester
 * URL: https://homemcr.org
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHOMEManchester(city = 'Manchester') {
  console.log('🎵 Scraping HOME Manchester...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://homemcr.org/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find event links on whats-on page
      document.querySelectorAll('a[href*="/whats-on/"]').forEach(link => {
        const url = link.href;
        if (!url || seen.has(url) || url === 'https://homemcr.org/whats-on' || url.includes('#') || url.includes('?')) return;
        seen.add(url);
        
        let container = link.closest('div, article, li') || link.parentElement;
        for (let i = 0; i < 5 && container; i++) {
          const titleEl = container.querySelector('h2, h3, h4, [class*="title"]');
          const title = titleEl?.textContent?.trim();
          
          if (title && title.length > 3 && title.length < 150) {
            const dateEl = container.querySelector('time, [class*="date"]');
            const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
            
            const img = container.querySelector('img');
            const imageUrl = img?.src || img?.getAttribute('data-src');
            
            results.push({ title, url, imageUrl, dateStr });
            break;
          }
          container = container.parentElement;
        }
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})?/i);
          if (match) {
            const month = (months.indexOf(match[1].toLowerCase().substring(0, 3)) + 1).toString().padStart(2, '0');
            const day = match[2].padStart(2, '0');
            const year = match[3] || new Date().getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'HOME Manchester',
          address: '2 Tony Wilson Place, Manchester M15 4FN',
          city: 'Manchester'
        },
        latitude: 53.4733,
        longitude: -2.2528,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'HOME Manchester'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} HOME Manchester events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  HOME Manchester error:', error.message);
    return [];
  }
}

module.exports = scrapeHOMEManchester;
