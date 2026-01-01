/**
 * Invisible Wind Factory Liverpool Scraper
 * URL: https://www.invisiblewindfactory.com/events/
 * Address: 3 Regent Road, Liverpool L3 7DS
 */

const puppeteer = require('puppeteer');

async function scrapeInvisibleWindFactory(city = 'Liverpool') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.invisiblewindfactory.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('a[href*="/event/"]', { timeout: 10000 }).catch(() => {});
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="/event/"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim();
        
        if (title && href && !items.find(e => e.url === href)) {
          const img = link.querySelector('img') || link.closest('article')?.querySelector('img');
          const imageUrl = img?.src || img?.getAttribute('data-src') || null;
          
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://www.invisiblewindfactory.com${href}`,
            image: imageUrl
          });
        }
      });
      
      return items;
    });
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      
      let eventDate = new Date();
      let description = null;
      let eventImage = item.image;
      
      try {
        await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 15000 });
        
        const details = await page.evaluate(() => {
          const dateEl = document.querySelector('.event-date, .date, time, [class*="date"]');
          const descEl = document.querySelector('.event-description, .description, [class*="description"], .content p');
          const imgEl = document.querySelector('.event-image img, .featured-image img, article img');
          
          return {
            dateText: dateEl?.textContent?.trim() || '',
            description: descEl?.textContent?.trim()?.substring(0, 500) || null,
            image: imgEl?.src || null
          };
        });
        
        if (details.dateText) {
          const parsed = new Date(details.dateText);
          if (!isNaN(parsed.getTime()) && parsed > new Date()) {
            eventDate = parsed;
          }
        }
        
        description = details.description;
        if (details.image && !details.image.includes('logo') && !details.image.includes('placeholder')) {
          eventImage = details.image;
        }
      } catch (err) {
        // Use default date
      }
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Invisible Wind Factory',
          address: '3 Regent Road, Liverpool L3 7DS',
          city: city
        },
        location: `Invisible Wind Factory, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: eventImage,
        imageUrl: eventImage,
        description: description,
        category: 'Nightlife',
        source: 'invisible_wind_factory'
      });
    }
    
    console.log(`Invisible Wind Factory: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Invisible Wind Factory scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeInvisibleWindFactory;
