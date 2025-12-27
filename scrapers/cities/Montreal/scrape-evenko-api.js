/**
 * Evenko Events Scraper - API Version
 * Scrapes from evenko.ca using Next.js data
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const VENUES = [
  { name: 'MTELUS', address: '59 Rue Sainte-Catherine Est, Montreal, QC H2X 1K5' },
  { name: 'Corona Theatre', address: '2490 Rue Notre-Dame Ouest, Montreal, QC H3J 1N5' },
  { name: 'Olympia Theatre', address: '1004 Rue Sainte-Catherine Est, Montreal, QC H2L 2G3' },
  { name: 'La Tulipe', address: '4530 Avenue Papineau, Montreal, QC H2H 1V4' },
  { name: 'Bell Centre', address: '1909 Avenue des Canadiens-de-Montréal, Montreal, QC H4B 5G0' },
  { name: 'Place Bell', address: '2100 Avenue des Canadiens-de-Montréal, Laval, QC H7T 0E9' }
];

async function scrape() {
  console.log('🎵 Scraping Evenko events...');
  const events = [];
  
  try {
    // Fetch main events page
    const response = await axios.get('https://evenko.ca/en/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 20000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract __NEXT_DATA__ JSON
    const scriptContent = $('script#__NEXT_DATA__').html();
    if (scriptContent) {
      try {
        const data = JSON.parse(scriptContent);
        const pageProps = data.props?.pageProps || {};
        
        // Check for events in various possible locations
        const eventsList = pageProps.events || pageProps.shows || pageProps.data?.events || [];
        
        if (Array.isArray(eventsList)) {
          for (const e of eventsList) {
            const title = e.title || e.name || e.artist || '';
            if (!title || title.length < 2) continue;
            
            const dateStr = e.date || e.startDate || e.datetime || '';
            const venue = VENUES.find(v => 
              (e.venue?.name || '').toLowerCase().includes(v.name.toLowerCase())
            ) || VENUES[0];
            
            if (!dateStr) continue; // Skip events without real dates
            
            events.push({
              id: uuidv4(),
              title: title.substring(0, 100),
              date: dateStr,
              url: e.url || e.link || 'https://evenko.ca/en/events',
              image: e.image || e.thumbnail || e.poster || null,
              imageUrl: e.image || e.thumbnail || e.poster || null,
              venue: {
                name: venue.name,
                address: venue.address,
                city: 'Montreal'
              },
              city: 'Montreal',
              category: 'Music',
              source: 'Evenko'
            });
          }
        }
      } catch (parseErr) {
        console.log('  JSON parse error');
      }
    }
    
    // Also scrape visible event links from HTML
    const seenUrls = new Set();
    $('a[href*="/event/"], a[href*="/show/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (!href || seenUrls.has(href)) return;
      seenUrls.add(href);
      
      const title = $(el).text().trim() || $(el).attr('title') || '';
      if (!title || title.length < 3 || title.length > 100) return;
      if (/menu|filter|search|login/i.test(title)) return;
      
      const fullUrl = href.startsWith('http') ? href : 'https://evenko.ca' + href;
      
      // Extract date from href or skip - don't add events without real dates
      const dateMatch = href.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!dateMatch) return; // Skip events without real dates in URL
      
      events.push({
        id: uuidv4(),
        title: title.substring(0, 100),
        date: dateMatch[0],
        url: fullUrl,
        image: null,
        imageUrl: null,
        venue: {
          name: 'Evenko Venue',
          address: 'Montreal, QC',
          city: 'Montreal'
        },
        city: 'Montreal',
        category: 'Music',
        source: 'Evenko'
      });
    });
    
    // Fetch og:image for events without images (limit to 30)
    let imageCount = 0;
    for (const event of events) {
      if (!event.image && event.url && imageCount < 30) {
        try {
          const resp = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
          });
          const $e = cheerio.load(resp.data);
          const ogImage = $e('meta[property="og:image"]').attr('content');
          if (ogImage && !ogImage.includes('logo')) {
            event.image = ogImage;
            event.imageUrl = ogImage;
            imageCount++;
          }
        } catch (e) {}
      }
    }
    
  } catch (error) {
    console.error('  ⚠️ Evenko error:', error.message);
  }
  
  console.log(`✅ Evenko: ${events.length} events, ${events.filter(e => e.image).length} with images`);
  return events;
}

module.exports = scrape;
module.exports.source = 'Evenko';
