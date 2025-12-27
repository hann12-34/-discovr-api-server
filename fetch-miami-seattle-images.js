/**
 * Fetch Miami & Seattle Images
 * Scrapes images from venue websites
 */

const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

async function scrapeVenueImages(url, venueName) {
  console.log(`🎤 Scraping ${venueName}...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const eventImages = await page.evaluate(() => {
      const results = [];
      
      // Try multiple selectors for event cards
      const selectors = [
        '.event-card', '.event', '.show', 'article', 
        '[class*="event"]', '.lineup-item', '.artist-card',
        '.schedule-item', '.calendar-event', '.show-listing'
      ];
      
      let cards = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > cards.length) {
          cards = found;
        }
      }
      
      cards.forEach(card => {
        try {
          // Get image - try multiple sources
          let imageUrl = null;
          const img = card.querySelector('img:not([src*="logo"]):not([alt*="logo"])');
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
          }
          
          // Try background image
          if (!imageUrl) {
            const bgEl = card.querySelector('[style*="background"]');
            if (bgEl) {
              const match = bgEl.style.backgroundImage?.match(/url\(['"]?([^'"]+)['"]?\)/);
              if (match) imageUrl = match[1];
            }
          }
          
          // Get title
          const titleEl = card.querySelector('h1, h2, h3, h4, .title, .event-title, .headliner, .artist-name, .event-name');
          let title = titleEl ? titleEl.textContent.trim() : null;
          
          // Clean up title
          if (title) {
            title = title.replace(/\s+/g, ' ').trim().toUpperCase();
          }
          
          if (imageUrl && title && imageUrl.startsWith('http') && 
              !imageUrl.includes('logo') && !imageUrl.includes('icon') && title.length > 2) {
            results.push({ title, imageUrl });
          }
        } catch (e) {}
      });
      
      return results;
    });
    
    console.log(`  Found ${eventImages.length} images`);
    await browser.close();
    return eventImages;
    
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    await browser.close();
    return [];
  }
}

async function updateEventsWithImages(city, allImages, collection) {
  // Get events without images for this city
  const events = await collection.find({
    city: city,
    $or: [
      { image: { $exists: false } },
      { image: null },
      { image: '' }
    ]
  }).toArray();
  
  console.log(`\n📊 ${city}: ${events.length} events without images`);
  
  let updated = 0;
  
  for (const event of events) {
    const eventTitle = (event.title || '').toUpperCase();
    
    // Try different matching strategies
    let match = null;
    
    // 1. Exact match
    match = allImages.find(img => img.title === eventTitle);
    
    // 2. Contains match
    if (!match) {
      match = allImages.find(img => 
        eventTitle.includes(img.title) || img.title.includes(eventTitle)
      );
    }
    
    // 3. First word match (for artist names)
    if (!match) {
      const firstWord = eventTitle.split(' ')[0];
      if (firstWord.length > 3) {
        match = allImages.find(img => img.title.startsWith(firstWord));
      }
    }
    
    if (match && match.imageUrl) {
      await collection.updateOne(
        { _id: event._id },
        { $set: { image: match.imageUrl, imageURL: match.imageUrl } }
      );
      console.log(`  ✅ ${event.title.substring(0, 35)}`);
      updated++;
    }
  }
  
  return updated;
}

async function fetchImages() {
  console.log('🖼️  FETCHING MIAMI & SEATTLE IMAGES\n');
  
  // Miami venues
  const miamiVenues = [
    { url: 'https://clubspace.com/events/', name: 'Club Space' },
    { url: 'https://www.thegroundmiami.com/', name: 'The Ground' },
    { url: 'https://www.livnightclub.com/events/', name: 'LIV Miami' },
    { url: 'https://www.storymiami.com/events/', name: 'Story Miami' },
  ];
  
  // Seattle venues
  const seattleVenues = [
    { url: 'https://www.showboxpresents.com/events', name: 'Showbox' },
    { url: 'https://neumos.com/events/', name: 'Neumos' },
    { url: 'https://www.stgpresents.org/calendar', name: 'STG Presents' },
    { url: 'https://www.thecrocodile.com/events', name: 'The Crocodile' },
  ];
  
  let miamiImages = [];
  let seattleImages = [];
  
  // Scrape Miami
  console.log('=== MIAMI ===\n');
  for (const venue of miamiVenues) {
    const images = await scrapeVenueImages(venue.url, venue.name);
    miamiImages = [...miamiImages, ...images];
  }
  
  // Scrape Seattle
  console.log('\n=== SEATTLE ===\n');
  for (const venue of seattleVenues) {
    const images = await scrapeVenueImages(venue.url, venue.name);
    seattleImages = [...seattleImages, ...images];
  }
  
  console.log(`\n📊 Total scraped: Miami=${miamiImages.length}, Seattle=${seattleImages.length}\n`);
  
  // Connect to MongoDB and update
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const collection = client.db('discovr').collection('events');
    
    const miamiUpdated = await updateEventsWithImages('Miami', miamiImages, collection);
    const seattleUpdated = await updateEventsWithImages('Seattle', seattleImages, collection);
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Miami: Updated ${miamiUpdated} events`);
    console.log(`✅ Seattle: Updated ${seattleUpdated} events`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Done');
  }
}

fetchImages();
