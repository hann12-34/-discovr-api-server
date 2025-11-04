const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { isTitleJustADate } = require('../../utils/city-util');

async function songkickMontrealEvents(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(`City mismatch! Expected 'Montreal', got '${city}'`);
  
  console.log(`🎵 Scraping Songkick for Montreal events...`);
  
  const allEvents = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await axios.get('https://www.songkick.com/metro-areas/27377-canada-montreal', {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    $('.event-listing, [class*="event"], li.concert').each((i, el) => {
      if (i > 100) return false;
      
      const $event = $(el);
      
      const title = $event.find('.event-link, .artists, h3, h2').first().text().trim() ||
                   $event.find('strong, .summary').first().text().trim();
      
      if (!title || title.length < 3 || title.length > 200) return;
      if (title.match(/^(See|View|All|More)/i)) return;
      if (isTitleJustADate(title)) return;
      
      const dateText = $event.find('[datetime]').attr('datetime') ||
                      $event.find('time').text().trim() ||
                      $event.find('.date').text().trim();
      
      if (!dateText || dateText.length < 4) return;
      
      let eventDate;
      try {
        eventDate = new Date(dateText);
        if (isNaN(eventDate.getTime())) {
          const match = dateText.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})?/);
          if (match) {
            const monthMap = {
              'Jan':0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,
              'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11
            };
            const month = monthMap[match[1].substring(0,3)];
            const year = match[3] ? parseInt(match[3]) : 2025;
            if (month !== undefined) {
              eventDate = new Date(year, month, parseInt(match[2]));
            }
          }
        }
        if (isNaN(eventDate.getTime())) return;
      } catch (e) {
        return;
      }
      
      const venueName = $event.find('.venue-name, .location').first().text().trim() || 'Montreal Venue';
      
      const eventUrl = $event.find('a').first().attr('href') || '';
      const fullUrl = eventUrl.startsWith('http') ? eventUrl :
                     eventUrl.startsWith('/') ? `https://www.songkick.com${eventUrl}` :
                     'https://www.songkick.com';
      
      allEvents.push({
        title: title,
        date: eventDate.toISOString(),
        venue: { 
          name: venueName, 
          address: 'Montreal, QC',
          city: 'Montreal' 
        },
        location: 'Montreal, QC',
        description: title,
        url: fullUrl,
        category: 'Music'
      });
    });
    
    console.log(`   ✅ Extracted ${allEvents.length} Songkick events`);
    
  } catch (error) {
    console.log(`   ⚠️  Songkick: 0 events`);
  }
  
  return filterEvents(allEvents);
}

module.exports = songkickMontrealEvents;
