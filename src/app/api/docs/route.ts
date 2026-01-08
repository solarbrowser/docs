import { NextResponse } from 'next/server';
import { loadConfig, loadMarkdownPage } from '@/lib/markdown';
import { parseMarkdownSections } from '@/lib/markdown-sections';

// Cache for config and pages
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const href = searchParams.get('href');

    // Check cache first
    const cacheKey = href || 'config';
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Load configuration
    const config = await loadConfig();

    // If no specific page requested, return config
    if (!href) {
      const response = { ok: true, config };
      setCache(cacheKey, response);
      return NextResponse.json(response);
    }

    // Find the page in config
    let pageFile: string | null = null;
    let sectionTitle = '';

    for (const section of config.sections) {
      const item = section.items.find(i => i.href === href);
      if (item?.file) {
        pageFile = item.file;
        sectionTitle = section.title;
        break;
      }
    }

    // Handle homepage
    if (href === '/' || !pageFile) {
      return NextResponse.json({
        ok: true,
        page: {
          title: config.homepage.title,
          section: 'Homepage',
          content: config.homepage.description,
          headings: []
        }
      });
    }

    // Load markdown page
    const page = await loadMarkdownPage(pageFile);

    if (!page) {
      return NextResponse.json(
        { ok: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Parse sections server-side for better performance
    const sections = parseMarkdownSections(page.content);

    const response = {
      ok: true,
      page: {
        ...page,
        href,
        section: sectionTitle,
        sections // Add pre-parsed sections
      }
    };

    setCache(cacheKey, response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
