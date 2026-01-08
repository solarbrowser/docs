import { NextResponse } from 'next/server';
import { loadConfig, loadMarkdownPage } from '@/lib/markdown';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ ok: true, results: [] });
    }

    const config = await loadConfig();
    if (!config) {
      return NextResponse.json({ ok: false, error: 'Config not found' }, { status: 404 });
    }

    const q = query.toLowerCase();
    const results: any[] = [];

    // Search through all sections and pages
    for (const section of config.sections) {
      // Check if section title matches
      if (section.title.toLowerCase().includes(q)) {
        const firstItem = section.items[0];
        if (firstItem) {
          results.push({
            type: 'section',
            title: section.title,
            href: firstItem.href,
            parentTitle: 'Section'
          });
        }
      }

      // Check each page in the section
      for (const item of section.items) {
        // Check page title
        if (item.title.toLowerCase().includes(q)) {
          results.push({
            type: 'page',
            title: item.title,
            href: item.href,
            parentTitle: section.title
          });
        }

        // Load the page content and search in headings
        if (item.file) {
          try {
            const page = await loadMarkdownPage(item.file);
            if (page) {
              // Search in page content
              const contentMatch = page.content.toLowerCase().includes(q);

              // Search in headings
              for (const heading of page.headings) {
                if (heading.text.toLowerCase().includes(q)) {
                  results.push({
                    type: 'heading',
                    title: heading.text,
                    href: `${item.href}#${heading.id}`,
                    parentTitle: `${section.title} → ${item.title}`
                  });
                }
              }

              // If content matches but no specific heading matched, add page result
              if (contentMatch && !results.some(r => r.href === item.href)) {
                results.push({
                  type: 'page',
                  title: item.title,
                  href: item.href,
                  parentTitle: section.title
                });
              }
            }
          } catch (err) {
            // Skip pages that can't be loaded
            console.error(`Failed to load page ${item.file}:`, err);
          }
        }
      }
    }

    // Remove duplicates based on href
    const seen = new Set<string>();
    const uniqueResults = results.filter(r => {
      if (seen.has(r.href)) return false;
      seen.add(r.href);
      return true;
    });

    // Limit to 12 results
    const finalResults = uniqueResults.slice(0, 12);

    return NextResponse.json({ ok: true, results: finalResults });
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
