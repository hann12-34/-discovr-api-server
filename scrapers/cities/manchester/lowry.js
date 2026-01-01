/**
 * The Lowry Manchester
 * URL: https://thelowry.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTheLowry(city = 'Manchester') {
  console.log('🎵 Scraping The Lowry...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://thelowry.com/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find event links on whats-on page
      document.querySelectorAll('a[href]').forEach(link => {
        const url = link.href;
        // Skip non-event links
        if (!url || seen.has(url) || url.includes('?') || url.includes('#') || 
            url === 'https://thelowry.com/whats-on' || url.endsWith('/whats-on') ||
            url.includes('conferences') || url.includes('login') || url.includes('basket')) return;
        
        // Only process links that look like event pages
        if (!url.match(/thelowry\.com\/[a-z0-9-]+-[a-z0-9]+$/i)) return;
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
          name: 'The Lowry',
          address: 'Pier 8, Salford Quays M50 3AZ',
          city: 'Manchester'
        },
        latitude: 53.4712,
        longitude: -2.2965,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'The Lowry'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} The Lowry events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Lowry error:', error.message);
    return [];
  }
}

module.exports = scrapeTheLowry;
