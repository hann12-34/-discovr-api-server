const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { toISODate } = require('../../utils/dateNormalizer');

const VENUE_NAME = "S.O.B.'s";
const VENUE_ADDRESS = '204 Varick St, New York, NY 10014';
const EVENTS_URL = 'https://www.sobs.com/events/';

// Blacklist for generic images
const IMAGE_BLACKLIST = ['logo', 'header', 'icon', 'favicon', 'legendary', 'default', 'cropped-sobs', 'loading.gif', 'spinner'];

function isValidEventImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('uploads') && !IMAGE_BLACKLIST.some(p => lower.includes(p));
}

// Fetch og:image from individual event page
async function fetchEventPageImage(url) {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 8000
    });
    const $ = cheerio.load(response.data);
    
    // Try og:image first
    let image = $('meta[property="og:image"]').attr('content');
    if (image && isValidEventImage(image)) return image;
    
    // Try first content image
    $('img[src*="uploads"]').each((i, img) => {
      const src = $(img).attr('src');
      if (!image && isValidEventImage(src)) {
        image = src.startsWith('http') ? src : 'https://sobs.com' + src;
      }
    });
    
    return image || null;
  } catch (e) {
    return null;
  }
}

async function scrapeEvents(city = 'New York') {
  console.log("🎪 Scraping S.O.B.'s events with proper images...");
  const events = [];
  
  try {
    const response = await axios.get(EVENTS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Get unique event URLs
    const eventUrls = new Set();
    $('a[href*="sobs.com/events/"]').each((i, a) => {
      const href = $(a).attr('href');
      if (href && !href.endsWith('/events/') && href.includes('/events/')) {
        eventUrls.add(href);
      }
    });
    
    console.log(`   Found ${eventUrls.size} unique event URLs`);
    
    // Fetch each event page for proper title, date, and image
    for (const url of eventUrls) {
      try {
        const eventResponse = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          timeout: 8000
        });
        const $e = cheerio.load(eventResponse.data);
        
        // Get title from page - try multiple sources
        let title = $e('meta[property="og:title"]').attr('content') || 
                   $e('title').text().trim() ||
                   $e('h1').first().text().trim() ||
                   $e('h2').first().text().trim();
        
        // Clean title - remove site name and generic text
        title = title.replace(/\s*[-–|]\s*S\.?O\.?B\.?'?s?.*$/i, '').trim();
        title = title.replace(/\s*[-–|]\s*SOB.*$/i, '').trim();
        title = title.replace(/^EVENT\s*/i, '').trim();
        
        // If title is still generic, extract from URL
        if (!title || title.length < 3 || title.toUpperCase() === 'EVENT') {
          // Extract from URL slug: /events/dmx-55/ -> "DMX 55"
          const urlMatch = url.match(/\/events\/([^\/]+)\/?$/);
          if (urlMatch) {
            title = urlMatch[1]
              .replace(/-/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
              .trim();
          }
        }
        
        if (!title || title.length < 3) continue;
        
        // Get date
        let dateText = null;
        $e('time, .date, .event-date').each((i, el) => {
          if (!dateText) {
            const text = $e(el).text().trim();
            const dt = $e(el).attr('datetime');
            if (dt) dateText = dt;
            else if (text.match(/\d{1,2}/)) dateText = text;
          }
        });
        
        // Try to extract date from page content
        if (!dateText) {
          const pageText = $e('body').text();
          const dateMatch = pageText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4}/i) ||
                           pageText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}/i);
          if (dateMatch) dateText = dateMatch[0];
        }
        
        // Get image - try og:image first, then content images
        let image = $e('meta[property="og:image"]').attr('content');
        if (!isValidEventImage(image)) {
          image = null;
          $e('img[src*="uploads"]').each((i, img) => {
            const src = $e(img).attr('src');
            if (!image && isValidEventImage(src)) {
              image = src.startsWith('http') ? src : 'https://sobs.com' + src;
            }
          });
        }
        
        events.push({
          id: uuidv4(),
          title: title.substring(0, 100),
          date: toISODate(dateText) || null,
          image: image,
          venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city },
          url: url,
          source: VENUE_NAME,
          category: 'Music'
        });
        
      } catch (pageError) {
        // Skip this event
      }
    }
    
    // Filter out events without valid data
    const validEvents = events.filter(e => e.title && e.title.length > 3);
    
    console.log(`   ✅ S.O.B.'s: ${validEvents.length} events, ${validEvents.filter(e => e.image).length} with images`);
    return validEvents;
    
  } catch (error) {
    console.log(`   ❌ S.O.B.'s error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeEvents;
