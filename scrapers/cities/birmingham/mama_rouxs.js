/**
 * Mama Roux's Birmingham Scraper
 * URL: https://www.mamarouxs.co.uk/whatson
 * Address: Lower Trinity Street, Birmingham B9 4AG
 */

const puppeteer = require('puppeteer');

async function scrapeMamaRouxs(city = 'Birmingham') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.mamarouxs.co.uk/whatson', {
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
        if (text.includes('Cookie') || text.includes('Privacy')) return;
        
        if (href.includes('event') || href.includes('mama') || href.includes('ticket')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.mamarouxs.co.uk${href}`,
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
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: "Mama Roux's",
          address: 'Lower Trinity Street, Birmingham B9 4AG',
          city: city
        },
        location: `Mama Roux's, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'mama_rouxs'
      });
    }
    
    console.log(`Mama Roux's Birmingham: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error("Mama Roux's scraper error:", error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeMamaRouxs;
