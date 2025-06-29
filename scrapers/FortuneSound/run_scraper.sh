#!/bin/bash
# Fortune Sound Club Scraper Runner
# This script runs both the scraper and MongoDB conversion in sequence

# Navigate to the script directory
cd "$(dirname "$0")"

# Setup virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run the scraper
echo "Running Fortune Sound Club event scraper..."
python fortune_scraper.py

# Check if the scraper was successful
if [ $? -ne 0 ]; then
    echo "Scraper failed, exiting."
    exit 1
fi

# Convert to MongoDB format
echo "Converting events to MongoDB format..."
python mongo_integration.py

echo "Done! Events have been scraped and converted to MongoDB format."
echo "Files created:"
echo "- fortune_events.json (raw scraped data)"
echo "- fortune_events_mongodb.json (formatted for MongoDB)"
