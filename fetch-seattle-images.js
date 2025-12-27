/**
 * Fetch Seattle Images
 * Scrapes images from Seattle venue websites and matches to existing events
 */

const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

async function scrapeShowboxImages() {
  console.log('🎤 Scraping images from Showbox...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.showboxpresents.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get all event images with their titles
    const eventImages = await page.evaluate(() => {
      const results = [];
      
      // Look for event cards/blocks
      const cards = document.querySelectorAll('.eventWrapper, .event-item, .show-listing, [class*="event"]');
      
      cards.forEach(card => {
        try {
          // Get the image
          const img = card.querySelector('img');
          const imageUrl = img ? (img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src')) : null;
          
          // Get the title - usually in headings or specific class
          const titleEl = card.querySelector('h2, h3, h4, .headliner, .title, .event-name, .artist-name');
          const title = titleEl ? titleEl.textContent.trim().toUpperCase() : null;
          
          if (imageUrl && title && imageUrl.startsWith('http') && !imageUrl.includes('logo')) {
            results.push({ title, imageUrl });
          }
        } catch (e) {}
      });
      
      // Also try og:image as fallback for the main page
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        results.push({ title: '_FALLBACK_', imageUrl: ogImage.content });
      }
      
      return results;
    });
    
    console.log(`  Found ${eventImages.length} event images`);
    await browser.close();
    return eventImages;
    
  } catch (error) {
    console.error('  Error scraping Showbox:', error.message);
    await browser.close();
    return [];
  }
}

async function scrapeNeumosImages() {
  console.log('🎸 Scraping images from Neumos...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://neumos.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventImages = await page.evaluate(() => {
      const results = [];
      
      const cards = document.querySelectorAll('.event, .show, article, [class*="event"]');
      
      cards.forEach(card => {
        try {
          const img = card.querySelector('img');
          const imageUrl = img ? (img.src || img.getAttribute('data-src')) : null;
          
          const titleEl = card.querySelector('h2, h3, h4, .title, .headliner');
          const title = titleEl ? titleEl.textContent.trim().toUpperCase() : null;
          
          if (imageUrl && title && imageUrl.startsWith('http') && !imageUrl.includes('logo')) {
            results.push({ title, imageUrl });
          }
        } catch (e) {}
      });
      
      return results;
    });
    
    console.log(`  Found ${eventImages.length} event images`);
    await browser.close();
    return eventImages;
    
  } catch (error) {
    console.error('  Error scraping Neumos:', error.message);
    await browser.close();
    return [];
  }
}

async function scrapeTractorImages() {
  console.log('🚜 Scraping images from Tractor Tavern...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.tractortavern.com/calendar', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventImages = await page.evaluate(() => {
      const results = [];
      
      const cards = document.querySelectorAll('.event, .show, article, [class*="event"], .seetickets-list-event');
      
      cards.forEach(card => {
        try {
          const img = card.querySelector('img');
          const imageUrl = img ? (img.src || img.getAttribute('data-src')) : null;
          
          const titleEl = card.querySelector('h2, h3, h4, .title, .headliner, .event-name');
          const title = titleEl ? titleEl.textContent.trim().toUpperCase() : null;
          
          if (imageUrl && title && imageUrl.startsWith('http') && !imageUrl.includes('logo')) {
            results.push({ title, imageUrl });
          }
        } catch (e) {}
      });
      
      return results;
    });
    
    console.log(`  Found ${eventImages.length} event images`);
    await browser.close();
    return eventImages;
    
  } catch (error) {
    console.error('  Error scraping Tractor:', error.message);
    await browser.close();
    return [];
  }
}

async function fetchSeattleImages() {
  console.log('🖼️  FETCHING SEATTLE IMAGES\n');
  
  // Scrape images from venues
  const showboxImages = await scrapeShowboxImages();
  const neumosImages = await scrapeNeumosImages();
  const tractorImages = await scrapeTractorImages();
  
  const allImages = [...showboxImages, ...neumosImages, ...tractorImages];
  console.log(`\n📊 Total images scraped: ${allImages.length}\n`);
  
  if (allImages.length === 0) {
    console.log('No images found from venues. Exiting.');
    return;
  }
  
  // Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // Get Seattle events without images
    const seattleEvents = await collection.find({
      city: 'Seattle',
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    }).toArray();
    
    console.log(`📊 Found ${seattleEvents.length} Seattle events without images\n`);
    
    let updated = 0;
    
    // Try to match events with scraped images
    for (const event of seattleEvents) {
      const eventTitle = (event.title || '').toUpperCase();
      
      // Find matching image
      const match = allImages.find(img => {
        const imgTitle = img.title.toUpperCase();
        // Fuzzy match - event title contains image title or vice versa
        return eventTitle.includes(imgTitle) || imgTitle.includes(eventTitle) ||
               eventTitle.split(' ')[0] === imgTitle.split(' ')[0]; // First word match
      });
      
      if (match && match.imageUrl) {
        await collection.updateOne(
          { _id: event._id },
          { $set: { image: match.imageUrl, imageURL: match.imageUrl } }
        );
        console.log(`✅ ${event.title.substring(0, 35)}`);
        console.log(`   Image: ${match.imageUrl.substring(0, 50)}...`);
        updated++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Updated ${updated} Seattle events with images`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Done');
  }
}

fetchSeattleImages();
