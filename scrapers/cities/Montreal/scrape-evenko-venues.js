const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Evenko manages multiple major Montreal concert venues
 */
const EVENKO_VENUES = [
  { slug: 'mtelus', name: 'MTELUS', address: '59 Rue Sainte-Catherine Est, Montreal, QC H2X 1K5' },
  { slug: 'corona-theatre', name: 'Corona Theatre', address: '2490 Rue Notre-Dame Ouest, Montreal, QC H3J 1N5' },
  { slug: 'olympia', name: 'Olympia Theatre', address: '1004 Rue Sainte-Catherine Est, Montreal, QC H2L 2G3' },
  { slug: 'la-tulipe', name: 'La Tulipe', address: '4530 Avenue Papineau, Montreal, QC H2H 1V4' }
];

async function scrapeEvenkoVenue(page, venue) {
  const url = `https://evenko.ca/en/events/venue/${venue.slug}`;
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for JS to render
    
    const events = await page.evaluate((venueName, venueAddress) => {
      const results = [];
      const eventCards = document.querySelectorAll('article, .event, [class*="event-card"]');
      
      eventCards.forEach(card => {
        // Get title
        let title = '';
        const titleEl = card.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="artist"]');
        if (titleEl) {
          title = titleEl.textContent.trim();
        }
        
        if (!title || title.length < 2) return;
        
        // Get date
        let dateText = '';
        const timeEl = card.querySelector('time, [datetime], .date, [class*="date"]');
        if (timeEl) {
          dateText = timeEl.getAttribute('datetime') || timeEl.textContent.trim();
        }
        
        if (!dateText) {
          const allText = card.textContent;
          const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i);
          if (dateMatch) dateText = dateMatch[0];
        }
        
        if (!dateText || dateText.length < 4) return;
        
        // Get URL
        let eventUrl = '';
        const linkEl = card.querySelector('a');
        if (linkEl) {
          eventUrl = linkEl.getAttribute('href') || '';
          if (eventUrl && !eventUrl.startsWith('http')) {
            eventUrl = 'https://evenko.ca' + eventUrl;
          }
        }
        
        results.push({
          title: title.split('\n')[0].trim(),
          date: dateText,
          url: eventUrl,
          venueName: venueName,
          venueAddress: venueAddress
        });
      });
      
      return results;
    }, venue.name, venue.address);
    
    // Fetch og:image from each event URL
    const eventsWithImages = [];
    for (const e of events) {
      let image = null;
      if (e.url && e.url.startsWith('http')) {
        try {
          const resp = await axios.get(e.url, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
          });
          const $ = cheerio.load(resp.data);
          image = $('meta[property="og:image"]').attr('content') || null;
        } catch (err) {}
      }
      
      eventsWithImages.push({
        id: uuidv4(),
        title: e.title,
        date: e.date,
        url: e.url,
        image: image,
        venue: {
          name: e.venueName,
          address: e.venueAddress,
          city: 'Montreal'
        },
        city: 'Montreal',
        category: 'Concert',
        source: e.venueName
      });
    }
    
    return eventsWithImages;
    
  } catch (error) {
    console.log(`  ⚠️  ${venue.name}: ${error.message}`);
    return [];
  }
}

async function scrapeEvents(city = 'Montreal') {
  console.log('🎵 Scraping evenko venues with Puppeteer...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    const allEvents = [];
    const seen = new Set();
    
    for (const venue of EVENKO_VENUES) {
      console.log(`📍 Checking ${venue.name}...`);
      const events = await scrapeEvenkoVenue(page, venue);
      
      // Deduplicate
      for (const event of events) {
        const dedupeKey = `${event.title.toLowerCase().trim()}|${event.date}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          allEvents.push(event);
          console.log(`  ✓ ${event.title} | ${event.date}`);
        }
      }
      
      console.log(`   Found ${events.length} events\n`);
    }
    
    console.log(`✅ Found ${allEvents.length} total events from evenko venues`);
    return allEvents;
    
  } catch (error) {
    console.error('  ❌ Evenko scraper error:', error.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeEvents;
