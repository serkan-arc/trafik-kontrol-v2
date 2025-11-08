#!/usr/bin/env python3
"""
Safely remove dark mode classes while preserving file structure
"""

import os
import re
from pathlib import Path

def remove_dark_classes_safe(content):
    """Remove dark: classes carefully without breaking syntax"""
    
    # Pattern to match className="..." or className='...'
    def replace_in_classname(match):
        quote = match.group(1)
        classes = match.group(2)
        
        # Remove dark: prefixed classes
        # Match dark:xxx including variants like dark:hover:xxx, dark:bg-xxx, etc.
        cleaned_classes = re.sub(r'\s*dark:[a-zA-Z0-9\-:\/\[\]]+', '', classes)
        
        # Clean up extra spaces
        cleaned_classes = ' '.join(cleaned_classes.split())
        
        if cleaned_classes.strip():
            return f'className={quote}{cleaned_classes}{quote}'
        else:
            return ''  # Remove empty className
    
    # Process className with double quotes
    content = re.sub(r'className=(["\'])([^"\']*?)\1', replace_in_classname, content)
    
    return content

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file contains dark: classes
        if 'dark:' not in content:
            return False
        
        # Remove dark classes
        cleaned_content = remove_dark_classes_safe(content)
        
        # Only write if content actually changed
        if cleaned_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            return True
        
        return False
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def main():
    """Main function"""
    base_dir = Path('/home/root/webapp/traffic-control-system')
    
    # Directories to search
    search_dirs = ['app', 'components']
    
    # File extensions to process
    extensions = ['.tsx', '.jsx']
    
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
                    rel_path = file_path.relative_to(base_dir)
                    print(f"  ✓ {rel_path}")
                    processed_count += 1
    
    print(f"\n✅ Processed {processed_count} files")
    
    if processed_count > 0:
        print("🎉 All dark mode classes removed safely!")
    else:
        print("ℹ️  No dark mode classes found")

if __name__ == '__main__':
    main()
