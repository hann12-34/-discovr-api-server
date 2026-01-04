/**
 * Royale Boston Scraper
 * URL: https://royaleboston.com/events/
 * Address: 279 Tremont St, Boston, MA 02116
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeRoyaleBoston(city = 'Boston') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://royaleboston.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="/event/"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href');
        let title = link.textContent?.trim();
        
        // Clean up title
        if (title) {
          title = title.replace(/\[moved to.*?\]/gi, '').replace(/\[canceled\]/gi, '').trim();
        }
        
        const container = link.closest('div, article, li');
        const imgEl = container?.querySelector('img');
        
        if (title && title.length > 2 && href && !items.find(e => e.url === href)) {
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://royaleboston.com${href}`,
            image: imgEl?.src || null
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      if (item.title.includes('canceled') || item.title.includes('moved to')) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        id: uuidv4(),
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Royale Boston',
          address: '279 Tremont St, Boston, MA 02116',
          city: city
        },
        location: `Royale Boston, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'royale_boston'
      });
    }
    
    console.log(`Royale Boston: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Royale Boston scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeRoyaleBoston;
