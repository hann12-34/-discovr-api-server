# 🎯 AGGRESSIVE FIX PLAN - ROAD TO 100%

## Strategy: Fix EVERYTHING that can be fixed

### **Phase 1: Quick Wins (5 mins)** ⚡
Fix scrapers with simple issues:
- [x] do604.js - module.exports ✅
- [x] madeInThe604.js - module.exports ✅  
- [x] foxCabaret.js - filterEvents import ✅
- [x] granvilleIslandBrewing.js - duplicate dateSelectors ✅
- [x] pneEvents.js - duplicate dateSelectors ✅
- [x] queenElizabethTheatre.js - early return + syntax ✅

### **Phase 2: High-Value Venues (30 mins)** 🔧
**Target: +15-20 scrapers**

Fix major venues one by one:
1. [ ] biltmoreCabaret.js - Already has good structure
2. [ ] mediaClub.js - Already has good structure  
3. [ ] studioTheatre.js - Already has good structure
4. [ ] granvilleIsland.js - Popular tourist spot
5. [ ] vancouverSymphony.js - Major arts venue (user has it open!)
6. [ ] vancouverOpera.js - Arts venue
7. [ ] pacificTheatre.js - Theatre
8. [ ] sidWilliamsTheatre.js - Theatre
9. [ ] theCultch.js - Has static event list
10. [ ] bcPlace.js - Stadium
11. [ ] pacificColiseum.js - Arena
12. [ ] scienceWorld.js - Major attraction
13. [ ] balletBC.js - Dance company
14. [ ] firehallArtsCentre.js - Already working (3 events)
15. [ ] gatewayTheatre.js - Theatre
16. [ ] artsClubTheatre.js - Theatre
17. [ ] centennialTheatre.js - Theatre
18. [ ] surreyCivicTheatres.js - Theatres
19. [ ] coqParkTheatre.js - Theatre
20. [ ] royalTheatreVictoria.js - Victoria venue

### **Phase 3: Medium Priority (20 mins)** 📊
**Target: +10-15 scrapers**

Venues with potential:
1. [ ] bellPerformingArtsCentre.js - Already working (2 events)
2. [ ] squamishArts.js - Already working (7 events)
3. [ ] chanCentre.js - Already working (8 events)
4. [ ] ubcChanCentre.js - Already working (2 events)
5. [ ] museumOfAnthropology.js - UBC museum
6. [ ] billReidGallery.js - Art gallery
7. [ ] littleMountainGallery.js - Gallery
8. [ ] maritimeMuseumEvents.js - Museum
9. [ ] hrMacMillanSpaceCentreEvents.js - Space centre
10. [ ] capilanoSuspensionBridge.js - Tourist attraction
11. [ ] grouseMountain.js - Ski resort
12. [ ] seaToSkyGondola.js - Gondola
13. [ ] vandusenGarden.js - Already working (1 event)
14. [ ] vanierPark.js - Park events
15. [ ] canadaPlace.js - Convention centre

### **Phase 4: Festivals & Events (15 mins)** 🎉
**Target: +5-10 scrapers**

Festival scrapers:
1. [ ] pushFestival.js
2. [ ] queerArtsFestival.js
3. [ ] coastalJazz.js
4. [ ] vancouverPride.js
5. [ ] bardOnTheBeach.js
6. [ ] dineOutVancouver.js
7. [ ] khatsahlanoEvents.js
8. [ ] cultureCrawlEvents.js
9. [ ] hondaCelebrationOfLight.js
10. [ ] richmondNightMarket.js

### **Phase 5: Aggregators & Lists (10 mins)** 📰
**Target: +5 scrapers**

More aggregators:
1. [ ] vancouverIsAwesome.js
2. [ ] dailyHiveVancouver.js
3. [ ] todoCanada.js
4. [ ] yaletownInfo.js
5. [ ] broadwayVancouver.js

### **Phase 6: Accept Reality** ⚠️
These won't work (external ticketing, closed, etc):
- rickshawTheatre.js - Puppeteer $element issue
- vogueTheatre.js - External ticketing
- orpheum.js - Might already work
- commodoreBallroom.js - Might already work
- fortuneSoundClub.js - Might already work
- Many nightclubs/bars with no event calendars

---

## **EXECUTION PLAN:**

### **Step 1: Test Current Baseline** (running now)
- Get exact count of working scrapers
- Identify which are already working

### **Step 2: Batch Fix Simple Issues**
- Fix all module.exports issues
- Fix all filterEvents imports
- Fix all syntax errors

### **Step 3: Manual Fix High-Value**
- One by one, test and fix each major venue
- Focus on getting dates extracted properly
- Aim for 40+ working scrapers

### **Step 4: Final Push**
- Fix remaining fixable scrapers
- Accept some won't work
- Aim for 60-70 working scrapers (40-50%)

---

## **TOOLS TO USE:**

1. Quick test individual: `node -e "require('./scrapers/cities/vancouver/X.js')('vancouver').then(console.log)"`
2. Mass test: `node QUICK-COUNT-WORKING.js`
3. Full import: `node FINAL-ALL-CITIES-ZERO-NULLS.js`

---

## **TARGET NUMBERS:**

- **Minimum**: 40 working (27%)
- **Target**: 50 working (34%) 
- **Stretch**: 60 working (40%)
- **Dream**: 70+ working (47%+)

**LET'S GO! 🚀**
