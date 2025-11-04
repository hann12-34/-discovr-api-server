# 🎯 ACTION PLAN: Reach 50+ Working Scrapers

## 📊 Current Status (Confirmed)

### **Working Scrapers: 18-20** ✅
Top performers:
- do604.js: 107 events
- madeInThe604.js: 31 events
- vancouversBestPlaces.js: 16 events
- theRoxy.js: 15 events
- vancouverArtGallery.js: 13 events
- fringeFestivalEvents.js: 11 events
- whistlerFilmFestival.js: 11 events
- vancouverWritersFest.js: 11 events
- rogersArena.js: 9 events
- mansionClub.js: 8 events
- commodoreBallroom.js: 45 events
- fortuneSoundClub.js: 39 events
- orpheum.js: 77 events
- +5-7 more

### **Total Events: ~250-300** clean events

---

## 🎯 Target: 50-60 Working Scrapers

**Need to fix: 30-40 more scrapers**

---

## 📋 Three-Tier Strategy

### **TIER 1: Quick Wins (Target: +10 scrapers)** ⚡
**High-value venues that just need selector updates**

Priority list:
1. rickshawTheatre.js - Major music venue
2. biltmoreCabaret.js - Popular nightclub
3. foxCabaret.js - Concert venue
4. granvilleIsland.js - Tourist hub
5. mediaClub.js - Music venue
6. theCultch.js - Theatre venue
7. queenElizabethTheatre.js - Major theatre
8. sidWilliamsTheatre.js - Theatre
9. pacificTheatre.js - Theatre
10. studioTheatre.js - Theatre

**Action:** Update selectors + test each manually

---

### **TIER 2: Medium Effort (Target: +15 scrapers)** 🔧
**Venues with changed websites or need custom logic**

Priority list:
1. vancouverSymphony.js - Major arts venue
2. vancouverOpera.js - Arts venue
3. bcPlace.js - Stadium
4. pacificColiseum.js - Arena
5. scienceWorld.js - Major attraction
6. museumOfAnthropology.js - Museum
7. granvilleIslandBrewing.js - Brewery events
8. balletBC.js - Dance company
9. firehallArtsCentre.js - Arts venue
10. gatewayTheatre.js - Theatre
11. artsClubTheatre.js - Theatre
12. centennialTheatre.js - Theatre
13. surreyCivicTheatres.js - Theatres
14. coqParkTheatre.js - Theatre
15. royalTheatreVictoria.js - Victoria venue

**Action:** Inspect each website + custom scraping logic

---

### **TIER 3: Accept Reality (Low Priority)** ⚠️
**Venues unlikely to yield results**

Reasons:
- Closed/moved venues
- External ticketing only (Ticketmaster, Eventbrite)
- No event calendars on website
- Inactive organizations
- Festival that ended

Examples:
- michaelJFoxTheatre.js (site issues)
- museumOfVancouver.js (redirect issues)
- vancouverAquarium.js (no events page)
- Many small festivals
- Inactive community centers

---

## 🚀 Implementation Plan

### **Phase 1: Tier 1 Quick Wins (1-2 hours)**
For each venue:
1. Test current scraper
2. Visit website manually
3. Identify event selectors using browser DevTools
4. Update scraper selectors
5. Add enhanced date extraction
6. Test and verify

**Expected result: 10 more working scrapers → 30 total**

---

### **Phase 2: Tier 2 Medium Effort (2-3 hours)**
For each venue:
1. Analyze website structure
2. Identify if events are:
   - Static HTML
   - JavaScript-rendered
   - Behind API calls
3. Implement appropriate scraping method:
   - Cheerio for static
   - Puppeteer for JS
   - Axios for APIs
4. Custom date extraction per venue
5. Test and verify

**Expected result: 15 more working scrapers → 45 total**

---

### **Phase 3: Optimization (30 mins)**
1. Run full database import
2. Verify 0 NULL dates
3. Remove remaining duplicates
4. Count final events

**Expected result: 500-700 clean events**

---

## 📈 Success Metrics

### **Minimum Success (50 scrapers):**
- 50 working scrapers (33% coverage)
- 500+ clean events
- 0 NULL dates
- 0 junk
- All major venues covered

### **Target Success (60 scrapers):**
- 60 working scrapers (40% coverage)
- 600+ clean events
- Top 30 Vancouver venues all working

### **Stretch Goal (75 scrapers):**
- 75 working scrapers (50% coverage)
- 750+ clean events
- Most active venues covered

---

## ⚡ Next Immediate Actions

**RIGHT NOW:**
1. ✅ Verify current baseline (FINAL-ALL-CITIES script running)
2. 🔧 Start Tier 1: Fix rickshawTheatre.js as test case
3. 🔧 Apply same pattern to other Tier 1 venues
4. 📊 Re-test after each batch of 5 fixes

**AUTOMATE WHERE POSSIBLE:**
- Create template for common venue types
- Batch-apply selector updates
- Automated testing after changes

---

## 🎯 Let's Go!

**Starting with Tier 1, targeting 10 quick wins to reach 30 working scrapers!**
