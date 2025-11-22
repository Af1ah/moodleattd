#!/bin/bash

# Interactive Semester Auto-Generator
# This script helps you auto-generate semesters for admission years
# via the API endpoint

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Semester Auto-Generator${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Configuration
API_BASE_URL="http://localhost:3000"
TOKEN_FILE=".moodle_token"

# Check if token exists
if [ ! -f "$TOKEN_FILE" ]; then
    echo -e "${YELLOW}No authentication token found.${NC}"
    echo "Please enter your Moodle token:"
    read -r TOKEN
    echo "$TOKEN" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
else
    TOKEN=$(cat "$TOKEN_FILE")
fi

echo -e "${GREEN}✓ Token loaded${NC}"
echo ""

# Function to make API call
make_api_call() {
    local endpoint=$1
    curl -s -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         "$API_BASE_URL$endpoint"
}

# Fetch available admission years
echo -e "${BLUE}Fetching available admission years...${NC}"
YEARS_RESPONSE=$(make_api_call "/api/availableAdmissionYears")

# Parse years from JSON response
YEARS=$(echo "$YEARS_RESPONSE" | grep -o '"years":\[.*\]' | grep -o '[0-9]\{4\}' | sort -r)

if [ -z "$YEARS" ]; then
    echo -e "${RED}✗ No admission years found!${NC}"
    echo "Make sure students have admission year data in their profiles."
    exit 1
fi

echo -e "${GREEN}✓ Found admission years:${NC}"
echo "$YEARS"
echo ""

# Fetch existing semesters
echo -e "${BLUE}Checking existing semesters...${NC}"
SEMESTERS_RESPONSE=$(make_api_call "/api/semesterDates")

echo ""
echo -e "${YELLOW}Semester Status:${NC}"
echo "-----------------------------------"

for YEAR in $YEARS; do
    # Count semesters for this year
    COUNT=$(echo "$SEMESTERS_RESPONSE" | grep -o "\"admissionyear\":\"$YEAR\"" | wc -l)
    
    if [ "$COUNT" -ge 8 ]; then
        echo -e "${GREEN}$YEAR: Complete (8/8 semesters)${NC}"
    else
        echo -e "${YELLOW}$YEAR: Incomplete ($COUNT/8 semesters)${NC}"
    fi
done

echo ""
echo "-----------------------------------"
echo ""

# Interactive menu
while true; do
    echo -e "${BLUE}Options:${NC}"
    echo "1) Generate semesters for a specific year"
    echo "2) Generate for all incomplete years"
    echo "3) View semester details"
    echo "4) Update token"
    echo "5) Exit"
    echo ""
    read -p "Select an option (1-5): " OPTION
    
    case $OPTION in
        1)
            echo ""
            echo "Available years:"
            echo "$YEARS"
            echo ""
            read -p "Enter admission year (e.g., 2024): " SELECTED_YEAR
            
            # Validate year
            if ! echo "$YEARS" | grep -q "^$SELECTED_YEAR$"; then
                echo -e "${RED}✗ Invalid year!${NC}"
                continue
            fi
            
            echo -e "${BLUE}Generating semesters for $SELECTED_YEAR...${NC}"
            RESULT=$(make_api_call "/api/semesterDates?admissionYear=$SELECTED_YEAR&autoGenerate=true")
            
            if echo "$RESULT" | grep -q "error"; then
                echo -e "${RED}✗ Error: $(echo "$RESULT" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)${NC}"
            else
                COUNT=$(echo "$RESULT" | grep -o "\"admissionyear\":\"$SELECTED_YEAR\"" | wc -l)
                echo -e "${GREEN}✓ Success! Generated/Updated semesters for $SELECTED_YEAR${NC}"
                echo -e "${GREEN}  Total semesters: $COUNT${NC}"
            fi
            echo ""
            ;;
            
        2)
            echo ""
            echo -e "${BLUE}Generating semesters for all incomplete years...${NC}"
            
            for YEAR in $YEARS; do
                COUNT=$(echo "$SEMESTERS_RESPONSE" | grep -o "\"admissionyear\":\"$YEAR\"" | wc -l)
                
                if [ "$COUNT" -lt 8 ]; then
                    echo -e "${YELLOW}Processing $YEAR...${NC}"
                    RESULT=$(make_api_call "/api/semesterDates?admissionYear=$YEAR&autoGenerate=true")
                    
                    if echo "$RESULT" | grep -q "error"; then
                        echo -e "${RED}  ✗ Error for $YEAR${NC}"
                    else
                        echo -e "${GREEN}  ✓ Success for $YEAR${NC}"
                    fi
                fi
            done
            
            echo ""
            echo -e "${GREEN}✓ Batch generation complete!${NC}"
            echo ""
            
            # Refresh semester data
            SEMESTERS_RESPONSE=$(make_api_call "/api/semesterDates")
            ;;
            
        3)
            echo ""
            read -p "Enter admission year to view (or press Enter for all): " VIEW_YEAR
            
            if [ -z "$VIEW_YEAR" ]; then
                DETAIL_RESPONSE="$SEMESTERS_RESPONSE"
            else
                DETAIL_RESPONSE=$(make_api_call "/api/semesterDates?admissionYear=$VIEW_YEAR")
            fi
            
            echo ""
            echo -e "${BLUE}Semester Details:${NC}"
            echo "-----------------------------------"
            
            # Parse and display semesters
            echo "$DETAIL_RESPONSE" | jq -r '.[] | "\(.admissionyear) - Sem \(.semestername): \(.startdate[0:10]) to \(.enddate[0:10]) [\(if .iscurrent then "CURRENT" else "Inactive" end)]"' 2>/dev/null || {
                echo "Install 'jq' for better formatting or view raw response:"
                echo "$DETAIL_RESPONSE"
            }
            
            echo "-----------------------------------"
            echo ""
            ;;
            
        4)
            echo ""
            echo "Enter new Moodle token:"
            read -r NEW_TOKEN
            echo "$NEW_TOKEN" > "$TOKEN_FILE"
            TOKEN="$NEW_TOKEN"
            echo -e "${GREEN}✓ Token updated${NC}"
            echo ""
            ;;
            
        5)
            echo ""
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
            
        *)
            echo -e "${RED}✗ Invalid option!${NC}"
            echo ""
            ;;
    esac
done
