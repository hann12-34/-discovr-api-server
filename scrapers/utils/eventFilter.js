/**
 * Event Filter Utility
 * Filters out navigation links, junk, and non-event items from scraped data
 */

const JUNK_PATTERNS = [
  // Navigation and UI elements
  /^Events?$/i,
  /^View\s+(Full|All|More|Event)/i,
  /View\s+All/i,  // Catch "View All" anywhere
  /^Check\s+Out/i,
  /^Click\s+(here|for)/i,
  /^Read\s+More/i,
  /Learn\s+More/i,  // Catch "Learn More" anywhere
  /^See\s+(All|More)/i,
  /^Show\s+(All|More)/i,
  /^More\s+(Details|Info|Events)/i,
  
  // Ticket/Purchase related - more flexible patterns
  /Buy\s+Tickets?/i,  // Catch "Buy Tickets" anywhere in title
  /^Get\s+Tickets?/i,
  /^Purchase\s+Tickets?/i,
  /^Tickets?$/i,
  /^Buy\s+Now/i,
  /Buy.*Now/i,  // Catch "BUY TICKETS NOW" etc
  /^Book\s+Now$/i,
  /^Reserve\s+Now$/i,
  /^(Find|Get)\s+Info$/i,
  
  // Shows/Near You type navigation
  /^Shows?\s+Near\s+You$/i,
  /^Events?\s+Near\s+You$/i,
  /^Find\s+(Shows?|Events?)$/i,
  
  // Calendar/List pages
  /events?\s+(this\s+week|calendar|list|page|archive)/i,
  /^(signature|featured|upcoming|past|recent)\s+events?$/i,
  /^Event\s+(Calendar|List|Archive|Page)$/i,
  
  // Month listings
  /^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+Events/i,
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i,
  
  // Generic categories
  /^Shows?\s*&\s*Entertain/i,
  /^Festivals?\s*&\s*Eve/i,
  /^Events?\s*&\s*Activities/i,
  
  // HTML/Image tags
  /^<img/i,
  /^<a\s+/i,
  /^<div/i,
  /srcset=/i,
  /class="/i,
  
  // Sponsorship/Support
  /becoming\s+a\s+sponsor/i,
  /support(s|ing)/i,
  /donate/i,
  
  // Generic words
  /^(Home|About|Contact|Menu|Login|Register|Subscribe)$/i,
  /^(Facebook|Twitter|Instagram|YouTube)$/i,
  /^(Blog|News|Press|Media)$/i,
  
  // Venue-specific junk
  /^(Awards?|Panels?|Archive)$/i,
  /^Industry\s+/i,
  /^First\s+Look:/i,
  /^The\s+Next\s+Gen/i,
  
  // Company/Service names (not events)
  /^(Eventbrite|Eventim|Ticketmaster|Live Nation|Stubhub)$/i,
  /^About\s+(Eventbrite|Ticketmaster|Live Nation)/i,
  /Productions?$/i,
  
  // Premium/VIP navigation
  /^Premium\s+Tickets?$/i,
  /^VIP\s+(Tickets?|Access)$/i,
  
  // Very short/generic
  /^(OUT|UPU|sp|ICS)$/i,
  /^→$/,  // Just an arrow
  
  // Cancelled/Postponed events
  /^\*?cancelled\*?/i,
  /^\*?postponed\*?/i,
  /^\[cancelled\]/i,
  /^\(cancelled\)/i,
  
  // JavaScript code/tech junk
  /^(if|var|const|let|function)\s*\(/i,
  /^var\s+\w+\s*=/i,
  /S3_BUCKET/i,
  
  // UI Navigation elements
  /^Recent\s+search/i,
  /^Quick\s+access/i,
  /^Event\s+Views\s+Navigation/i,
  /^Coming\s+to\s+a\s+Concert\?/i,
  /^TODAY'S\s+SHOWS$/i,
  
  // Generic promotional text
  /^(Welcome|Bienvenue)\s+(to|à)/i,
  /^Powered\s+by/i,
  /^Events?\s+that\s+will\s+set\s+you\s+free/i,
  /^Concerts?\s+and\s+events$/i,
  /^The\s+show\s+rooms?\s+are\s+located/i,
  /^(Venez|Come)\s+(nous\s+)?voir/i,
  /^Meet\s+the\s+(Tenants|Suppliers)/i,
  
  // Malformed titles with Learn More/Buy Tickets appended
  /\d{4}Learn\s+More/i,  // "September 18, 2025Learn More"
  /[A-Za-z]{3,}Learn\s+More/,  // Letters followed by "Learn More" with no space
  /[A-Za-z]{3,}Buy\s+Tickets/,  // Letters followed by "Buy Tickets" with no space
  
  // Generic junk titles
  /^Filters?$/i,
  /^UpcomingEvents?$/i,
  /^Families$/i,
  /^EVENTS\s+AT\s+THE\s+[A-Z]{2,}$/i,  // "EVENTS AT THE AGO" etc
  
  // "Featured" and date-only titles
  /^Featured$/i,
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i,  // "Nov 04", "Aug 3"
  /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i,  // "04 Nov", "3 Aug"
  /^(MTWTFSS|Online)$/i,  // Weekday codes, "Online"
  
  // Toronto junk titles
  /^Filter\s+by/i,  // "Filter by artist"
  /^Explore\s+(events|shows)/i,  // "Explore events..."
  /^Find\s+(Tickets|Events|Shows)/i,  // "Find TicketsTor..."
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i,  // "November 2025"
  /^Yesterday\s+-\s+/i,  // "Yesterday - Nov..."
  /^Job\s+Fair/i,  // "Job Fair Toront..."
  /^Career\s+Fair/i,
  /^Hiring\s+Event/i,
  
  // NEW: Generic navigation/page elements
  /^Calendar$/i,
  /^Location$/i,
  /^What'?s\s+New$/i,
  /^Stay\s+Up\s+to\s+Date/i,
  /^Interactive\s+Map$/i,
  /^Splash\s+Page$/i,
  /^explore\s+the\s+space$/i,
  /^It'?s\s+a\s+feeling$/i,
  /^Join\s+THE\s+A-LIST/i,
  /^Support\s+musician$/i,
  
  // NEW: Date-only titles (NOT real events)
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(day)?,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{0,2}$/i,  // "Friday, Novemb", "Tue Nov 04"
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+Nove?m?b?e?r?\.{3}$/i,  // "Thursday, Nove..."
  /^Today\s*\+\s*Tomo?r?r?\.{0,3}$/i,  // "Today + Tomorr..."
  
  // NEW: Generic content titles
  /^School\s+Group\s+Vi/i,  // "School Group Vi..."
  /^Met\s+Expert\s+Talk/i,
  /^Faculty\s+Afterno/i,
  /^Fall\s+First\s+Discov/i,
  /^FETCH\s+TIGER/i,
  /^VIJAY\s+IYER\s+QU/i,
  
  // NEW: Generic promotional/page titles
  /^(30th|20th|10th)\s+ANNIVERS/i,  // "30th ANNIVERS..."
  /^Election\s+Night/i,
  /^Ice[\s-]?Theatre\s+ov/i,  // "Ice Theatre ov..."
  /^Cooling\s+Class/i,  // "Cooling Class" (likely exhibit not event)
];

/**
 * Check if a title is likely junk/navigation
 * @param {string} title - Event title to check
 * @returns {boolean} - True if junk, false if valid event
 */
function isJunkTitle(title) {
  if (!title || typeof title !== 'string') return true;
  
  const trimmed = title.trim();
  
  // Too short (but allow PNE, VSO, etc)
  if (trimmed.length < 4 && !['PNE', 'VSO', 'UBC'].includes(trimmed)) {
    return true;
  }
  
  // Too long (likely scraped HTML)
  if (trimmed.length > 200) {
    return true;
  }
  
  // Reject single-word generic titles (unless they're known valid)
  const wordCount = trimmed.split(/\s+/).length;
  const VALID_SINGLE_WORDS = ['JAUZ', 'WUKI', 'ZERB', 'TIESTO', 'ALESSO', 'REZZ', 'ZEDD'];
  if (wordCount === 1 && trimmed.length < 15 && !VALID_SINGLE_WORDS.includes(trimmed.toUpperCase())) {
    // Single word titles are suspicious unless they're DJ names or have context
    if (/^(Calendar|Location|Search|Filter|Today|Tomorrow|Explore|Discover|Join|Support)$/i.test(trimmed)) {
      return true;
    }
  }
  
  // Reject truncated titles ending with "..." that look generic
  if (trimmed.endsWith('...') && trimmed.length < 20) {
    return true;
  }
  
  // Check against patterns
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filter an array of events to remove junk
 * @param {Array} events - Array of event objects with 'title' property
 * @returns {Array} - Filtered array of valid events
 */
function filterEvents(events) {
  if (!Array.isArray(events)) return [];
  
  const filtered = events.filter(event => {
    if (!event || !event.title) return false;
    
    // Filter NULL dates
    if (!event.date || event.date === null) {
      console.log(`  ❌ Filtered out (NULL date): "${event.title}"`);
      return false;
    }
    
    // Filter short titles (< 4 chars) except known exceptions
    // Allow DJ names and short event titles (JAUZ, WUKI, ZERB, etc.)
    const VALID_SHORT = ['PNE', 'VSO', 'UBC', 'VIFF', 'BMO'];
    if (event.title.length < 4 && !VALID_SHORT.includes(event.title.trim())) {
      console.log(`  ❌ Filtered out (too short): "${event.title}"`);
      return false;
    }
    
    const isJunk = isJunkTitle(event.title);
    if (isJunk) {
      console.log(`  ❌ Filtered out: "${event.title}"`);
    }
    return !isJunk;
  });
  
  const removed = events.length - filtered.length;
  if (removed > 0) {
    console.log(`  🧹 Filtered out ${removed} junk items`);
  }
  
  return filtered;
}

module.exports = {
  isJunkTitle,
  filterEvents,
  JUNK_PATTERNS
};
