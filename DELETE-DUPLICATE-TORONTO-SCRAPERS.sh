#!/bin/bash

# DELETE TORONTO SCRAPERS THAT ALL SCRAPE THE SAME URL

echo "🗑️  DELETING DUPLICATE TORONTO SCRAPERS..."

# Find all scrapers using nowtoronto.com/events (they're all duplicates)
FILES=$(grep -l "nowtoronto.com/events" scrapers/cities/Toronto/*.js)

COUNT=0
for file in $FILES; do
  echo "  Deleting: $(basename $file)"
  rm "$file"
  COUNT=$((COUNT + 1))
done

echo ""
echo "✅ Deleted $COUNT duplicate scrapers"
echo ""
echo "Remaining Toronto scrapers:"
ls scrapers/cities/Toronto/*.js 2>/dev/null | wc -l
