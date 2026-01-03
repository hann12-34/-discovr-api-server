/**
 * Esther's Follies Austin Comedy Events Scraper
 * URL: https://esthersfollies.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeEsthersFollies(city = 'Austin') {
  console.log('😂 Scraping Esthers Follies...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://esthersfollies.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Scrape actual events from the page - no generation allowed
      document.querySelectorAll('a[href*="ticket"], a[href*="event"], .event, article, [class*="show"]').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);
          
          const titleEl = el.querySelector('h2, h3, h4, .title') || el;
          const title = titleEl?.textContent?.trim();
          if (!title || title.length < 3 || title.length > 150) return;
          
          const dateEl = el.querySelector('time, .date, [class*="date"]');
          const dateText = dateEl?.textContent || el.textContent || '';
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
          
          const imgEl = el.querySelector('img');
          let imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
          
          if (url.startsWith('http')) {
            results.push({
              title,
              url,
              imageUrl,
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Esther\'s Follies',
          address: '525 E 6th Street, Austin TX 78701',
          city: 'Austin'
        },
        latitude: 30.2680,
        longitude: -97.7362,
        city: 'Austin',
        category: 'Nightlife',
        source: 'Esthers Follies'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Esthers Follies events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Esthers Follies error:', error.message);
    return [];
  }
}

module.exports = scrapeEsthersFollies;
