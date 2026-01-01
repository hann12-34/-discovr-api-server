/**
 * RBC Bluesfest Ottawa Official Scraper
 * URL: https://www.ottawabluesfest.ca/lineup
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBluesfestOfficial(city = 'Ottawa') {
  console.log('🎸 Scraping RBC Bluesfest...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.ottawabluesfest.ca/lineup', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.href;
        const text = link.textContent.trim();
        
        if (text.length > 3 && text.length < 100 && !seen.has(text)) {
          seen.add(text);
          
          let container = link.parentElement;
          for (let i = 0; i < 2; i++) {
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
      
      if (!isoDate) {
        // Bluesfest is typically in July
        const bluesfestDate = new Date(now.getFullYear(), 6, 10); // July 10
        if (bluesfestDate < now) {
          bluesfestDate.setFullYear(now.getFullYear() + 1);
        }
        isoDate = bluesfestDate.toISOString().split('T')[0];
      }
      
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'RBC Bluesfest',
          address: 'LeBreton Flats, Ottawa ON K1R 7X7',
          city: 'Ottawa'
        },
        latitude: 45.4150,
        longitude: -75.7154,
        city: 'Ottawa',
        category: 'Festival',
        source: 'RBC Bluesfest'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Bluesfest events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Bluesfest error:', error.message);
    return [];
  }
}

module.exports = scrapeBluesfestOfficial;
