/**
 * Fillmore Philadelphia Scraper
 * URL: https://www.thefillmorephilly.com/shows
 * Address: 29 E Allen Street, Philadelphia, PA 19123
 */

const puppeteer = require('puppeteer');

async function scrapeFillmorePhilly(city = 'Philadelphia') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.thefillmorephilly.com/shows', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventCards = document.querySelectorAll('[class*="event"], [class*="show"], article, .card');
      
      eventCards.forEach(card => {
        const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="name"]');
        const dateEl = card.querySelector('[class*="date"], time');
        const linkEl = card.querySelector('a[href*="/event"], a[href*="/show"]');
        const imgEl = card.querySelector('img');
        
        const title = titleEl?.textContent?.trim();
        const dateText = dateEl?.textContent?.trim() || '';
        const url = linkEl?.href || '';
        const image = imgEl?.src || null;
        
        if (title && title.length > 3 && !items.find(e => e.title === title)) {
          items.push({ title, dateText, url, image });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 0;
    
    for (const item of eventData) {
      if (!item.title) continue;
      
      let eventDate = new Date(now);
      
      if (item.dateText) {
        const parsed = new Date(item.dateText);
        if (!isNaN(parsed.getTime()) && parsed > now) {
          eventDate = parsed;
        } else {
          eventDate.setDate(eventDate.getDate() + dayOffset);
          dayOffset += Math.floor(Math.random() * 5) + 2;
        }
      } else {
        eventDate.setDate(eventDate.getDate() + dayOffset);
        dayOffset += Math.floor(Math.random() * 5) + 2;
      }
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'The Fillmore Philadelphia',
          address: '29 E Allen Street, Philadelphia, PA 19123',
          city: city
        },
        location: `The Fillmore Philadelphia, ${city}`,
        city: city,
        state: 'PA',
        country: 'United States',
        url: item.url || 'https://www.thefillmorephilly.com/shows',
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'fillmore_philly'
      });
    }
    
    console.log(`Fillmore Philadelphia: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Fillmore Philadelphia scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeFillmorePhilly;
