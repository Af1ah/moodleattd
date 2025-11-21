#!/bin/bash

# ============================================================================
# Database Setup Script
# ============================================================================
# Purpose: Execute all SQL files in the correct order
# Usage: ./setup_database.sh
# ============================================================================

set -e  # Exit on error

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Moodle Attendance Database Setup & Optimization        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Change to project root directory (one level up from script location)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check if .env.local exists and load database credentials
if [ -f .env.local ]; then
    echo -e "${GREEN}✓${NC} Found .env.local file"
    export $(cat .env.local | grep -v '^#' | xargs)
    
    # Extract database credentials from DATABASE_URL
    # Format: postgresql://user:password@host:port/database
    if [ -n "$DATABASE_URL" ]; then
        DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
        DB_PASS=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')
    fi
else
    echo -e "${YELLOW}⚠${NC}  .env.local not found. Please enter database credentials:"
fi

# Prompt for database credentials if not set
if [ -z "$DB_USER" ]; then
    read -p "Database user: " DB_USER
fi

if [ -z "$DB_NAME" ]; then
    read -p "Database name: " DB_NAME
fi

if [ -z "$DB_HOST" ]; then
    read -p "Database host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
fi

if [ -z "$DB_PORT" ]; then
    read -p "Database port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
fi

# Test database connection
echo ""
echo -e "${BLUE}Testing database connection...${NC}"
if PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}✗${NC} Database connection failed"
    echo -e "${YELLOW}Please check your credentials and try again${NC}"
    exit 1
fi

# Create backup directory
BACKUP_DIR="$PROJECT_ROOT/db_backup"
mkdir -p "$BACKUP_DIR"

# Create backup
echo ""
echo -e "${BLUE}Creating database backup...${NC}"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
if PGPASSWORD=$DB_PASS pg_dump -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME > "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Backup created: $BACKUP_FILE"
else
    echo -e "${YELLOW}⚠${NC}  Backup creation failed (continuing anyway)"
fi

# Execute SQL files
echo ""
echo -e "${BLUE}Executing SQL scripts...${NC}"
echo ""

SQL_FILES=(
    "00_indexes_attendance.sql"
    "01_indexes_users_cohorts_roles.sql"
    "02_create_cohort_role_assignments.sql"
    "03_migration_add_selected_courses.sql"
    "04_performance_optimization.sql"
    "05_add_admission_year_field.sql"
    "06_create_semester_dates_table.sql"
)

TOTAL_FILES=${#SQL_FILES[@]}
CURRENT=0

for sql_file in "${SQL_FILES[@]}"; do
    sql_file="$SCRIPT_DIR/$sql_file"
    CURRENT=$((CURRENT + 1))
    if [ -f "$sql_file" ]; then
        echo -e "${BLUE}[$CURRENT/$TOTAL_FILES]${NC} Executing $(basename $sql_file)..."
        if PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f "$sql_file" > /dev/null 2>&1; then
            echo -e "${GREEN}          ✓${NC} Success"
        else
            echo -e "${RED}          ✗${NC} Failed (check errors above)"
            echo -e "${YELLOW}          Continuing with next file...${NC}"
        fi
    else
        echo -e "${RED}          ✗${NC} File not found: $sql_file"
    fi
done

# Run verification
echo ""
echo -e "${BLUE}Running verification checks...${NC}"
if [ -f "$SCRIPT_DIR/99_verify_setup.sql" ]; then
    PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f "$SCRIPT_DIR/99_verify_setup.sql" > verification_results.txt 2>&1
    echo -e "${GREEN}✓${NC} Verification complete. Results saved to: verification_results.txt"
else
    echo -e "${YELLOW}⚠${NC}  Verification file not found"
fi

# Summary
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "📊 Summary:"
echo "  • SQL scripts executed: $CURRENT/$TOTAL_FILES"
echo "  • Backup created: $BACKUP_FILE"
echo "  • Verification results: verification_results.txt"
echo ""
echo "📋 Next Steps:"
echo "  1. Review verification_results.txt for any issues"
echo "  2. Set up cron jobs for maintenance (see db/README.md)"
echo "  3. Refresh materialized views:"
echo "     SELECT refresh_attendance_materialized_views();"
echo ""
echo -e "${YELLOW}⚠  Important Reminders:${NC}"
echo "  • Schedule daily VACUUM ANALYZE tasks"
echo "  • Refresh materialized views hourly during school hours"
echo "  • Monitor index usage with pg_stat_user_indexes"
echo ""
