#!/bin/bash
BACKUP_FILE="dtektracking_backup_$(date +%Y%m%d_%H%M%S).sql"
export PGPASSWORD='T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s'

echo "-- DTekTracking Database Backup" > "$BACKUP_FILE"
echo "-- Created: $(date)" >> "$BACKUP_FILE"
echo "-- Database: dtektracking" >> "$BACKUP_FILE"
echo "" >> "$BACKUP_FILE"

# Get all table names
TABLES=$(psql -h postgres.dtekai.com -p 5432 -U postgres -d dtektracking -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")

for table in $TABLES; do
    echo "Backing up table: $table"
    echo "" >> "$BACKUP_FILE"
    echo "-- Table: $table" >> "$BACKUP_FILE"
    
    # Get CREATE TABLE statement
    psql -h postgres.dtekai.com -p 5432 -U postgres -d dtektracking -c "\\d+ $table" >> "$BACKUP_FILE" 2>&1
    
    # Get row count
    COUNT=$(psql -h postgres.dtekai.com -p 5432 -U postgres -d dtektracking -t -c "SELECT COUNT(*) FROM $table;")
    echo "-- Rows: $COUNT" >> "$BACKUP_FILE"
    echo "" >> "$BACKUP_FILE"
done

echo "Backup completed: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"
