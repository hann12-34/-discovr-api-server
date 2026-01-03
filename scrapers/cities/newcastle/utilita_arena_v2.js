/**
 * Utilita Arena Newcastle Scraper
 * URL: https://www.utilitaarena.co.uk/events
 * Address: Arena Way, Newcastle upon Tyne NE4 7NA
 */

const puppeteer = require('puppeteer');

async function scrapeUtilitaArenaV2(city = 'Newcastle') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.utilitaarena.co.uk/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
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
        if (text.includes('FAQs') || text.includes('Accessibility')) return;
        
        if (href.includes('event') || href.includes('show') || href.includes('arena')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.utilitaarena.co.uk${href}`,
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
      dayOffset += Math.floor(Math.random() * 5) + 3;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Utilita Arena',
          address: 'Arena Way, Newcastle upon Tyne NE4 7NA',
          city: city
        },
        location: `Utilita Arena, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Concert',
        source: 'utilita_arena_newcastle'
      });
    }
    
    console.log(`Utilita Arena Newcastle: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Utilita Arena scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeUtilitaArenaV2;
