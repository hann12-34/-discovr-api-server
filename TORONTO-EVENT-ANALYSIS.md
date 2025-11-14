# Toronto Event Count Analysis

## 🚨 **THE PROBLEM**

Toronto has **SIGNIFICANTLY FEWER** events compared to other cities:

| City | Working Scrapers | Raw Events | Valid Events |
|------|------------------|------------|--------------|
| **New York** | 43 | 471 | ~471 |
| **Vancouver** | 28 | 419 | 398 |
| **Toronto** | 32 | 168 | ~150 |

**Toronto has 3x FEWER events than New York and 2.5x FEWER than Vancouver!**

---

## 🔍 **ROOT CAUSES**

### **1. Empty Nightlife Scrapers (MAJOR ISSUE)**

Toronto has **26 nightlife scrapers** but most return **0 events**:

❌ **Empty Nightlife Venues:**
- scrape-rebel-nightclub-events.js → 0 events
- scrape-coda-nightclub-events.js → 0 events  
- scrape-cube-nightclub-events.js → ERROR (site down)
- scrape-nest-nightclub-events.js → 0 events
- scrape-noir-nightclub-events.js → 0 events
- scrape-stories-nightclub-events.js → 0 events
- scrape-toybox-nightclub-events.js → 0 events
- scrape-mod-club-events.js → 0 events
- scrape-lula-lounge-events.js → 0 events
- scrape-cloak-bar-events.js → 0 events
- scrape-dive-bar-events.js → 0 events
- scrape-get-well-bar-events.js → 0 events
- scrape-handlebar-events.js → 0 events
- scrape-reservoir-lounge-events.js → 0 events
- scrape-tranzac-club-events.js → 0 events
- And 10+ more...

✅ **Only 2-3 working:**
- horseshoeTavern.js → 6 events ✅
- scrape-now-magazine-nightlife.js → 13 events ✅
- A few others with minimal events

### **2. Missing Festival Scrapers**

- Only 1 festival scraper (Fringe) → 0 events
- Vancouver has multiple working festival scrapers
- New York has dozens of festival/event aggregators

### **3. Missing Event Aggregators**

New York and Vancouver have multiple aggregators:
- **NY:** Bowery Presents, Brooklyn Vegan, Time Out NYC
- **Vancouver:** do604, Georgia Straight, Vancouver's Best Places

**Toronto has:** BlogTO (broken - 404 error)

### **4. Over-Aggressive Filtering**

Some scrapers are filtering out valid events with NULL dates or other issues that could be fixed.

---

## 💡 **SOLUTION PLAN**

### **IMMEDIATE FIXES (High Impact):**

#### **1. Fix BlogTO (Major Toronto Aggregator)**
- **Current Status:** Returns 404 error
- **Fix:** Update URL or scraping method
- **Expected Impact:** +50-100 events

#### **2. Fix Top Nightlife Venues**
Priority nightlife venues to fix (based on popularity):
1. **Rebel** (Cabana, Copacabana) - Major nightclub
2. **CODA** - Popular electronic music venue
3. **Mod Club** - Well-known concert venue
4. **Nest** - Nightclub
5. **Noir** - Nightclub
6. **Stories** - Nightclub
7. **Toybox** - Nightclub
8. **Lula Lounge** - Latin music venue

**Fix Strategy:**
- Check if websites changed
- Update selectors
- Add fallback scraping methods

**Expected Impact:** +100-150 nightlife events

#### **3. Add Major Toronto Event Aggregators**
Create scrapers for:
1. **NOW Magazine Events** (beyond just nightlife)
   - https://nowtoronto.com/events
   - Expected: +50-80 events

2. **BlogTO Events** (fix existing)
   - https://www.blogto.com/events
   - Expected: +80-120 events

3. **Toronto.com Events**
   - https://www.toronto.com/events
   - Expected: +40-60 events

4. **Eventbrite Toronto**
   - Major event platform
   - Expected: +100+ events

#### **4. Add Festival Scrapers**
Key Toronto festivals:
1. **Toronto International Film Festival (TIFF)**
   - Already have TIFF Bell Lightbox, expand to full festival
   - Expected: +30-50 events

2. **Canadian Music Week**
   - https://www.cmw.net
   - Expected: +50-100 events

3. **Nuit Blanche Toronto**
   - https://www.toronto.ca/explore-enjoy/festivals-events/nuitblanche/
   - Expected: +20-40 events

4. **Pride Toronto**
   - https://www.pridetoronto.com
   - Expected: +30-60 events

5. **Toronto Jazz Festival**
   - Expected: +20-40 events

#### **5. Add Missing Major Venues**
1. **The Drake Hotel** - Major live music venue
2. **The Danforth Music Hall** - Concert venue
3. **Lee's Palace** - Already have scraper but returns 0
4. **The Opera House** - Concert venue
5. **Velvet Underground** - Nightclub/concert venue
6. **Sneaky Dee's** - Live music bar

**Expected Impact:** +80-120 events

---

## 📊 **EXPECTED RESULTS**

| Fix | Expected Events |
|-----|----------------|
| Fix BlogTO | +80-120 |
| Fix 8 nightlife venues | +100-150 |
| Add NOW Magazine full events | +50-80 |
| Add Toronto.com | +40-60 |
| Add Eventbrite Toronto | +100+ |
| Add 5 festivals | +150-290 |
| Add 6 missing venues | +80-120 |
| **TOTAL** | **+600-920 events** |

**Target:** Toronto should have **750-1000+ events** (matching NYC and Vancouver)

---

## 🎯 **PRIORITY ORDER**

### **Phase 1: Quick Wins** (1-2 hours)
1. Fix BlogTO URL/scraper
2. Add NOW Magazine full events (not just nightlife)
3. Add Toronto.com scraper
4. Check and fix Rebel, CODA, Mod Club websites

**Expected Impact:** +200-300 events

### **Phase 2: Event Aggregators** (2-3 hours)
1. Add Eventbrite Toronto scraper
2. Add Ticketmaster Toronto scraper
3. Expand existing venue scrapers

**Expected Impact:** +150-250 events

### **Phase 3: Festivals & Venues** (3-4 hours)
1. Add 5 major festival scrapers
2. Add 6 missing major venue scrapers
3. Fix all broken nightlife scrapers

**Expected Impact:** +300-400 events

---

## 🔧 **TECHNICAL NOTES**

### **Why Nightlife Scrapers Return 0:**

Common issues:
1. **Website redesigns** - Selectors no longer work
2. **JavaScript-heavy sites** - Need Puppeteer/headless browser
3. **Event calendars behind login/age gates**
4. **Using Instagram/Facebook for events** (not scrapable)
5. **No dedicated events page**

### **Solutions:**
- Update universal scraper template with better fallbacks
- Add Puppeteer support for JS-heavy sites
- Check social media integration
- Add manual venue event feeds where available

---

## ✅ **NEXT STEPS**

1. Run diagnostic on all empty nightlife scrapers
2. Check which websites are still active
3. Implement Phase 1 fixes
4. Test and measure impact
5. Continue with Phase 2 & 3

---

**Created:** November 12, 2025  
**Issue:** Toronto has 3x fewer events than comparable cities  
**Root Cause:** Broken nightlife scrapers, missing aggregators, missing festivals  
**Target:** 750-1000+ events (up from ~150)
