import fs from 'fs/promises';
import path from 'path';

export interface MarkdownPage {
  title: string;
  href: string;
  content: string;
  headings: { text: string; level: number; id: string }[];
}

export interface Section {
  title: string;
  icon: string;
  order: number;
  items: {
    title: string;
    href: string;
    file: string | null;
  }[];
}

export interface DocsConfig {
  sections: Section[];
  homepage: {
    title: string;
    description: string;
  };
}

const PAGES_DIR = path.join(process.cwd(), 'public', 'pages');
const CONFIG_PATH = path.join(PAGES_DIR, 'config.json');

/**
 * Load the docs configuration
 */
export async function loadConfig(): Promise<DocsConfig> {
  try {
    const configContent = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Error loading config:', error);
    return { sections: [], homepage: { title: '', description: '' } };
  }
}

/**
 * Extract headings from markdown content
 */
export function extractHeadings(markdown: string): { text: string; level: number; id: string }[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: { text: string; level: number; id: string }[] = [];

  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    headings.push({ text, level, id });
  }

  return headings;
}

/**
 * Load a markdown file and extract its content and headings
 */
export async function loadMarkdownPage(filePath: string): Promise<MarkdownPage | null> {
  try {
    const fullPath = path.join(PAGES_DIR, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const headings = extractHeadings(content);

    // Extract title from first h1 or use filename
    const firstH1 = headings.find(h => h.level === 1);
    const title = firstH1?.text || path.basename(filePath, '.md');

    return {
      title,
      href: '', // Will be filled by caller
      content,
      headings
    };
  } catch (error) {
    console.error(`Error loading markdown file ${filePath}:`, error);
    return null;
  }
}

/**
 * Save markdown content to a file
 */
export async function saveMarkdownPage(filePath: string, content: string): Promise<void> {
  try {
    const fullPath = path.join(PAGES_DIR, filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  } catch (error) {
    console.error(`Error saving markdown file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Save the docs configuration
 */
export async function saveConfig(config: DocsConfig): Promise<void> {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}
