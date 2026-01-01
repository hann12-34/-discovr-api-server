/**
 * Live Nation Ottawa Events Scraper
 * URL: https://www.livenation.com/city/ottawa-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeLiveNationOttawa(city = 'Ottawa') {
  console.log('🎫 Scraping Live Nation Ottawa...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.livenation.com/city/ottawa-on', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(link => {
        const href = link.href;
        const text = link.textContent.trim();
        
        if (text.length > 3 && text.length < 150 && !seen.has(text)) {
          seen.add(text);
          
          let container = link.parentElement;
          for (let i = 0; i < 3; i++) {
            if (container) container = container.parentElement;
          }
          
          const img = container?.querySelector('img');
          const allText = container?.textContent || text;
          const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
          
          results.push({
            title: text.replace(/\s+/g, ' '),
            url: href,
            imageUrl: img?.src || null,
            dateStr: dateMatch ? dateMatch[0] : null
          });
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
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Live Nation Ottawa',
          address: 'Various Venues, Ottawa ON',
          city: 'Ottawa'
        },
        latitude: 45.4215,
        longitude: -75.6972,
        city: 'Ottawa',
        category: 'Festival',
        source: 'Live Nation Ottawa'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Live Nation events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Live Nation error:', error.message);
    return [];
  }
}

module.exports = scrapeLiveNationOttawa;
