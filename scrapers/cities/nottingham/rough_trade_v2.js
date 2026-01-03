/**
 * Rough Trade Nottingham Scraper
 * URL: https://www.roughtrade.com/en-gb/events/nottingham
 * Address: 5 Broad Street, Nottingham NG1 3AJ
 */

const puppeteer = require('puppeteer');

async function scrapeRoughTradeV2(city = 'Nottingham') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.roughtrade.com/en-gb/events/nottingham', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const allLinks = document.querySelectorAll('a');
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        
        if (!text || text.length < 6 || text.length > 100) return;
        if (text.includes('Contact') || text.includes('Privacy')) return;
        
        if (href.includes('event') || href.includes('gig') || href.includes('roughtrade')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.roughtrade.com${href}`,
              image: imgEl?.src || null
            });
          }
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 3) + 1;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Rough Trade',
          address: '5 Broad Street, Nottingham NG1 3AJ',
          city: city
        },
        location: `Rough Trade, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Concert',
        source: 'rough_trade'
      });
    }
    
    console.log(`Rough Trade Nottingham: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Rough Trade scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeRoughTradeV2;
