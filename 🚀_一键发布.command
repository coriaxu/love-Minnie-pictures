#!/bin/bash

set -u

# Fix encoding issues for Chinese paths
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# ========================================================
# Minnie's Gallery - One-Click Publisher
# ========================================================

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}$1${NC}"
}

success() {
    echo -e "${GREEN}$1${NC}"
}

error() {
    echo -e "${RED}$1${NC}"
}

clear_proxy() {
    unset https_proxy http_proxy all_proxy HTTPS_PROXY HTTP_PROXY ALL_PROXY
}

set_proxy() {
    local host="$1"
    local port="$2"
    export https_proxy="http://${host}:${port}"
    export http_proxy="http://${host}:${port}"
    export all_proxy="socks5://${host}:${port}"
}

find_available_proxy_port() {
    local host="127.0.0.1"
    local ports=()
    local port=""

    if [ -n "${LOVE_MINNIE_PROXY_PORT:-}" ]; then
        ports+=("${LOVE_MINNIE_PROXY_PORT}")
    fi

    ports+=(33210 7890 7897 7891)

    for port in "${ports[@]}"; do
        if nc -z "$host" "$port" >/dev/null 2>&1; then
            echo "$port"
            return 0
        fi
    done

    return 1
}

has_unpushed_commits() {
    local branch="$1"

    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        [ "$(git rev-list --count "origin/$branch..HEAD")" -gt 0 ]
        return $?
    fi

    return 0
}

push_current_branch() {
    local branch="$1"
    local push_output=""
    local push_status=0
    local proxy_port=""

    clear_proxy
    info "🌐 Trying direct connection to GitHub..."

    push_output=$(git push -u origin "$branch" 2>&1)
    push_status=$?
    if [ "$push_status" -eq 0 ]; then
        echo "$push_output"
        return 0
    fi

    proxy_port=$(find_available_proxy_port || true)
    if [ -n "$proxy_port" ]; then
        set_proxy "127.0.0.1" "$proxy_port"
        info "🌐 Direct connection failed. Retrying via local proxy 127.0.0.1:${proxy_port}..."
        push_output=$(git push -u origin "$branch" 2>&1)
        push_status=$?
        if [ "$push_status" -eq 0 ]; then
            echo "$push_output"
            return 0
        fi
    fi

    echo "$push_output"
    return "$push_status"
}

info "🌻 Starting One-Click Publisher..."

# 1. Set Project Directory (Assuming script is inside the project folder)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR" || exit

echo -e "📂 Project location: $PROJECT_DIR"

# 2. Find the latest zip file in Downloads
DOWNLOADS_DIR="$HOME/Downloads"
LATEST_ZIP=$(ls -t "$DOWNLOADS_DIR"/love-minnie-*.zip 2>/dev/null | head -n 1)

if [ -z "$LATEST_ZIP" ]; then
    error "❌ No 'love-minnie-*.zip' found in Downloads!"
    echo "Please go to the Admin panel and click 'Generate' first."
    exit 1
fi

success "📦 Found update package: $(basename "$LATEST_ZIP")"

# 3. Unzip and Overwrite
echo "Unzipping and updating files..."
unzip -o "$LATEST_ZIP" -d "$PROJECT_DIR"
if [ $? -ne 0 ]; then
    error "❌ Unzip failed!"
    exit 1
fi

# 4. Save local changes if there are any
BRANCH_NAME=$(git branch --show-current)
if [ -z "$BRANCH_NAME" ]; then
    error "❌ Could not determine the current git branch."
    exit 1
fi

git add .
if git diff --cached --quiet; then
    info "📝 No new file changes were detected in this package."
else
    echo "💾 Saving local update..."
    if ! git commit -m "Update gallery content $(date +%Y-%m-%d)"; then
        error "❌ Could not save the local update."
        exit 1
    fi
fi

# 5. Git Push
if has_unpushed_commits "$BRANCH_NAME"; then
    echo "🚀 Sending to GitHub..."
    PUSH_RESULT=$(push_current_branch "$BRANCH_NAME")
    PUSH_STATUS=$?

    if [ "$PUSH_STATUS" -eq 0 ]; then
        success "✅ Success! Site updated."
        echo "$PUSH_RESULT"
        echo "The changes should appear online in a few minutes."
        echo "Cleaning up..."
        mv "$LATEST_ZIP" "$HOME/.Trash/"
    else
        error "❌ Git push failed."
        echo "$PUSH_RESULT"
        echo "Please check whether VPN or your local proxy is running, then try again."
        exit 1
    fi
else
    success "✅ Success! The project is already synced to GitHub."
    echo "Cleaning up..."
    mv "$LATEST_ZIP" "$HOME/.Trash/"
fi

if [ $? -ne 0 ]; then
    exit 1
fi

# Keep window open
echo ""
read -n 1 -s -r -p "Press any key to close..."
