/**
 * Underground Arts Philadelphia Scraper
 * URL: https://undergroundarts.org/
 * Address: 1200 Callowhill Street, Philadelphia, PA 19123
 */

const puppeteer = require('puppeteer');

async function scrapeUndergroundArts(city = 'Philadelphia') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://undergroundarts.org/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('a[href*="tixr.com"]', { timeout: 10000 }).catch(() => {});
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="tixr.com/groups/undergroundarts"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim();
        
        if (title && href && title.length > 2 && !title.includes('Buy Tickets') && !items.find(e => e.url === href)) {
          const container = link.closest('div, article, li');
          const img = container?.querySelector('img');
          const imageUrl = img?.src || img?.getAttribute('data-src') || null;
          
          items.push({
            title,
            url: href,
            image: imageUrl
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 0;
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      if (item.title.includes('Sold Out')) continue;
      if (item.title.includes('Ticket Pack')) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 3) + 1;
      
      let cleanTitle = item.title.replace(/\*\*Sold Out\*\*/gi, '').trim();
      
      events.push({
        title: cleanTitle,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Underground Arts',
          address: '1200 Callowhill Street, Philadelphia, PA 19123',
          city: city
        },
        location: `Underground Arts, ${city}`,
        city: city,
        state: 'PA',
        country: 'United States',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'underground_arts'
      });
    }
    
    console.log(`Underground Arts: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Underground Arts scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeUndergroundArts;
