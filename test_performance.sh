#!/bin/bash
# Performance Test Script
# Tests the optimized attendance API performance

echo "================================"
echo "Performance Test - Attendance API"
echo "================================"
echo ""

API_URL="http://localhost:3000/api/getAttendanceDB"
COURSE_ID=8

echo "Testing Course ID: $COURSE_ID"
echo "Endpoint: $API_URL"
echo ""

# Test 5 times and calculate average
total=0
count=5

echo "Running $count requests..."
echo ""

for i in $(seq 1 $count); do
  echo -n "Request $i: "
  
  # Use curl with timing and measure response time
  start=$(date +%s%3N)
  
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"courseId\": $COURSE_ID}" \
    -w "\n%{time_total}")
  
  end=$(date +%s%3N)
  time_taken=$((end - start))
  
  # Extract just the timing from curl
  curl_time=$(echo "$response" | tail -n1)
  
  echo "${time_taken}ms (curl reported: ${curl_time}s)"
  
  total=$((total + time_taken))
  
  # Small delay between requests
  sleep 0.5
done

echo ""
echo "================================"
average=$((total / count))
echo "Average response time: ${average}ms"
echo "================================"

if [ $average -lt 2000 ]; then
  echo "✅ Performance is EXCELLENT! (< 2 seconds)"
elif [ $average -lt 4000 ]; then
  echo "✅ Performance is GOOD (< 4 seconds)"
else
  echo "⚠️  Performance needs improvement (> 4 seconds)"
fi

echo ""
echo "For production server (212.47.68.198:3000), adjust API_URL in this script."
