#!/usr/bin/env python3
"""
Remove all dark mode classes from React/Next.js components
"""

import os
import re
from pathlib import Path

def remove_dark_classes(content):
    """Remove dark: classes from className strings"""
    # Pattern to match dark:class-name including variants like dark:hover:, dark:bg-, etc.
    pattern = r'\s*dark:[a-zA-Z0-9\-:\/\[\]]+\s*'
    
    # Replace dark: classes with empty string
    cleaned = re.sub(pattern, ' ', content)
    
    # Clean up multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Clean up empty className=""
    cleaned = re.sub(r'className="\s*"', '', cleaned)
    cleaned = re.sub(r"className='\s*'", '', cleaned)
    
    return cleaned

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file contains dark: classes
        if 'dark:' not in content:
            return False
        
        # Remove dark classes
        cleaned_content = remove_dark_classes(content)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_content)
        
        return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function"""
    base_dir = Path('/home/root/webapp/traffic-control-system')
    
    # Directories to search
    search_dirs = ['app', 'components']
    
    # File extensions to process
    extensions = ['.tsx', '.jsx', '.ts', '.js']
    
    processed_count = 0
    
    for search_dir in search_dirs:
        dir_path = base_dir / search_dir
        if not dir_path.exists():
            continue
        
        print(f"Processing {search_dir}/...")
        
        for ext in extensions:
            for file_path in dir_path.rglob(f'*{ext}'):
                # Skip node_modules and .next
                if 'node_modules' in str(file_path) or '.next' in str(file_path):
                    continue
                
                if process_file(file_path):
                    print(f"  ✓ {file_path.relative_to(base_dir)}")
                    processed_count += 1
    
    print(f"\n✅ Processed {processed_count} files")
    print("🎉 All dark mode classes removed!")

if __name__ == '__main__':
    main()
