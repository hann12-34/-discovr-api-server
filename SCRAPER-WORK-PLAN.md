# 🎯 Scraper Improvement & Expansion Plan

**Created:** November 13, 2024  
**Status:** Ready to Execute  
**Goal:** Improve data quality and expand coverage across all cities

---

## ✅ **What's Working Now**

- ✅ Vancouver: 276 events showing with images
- ✅ Toronto: ~500 events
- ✅ Montreal: ~1054 events  
- ✅ Calgary: ~200 events
- ✅ New York: ~800 events
- ✅ Image display system working
- ✅ City filtering working perfectly

---

## 📊 **Current Scraper Inventory**

| City | Scrapers | Status |
|------|----------|--------|
| **Vancouver** | 328 files | ✅ Active, needs expansion |
| **Toronto** | 413 files | 🔄 Needs review |
| **Montreal** | 372 files | 🔄 Needs review |
| **New York** | 350 files | 🔄 Needs review |
| **Calgary** | 74 files | ⚠️ Needs more coverage |

**Total:** 806 scraper files

---

## 🎯 **Priority Work**

### **Phase 1: Vancouver Expansion** (Most Important!)

Vancouver is our flagship city and currently has the best data quality. Let's add more venues:

#### **High-Priority Vancouver Venues to Add:**

**Music Venues:**
- [ ] **Alexander Gastown** - Live music venue
- [ ] **The Wise Hall** - Community venue with events
- [ ] **The Imperial** - Music venue on Main St
- [ ] **The Cobalt** - Punk/alternative venue
- [ ] **Pat's Pub** - Live music pub
- [ ] **Railway Stage & Beer Cafe** - Music venue
- [ ] **The Princeton Pub** - Live music

**Theatres:**
- [ ] **Vancouver Playhouse** - Major theatre
- [ ] **Studio 58** - Langara theatre
- [ ] **Jericho Arts Centre** - Community theatre
- [ ] **Presentation House Theatre** - North Van

**Sports & Recreation:**
- [ ] **Vancouver Canadians** (Baseball - Nat Bailey Stadium)
- [ ] **BC Lions** (Football - BC Place - expand)
- [ ] **Vancouver Whitecaps** (Soccer - BC Place - expand)
- [ ] **Vancouver Warriors** (Lacrosse - Rogers Arena - expand)

**Festivals & Events:**
- [ ] **Vancouver International Film Festival (VIFF)**
- [ ] **Vancouver Folk Music Festival**
- [ ] **Khatsahlano Street Party**
- [ ] **Car Free Day Vancouver**
- [ ] **Vancouver Mural Festival**
- [ ] **Eastside Culture Crawl** (exists, verify working)

**Food & Markets:**
- [ ] **Night Market (Richmond)**
- [ ] **Shipyards Night Market** (North Van)
- [ ] **Brewery Events** (Brassneck, 33 Acres, Parallel 49)

---

### **Phase 2: Fix Existing Vancouver Scrapers**

Some scrapers might be broken or returning poor data. Let's audit:

#### **Quick Audit Commands:**

```bash
# Test a specific scraper
node scrapers/cities/vancouver/SCRAPER_NAME.js

# Check for common issues
grep -l "TODO\|FIXME\|broken" scrapers/cities/vancouver/*.js

# Find scrapers with no error handling
grep -L "try.*catch\|error" scrapers/cities/vancouver/*.js | head -10
```

#### **Common Issues to Fix:**

1. **Date Parsing**
   - Ensure all scrapers use consistent date formats
   - Handle "TBD" or "Coming Soon" dates gracefully
   
2. **Image URLs**
   - Make sure all scrapers extract poster/event images
   - Use venue default images as fallback

3. **Duplicate Detection**
   - Check for scrapers importing same events multiple times
   - Ensure unique event IDs

4. **URL Extraction**
   - Every event should have a `sourceURL` for tickets/info
   - Validate URLs are complete (not relative paths)

---

### **Phase 3: Toronto Improvements**

Toronto has 413 scrapers but needs quality review.

#### **High-Priority Toronto Venues:**

**Music Venues:**
- [ ] **The Danforth Music Hall**
- [ ] **Lee's Palace**
- [ ] **The Horseshoe Tavern**
- [ ] **The Opera House**
- [ ] **The Phoenix Concert Theatre**
- [ ] **History**
- [ ] **Adelaide Hall**

**Major Venues:**
- [ ] **Scotiabank Arena** - Raptors, Leafs, concerts
- [ ] **Rogers Centre** - Blue Jays, events
- [ ] **Budweiser Stage** - Summer concerts
- [ ] **BMO Field** - TFC, concerts

**Theatres:**
- [ ] **Princess of Wales Theatre**
- [ ] **Royal Alexandra Theatre**
- [ ] **Ed Mirvish Theatre**
- [ ] **Elgin & Winter Garden**

**Sports:**
- [ ] **Toronto Raptors** (Scotiabank Arena)
- [ ] **Toronto Maple Leafs** (Scotiabank Arena)
- [ ] **Toronto Blue Jays** (Rogers Centre)
- [ ] **Toronto FC** (BMO Field)

---

### **Phase 4: Calgary Expansion** (Priority!)

Calgary only has 74 scrapers - needs the most work!

#### **Essential Calgary Venues:**

**Major Venues:**
- [ ] **Scotiabank Saddledome** - Flames, Stampeders, concerts
- [ ] **McMahon Stadium** - Stampeders, concerts
- [ ] **WinSport** - Events, races

**Arts & Culture:**
- [ ] **Arts Commons** - Multiple theatres
- [ ] **Jubilee Auditorium**
- [ ] **Calgary Philharmonic**
- [ ] **Theatre Calgary**
- [ ] **Alberta Theatre Projects**

**Music Venues:**
- [ ] **MacEwan Hall** (University)
- [ ] **Commonwealth Bar & Stage**
- [ ] **Dickens Pub**
- [ ] **Broken City**
- [ ] **The Palomino Smokehouse**

**Festivals:**
- [ ] **Calgary Stampede** (Major! July event)
- [ ] **Calgary Folk Music Festival**
- [ ] **Lilac Festival**
- [ ] **GlobalFest** (Fireworks)
- [ ] **Beakerhead**

**Sports:**
- [ ] **Calgary Flames** (NHL)
- [ ] **Calgary Stampeders** (CFL)
- [ ] **Calgary Roughnecks** (Lacrosse)

---

### **Phase 5: Montreal Quality Check**

Montreal has 372 scrapers and 1000+ events but needs validation.

#### **Verify Major Montreal Venues:**

**Check These Are Working:**
- [ ] **Bell Centre** - Canadiens, concerts
- [ ] **Place des Arts** - Multiple venues
- [ ] **Théâtre St-Denis**
- [ ] **MTELUS** (formerly Metropolis)
- [ ] **Club Soda**
- [ ] **Corona Theatre**
- [ ] **Phi Centre**

**Festivals to Verify:**
- [ ] **Montreal International Jazz Festival**
- [ ] **Just for Laughs**
- [ ] **Osheaga**
- [ ] **Heavy Montreal**
- [ ] **Igloofest** (winter)

---

### **Phase 6: New York Maintenance**

New York has 350 scrapers - focus on major venues.

#### **Priority NY Venues:**

**Music:**
- [ ] **Madison Square Garden**
- [ ] **Barclays Center**
- [ ] **Terminal 5**
- [ ] **Webster Hall**
- [ ] **Brooklyn Steel**

**Broadway:**
- [ ] **Verify all major Broadway theatres**
- [ ] **Off-Broadway venues**

**Sports:**
- [ ] **Yankees Stadium**
- [ ] **Citi Field** (Mets)
- [ ] **MetLife Stadium** (Jets/Giants)

---

## 🛠️ **How to Work on Scrapers**

### **1. Test Individual Scraper**

```bash
cd ~/Desktop/discovr-api-server
node scrapers/cities/vancouver/SCRAPER_NAME.js
```

### **2. Common Scraper Template**

```javascript
const puppeteer = require('puppeteer');

async function scrapeVenueName() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://venue-website.com/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    const events = await page.evaluate(() => {
      const eventElements = document.querySelectorAll('.event-selector');
      return Array.from(eventElements).map(el => ({
        title: el.querySelector('.title')?.innerText,
        date: el.querySelector('.date')?.innerText,
        venue: 'Venue Name',
        city: 'Vancouver',
        url: el.querySelector('a')?.href,
        imageUrl: el.querySelector('img')?.src
      }));
    });
    
    await browser.close();
    return events.filter(e => e.title && e.date);
    
  } catch (error) {
    console.error('Scraper error:', error);
    await browser.close();
    return [];
  }
}

module.exports = scrapeVenueName;
```

### **3. Add to Import Script**

After creating a scraper, add it to the city's import script:

```javascript
// In ImportFiles/import-all-vancouver-events.js
const newVenueScraper = require('../scrapers/cities/vancouver/newVenue');

// Add to scrapers array
const scrapers = [
  // ... existing scrapers
  { name: 'New Venue', scraper: newVenueScraper }
];
```

### **4. Test Import**

```bash
node ImportFiles/import-all-vancouver-events.js
```

### **5. Deploy**

```bash
git add .
git commit -m "Add [Venue Name] scraper for [City]"
git push origin main
```

Render will auto-deploy in ~3 minutes.

---

## 📈 **Success Metrics**

### **Goals:**

- **Vancouver:** 500+ events (currently 276)
- **Toronto:** 800+ events (currently ~500)
- **Calgary:** 400+ events (currently ~200)
- **Montreal:** Maintain 1000+ events
- **New York:** Maintain 800+ events

### **Quality Metrics:**

- ✅ 100% of events have valid dates
- ✅ 90%+ of events have images
- ✅ 100% of events have source URLs
- ✅ <5% duplicate events
- ✅ All scrapers have error handling

---

## 🚀 **Quick Start**

### **Want to add a Vancouver venue?**

1. Find the venue's events page
2. Copy `/scrapers/cities/vancouver/commodoreBallroom.js` as template
3. Modify selectors for the new venue
4. Test: `node scrapers/cities/vancouver/newVenue.js`
5. Add to import script
6. Run import
7. Deploy!

### **Want to fix a broken scraper?**

1. Run the scraper: `node scrapers/cities/vancouver/SCRAPER.js`
2. Check console for errors
3. Fix selectors or error handling
4. Test again
5. Deploy!

---

## 💡 **Tips**

### **Finding Selectors:**

1. Open venue website in Chrome
2. Right-click on event → Inspect
3. Find unique CSS selector
4. Test in console: `document.querySelectorAll('YOUR_SELECTOR')`

### **Common Selector Patterns:**

```javascript
// Event containers
'.event-card', '.event-item', 'article', '[class*="event"]'

// Titles
'h2', 'h3', '.title', '.event-title', '[class*="title"]'

// Dates
'.date', '.event-date', 'time', '[datetime]'

// Images
'img[src*="event"]', '.event-image img', '.poster img'

// Links
'a[href*="event"]', '.event-link', '.buy-tickets'
```

---

## 🎯 **Let's Build This!**

**Which city or venue would you like to start with?**

Some good options:
- 🔥 **Vancouver expansion** (add 10 new venues)
- 🔥 **Calgary boost** (needs the most help!)
- 🔥 **Audit existing scrapers** (fix broken ones)
- 🔥 **Add sports teams** (games are consistent data)

**I'm ready to help you build any scraper you want!** 🚀
