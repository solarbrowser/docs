'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import DocsSidebar from '@/components/DocsSidebar';
import PageTOC from '@/components/PageTOC';
import Link from 'next/link';
import { parseMarkdownSections } from '@/lib/markdown-sections';

interface Heading {
  text: string;
  level: number;
  id: string;
}

interface MarkdownSection {
  id: string;
  heading: string;
  level: number;
  content: string;
}

interface PageData {
  title: string;
  section: string;
  content: string;
  headings: Heading[];
  sections?: MarkdownSection[];
}

interface Section {
  title: string;
  icon: string;
  order: number;
  items: { title: string; href: string; file: string | null }[];
}

interface DocsConfig {
  sections: Section[];
  homepage: { title: string; description: string };
}

export default function DocPage() {
  const pathname = usePathname();
  const [config, setConfig] = useState<DocsConfig>({ sections: [], homepage: { title: '', description: '' } });
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [navPrev, setNavPrev] = useState<{ title: string; href: string } | null>(null);
  const [navNext, setNavNext] = useState<{ title: string; href: string } | null>(null);
  const manualActiveRef = useRef<{ id: string | null; timeout?: number | null; clearOnScroll?: boolean }>({ id: null, timeout: null, clearOnScroll: false });
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const configRes = await fetch('/api/docs/config');
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData.data);

          const pageRes = await fetch(`/api/docs?href=${pathname}`);
          if (pageRes.ok) {
            const pageResult = await pageRes.json();
            setPageData(pageResult.page);

            const flatItems: { title: string; href: string }[] = [];
            for (const s of configData.data.sections) {
              for (const it of s.items) {
                flatItems.push({ title: it.title, href: it.href });
              }
            }

            const homepageNav = { title: configData.data.homepage?.title || 'Documentation', href: '/' };
            const navChain = [homepageNav, ...flatItems];

            const currentIndex = navChain.findIndex(item => item.href === pathname);
            if (currentIndex > -1) {
              setNavPrev(navChain[currentIndex - 1] || null);
              setNavNext(navChain[currentIndex + 1] || null);
            }
          }
        }
      } catch (err) {
        console.error('Error loading docs:', err);
      }
    };
    load();
  }, [pathname]);

  const tocSections = pageData?.headings
    ?.filter(h => h.level === 2 || h.level === 3)
    .reduce((acc, heading) => {
      if (heading.level === 2) {
        acc.push({ title: heading.text, id: heading.id, children: [] });
      } else if (heading.level === 3 && acc.length > 0) {
        acc[acc.length - 1].children.push({ title: heading.text, id: heading.id });
      }
      return acc;
    }, [] as { title: string; id: string; children: { title: string; id: string }[] }[]);

  useEffect(() => {
    if (!pageData?.headings || pageData.headings.length === 0) return;

    let isScrolling = false;
    let scrollTimeout: number | null = null;

    const handleScroll = () => {
      isScrolling = true;
      if (scrollTimeout) window.clearTimeout(scrollTimeout);

      scrollTimeout = window.setTimeout(() => {
        isScrolling = false;
      }, 150);

      if (manualActiveRef.current.id) return;

      // Check if we're at the bottom of the page
      const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 50;

      if (isAtBottom) {
        const lastHeading = pageData.headings[pageData.headings.length - 1];
        if (lastHeading) {
          setActiveSectionId(lastHeading.id);
          return;
        }
      }

      let closestId = '';
      let closestDistance = Infinity;

      pageData.headings.forEach((h: Heading) => {
        const el = document.getElementById(h.id);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - 150);

        if (rect.top <= 200 && distance < closestDistance) {
          closestId = h.id;
          closestDistance = distance;
        }
      });

      if (closestId) {
        setActiveSectionId(closestId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
    };
  }, [pageData]);

  useEffect(() => {
    if (!pageData?.headings || pageData.headings.length === 0) return;
    if (activeSectionId) return;
    if (manualActiveRef.current?.id) return;

    const atTop = (typeof window !== 'undefined' ? window.scrollY : 0) <= 40;
    const timeout = window.setTimeout(() => {
      const firstHeading = pageData.headings.find(h => h.level === 2);
      if (firstHeading && !activeSectionId && atTop) {
        const el = document.getElementById(firstHeading.id);
        if (el) {
          manualActiveRef.current.id = firstHeading.id;
          setActiveSectionId(firstHeading.id);
          if (manualActiveRef.current.timeout) {
            window.clearTimeout(manualActiveRef.current.timeout);
          }
          manualActiveRef.current.timeout = window.setTimeout(() => {
            manualActiveRef.current.id = null;
            manualActiveRef.current.timeout = null;
          }, 400);
        }
      }
    }, 60);

    return () => window.clearTimeout(timeout);
  }, [pageData, activeSectionId]);

  const smoothScrollTo = (el: HTMLElement) => {
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      const targetY = window.scrollY + el.getBoundingClientRect().top - 80;
      window.scrollTo(0, targetY);
    }
  };

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (!anchor || !anchor.getAttribute) return;

      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('#')) {
        const id = href.replace('#', '');
        const sectionEl = document.getElementById(id);
        if (sectionEl) {
          e.preventDefault();
          smoothScrollTo(sectionEl);
          sectionEl.classList.remove('flash');
          void sectionEl.offsetWidth;
          sectionEl.classList.add('flash');
          manualActiveRef.current.id = id;
          manualActiveRef.current.clearOnScroll = true;
          setActiveSectionId(id);

          if (manualActiveRef.current.timeout) {
            window.clearTimeout(manualActiveRef.current.timeout);
          }
          manualActiveRef.current.timeout = window.setTimeout(() => {
            manualActiveRef.current.id = null;
            manualActiveRef.current.timeout = null;
          }, 700);

          setTimeout(() => sectionEl.classList.remove('flash'), 800);
        }
      }
    };

    root.addEventListener('click', handleClick);
    return () => root.removeEventListener('click', handleClick);
  }, [contentRef, pageData]);

  useEffect(() => {
    const onScroll = () => {
      if (manualActiveRef.current.clearOnScroll) {
        manualActiveRef.current.id = null;
        manualActiveRef.current.clearOnScroll = false;
        if (manualActiveRef.current.timeout) {
          window.clearTimeout(manualActiveRef.current.timeout);
          manualActiveRef.current.timeout = null;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!pageData) {
    return (
      <div className="min-h-screen bg-[#232223] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-white animate-spin" />
          <div className="text-white/60 text-sm">Loading documentation...</div>
        </div>
      </div>
    );
  }

  const sections = pageData?.sections || (pageData?.content ? parseMarkdownSections(pageData.content) : []);

  const MarkdownComponents = {
    h1: ({ children, ...props }: any) => {
      const text = String(children);
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h1 id={id} className="text-3xl font-bold text-white mb-4 heading-section" style={{ scrollMarginTop: '6rem' }} {...props}>{children}</h1>;
    },
    h2: ({ children, ...props }: any) => {
      const text = String(children);
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h2 id={id} className="text-2xl font-semibold text-white mt-8 mb-4 heading-section" style={{ scrollMarginTop: '6rem' }} {...props}>{children}</h2>;
    },
    h3: ({ children, ...props }: any) => {
      const text = String(children);
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h3 id={id} className="text-xl font-semibold text-white mt-6 mb-3 heading-section" style={{ scrollMarginTop: '6rem' }} {...props}>{children}</h3>;
    },
    h4: ({ children, ...props }: any) => {
      const text = String(children);
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h4 id={id} className="text-lg font-semibold text-white mt-4 mb-2 heading-section" style={{ scrollMarginTop: '6rem' }} {...props}>{children}</h4>;
    },
    p: ({ children, ...props }: any) => <p className="text-white/80 mb-4 leading-relaxed section-content" {...props}>{children}</p>,
    a: ({ node, ...props }: any) => <a className="text-amber-400 hover:underline" {...props} />,
    ul: ({ children, ...props }: any) => <ul className="list-disc list-inside text-white/80 mb-4 space-y-2 section-content" {...props}>{children}</ul>,
    ol: ({ children, ...props }: any) => <ol className="list-decimal list-inside text-white/80 mb-4 space-y-2 section-content" {...props}>{children}</ol>,
    li: ({ children, ...props }: any) => <li className="text-white/80" {...props}>{children}</li>,
    strong: ({ children, ...props }: any) => <strong className="text-white font-semibold" {...props}>{children}</strong>,
    em: ({ children, ...props }: any) => <em className="text-white/90 italic" {...props}>{children}</em>,
    blockquote: ({ children, ...props }: any) => <blockquote className="border-l-4 border-amber-400/50 pl-4 italic text-white/70 my-4" {...props}>{children}</blockquote>,
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full" style={{ borderCollapse: 'collapse', border: '1px solid rgba(255,255,255,0.15)' }} {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }: any) => <thead className="bg-white/5" {...props}>{children}</thead>,
    tbody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }: any) => <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }} {...props}>{children}</tr>,
    th: ({ children, ...props }: any) => <th className="px-4 py-3 text-left text-white font-semibold" style={{ border: '1px solid rgba(255,255,255,0.15)' }} {...props}>{children}</th>,
    td: ({ children, ...props }: any) => <td className="px-4 py-3 text-white/80" style={{ border: '1px solid rgba(255,255,255,0.15)' }} {...props}>{children}</td>,
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          codeTagProps={{
            style: {
              background: 'transparent',
              padding: 0,
              fontFamily: '"Courier New", Courier, monospace'
            }
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-white/10 px-2 py-1 rounded text-sm text-amber-300" {...props}>{children}</code>
      );
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <DocsSidebar sections={config.sections} />
      <main ref={contentRef} className="lg:ml-80 ml-0 pt-16 lg:pt-6">
        <div className="max-w-6xl px-6 md:px-12 pl-8 md:pl-12 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <Link href="/" className="text-white/80 hover:text-white text-xs sm:text-sm transition-colors leading-tight">
                ← Back to Documentation
              </Link>
            </div>

            <div className="mb-8">
              <span className="text-sm text-white/40">{pageData.section}</span>
              <h1 className="text-4xl font-bold text-white mt-2 mb-4">
                {pageData.title}
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-8">
              <div>
                <div className="prose prose-invert max-w-none break-words markdown-content">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      id={section.id}
                      className="doc-section"
                      style={{ scrollMarginTop: '6rem' }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {section.content}
                      </ReactMarkdown>
                    </div>
                  ))}

                  <div className="mt-10">
                    {!navNext && navPrev ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href={navPrev.href} className="block w-full no-underline md:col-span-2">
                          <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/6 transition-colors h-full w-full">
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/6 text-white/60">
                              <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                            </div>
                            <div className="ml-3 text-left">
                              <div className="text-xs text-white/60">Previous</div>
                              <div className="text-sm text-white font-semibold">{navPrev.title}</div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {navPrev ? (
                          <Link href={navPrev.href} className={`block w-full no-underline ${navNext ? '' : 'md:col-span-2'}`}>
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/6 transition-colors h-full w-full">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/6 text-white/60">
                                <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                              </div>
                              <div className="text-left">
                                <div className="text-xs text-white/60">Previous</div>
                                <div className="text-sm text-white font-semibold">{navPrev.title}</div>
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex-1" />
                        )}
                        {navNext && (
                          <Link href={navNext.href} className={`block w-full no-underline text-right ${navPrev ? '' : 'md:col-span-2'}`}>
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/6 transition-colors justify-end h-full w-full">
                              <div className="text-right mr-3">
                                <div className="text-xs text-white/60">Next</div>
                                <div className="text-sm text-white font-semibold">{navNext.title}</div>
                              </div>
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/6 text-white/60">
                                <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                              </div>
                            </div>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {tocSections && tocSections.length > 0 && (
                <PageTOC
                  sections={tocSections}
                  onClick={(id) => {
                    const sectionEl = document.getElementById(id);
                    if (!sectionEl) return;

                    const yOffset = -100;
                    const y = sectionEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });

                    setTimeout(() => {
                      sectionEl.classList.remove('flash');
                      void sectionEl.offsetWidth;
                      sectionEl.classList.add('flash');

                      manualActiveRef.current.id = id;
                      manualActiveRef.current.clearOnScroll = true;
                      if (manualActiveRef.current.timeout) {
                        window.clearTimeout(manualActiveRef.current.timeout);
                      }
                      manualActiveRef.current.timeout = window.setTimeout(() => {
                        manualActiveRef.current.id = null;
                        manualActiveRef.current.timeout = null;
                      }, 1000);
                      setActiveSectionId(id);

                      setTimeout(() => {
                        sectionEl.classList.remove('flash');
                      }, 800);
                    }, 300);
                  }}
                  activeId={activeSectionId}
                />
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
