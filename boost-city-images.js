/**
 * Boost Image Coverage for Low Cities
 * Target: Seattle, New York, Los Angeles - at least 50%
 */

const { MongoClient } = require('mongodb');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

const BAD_PATTERNS = [
  'logo', 'icon', 'favicon', 'placeholder', 'loading', 'default',
  'avatar', 'profile', 'badge', 'sprite', 'blank', 'spacer',
  'social', 'share', '1x1', 'pixel', 'tracking', 'banner-ad'
];

function isValidImage(url) {
  if (!url || !url.startsWith('http')) return false;
  const urlLower = url.toLowerCase();
  if (BAD_PATTERNS.some(p => urlLower.includes(p))) return false;
  // Must be an image URL
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || 
      urlLower.includes('.png') || urlLower.includes('.webp') ||
      urlLower.includes('image') || urlLower.includes('photo') ||
      urlLower.includes('media') || urlLower.includes('cdn')) {
    return true;
  }
  return true; // Accept other URLs as potential images
}

async function fetchImageAxios(url) {
  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 8000,
      maxRedirects: 3
    });
    
    const $ = cheerio.load(response.data);
    
    // Try multiple sources
    const sources = [
      $('meta[property="og:image"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      $('meta[property="twitter:image"]').attr('content'),
      $('meta[name="twitter:image:src"]').attr('content'),
    ];
    
    for (const img of sources) {
      if (isValidImage(img)) return img;
    }
    
    // Try Schema.org JSON-LD
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json.image) {
          const img = Array.isArray(json.image) ? json.image[0] : json.image;
          if (typeof img === 'string' && isValidImage(img)) {
            sources.push(img);
          } else if (img?.url && isValidImage(img.url)) {
            sources.push(img.url);
          }
        }
      } catch (e) {}
    });
    
    // Try main content images
    const mainImgSelectors = [
      '.event-image img', '.event img', 'article img', 
      '.hero img', '.featured img', 'main img',
      '.content img', '#content img'
    ];
    
    for (const sel of mainImgSelectors) {
      const img = $(sel).first().attr('src') || $(sel).first().attr('data-src');
      if (img) {
        const fullUrl = img.startsWith('http') ? img : new URL(img, url).href;
        if (isValidImage(fullUrl)) return fullUrl;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchImagePuppeteer(url, browser) {
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    
    const image = await page.evaluate(() => {
      // Try og:image
      const og = document.querySelector('meta[property="og:image"]');
      if (og?.content) return og.content;
      
      // Try twitter:image
      const tw = document.querySelector('meta[name="twitter:image"]');
      if (tw?.content) return tw.content;
      
      // Try main image
      const imgs = document.querySelectorAll('article img, .event img, main img, .content img');
      for (const img of imgs) {
        const src = img.src || img.dataset.src;
        if (src && src.startsWith('http') && !src.includes('logo')) {
          return src;
        }
      }
      return null;
    });
    
    await page.close();
    return isValidImage(image) ? image : null;
  } catch (error) {
    if (page) await page.close().catch(() => {});
    return null;
  }
}

async function boostCityImages() {
  console.log('🚀 BOOSTING IMAGE COVERAGE FOR LOW CITIES\n');
  console.log('Target: Seattle, New York, Los Angeles - at least 50%\n');
  
  const client = new MongoClient(MONGODB_URI);
  let browser;
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const collection = client.db('discovr').collection('events');
    const targetCities = ['Seattle', 'New York', 'Los Angeles'];
    
    // Launch browser for Puppeteer fallback
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    for (const city of targetCities) {
      const total = await collection.countDocuments({ city });
      const target = Math.ceil(total * 0.5);
      let current = await collection.countDocuments({ 
        city, 
        image: { $exists: true, $ne: null, $ne: '' }
      });
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📍 ${city}: ${current}/${total} (${Math.round(current*100/total)}%) - Target: ${target}`);
      console.log('='.repeat(60));
      
      if (current >= target) {
        console.log(`✅ Already at 50%+!`);
        continue;
      }
      
      // Get events without images
      const events = await collection.find({
        city,
        $or: [{ image: null }, { image: '' }, { image: { $exists: false } }],
        url: { $regex: /^https?:/, $options: 'i' }
      }).toArray();
      
      console.log(`Found ${events.length} events to process\n`);
      
      let updated = 0;
      let tried = 0;
      
      for (const event of events) {
        // Check if we've hit target
        current = await collection.countDocuments({ 
          city, 
          image: { $exists: true, $ne: null, $ne: '' }
        });
        
        if (current >= target) {
          console.log(`\n🎯 Reached 50% target!`);
          break;
        }
        
        const url = event.sourceURL || event.url;
        if (!url || url.endsWith('/events') || url.endsWith('/events/')) continue;
        
        tried++;
        const title = (event.title || '').substring(0, 35);
        process.stdout.write(`[${tried}] ${title}...`);
        
        // Try axios first (faster)
        let imageUrl = await fetchImageAxios(url);
        
        // If axios fails, try Puppeteer
        if (!imageUrl) {
          imageUrl = await fetchImagePuppeteer(url, browser);
        }
        
        if (imageUrl) {
          await collection.updateOne(
            { _id: event._id },
            { $set: { image: imageUrl, imageURL: imageUrl } }
          );
          console.log(` ✅`);
          updated++;
        } else {
          console.log(` ❌`);
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Final count
      const final = await collection.countDocuments({ 
        city, 
        image: { $exists: true, $ne: null, $ne: '' }
      });
      const finalPct = Math.round(final * 100 / total);
      console.log(`\n${city}: ${final}/${total} (${finalPct}%) - Updated ${updated} events`);
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY:');
    console.log('='.repeat(60));
    
    for (const city of targetCities) {
      const total = await collection.countDocuments({ city });
      const withImg = await collection.countDocuments({ 
        city, 
        image: { $exists: true, $ne: null, $ne: '' }
      });
      const pct = Math.round(withImg * 100 / total);
      const status = pct >= 50 ? '✅' : '⚠️';
      console.log(`${status} ${city}: ${withImg}/${total} (${pct}%)`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) await browser.close();
    await client.close();
    console.log('\n👋 Done');
  }
}

boostCityImages();
