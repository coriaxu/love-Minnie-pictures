---
description: Force a "Hard Refresh" by updating version numbers in HTML files to fix display/cache issues.
---

1. Update the version timestamp for style.css in index.html and gallery.html to the current time to bust cache.
// turbo
sed -i '' "s/style.css?v=[0-9]*/style.css?v=$(date +%s)/g" index.html gallery.html

2. Deploy the "cache busted" version
// turbo
git add .
// turbo
git commit -m "Fix: Force style refresh (Cache Busting) 🧹"
// turbo
git push
