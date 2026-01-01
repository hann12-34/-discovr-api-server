/**
 * Chicago Bulls Basketball Events Scraper
 * URL: https://www.nba.com/bulls/schedule
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBulls(city = 'Chicago') {
  console.log('🏀 Scraping Chicago Bulls...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.nba.com/bulls/schedule', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('div, a, td').forEach(el => {
        const text = el.textContent.trim();
        
        if ((text.includes('vs') || text.includes('@')) && text.length > 5 && text.length < 150) {
          if (!seen.has(text)) {
            seen.add(text);
            
            const link = el.closest('a') || el.querySelector('a');
            const href = link ? link.href : 'https://www.nba.com/bulls/schedule';
            const allText = el.textContent || text;
            const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
            
            if (dateMatch) {
              results.push({
                title: text.replace(/\s+/g, ' '),
                url: href,
                imageUrl: null,
                dateStr: dateMatch[0]
              });
            }
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
        title: `Chicago Bulls ${event.title}`,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'United Center',
          address: '1901 W Madison Street, Chicago IL 60612',
          city: 'Chicago'
        },
        latitude: 41.8807,
        longitude: -87.6742,
        city: 'Chicago',
        category: 'Festival',
        source: 'Chicago Bulls'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Bulls events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Bulls error:', error.message);
    return [];
  }
}

module.exports = scrapeBulls;
