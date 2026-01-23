#!/bin/bash

# Fix encoding issues for Chinese paths
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Auto-configure proxy (Surfin's Environment)
export https_proxy=http://127.0.0.1:33210
export http_proxy=http://127.0.0.1:33210
export all_proxy=socks5://127.0.0.1:33210

# ========================================================
# Minnie's Gallery - One-Click Publisher
# ========================================================

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌻 Starting One-Click Publisher...${NC}"

# 1. Set Project Directory (Assuming script is inside the project folder)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR" || exit

echo -e "📂 Project location: $PROJECT_DIR"

# 2. Find the latest zip file in Downloads
DOWNLOADS_DIR="$HOME/Downloads"
LATEST_ZIP=$(ls -t "$DOWNLOADS_DIR"/love-minnie-*.zip 2>/dev/null | head -n 1)

if [ -z "$LATEST_ZIP" ]; then
    echo -e "${RED}❌ No 'love-minnie-*.zip' found in Downloads!${NC}"
    echo "Please go to the Admin panel and click 'Generate' first."
    exit 1
fi

echo -e "${GREEN}📦 Found update package: $(basename "$LATEST_ZIP")${NC}"

# 3. Unzip and Overwrite
echo "Unzipping and updating files..."
unzip -o "$LATEST_ZIP" -d "$PROJECT_DIR"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Unzip failed!${NC}"
    exit 1
fi

# 4. Git Push
echo "🚀 Pushing to GitHub..."
git add .
git commit -m "Update gallery content $(date +%Y-%m-%d)"
# Use -u origin main to ensure upstream is set, handling the "no upstream" error
git push -u origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Success! Site updated.${NC}"
    echo "The changes should appear online in a few minutes."
    
    # Optional: Move the used zip to Trash to keep Downloads clean
    echo "Cleaning up..."
    mv "$LATEST_ZIP" "$HOME/.Trash/"
else
    echo -e "${RED}❌ Git push failed. Please check your network or git settings.${NC}"
    exit 1
fi

# Keep window open
echo ""
read -n 1 -s -r -p "Press any key to close..."
