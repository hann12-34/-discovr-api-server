# Manchester Scraper Fixing Plan

## Goal
Get from 7 working scrapers to 20+ working scrapers

## Strategy
1. **Test all existing scrapers** (in progress)
2. **Identify "No Events" scrapers** - these are close to working, just need fixing
3. **Fix them one by one** by:
   - Checking actual website structure
   - Updating selectors to match real HTML
   - Testing immediately after each fix
4. **Skip error scrapers** - these have bigger issues (broken URLs, etc.)

## Why This Works Better
- Existing scrapers already have correct URLs and addresses
- Many just need selector updates to match current website structure
- Much faster than creating new scrapers from scratch
- Higher success rate

## Target
- Current: 7 working
- Need: 13 more
- From: "No Events" category (scrapers that load but extract 0 events)

## Next Steps (After Test Completes)
1. Get list of "No Events" scrapers
2. Pick first one
3. Visit actual website
4. Update selectors to match
5. Test immediately
6. Repeat until 20+ working

## Success Criteria
- Each fixed scraper must extract ≥ 1 event
- Must follow all primary rules
- Must have real images from event URLs
- No fallbacks or generators
