#!/bin/bash

# MongoDB Backup Script for Discovr
# This script creates a backup of your MongoDB database

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="discovr_backup_$DATE"

# Ensure the backup directory exists
mkdir -p $BACKUP_DIR

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    source <(grep -v '^#' .env | sed -E 's/(.*)=(.*)/export \1="\2"/g')
fi

# Default to localhost if MONGODB_URI is not set
MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017/discovr"}

# Extract database name from URI
DB_NAME=$(echo $MONGODB_URI | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "==== MongoDB Backup ===="
echo "Creating backup of database: $DB_NAME"
echo "Backup location: $BACKUP_DIR/$BACKUP_FILENAME"

# Create the backup
if command -v mongodump &> /dev/null; then
    # Use mongodump if available
    mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_FILENAME"
    
    # Archive the backup into a compressed file
    cd $BACKUP_DIR
    tar -czf "${BACKUP_FILENAME}.tar.gz" $BACKUP_FILENAME
    rm -rf $BACKUP_FILENAME
    
    echo "Backup completed successfully: ${BACKUP_DIR}/${BACKUP_FILENAME}.tar.gz"
    echo "To restore this backup, use:"
    echo "tar -xzf ${BACKUP_FILENAME}.tar.gz"
    echo "mongorestore --uri=\"$MONGODB_URI\" $BACKUP_FILENAME"
else
    echo "ERROR: mongodump command not found."
    echo "Please install MongoDB tools to use this backup script."
    exit 1
fi

# Manage backup retention (keep last 5 backups)
echo "Managing backup retention (keeping last 5 backups)"
cd $BACKUP_DIR
ls -1t *.tar.gz | tail -n +6 | xargs -r rm

echo "Backup process completed."
