/**
 * White Horse Austin Events Scraper
 * URL: https://thewhitehorseaustin.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeWhiteHorse(city = 'Austin') {
  console.log('🤠 Scraping White Horse Austin...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://thewhitehorseaustin.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href], div').forEach(el => {
        const text = el.textContent.trim();
        
        if (text.length > 5 && text.length < 150 && !seen.has(text)) {
          const link = el.closest('a') || el.querySelector('a');
          const href = link ? link.href : 'https://thewhitehorseaustin.com';
          
          let container = el.parentElement;
          const img = container?.querySelector('img');
          const allText = el.textContent || text;
          const dateMatch = allText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
          
          if (dateMatch) {
            seen.add(text);
            results.push({
              title: text.replace(/\s+/g, ' '),
              url: href,
              imageUrl: img?.src || null,
              dateStr: dateMatch[0]
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
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'The White Horse',
          address: '500 Comal Street, Austin TX 78702',
          city: 'Austin'
        },
        latitude: 30.2650,
        longitude: -97.7286,
        city: 'Austin',
        category: 'Nightlife',
        source: 'White Horse'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} White Horse events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  White Horse error:', error.message);
    return [];
  }
}

module.exports = scrapeWhiteHorse;
