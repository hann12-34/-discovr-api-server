# Toronto Events - Complete Analysis & Action Plan

## 📊 **CURRENT STATUS**

**Toronto Results (Nov 12, 2025):**
- **142 valid events** (from 167 raw, after filtering)
- **32 working scrapers** out of 204 total
- **135.8 seconds** to scrape all

**Comparison:**
- New York: **471 events** (3.3x more) ✅
- Vancouver: **398 events** (2.8x more) ✅
- Toronto: **142 events** ❌

**Gap: Toronto needs 250-350+ more events**

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **1. Broken Major Aggregator:**
- ❌ **BlogTO** - Returns 404 error on `/nightlife/` URL
  - This should be Toronto's biggest event source
  - Expected: 80-120 events

### **2. Empty Nightlife Scrapers:**
Most nightlife venues return 0 events:
- ❌ Rebel, CODA (only 6), Nest, Noir, Stories, Toybox
- ❌ Mod Club, Lula Lounge, Get Well, Dive Bar
- ❌ Most bar/club scrapers return 0

**Why:**
- Websites use JavaScript/React (need Puppeteer)
- Events listed on social media only (Instagram/Facebook)
- Website structures changed since scrapers were written
- Some venues may genuinely have no upcoming events listed

### **3. Limited Festival Coverage:**
- Only 1 festival scraper (Fringe) → Returns 0 events
- Missing: TIFF, Pride, CMW, Jazz Festival, Nuit Blanche

### **4. Missing Major Venues:**
- No Drake Hotel scraper (created but returns 0)
- No Danforth Music Hall scraper (created but returns 0)
- No Lee's Palace events (scraper exists but broken)
- No Opera House
- Many other major venues missing

---

## ✅ **WHAT'S WORKING WELL**

### **Top Event Sources:**
1. **Aga Khan Museum** → 20 events (exhibitions)
2. **George Brown College** → 14 events
3. **NOW Magazine** → 13 events (nightlife only)
4. **Justina Barnicke Gallery** → 11 events
5. **Harbourfront Centre** → 8 events

### **Working Nightlife:**
- Horseshoe Tavern → 6 events ✅
- NOW Magazine nightlife → 13 events ✅
- Reservoir Lounge → 1 event

---

## 🚀 **ACTIONABLE SOLUTIONS**

### **PRIORITY 1: Fix BlogTO (HIGH IMPACT)**

**Problem:** URL returns 404
```javascript
// Current (BROKEN):
'https://www.blogto.com/nightlife/' // → 404 error

// Should be:
'https://www.blogto.com/events/'  // Main events page
```

**Action:** Update BlogTO scraper to use correct URLs and scrape from events calendar

**Expected Impact:** +80-120 events

---

### **PRIORITY 2: Expand NOW Magazine (QUICK WIN)**

**Current:** Only scraping nightlife section (13 events)

**Action:** Expand to scrape ALL events, not just nightlife
- URL: https://nowtoronto.com/events
- Categories: Music, Arts, Theatre, Food, etc.

**Expected Impact:** +50-80 events

---

### **PRIORITY 3: Add Toronto.com Scraper (MEDIUM EFFORT)**

**New scraper needed**
- URL: https://www.toronto.com/things-to-do/
- Official local events listing

**Expected Impact:** +40-60 events

---

### **PRIORITY 4: Add See Tickets Toronto**

**New scraper needed**
- URL: https://www.seetickets.us/venue/toronto
- Ticket vendor with comprehensive venue listings
- NOT a competitor (they're a ticket seller, not event discovery)

**Expected Impact:** +50-80 events

---

### **PRIORITY 5: Add Festival Scrapers (SEASONAL)**

When in season, these add massive event counts:

1. **TIFF** (September)
   - https://www.tiff.net/events
   - +200-400 festival events

2. **Pride Toronto** (June)
   - https://www.pridetoronto.com/events/
   - +100-150 events

3. **Toronto Jazz Festival** (June-July)
   - https://torontojazz.com/
   - +150-250 concerts

4. **Canadian Music Week** (May)
   - https://cmw.net/festival/schedule/
   - +100-200 events

---

## 🎯 **REALISTIC TARGETS**

### **Phase 1: Fix Existing (1-2 hours)**
1. Fix BlogTO URL → +80-120 events
2. Expand NOW Magazine → +50-80 events
3. Fix date parsing (11 events currently skipped) → +11 events

**Phase 1 Total: +141-211 events**
**New Total: 283-353 events** ✅

### **Phase 2: Add Aggregators (2-3 hours)**
1. Add Toronto.com → +40-60 events
2. Add See Tickets → +50-80 events
3. Add Destination Toronto → +30-50 events

**Phase 2 Total: +120-190 events**
**New Total: 403-543 events** ✅✅

### **Phase 3: Venue Deep Dive (3-5 hours)**
- Investigate why major venues return 0
- May need Puppeteer for JS-heavy sites
- May need to accept some venues just don't list online

**Phase 3 Total: +50-100 events**
**Final Total: 450-650 events** 🎯

---

## ⚠️ **IMPORTANT CONSTRAINTS**

### **Cannot Use:**
- ❌ Eventbrite (competitor)
- ❌ Songkick (competitor)
- ❌ Bandsintown (competitor)
- ❌ Meetup (competitor)

### **Can Use:**
- ✅ Venue websites directly
- ✅ Festival websites directly
- ✅ Local media (NOW, BlogTO, Toronto.com)
- ✅ Tourism sites (Destination Toronto)
- ✅ Ticket vendors (See Tickets, Ticketmaster venues)

---

## 📋 **NEXT IMMEDIATE ACTIONS**

1. **Fix BlogTO scraper** (30 min)
   - Update URLs
   - Test and verify

2. **Expand NOW Magazine** (20 min)
   - Scrape full events section
   - Not just nightlife

3. **Create Toronto.com scraper** (45 min)
   - New scraper from scratch
   - Test and integrate

4. **Fix date parsing** (15 min)
   - Handle "NOV 13 – 15, 2025" format from TSO
   - Recover 11 lost events

**Total Time: ~2 hours**
**Expected Result: 280-350+ events**

---

## 💭 **REALITY CHECK: Nightlife**

Many Toronto nightlife venues don't maintain online event calendars:
- They use Instagram/Facebook exclusively
- They book week-by-week
- They're DJ residencies (same weekly schedule)

**This is NORMAL for nightlife**

**Solution:** Focus on:
- Local media listings (NOW, BlogTO)
- Venues that DO maintain calendars (Horseshoe, Drake, Danforth)
- Accept we can't scrape Instagram/Facebook

---

## ✅ **SUCCESS CRITERIA**

**Minimum Target:** 300+ events (2x current)
**Good Target:** 400+ events (3x current, close to Vancouver)
**Stretch Target:** 500+ events (matches NYC scale)

**Given constraints (no Eventbrite/Songkick), realistic target is 350-450 events**

---

**Status:** Analysis Complete  
**Priority:** Fix BlogTO + Expand NOW Magazine  
**Timeline:** Can achieve 300+ events in 2-3 hours of work  
**Blockers:** None - all fixes are straightforward
