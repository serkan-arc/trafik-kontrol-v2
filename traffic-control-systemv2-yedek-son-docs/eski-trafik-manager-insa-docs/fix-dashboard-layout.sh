#!/bin/bash

FILES=(
  "app/dashboard/sites/ssl/page.tsx"
  "app/dashboard/sites/deploy/page.tsx"
  "app/dashboard/sites/[id]/page.tsx"
  "app/dashboard/sites/page.tsx"
)

for file in "${FILES[@]}"; do
  echo "Fixing $file..."
  
  # Remove import
  sed -i "/import DashboardLayout from '@\/components\/layout\/DashboardLayout';/d" "$file"
  
  # Remove opening tag (handle both single line and multi-line)
  sed -i 's/<DashboardLayout>//' "$file"
  
  # Remove closing tag
  sed -i 's/<\/DashboardLayout>//' "$file"
  
  echo "  ✓ Fixed $file"
done

echo "All files fixed!"
