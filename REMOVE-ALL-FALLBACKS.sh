#!/bin/bash

# REMOVE ALL DATE FALLBACKS FROM ALL SCRAPERS
# Replaces 'Date TBA', 'TBA', 'TBD', etc. with null

echo "🔧 REMOVING ALL DATE FALLBACKS..."

# Find all JS files with fallbacks
FILES=$(grep -r "date.*TBA\|date.*TBD\|date.*Ongoing\|date.*Coming Soon" scrapers/cities/ --include="*.js" | grep -v ".bak" | cut -d: -f1 | sort -u)

for file in $FILES; do
  echo "  Fixing: $file"
  
  # Backup
  cp "$file" "$file.fallback.bak"
  
  # Replace fallback patterns
  sed -i '' "s/|| 'Date TBA'/|| null/g" "$file"
  sed -i '' "s/|| 'Date TBD'/|| null/g" "$file"
  sed -i '' "s/|| 'Ongoing'/|| null/g" "$file"
  sed -i '' "s/|| 'Coming Soon'/|| null/g" "$file"
  sed -i '' "s/|| \"Date TBA\"/|| null/g" "$file"
  sed -i '' "s/|| \"Date TBD\"/|| null/g" "$file"
  sed -i '' "s/|| \"Ongoing\"/|| null/g" "$file"
  sed -i '' "s/|| \"Coming Soon\"/|| null/g" "$file"
  
  sed -i '' "s/date: 'Date TBA'/date: null/g" "$file"
  sed -i '' "s/date: 'Date TBD'/date: null/g" "$file"
  sed -i '' "s/date: 'Ongoing'/date: null/g" "$file"
  sed -i '' "s/date: 'Coming Soon'/date: null/g" "$file"
  sed -i '' "s/date: \"Date TBA\"/date: null/g" "$file"
  sed -i '' "s/date: \"Date TBD\"/date: null/g" "$file"
  sed -i '' "s/date: \"Ongoing\"/date: null/g" "$file"
  sed -i '' "s/date: \"Coming Soon\"/date: null/g" "$file"
done

echo "✅ Done! Fixed $(echo "$FILES" | wc -l | tr -d ' ') files"
echo ""
echo "Backups saved with .fallback.bak extension"
