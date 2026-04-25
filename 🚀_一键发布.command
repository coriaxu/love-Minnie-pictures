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

PACKAGE_TMP_DIR=""
TEMP_INDEX_FILE=""

cleanup_temp_files() {
    if [ -n "${PACKAGE_TMP_DIR:-}" ] && [ -d "$PACKAGE_TMP_DIR" ]; then
        rm -rf "$PACKAGE_TMP_DIR"
    fi

    if [ -n "${TEMP_INDEX_FILE:-}" ] && [ -f "$TEMP_INDEX_FILE" ]; then
        rm -f "$TEMP_INDEX_FILE"
    fi
}

restore_git_index_file() {
    local previous_git_index="$1"

    if [ -n "$previous_git_index" ]; then
        export GIT_INDEX_FILE="$previous_git_index"
    else
        unset GIT_INDEX_FILE
    fi
}

trap cleanup_temp_files EXIT

has_unpushed_commits() {
    local branch="$1"

    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        [ "$(git rev-list --count "origin/$branch..HEAD")" -gt 0 ]
        return $?
    fi

    return 0
}

build_commit_from_package() {
    local branch="$1"
    local zip_file="$2"
    local base_ref="HEAD"
    local base_commit=""
    local base_tree=""
    local new_tree=""
    local new_commit=""
    local package_file=""
    local blob=""
    local i=0
    local previous_git_index="${GIT_INDEX_FILE:-}"
    local package_files=()
    local package_blobs=()

    PACKAGE_TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/love-minnie-publish.XXXXXX")
    TEMP_INDEX_FILE=$(mktemp "${TMPDIR:-/tmp}/love-minnie-index.XXXXXX")

    if ! unzip -q -o "$zip_file" -d "$PACKAGE_TMP_DIR"; then
        restore_git_index_file "$previous_git_index"
        return 1
    fi

    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        if [ "$(git rev-list --count "origin/$branch..HEAD")" -gt 0 ]; then
            base_ref="HEAD"
        else
            base_ref="origin/$branch"
        fi
    fi

    base_commit=$(git rev-parse "$base_ref") || {
        restore_git_index_file "$previous_git_index"
        return 1
    }

    base_tree=$(git rev-parse "$base_ref^{tree}") || {
        restore_git_index_file "$previous_git_index"
        return 1
    }

    export GIT_INDEX_FILE="$TEMP_INDEX_FILE"
    git read-tree "$base_tree" || {
        restore_git_index_file "$previous_git_index"
        return 1
    }

    while IFS= read -r package_file; do
        case "$package_file" in
            ""|*/|__MACOSX/*|*.DS_Store)
                continue
                ;;
        esac

        if [ ! -f "$PACKAGE_TMP_DIR/$package_file" ]; then
            continue
        fi

        blob=$(git hash-object -w "$PACKAGE_TMP_DIR/$package_file") || {
            restore_git_index_file "$previous_git_index"
            return 1
        }

        git update-index --add --cacheinfo 100644 "$blob" "$package_file" || {
            restore_git_index_file "$previous_git_index"
            return 1
        }

        package_files+=("$package_file")
        package_blobs+=("$blob")
    done < <(unzip -Z1 "$zip_file")

    if [ "${#package_files[@]}" -eq 0 ]; then
        restore_git_index_file "$previous_git_index"
        return 1
    fi

    new_tree=$(git write-tree) || {
        restore_git_index_file "$previous_git_index"
        return 1
    }

    restore_git_index_file "$previous_git_index"

    if [ "$new_tree" = "$base_tree" ]; then
        unzip -q -o "$zip_file" -d "$PROJECT_DIR" || return 1
        return 2
    fi

    new_commit=$(printf "Update gallery content %s\n" "$(date +%Y-%m-%d)" | git commit-tree "$new_tree" -p "$base_commit") || return 1
    git update-ref "refs/heads/$branch" "$new_commit" || return 1

    unzip -q -o "$zip_file" -d "$PROJECT_DIR" || return 1

    for i in "${!package_files[@]}"; do
        git update-index --add --cacheinfo 100644 "${package_blobs[$i]}" "${package_files[$i]}" || return 1
    done

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

# 3. Save package contents without scanning the whole Google Drive folder
BRANCH_NAME=$(git branch --show-current)
if [ -z "$BRANCH_NAME" ]; then
    error "❌ Could not determine the current git branch."
    exit 1
fi

echo "Unzipping and updating files..."
build_commit_from_package "$BRANCH_NAME" "$LATEST_ZIP"
BUILD_STATUS=$?

if [ "$BUILD_STATUS" -eq 0 ]; then
    echo "💾 Saving local update..."
elif [ "$BUILD_STATUS" -eq 2 ]; then
    info "📝 No new file changes were detected in this package."
else
    error "❌ Could not save the local update."
    exit 1
fi

# 4. Git Push
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
