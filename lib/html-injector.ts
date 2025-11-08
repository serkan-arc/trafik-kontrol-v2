/**
 * HTML Injection Helper
 * Injects tracking scripts and other code into HTML files
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Inject tracking script into HTML file
 */
export async function injectTrackingScript(
  htmlFilePath: string,
  siteId: string,
  apiUrl: string = 'http://207.180.204.60:3500'
): Promise<boolean> {
  try {
    // Read HTML file
    let html = fs.readFileSync(htmlFilePath, 'utf-8');

    // Check if tracking already injected
    if (html.includes('data-site-id')) {
      console.log('Tracking script already exists in:', htmlFilePath);
      return true;
    }

    // Create tracking script tag
    const trackingScript = `
<!-- Traffic Control Tracking -->
<script src="${apiUrl}/tracking/track.js" data-site-id="${siteId}" data-api-url="${apiUrl}"></script>
`;

    // Try to inject before </body>
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${trackingScript}</body>`);
    } 
    // If no </body>, try before </html>
    else if (html.includes('</html>')) {
      html = html.replace('</html>', `${trackingScript}</html>`);
    }
    // Otherwise append at the end
    else {
      html += trackingScript;
    }

    // Write back to file
    fs.writeFileSync(htmlFilePath, html, 'utf-8');
    console.log('✓ Tracking script injected:', htmlFilePath);
    return true;
  } catch (error) {
    console.error('Error injecting tracking script:', error);
    return false;
  }
}

/**
 * Inject tracking into all HTML files in directory
 */
export async function injectTrackingIntoDirectory(
  directoryPath: string,
  siteId: string,
  apiUrl: string = 'http://207.180.204.60:3500'
): Promise<{ success: number; failed: number; skipped: number }> {
  const results = { success: 0, failed: 0, skipped: 0 };

  try {
    // Get all HTML files recursively
    const htmlFiles = findHTMLFiles(directoryPath);

    console.log(`Found ${htmlFiles.length} HTML files in ${directoryPath}`);

    for (const htmlFile of htmlFiles) {
      const success = await injectTrackingScript(htmlFile, siteId, apiUrl);
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }
    }

    return results;
  } catch (error) {
    console.error('Error injecting tracking into directory:', error);
    return results;
  }
}

/**
 * Find all HTML files in directory recursively
 */
function findHTMLFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip certain directories
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', '.git', '_next'].includes(file)) {
        findHTMLFiles(filePath, fileList);
      }
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Remove tracking script from HTML file
 */
export async function removeTrackingScript(htmlFilePath: string): Promise<boolean> {
  try {
    let html = fs.readFileSync(htmlFilePath, 'utf-8');

    // Remove tracking script section
    html = html.replace(/<!-- Traffic Control Tracking -->[\s\S]*?<script[^>]*data-site-id[^>]*><\/script>\s*/g, '');

    fs.writeFileSync(htmlFilePath, html, 'utf-8');
    console.log('✓ Tracking script removed:', htmlFilePath);
    return true;
  } catch (error) {
    console.error('Error removing tracking script:', error);
    return false;
  }
}
