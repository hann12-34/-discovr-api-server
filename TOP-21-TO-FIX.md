# 🎯 TOP 21 SCRAPERS TO FIX - PATH TO 50

## Current: 29 working | Target: 50 | Need: 21 more

---

## **TIER 1: PUPPETEER WORKING BUT TIMEOUT (3 scrapers)**
These work but need longer timeout in production:

1. **commodoreBallroom.js** - 56 events (Puppeteer, working but times out at 15s)
2. **orpheum.js** - Working Puppeteer scraper
3. **rickshawTheatre.js** - Working Puppeteer scraper

**Action:** Already working, just need production timeout config
**Expected:** +3 scrapers, +70+ events

---

## **TIER 2: HIGH-VALUE VENUES (10 scrapers)**
Major venues worth manual selector fixes:

4. **biltmoreCabaret.js** - Popular music venue
5. **mediaClub.js** - Music venue (11 events found, NULL dates)
6. **studioTheatre.js** - Theatre
7. **playhouse.js** - Vancouver Playhouse Theatre
8. **gatewayTheatre.js** - Gateway Theatre
9. **centennialTheatre.js** - North Van theatre
10. **surreyCivicTheatres.js** - Multiple Surrey theatres
11. **waterfrontTheatre.js** - Granville Island
12. **pacificTheatre.js** - Theatre (9 events found, NULL dates)
13. **vancouverOpera.js** - Opera company (14 events found, NULL dates)

**Action:** Visit websites, find correct selectors, fix date extraction
**Expected:** +7-10 scrapers (some may be inactive), +30-60 events

---

## **TIER 3: CULTURAL ATTRACTIONS (5 scrapers)**

14. **scienceWorld.js** - Major attraction
15. **granvilleIsland.js** - Tourist hub
16. **canadaPlace.js** - Convention centre
17. **richmondNightMarket.js** - Seasonal event
18. **shipyardsNightMarket.js** - Seasonal event

**Action:** Check if they have accessible calendars, fix if available
**Expected:** +2-3 scrapers, +10-20 events

---

## **TIER 4: FESTIVALS & EVENTS (3 scrapers)**

19. **bardOnTheBeach.js** - Major Shakespeare festival
20. **coastalJazz.js** - TD Jazz Festival
21. **dineOutVancouver.js** - Major food festival

**Action:** Check festival dates, seasonal availability
**Expected:** +1-2 scrapers (seasonal), +5-15 events

---

## **EXECUTION PLAN:**

### **Phase 1: Quick Wins (5 mins)**
- Add commodoreBallroom, orpheum, rickshawTheatre to working list
- **Gain: +3 scrapers**

### **Phase 2: Fix High-Value Venues (30-45 mins)**
- Manually inspect and fix top 10 venues
- Test each one after fixing
- **Gain: +7-10 scrapers**

### **Phase 3: Cultural & Festivals (20-30 mins)**
- Check remaining 8 scrapers
- Fix what's fixable
- **Gain: +3-5 scrapers**

### **TOTAL EXPECTED:**
- **Conservative:** +13 scrapers = 42 total (84% of target)
- **Realistic:** +18 scrapers = 47 total (94% of target)
- **Optimistic:** +21 scrapers = 50 total (100% of target!)

---

## **LET'S GO NOW! 🔥**

Starting with Tier 1 (Puppeteer scrapers that already work)...
