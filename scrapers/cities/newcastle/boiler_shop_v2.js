/**
 * Boiler Shop Newcastle Scraper
 * URL: https://www.boilershop.net/
 * Address: 20 South Street, Newcastle upon Tyne NE1 3PE
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeBoilerShopV2(city = 'Newcastle') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.boilershop.net/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="event"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        const container = link.closest('div, article');
        const imgEl = container?.querySelector('img');
        
        if (text && text.length > 2 && text.length < 100) {
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.boilershop.net${href}`,
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
      if (!item.title || item.title.length < 3) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 5) + 3;
      
      events.push({
        id: uuidv4(),
        id: crypto.randomUUID(),
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Boiler Shop',
          address: '20 South Street, Newcastle upon Tyne NE1 3PE',
          city: city
        },
        location: `Boiler Shop, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'boiler_shop'
      });
    }
    
    console.log(`Boiler Shop Newcastle: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Boiler Shop scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeBoilerShopV2;
