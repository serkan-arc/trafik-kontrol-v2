#!/bin/bash

# Quick Cleanup Script - Find and organize viable sites

echo "🧹 Quick Site Cleanup and Organization"
echo "======================================="
echo ""

# Create organized sites directory
SITES_DIR="/home/root/sites"
mkdir -p "$SITES_DIR"/{static,nextjs,nodejs,archives,to-remove}

echo "📁 Created directory structure at $SITES_DIR"
echo ""

# Function to check if directory has web content
check_site_viability() {
    local dir="$1"
    local name=$(basename "$dir")
    
    # Check for key files
    if [[ -f "$dir/index.html" ]]; then
        echo "static"
        return 0
    elif [[ -f "$dir/package.json" ]] && [[ -f "$dir/next.config.js" || -f "$dir/next.config.ts" ]]; then
        echo "nextjs"
        return 0
    elif [[ -f "$dir/package.json" ]] && [[ -f "$dir/server.js" || -f "$dir/app.js" || -f "$dir/index.js" ]]; then
        echo "nodejs"
        return 0
    else
        return 1
    fi
}

echo "🔍 Scanning for viable sites..."
echo ""

# Known good sites
echo "✅ Processing known good sites:"

# 1. Traffic Control System (keep in place)
echo "   • traffic-control-system - KEEPING IN PLACE"

# 2. Hurriyet Health
if [[ -d "/home/root/webapp/organized-sites/hurriyet-health" ]]; then
    cp -r "/home/root/webapp/organized-sites/hurriyet-health" "$SITES_DIR/nodejs/hurriyet-health" 2>/dev/null
    echo "   • hurriyet-health → $SITES_DIR/nodejs/"
fi

# 3. OzPhyzen sites (static)
for site in /home/root/webapp/site-packages/*; do
    if [[ -d "$site" ]]; then
        name=$(basename "$site")
        if [[ -f "$site/index.html" ]]; then
            cp -r "$site" "$SITES_DIR/static/$name" 2>/dev/null
            echo "   • $name → $SITES_DIR/static/"
        fi
    fi
done

# 4. OzPhyzen organized pages
for site in /home/root/webapp/organized-sites/ozphyzen-pages/*; do
    if [[ -d "$site" ]]; then
        name=$(basename "$site")
        cp -r "$site" "$SITES_DIR/static/ozphyzen-$name" 2>/dev/null
        echo "   • ozphyzen-$name → $SITES_DIR/static/"
    fi
done

echo ""
echo "🗑️ Sites to remove (duplicates/old versions):"

# List candidates for removal
candidates=(
    "/root/novabiosale"
    "/var/www/ozphyzensaleid1"
    "/home/root/webapp/backups/*"
    "/home/root/webapp/ozphyzen-sites/*"
    "/home/root/trafik-manager-clean"
    "/opt/trafikkontrol"
    "/opt/traffic-management"
    "/opt/webapp"
    "/var/www/html"
)

for pattern in "${candidates[@]}"; do
    for dir in $pattern; do
        if [[ -d "$dir" ]] && [[ "$dir" != "/home/root/webapp/traffic-control-system" ]]; then
            size=$(du -sh "$dir" 2>/dev/null | cut -f1)
            echo "   • $dir (Size: $size)"
            # Create removal record
            echo "$dir" >> "$SITES_DIR/to-remove/removal-list.txt"
        fi
    done
done

echo ""
echo "📊 Summary:"
echo "==========="

# Count files
static_count=$(ls -1 "$SITES_DIR/static" 2>/dev/null | wc -l)
nodejs_count=$(ls -1 "$SITES_DIR/nodejs" 2>/dev/null | wc -l)
nextjs_count=$(ls -1 "$SITES_DIR/nextjs" 2>/dev/null | wc -l)

echo "   Static sites: $static_count"
echo "   Node.js apps: $nodejs_count"
echo "   Next.js apps: $nextjs_count"
echo ""
echo "📁 Organized sites location: $SITES_DIR"
echo "📝 Removal candidates listed in: $SITES_DIR/to-remove/removal-list.txt"
echo ""
echo "✨ Next steps:"
echo "   1. Review sites in $SITES_DIR"
echo "   2. Test each site individually"
echo "   3. Delete directories listed in removal-list.txt"
echo "   4. Update Traffic Control to use $SITES_DIR for deployments"
echo ""

# Create a simple info file
cat > "$SITES_DIR/README.md" << EOF
# Organized Sites Directory

## Current Sites

### Static Sites (/static)
$(ls -1 "$SITES_DIR/static" 2>/dev/null | sed 's/^/- /')

### Node.js Apps (/nodejs)
$(ls -1 "$SITES_DIR/nodejs" 2>/dev/null | sed 's/^/- /')

### Next.js Apps (/nextjs)  
$(ls -1 "$SITES_DIR/nextjs" 2>/dev/null | sed 's/^/- /')

## Removal Candidates
Check to-remove/removal-list.txt for directories that can be deleted.

Generated: $(date)
EOF

echo "✅ Cleanup complete!"