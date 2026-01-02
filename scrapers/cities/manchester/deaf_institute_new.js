/**
 * Deaf Institute Manchester Events Scraper
 * Popular indie/alternative venue in Manchester
 * URL: https://www.thedeafinstitute.co.uk/whats-on/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeDeafInstitute(city = 'Manchester') {
  console.log('🎸 Scraping Deaf Institute Manchester...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thedeafinstitute.co.uk/whats-on/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load more events
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Get all event data directly from listing page
    const eventLinks = await page.evaluate(() => {
      const links = [];
      const seen = new Set();
      
      // Try multiple selector patterns
      const selectors = [
        'a[href*="/event/"]',
        '.event-item a',
        '.events-list a',
        'article a',
        '.tribe-events-calendar-list__event a'
      ];
      
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(link => {
          const href = link.href;
          if (!href || seen.has(href)) return;
          if (!href.includes('/event/')) return;
          seen.add(href);
          
          // Get title - try multiple approaches
          let title = link.querySelector('h2, h3, h4, .title')?.textContent?.trim();
          if (!title) title = link.textContent?.trim();
          
          // Clean title
          if (title) {
            title = title.split('\n')[0].trim();
            if (title.length > 2 && title !== 'Buy Tickets' && !title.match(/^(view|more|details)/i)) {
              links.push({ url: href, title });
            }
          }
        });
      }
      
      // Also try getting all links from the page body
      if (links.length === 0) {
        const allLinks = document.body.innerHTML.match(/href="([^"]*\/event\/[^"]*)"/g) || [];
        allLinks.forEach(match => {
          const url = match.replace('href="', '').replace('"', '');
          if (!seen.has(url)) {
            seen.add(url);
            // Extract title from URL slug
            const slug = url.split('/event/')[1]?.replace(/\/$/, '').replace(/-/g, ' ');
            if (slug) {
              links.push({ url: url.startsWith('http') ? url : 'https://www.thedeafinstitute.co.uk' + url, title: slug });
            }
          }
        });
      }
      
      return links;
    });

    console.log(`  📋 Found ${eventLinks.length} event links, fetching details...`);

    const events = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    // Visit each event page to get date and image
    for (const eventLink of eventLinks.slice(0, 50)) { // Limit to 50 to avoid timeout
      try {
        await page.goto(eventLink.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        const eventData = await page.evaluate(() => {
          // Get date from page
          const dateEl = document.querySelector('.event-date, .date, time, [class*="date"]');
          let dateText = dateEl?.textContent?.trim() || '';
          
          // Also check meta tags
          if (!dateText) {
            const metaDate = document.querySelector('meta[property="event:start_time"]')?.content;
            if (metaDate) dateText = metaDate;
          }
          
          // Look for date in page content
          if (!dateText) {
            const bodyText = document.body.innerText;
            const dateMatch = bodyText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
            if (dateMatch) {
              dateText = dateMatch[0];
            }
          }
          
          // Get image
          const ogImage = document.querySelector('meta[property="og:image"]')?.content;
          const mainImage = document.querySelector('.event-image img, .featured-image img, article img')?.src;
          let imageUrl = ogImage || mainImage || null;
          
          // Filter out generic logos
          if (imageUrl && (imageUrl.includes('logo') || imageUrl.includes('placeholder') || imageUrl.includes('default'))) {
            imageUrl = null;
          }
          
          // Get description
          const descEl = document.querySelector('.event-description, .description, article p');
          const description = descEl?.textContent?.trim()?.substring(0, 300) || null;
          
          return { dateText, imageUrl, description };
        });

        // Parse date
        let isoDate = null;
        if (eventData.dateText) {
          // Try ISO format first
          const isoMatch = eventData.dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            isoDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
          } else {
            // Try "15 Jan 2026" or "15th January 2026" format
            const dateMatch = eventData.dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0');
              const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
              const now = new Date();
              let year = dateMatch[3] || now.getFullYear().toString();
              
              // If no year and month is before current month, use next year
              if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
                year = (now.getFullYear() + 1).toString();
              }
              
              isoDate = `${year}-${month}-${day}`;
            }
          }
        }

        if (isoDate && new Date(isoDate) >= new Date()) {
          events.push({
            title: eventLink.title,
            date: isoDate,
            url: eventLink.url,
            imageUrl: eventData.imageUrl,
            description: eventData.description
          });
        }

      } catch (e) {
        // Skip failed event pages
      }
    }

    await browser.close();

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      description: event.description,
      date: event.date,
      startDate: new Date(event.date + 'T20:00:00'),
      url: event.url,
      imageUrl: event.imageUrl,
      venue: {
        name: 'The Deaf Institute',
        address: '135 Grosvenor St, Manchester M1 7HE',
        city: 'Manchester'
      },
      latitude: 53.4729,
      longitude: -2.2321,
      city: 'Manchester',
      category: 'Nightlife',
      source: 'Deaf Institute'
    }));

    console.log(`  ✅ Found ${formattedEvents.length} Deaf Institute events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Deaf Institute error:', error.message);
    return [];
  }
}

module.exports = scrapeDeafInstitute;
