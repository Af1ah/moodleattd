#!/bin/bash

# ============================================================================
# Database Setup Script (Stable Version)
# ============================================================================
# Purpose: Execute all SQL files in order using database URL directly
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

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Moodle Attendance Database Setup & Optimization        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Move to project root
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Load env variables
if [ -f .env.local ]; then
    echo -e "${GREEN}✓${NC} Found .env.local file"

    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
else
    echo -e "${RED}✗ .env.local missing!${NC}"
    exit 1
fi

# -----------------------------
# Validate Connection Variables
# -----------------------------

if [ -z "$DIRECT_DATABASE_URL" ]; then
    echo -e "${RED}✗ DIRECT_DATABASE_URL is missing in .env.local${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Testing database connection...${NC}"
if psql "$DIRECT_DATABASE_URL" -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo -e "${YELLOW}Please check DIRECT_DATABASE_URL in .env.local${NC}"
    exit 1
fi

# -----------------------------
# Create Backup
# -----------------------------
BACKUP_DIR="$PROJECT_ROOT/db_backup"
mkdir -p "$BACKUP_DIR"

echo ""
echo -e "${BLUE}Creating database backup...${NC}"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

if pg_dump "$DIRECT_DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Backup created: $BACKUP_FILE"
else
    echo -e "${YELLOW}⚠ Backup creation failed — continuing anyway${NC}"
fi

# -----------------------------
# Execute SQL Files
# -----------------------------
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
    "apply_performance_indexes.sql"
)

TOTAL_FILES=${#SQL_FILES[@]}
CURRENT=0

for sql in "${SQL_FILES[@]}"; do
    FILEPATH="$SCRIPT_DIR/$sql"
    CURRENT=$((CURRENT + 1))

    echo -e "${BLUE}[$CURRENT/$TOTAL_FILES]${NC} Executing $sql..."

    if [ -f "$FILEPATH" ]; then
        if psql "$DIRECT_DATABASE_URL" -f "$FILEPATH" > /dev/null 2>&1; then
            echo -e "${GREEN}          ✓ Success${NC}"
        else
            echo -e "${RED}          ✗ Failed (see error above)${NC}"
        fi
    else
        echo -e "${RED}          ✗ Missing file: $FILEPATH${NC}"
    fi
done

# -----------------------------
# Run Verification
# -----------------------------
echo ""
echo -e "${BLUE}Running verification checks...${NC}"

VERIFY="$SCRIPT_DIR/99_verify_setup.sql"

if [ -f "$VERIFY" ]; then
    psql "$DIRECT_DATABASE_URL" -f "$VERIFY" > verification_results.txt 2>&1
    echo -e "${GREEN}✓${NC} Verification completed (see verification_results.txt)"
else
    echo -e "${YELLOW}⚠ verification file missing${NC}"
fi

# -----------------------------
# Summary
# -----------------------------
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     Setup Complete!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "📊 Summary:"
echo "  • SQL scripts executed: $CURRENT/$TOTAL_FILES"
echo "  • Backup file: $BACKUP_FILE"
echo "  • Verification: verification_results.txt"

echo ""
echo "📋 Next Steps:"
echo "  • Review verification_results.txt"
echo "  • Set up cron jobs for DB maintenance"
echo "  • Refresh materialized views routinely"
echo ""
