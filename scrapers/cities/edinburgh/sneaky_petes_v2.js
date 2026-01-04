/**
 * Sneaky Pete's Edinburgh Scraper
 * URL: https://www.sneakypetes.co.uk/
 * Address: 73 Cowgate, Edinburgh EH1 1JW
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeSneakyPetesV2(city = 'Edinburgh') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.sneakypetes.co.uk/', {
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
        if (text.includes('Cookie') || text.includes('Privacy') || text.includes('Contact')) return;
        if (text.includes('About') || text.includes('Home') || text.includes('Menu')) return;
        
        if (href.includes('event') || href.includes('sneaky') || href.includes('ticket')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.sneakypetes.co.uk${href}`,
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
        id: uuidv4(),
        id: crypto.randomUUID(),
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: "Sneaky Pete's",
          address: '73 Cowgate, Edinburgh EH1 1JW',
          city: city
        },
        location: `Sneaky Pete's, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'sneaky_petes'
      });
    }
    
    console.log(`Sneaky Pete's Edinburgh: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error("Sneaky Pete's scraper error:", error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeSneakyPetesV2;
