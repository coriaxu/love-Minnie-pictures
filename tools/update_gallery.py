import os
import json
import re
from datetime import datetime
from PIL import Image

# Configuration
RAW_DIR = "raw_images"
PROCESSED_DIR = "images"
DATA_FILE = "data.json"
DATA_JS = "data.js"
MAX_WIDTH = 1600

def setup_directories():
    if not os.path.exists(PROCESSED_DIR):
        os.makedirs(PROCESSED_DIR)
    if not os.path.exists(RAW_DIR):
        os.makedirs(RAW_DIR)

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_data(data):
    # Sort data by date (newest first)
    data.sort(key=lambda x: x['date'], reverse=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    save_data_js(data)

def save_data_js(data):
    with open(DATA_JS, 'w', encoding='utf-8') as f:
        f.write("window.__GALLERY_DATA__ = ")
        json.dump(data, f, ensure_ascii=False)
        f.write(";\n")

def compress_image(source_path, target_path):
    try:
        with Image.open(source_path) as img:
            # Convert to RGB (in case of RGBA/PNG)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if necessary
            width, height = img.size
            if width > MAX_WIDTH:
                new_height = int(height * (MAX_WIDTH / width))
                img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
            
            # Save as WebP
            img.save(target_path, 'WEBP', quality=85)
            return True
    except Exception as e:
        print(f"Error processing {source_path}: {e}")
        return False

def parse_date_from_filename(filename):
    # Try different date patterns
    # 1. YYYYMMDD (e.g., 20251206.jpg)
    match = re.search(r'(\d{4})(\d{2})(\d{2})', filename)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    
    # 2. YYYY-MM-DD (e.g., 2025-12-06.jpg)
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', filename)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    
    return None

def main():
    print("🌻 Starting Love Minnie Gallery Update...")
    setup_directories()
    current_data = load_data()
    existing_filenames = {item['filename'] for item in current_data}
    
    new_entries = []
    processed_count = 0
    
    # Scan raw_images
    for filename in os.listdir(RAW_DIR):
        if filename.startswith('.'): continue # Skip hidden files
        
        # Check if already processed (check base name without extension vs processed filenames)
        # Note: We store the PROCESSED filename in json.
        # So we need to predict the processed filename.
        name_part = os.path.splitext(filename)[0]
        processed_filename = f"{name_part}.webp"
        
        if processed_filename in existing_filenames:
            continue
            
        source_path = os.path.join(RAW_DIR, filename)
        target_path = os.path.join(PROCESSED_DIR, processed_filename)
        
        # Extract date
        date_str = parse_date_from_filename(filename)
        if not date_str:
            print(f"⚠️  Skipping {filename}: Could not find date in filename (use YYYYMMDD format)")
            continue
            
        print(f"🎨 Processing new painting: {filename}...")
        
        if compress_image(source_path, target_path):
            entry = {
                "id": name_part,
                "date": date_str,
                "filename": processed_filename,
                "title": f"Minnie 的画 - {date_str}", # Default title
                "description": "", # Default description
                "music": "" # Future feature
            }
            new_entries.append(entry)
            processed_count += 1
            
    if new_entries:
        current_data.extend(new_entries)
        save_data(current_data)
        print(f"✅ Automatically added {processed_count} new paintings!")
    else:
        save_data_js(current_data)
        print("✨ No new images found. Gallery is up to date.")

if __name__ == "__main__":
    main()
