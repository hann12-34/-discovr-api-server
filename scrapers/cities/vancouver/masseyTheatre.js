/**
 * Massey Theatre Events Scraper
 * Scrapes events from masseytheatre.com - New Westminster venue
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VENUE = {
  name: 'Massey Theatre',
  address: '735 Eighth Avenue, New Westminster, BC V3M 2R2',
  city: 'Vancouver'
};

async function fetchEventDetails(eventUrl) {
  try {
    const response = await axios.get(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Try to find JSON-LD structured data
    let eventData = null;
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (Array.isArray(data)) {
          const event = data.find(d => d['@type'] === 'Event');
          if (event) eventData = event;
        } else if (data['@type'] === 'Event') {
          eventData = data;
        }
      } catch (e) {}
    });
    
    if (eventData) {
      return {
        title: eventData.name,
        dateText: eventData.startDate ? eventData.startDate.split('T')[0] : null,
        image: eventData.image,
        description: eventData.description ? eventData.description.replace(/<[^>]*>/g, '').substring(0, 500) : null
      };
    }
    
    // Fallback to meta tags
    const title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const image = $('meta[property="og:image"]').attr('content');
    const description = $('meta[property="og:description"]').attr('content');
    
    return { title, dateText: null, image, description };
  } catch (error) {
    return { title: null, dateText: null, image: null, description: '' };
  }
}

const MasseyTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Massey Theatre...');

    try {
      const response = await axios.get('https://www.masseytheatre.com/events/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();
      const eventUrls = [];

      // Find all event links
      $('a[href*="/event/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        
        let url = href;
        if (!url.startsWith('http')) {
          url = 'https://www.masseytheatre.com' + url;
        }
        
        // Skip category pages
        if (url.includes('/category/')) return;
        
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          eventUrls.push(url);
        }
      });

      console.log(`  Found ${eventUrls.length} event URLs from Massey Theatre`);

      // Fetch details for each event
      for (const eventUrl of eventUrls.slice(0, 30)) {
        try {
          const details = await fetchEventDetails(eventUrl);
          
          if (!details.dateText || !details.title) {
            continue;
          }
          
          // Clean up title
          let title = details.title.replace(/\s*[-|–]\s*Massey Theatre.*$/i, '').trim();
          
          events.push({
            id: uuidv4(),
            title: title,
            date: details.dateText,
            url: eventUrl,
            venue: VENUE,
            city: 'Vancouver',
            description: details.description || null,
            image: details.image || null,
            source: 'Massey Theatre'
          });
          
        } catch (err) {
          // Continue with next event
        }
      }

      console.log(`Found ${events.length} total events from Massey Theatre`);
      const filtered = filterEvents(events);

      // Fetch descriptions from event detail pages
      for (const event of events) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }

      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Massey Theatre:', error.message);
      return [];
    }
  }
};

module.exports = MasseyTheatreEvents.scrape;
