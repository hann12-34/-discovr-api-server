/**
 * Ottawa Senators Hockey Events Scraper
 * URL: https://www.nhl.com/senators/schedule
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSenatorsGames(city = 'Ottawa') {
  console.log('🏒 Scraping Ottawa Senators...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.nhl.com/senators/schedule', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href], div, td').forEach(el => {
        const text = el.textContent.trim();
        
        if (text.includes('vs') || text.includes('@')) {
          const link = el.closest('a') || el.querySelector('a');
          const href = link ? link.href : window.location.href;
          
          if (!seen.has(text) && text.length > 5 && text.length < 100) {
            seen.add(text);
            
            let container = el.parentElement;
            for (let i = 0; i < 2; i++) {
              if (container) container = container.parentElement;
            }
            
            const allText = container?.textContent || text;
            const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
            
            results.push({
              title: text.replace(/\s+/g, ' '),
              url: href,
              imageUrl: null,
              dateStr: dateMatch ? dateMatch[0] : null
            });
          }
        }
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
        title: `Ottawa Senators ${event.title}`,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Canadian Tire Centre',
          address: '1000 Palladium Drive, Ottawa ON K2V 1A5',
          city: 'Ottawa'
        },
        latitude: 45.2968,
        longitude: -75.9273,
        city: 'Ottawa',
        category: 'Festival',
        source: 'Ottawa Senators'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Senators games`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Senators error:', error.message);
    return [];
  }
}

module.exports = scrapeSenatorsGames;
