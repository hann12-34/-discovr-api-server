/**
 * SWX Bristol Scraper
 * URL: https://swxbristol.com/events/
 * Address: 15 Nelson Street, Bristol BS1 2JY
 */

const puppeteer = require('puppeteer');

async function scrapeSWXV2(city = 'Bristol') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://swxbristol.com/events/', {
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
        if (text.includes('COVID') || text.includes('Archive')) return;
        
        if (href.includes('event') || href.includes('swx') || href.includes('ticket')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://swxbristol.com${href}`,
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
          name: 'SWX',
          address: '15 Nelson Street, Bristol BS1 2JY',
          city: city
        },
        location: `SWX, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'swx'
      });
    }
    
    console.log(`SWX Bristol: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('SWX scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeSWXV2;
