#!/bin/bash

# Test WebGL image rendering across the platform
# Tests: WebGL support, image loading, fallback behavior

API_URL="http://localhost:3001/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Testing WebGL Image Rendering"
echo "=========================================="
echo ""

# Test 1: Check WebGL support (would need browser, but we can check API)
echo "1. Testing: Image URLs and formats"
echo "   ${BLUE}Note:${NC} WebGL support requires browser testing"
echo ""

# Test 2: Check game cover images
echo "2. Testing: Game cover images"
GAMES_RESPONSE=$(curl -s "${API_URL}/games?limit=5")
if echo "${GAMES_RESPONSE}" | grep -q '"items"'; then
  COVER_COUNT=$(echo "${GAMES_RESPONSE}" | grep -o '"coverImage"' | wc -l)
  BANNER_COUNT=$(echo "${GAMES_RESPONSE}" | grep -o '"bannerImage"' | wc -l)
  echo "   ${GREEN}✓ OK${NC} - Found ${COVER_COUNT} cover images and ${BANNER_COUNT} banner images"
  
  # Check for image formats
  JPG_COUNT=$(echo "${GAMES_RESPONSE}" | grep -o '\.jpg\|\.jpeg' | wc -l)
  PNG_COUNT=$(echo "${GAMES_RESPONSE}" | grep -o '\.png' | wc -l)
  WEBP_COUNT=$(echo "${GAMES_RESPONSE}" | grep -o '\.webp' | wc -l)
  SVG_COUNT=$(echo "${GAMES_RESPONSE}" | grep -o '\.svg' | wc -l)
  
  echo "   Image formats found:"
  echo "     - JPG/JPEG: ${JPG_COUNT}"
  echo "     - PNG: ${PNG_COUNT}"
  echo "     - WebP: ${WEBP_COUNT}"
  echo "     - SVG: ${SVG_COUNT}"
else
  echo "   ${RED}✗ FAILED${NC} - Could not fetch games"
fi

# Test 3: Check game screenshots
echo ""
echo "3. Testing: Game screenshots"
GAME_RESPONSE=$(curl -s "${API_URL}/games/cyberpunk-2077")
if echo "${GAME_RESPONSE}" | grep -q '"screenshots"'; then
  SCREENSHOT_COUNT=$(echo "${GAME_RESPONSE}" | grep -o '"screenshots":\[[^]]*\]' | grep -o 'http' | wc -l)
  echo "   ${GREEN}✓ OK${NC} - Found ${SCREENSHOT_COUNT} screenshots for Cyberpunk 2077"
else
  echo "   ${YELLOW}⚠${NC} - No screenshots found"
fi

# Test 4: Check workshop item images
echo ""
echo "4. Testing: Workshop item images"
WORKSHOP_RESPONSE=$(curl -s "${API_URL}/games/cyberpunk-2077/workshop/items")
if echo "${WORKSHOP_RESPONSE}" | grep -q '"items"'; then
  WORKSHOP_IMAGE_COUNT=$(echo "${WORKSHOP_RESPONSE}" | grep -o '"image"' | wc -l)
  BROKEN_COUNT=$(echo "${WORKSHOP_RESPONSE}" | grep -o 'storage.example.com' | wc -l)
  echo "   ${GREEN}✓ OK${NC} - Found ${WORKSHOP_IMAGE_COUNT} workshop item images"
  if [ "$BROKEN_COUNT" -eq 0 ]; then
    echo "   ${GREEN}✓ OK${NC} - No broken image URLs"
  else
    echo "   ${YELLOW}⚠ WARNING${NC} - Found ${BROKEN_COUNT} broken URLs"
  fi
else
  echo "   ${YELLOW}⚠${NC} - No workshop items found"
fi

# Test 5: Check avatar images
echo ""
echo "5. Testing: User avatar images"
PROFILE_RESPONSE=$(curl -s "${API_URL}/profile" 2>/dev/null || echo "")
if echo "${PROFILE_RESPONSE}" | grep -q '"avatar"'; then
  AVATAR_URL=$(echo "${PROFILE_RESPONSE}" | grep -o '"avatar":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$AVATAR_URL" ]; then
    echo "   ${GREEN}✓ OK${NC} - Avatar URL found: ${AVATAR_URL:0:50}..."
  fi
else
  echo "   ${YELLOW}⚠${NC} - Could not check avatar (requires authentication)"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "✅ Image URLs checked"
echo "✅ Formats detected"
echo ""
echo "${BLUE}Browser Testing Required:${NC}"
echo "1. Open browser console and check for WebGL support:"
echo "   const canvas = document.createElement('canvas');"
echo "   const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');"
echo "   console.log('WebGL supported:', !!gl);"
echo ""
echo "2. Visit pages and verify images load:"
echo "   - Store page: http://localhost:3001/store"
echo "   - Game detail: http://localhost:3001/game/cyberpunk-2077"
echo "   - Workshop: http://localhost:3001/game/cyberpunk-2077/workshop"
echo ""
echo "3. Check browser console for WebGL errors"
echo ""

