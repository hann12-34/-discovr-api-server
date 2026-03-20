# Discovr App — Scraper Date Fixes (Feb 2026)

## Summary

Fixed incorrect, random, and null event dates across Edinburgh and Liverpool scrapers. Events were appearing with wrong dates in the app due to multiple scraper bugs. All fixes are inline — no shared utility dependencies.

---

## Root Causes & Fixes

### 1. Festival Theatre (`scrapers/cities/edinburgh/festival.js`)
- **Bug:** Regex matched `"20"` from the year string `"2026"` as the day number, causing ALL 42 events to get the same incorrect date `2026-02-20`.
- **Fix:** Rewrote scraper to walk DOM elements sequentially, tracking the current date context and associating it with the next event link. Now produces 38 events with correct, varied dates.

### 2. 15 Edinburgh Scrapers — Null Date Events Pushed to DB
- **Bug:** Scrapers pushed events to the array even when no date was extracted (`isoDate = null`), resulting in null `startDate` values in the database.
- **Fix:** Added `if (!isoDate) return;` guard before `events.push()` in: `church_hill.js`, `kings_theatre.js`, `la_belle_angele.js`, `leith_theatre.js`, `o2academy.js`, `playhouse.js`, `pleasance.js`, `queens.js`, `royal_lyceum.js`, `the_stand.js`, `traverse.js`, `tropicana.js`, `usherHall.js`, `voodoo.js`, `bongo.js`.

### 3. Garbage Titles ("Cookies", "TICKETS", "www.capitaltheatres.com")
- **Bug:** Broad CSS selectors caught cookie banners, nav links, and footer elements as "events".
- **Fix:**
  - `bannermans.js` — Added regex filter rejecting "GIGSTORY CHANNEL", "TICKETS", etc.
  - `edinburgh_science_fest.js` — Added filter rejecting "Cookies", "Accept", "Explore our festival", etc.
  - **Import scripts** (`import-all-edinburgh-events.js`, `import-all-liverpool-events.js`) — Added a **STEP 0: Title validation** that rejects garbage titles (too short, too long, URL-like, known junk words, non-alphabetic strings) before any date processing.

### 4. Invisible Wind Factory (`scrapers/cities/liverpool/invisible_wind_factory.js`)
- **Bug:** `let eventDate = new Date()` defaulted to TODAY if date extraction failed, so every failed event got today's date.
- **Fix:** Changed default to `null`, added `if (!eventDate) continue;` to skip events without valid dates. Also fixed `startDate` to use UTC midnight.

### 5. Local-Time startDate Bug (60+ Files, All 3 Cities)
- **Bug:** `startDate` used local-time suffix `T22:00:00` or `T00:00:00` (no Z), causing date shifts depending on server timezone.
- **Fix:** Changed all scrapers to use `T00:00:00.000Z` (UTC midnight) across Birmingham, Edinburgh, and Liverpool.

### 6. Hardcoded Year `'2026'` in 9 Edinburgh Scrapers
- **Bug:** Fallback year was hardcoded as `'2026'` instead of being dynamically calculated.
- **Fix:** Replaced with `new Date().getFullYear()` + month-based year inference (if month < current month, use next year).

### 7. Missing `startDate` Field in 21 Edinburgh Scrapers + 2 Visit Scrapers
- **Bug:** Many scrapers only set `date` (string) but not `startDate` (Date object), causing MongoDB queries on `startDate` to miss these events.
- **Fix:** Added `startDate: new Date(isoDate + 'T00:00:00.000Z')` to all affected scrapers. Also added to `visit_birmingham_events.js` and `visit_liverpool_events.js`.

### 8. XOYO Birmingham (`scrapers/cities/birmingham/xoyo_birmingham.js`)
- **Bug:** Date regex only matched US-style dates (`Month DD, YYYY`), not UK-style (`DD Mon YYYY`).
- **Fix:** Added UK-style regex pattern alongside existing US-style. Fixed year inference and UTC startDate.

### 9. Import Script Safety Net (All 3 Cities)
- **Normalization:** Import scripts (`import-all-birmingham-events.js`, `import-all-edinburgh-events.js`, `import-all-liverpool-events.js`) now normalize `startDate` from the `date` string field if `startDate` is missing.
- **Validation:** Rejects events with past dates or dates more than 18 months in the future.
- **Deduplication:** Deduplicates by URL (if long enough) or by `title + date + venue`.

---

## Files Modified

### Import Scripts
- `ImportFiles/import-all-birmingham-events.js`
- `ImportFiles/import-all-edinburgh-events.js`
- `ImportFiles/import-all-liverpool-events.js`

### Edinburgh Scrapers (25 files)
- `festival.js` (rewritten date extraction)
- `bannermans.js` (title filter + null date guard)
- `edinburgh_science_fest.js` (title filter)
- `church_hill.js`, `kings_theatre.js`, `la_belle_angele.js`, `leith_theatre.js`, `o2academy.js`, `playhouse.js`, `pleasance.js`, `queens.js`, `royal_lyceum.js`, `the_stand.js`, `traverse.js`, `tropicana.js`, `usherHall.js`, `voodoo.js`, `bongo.js` (null date guard)
- 9 scrapers with hardcoded year fix
- 21 scrapers with missing startDate fix
- All scrapers with local-time UTC fix

### Liverpool Scrapers (16 files)
- `invisible_wind_factory.js` (default-to-today bug)
- `visit_liverpool_events.js` (missing startDate + year)
- All scrapers with local-time UTC fix

### Birmingham Scrapers (13 files)
- `xoyo_birmingham.js` (date regex + year + UTC)
- `visit_birmingham_events.js` (missing startDate + year)
- All scrapers with local-time UTC fix

---

## How to Re-scrape

```bash
node ImportFiles/import-all-birmingham-events.js
node ImportFiles/import-all-edinburgh-events.js
node ImportFiles/import-all-liverpool-events.js
```

Check logs for:
- `🚫 Title validation: X garbage events rejected`
- `🔧 Fixed X events missing startDate`
- `🗓️ Date validation: X rejected, Y valid`
- `✨ Removed X duplicates (Y unique)`
