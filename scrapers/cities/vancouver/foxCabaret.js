const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');
const { sanitizeDescription } = require('../../utils/sanitizeDescription');

const FoxCabaretEvents = {
  async scrape(city) {
    console.log('🔍 Scraping Fox Cabaret...');
    
    try {
      const response = await axios.get('https://www.foxcabaret.com/monthly-calendar-list', {
        headers: {'User-Agent': 'Mozilla/5.0'},
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();
      
      $('article.eventlist-event').each((i, el) => {
        const $el = $(el);
        
        // Get event name
        const titleEl = $el.find('.eventlist-title, h1, .title').first();
        const title = titleEl.text().trim();
        
        // Get date
        const dateEl = $el.find('.eventlist-datetag-startdate, .event-date, time').first();
        const dateText = dateEl.text().trim();
        
        // Get time  
        const timeEl = $el.find('.eventlist-datetag-time, .event-time').first();
        const timeText = timeEl.text().trim();
        
        // Get URL
        const linkEl = $el.find('a').first();
        const url = linkEl.attr('href');
        
        // Get REAL POSTER IMAGE
        const img = $el.find('img:not([src*="logo"]):not([alt*="logo"])').first();
        let imageUrl = null;
        if (img.length > 0) {
          const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
          if (src && !src.includes('logo') && !src.includes('icon')) {
            imageUrl = src.startsWith('http') ? src : `https://www.foxcabaret.com${src}`;
          }
        }
        
        // Parse date from text like "Oct 2" or "Oct\n2"
        const fullText = $el.text();
        const dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        
        let eventDate = null;
        if (dateMatch) {
          const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
          const monthStr = dateMatch[1].toLowerCase().substring(0,3);
          const month = months[monthStr];
          const day = dateMatch[2].padStart(2, '0');
          
          // Year logic: if month has passed this year, use next year
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth(); // 0-indexed
          const monthIndex = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthStr);
          const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
          
          // Use proper date format: "Month DD, YYYY" for parsing
          eventDate = `${dateMatch[1]} ${dateMatch[2]}, ${year}`;
        }
        
        // Use title or fallback
        const eventTitle = title || (dateText + ' ' + timeText).trim() || `Fox Cabaret Event`;
        
        // Skip if no date or no title
        if (!eventDate || !eventTitle || eventTitle.length < 3) return;
        
        // DEDUPLICATION: Skip recurring weekly/monthly events beyond first occurrence
        const recurringPatterns = [
          'The Sunday Service', 
          'Sweet Neens KARAOKE', 
          'KARAOKE at the Fox',
          '80s vs 90s Night',
          '90s vs 00s Night',
          'GOLDEN: 80s/90s/00s Hip Hop Dance Party',
          'Millennium',
          '4x4: Four Bands for Four Bucks',
          'Non-Stop Disco Party',
          'Teen Angst Night',
          'Absolute 80s Night',
          'Guilty Pleasures:',
          'Pump Up The Jam:'
        ];
        const isRecurring = recurringPatterns.some(pattern => eventTitle.includes(pattern));
        const isDuplicateRecurring = isRecurring && recurringPatterns.some(pattern => 
          eventTitle.includes(pattern) && seen.has(pattern)
        );
        
        if (!seen.has(eventTitle + eventDate) && !isDuplicateRecurring) {
          seen.add(eventTitle + eventDate);
          
          // Mark recurring events as seen to prevent duplicates
          if (isRecurring) {
            const matchedPattern = recurringPatterns.find(pattern => eventTitle.includes(pattern));
            if (matchedPattern) {
              seen.add(matchedPattern);
            }
          }

          // Convert date to ISO format for startDate
          let isoDate = null;
          if (eventDate) {
            const parsed = new Date(eventDate);
            if (!isNaN(parsed)) {
              const y = parsed.getFullYear();
              const m = String(parsed.getMonth() + 1).padStart(2, '0');
              const d = String(parsed.getDate()).padStart(2, '0');
              isoDate = `${y}-${m}-${d}`;
            }
          }

          // Generate clean description
          const description = sanitizeDescription(
            null,
            eventTitle,
            'Fox Cabaret',
            'Vancouver'
          );

          events.push({
            id: uuidv4(),
            title: eventTitle,
            description: description,
            date: isoDate || eventDate,
            startDate: isoDate ? new Date(isoDate + 'T12:00:00') : null,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.foxcabaret.com' + url : 'https://www.foxcabaret.com'),
            imageUrl: imageUrl || null,  // Real poster image or null
            venue: { name: 'Fox Cabaret', address: '2321 Main Street, Vancouver, BC V5T 3C9', city: 'Vancouver' },
            latitude: 49.2667,
            longitude: -123.1010,
            city: 'Vancouver',
            source: 'Fox Cabaret',
            category: 'Nightlife'
          });
          
          console.log(`✓ ${eventTitle} | ${eventDate || 'NO DATE'}`);
        }
      });
      
      console.log(`\n✅ Found ${events.length} Fox Cabaret events`);
      return filterEvents(events);
      
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }
};

module.exports = FoxCabaretEvents.scrape;
