---
description: Process new raw images and publish them to the gallery
---

1. Run the gallery update script to process images
// turbo
python3 update_gallery.py

2. Deploy the changes to GitHub
// turbo
git add .
// turbo
git commit -m "Add new daily art 🎨"
// turbo
git push
