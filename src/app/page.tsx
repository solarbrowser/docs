'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import DocsSidebar from '@/components/DocsSidebar';
import PageTOC from '@/components/PageTOC';
import { IconDisplay } from '@/components/Icons';
import { useRef } from 'react';
import Link from 'next/link';

interface DocItem {
  title: string;
  href: string;
}

interface Section {
  title: string;
  icon: string;
  description?: string;
  order: number;
  items: DocItem[];
}

interface Card {
  title: string;
  description: string;
  icon: string;
  href: string;
}

interface DocsData {
  sections: Section[];
  cards: Card[];
  homepage?: {
    title?: string;
    description?: string;
    cta?: { label: string; href: string };
    faqButton?: { label: string; href: string };
    showCards?: boolean;
  };
}

export default function DocsPage() {
  const [docsData, setDocsData] = useState<DocsData>({ sections: [], cards: [] });
  const [navNext, setNavNext] = useState<{ title: string; href: string } | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const manualActiveRef = useRef<{ id: string | null; timeout?: number | null; clearOnScroll?: boolean }>({ id: null, timeout: null, clearOnScroll: false });
  const bottomTimeoutRef = useRef<number | null>(null);

  const normalize = (h: string) => {
    if (!h) return '/';
    try {
      if (h === '/') return '/';
      let s = h.replace(/\\/g, '/');
      s = s.split(/[?#]/)[0];
      if (s !== '/' && s.endsWith('/')) s = s.replace(/\/\/+$/g, '');
      return s || '/';
    } catch (e) {
      return h;
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const configRes = await fetch('/api/docs/config');
        if (configRes.ok) {
          const { data } = await configRes.json();
          setDocsData({ sections: data.sections, cards: [], homepage: data.homepage });

          // Build navigation chain
          const flatItems: { title: string; href: string }[] = [];
          for (const s of data.sections) {
            for (const it of s.items) {
              flatItems.push({ title: it.title, href: it.href });
            }
          }

          const navChain = [{ title: data.homepage?.title || 'Documentation', href: '/' }, ...flatItems];
          const dedupedMap = new Set<string>();
          const dedupedNavChain: Array<any> = [];

          for (let i = 0; i < navChain.length; i++) {
            const entry = navChain[i];
            const nHref = normalize(entry.href || '/');
            if (!dedupedMap.has(nHref)) {
              dedupedMap.add(nHref);
              dedupedNavChain.push({ ...entry, __normalizedHref: nHref, __origIndex: i });
            }
          }

          setNavNext(dedupedNavChain[1] || null);
        }
      } catch (err) {
        console.error('Error loading docs data:', err);
      }
    };
    load();
  }, []);

  // Trigger flash when navigated from search results
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const flash = window.sessionStorage.getItem('docs-flash');
      if (!flash) return;
      // Remove to avoid handling twice
      window.sessionStorage.removeItem('docs-flash');
      const [p, hash] = flash.split('#');
      const pathname = window.location.pathname || '/';
      if (normalize(p) === normalize(pathname)) {
        if (!hash) return;
        const el = document.getElementById(hash);
        if (!el) return;
        smoothScrollTo(el, 280);
        el.classList.remove('flash');
        void el.offsetWidth;
        el.classList.add('flash');
        manualActiveRef.current.id = hash;
        manualActiveRef.current.clearOnScroll = true;
        if (manualActiveRef.current.timeout) {
          window.clearTimeout(manualActiveRef.current.timeout);
        }
        manualActiveRef.current.timeout = window.setTimeout(() => {
          manualActiveRef.current.id = null;
          manualActiveRef.current.timeout = null;
        }, 700);
        setActiveSectionId(hash);
        setTimeout(() => el.classList.remove('flash'), 800);
      }
    } catch (e) {
      // ignore
    }
  }, [docsData]);

  // Clear manual override when the user manually scrolls
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

  const homepage = docsData.homepage || {};

  // Ensure the last homepage section is selected when scrolled to the bottom
  // Debounced so the change only occurs after scrolling settles to avoid jumpiness
  useEffect(() => {
    if (!homepage || !Array.isArray((homepage as any).sections) || (homepage as any).sections.length === 0) return;
    const threshold = 40;
    const settleMs = 150;
    const handler = () => {
      try {
        if (manualActiveRef.current.id) return; // user override in effect
        const scrollBottom = (window.innerHeight || document.documentElement.clientHeight) + window.scrollY;
        const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight || 0);
        const atBottom = scrollBottom >= docHeight - threshold;
        if (bottomTimeoutRef.current) { window.clearTimeout(bottomTimeoutRef.current); bottomTimeoutRef.current = null; }
        if (atBottom) {
          bottomTimeoutRef.current = window.setTimeout(() => {
            try {
              const secLen = (homepage as any).sections.length;
              const lastId = `homepage-section-${secLen - 1}`;
              manualActiveRef.current.id = lastId;
              setActiveSectionId(lastId);
              if (manualActiveRef.current.timeout) { window.clearTimeout(manualActiveRef.current.timeout); manualActiveRef.current.timeout = null; }
              manualActiveRef.current.timeout = window.setTimeout(() => {
                manualActiveRef.current.id = null;
                manualActiveRef.current.timeout = null;
              }, 600);
            } catch (e) { /* ignore */ }
          }, settleMs) as any;
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
      if (bottomTimeoutRef.current) { window.clearTimeout(bottomTimeoutRef.current); bottomTimeoutRef.current = null; }
    };
  }, [homepage]);

  const mainRef = useRef<HTMLElement | null>(null);

  const smoothScrollTo = (el: HTMLElement, duration = 280) => {
    const targetY = window.scrollY + el.getBoundingClientRect().top - 80;
    const startY = window.scrollY;
    const diff = targetY - startY;
    let startTime: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const time = timestamp - startTime;
      const progress = Math.min(time / duration, 1);
      window.scrollTo(0, startY + diff * ease(progress));
      if (time < duration) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <div className="min-h-screen bg-dark">
      <DocsSidebar sections={docsData.sections} />
      <main className="lg:ml-80 ml-0 pt-16 lg:pt-6">
        <div className="max-w-6xl px-6 md:px-12 pl-8 md:pl-12 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="mb-6 flex items-center justify-between">
              {/* Keep page-level actions or CTAs aligned similarly to other pages */}
            </div>
            <div className="mb-8">
              <span className="text-sm text-white/40">Documentation</span>
              <h1 className="text-4xl font-bold mt-2 mb-4 text-white">{docsData.homepage?.title || 'Documentation'}</h1>
            </div>
            {docsData.homepage?.description && (
              <div className="prose prose-invert max-w-none text-base text-white/60">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children, ...props }: any) => <p className="mb-4" {...props}>{children}</p>,
                    a: ({ node, ...props }: any) => <a className="text-amber-400 hover:underline" {...props} />,
                    code: ({ node, inline, className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {docsData.homepage.description}
                </ReactMarkdown>
              </div>
            )}
          </motion.div>

          {/* Section Cards: large cards linking to the main categories (sections) */}
          {docsData.sections && docsData.sections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {docsData.sections.map((section, idx) => {
                const firstItem = section.items[0];
                const href = firstItem ? firstItem.href : '#';
                const pageCount = section.items ? section.items.length : 0;
                return (
                  <Link key={idx} href={href}>
                    <div className="group p-4 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer flex items-center gap-4">
                      <div className="flex-none w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center">
                        <IconDisplay iconValue={section.icon} className="text-lg text-white/60" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{section.title}</h3>
                        <div className="text-xs text-white/50 mt-2">{pageCount} {pageCount === 1 ? 'page' : 'pages'}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {homepage.showCards && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {docsData.cards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 + idx * 0.05 }}
                >
                  <Link href={card.href}>
                    <div className="group p-4 hover:bg-white/5 hover:border-white/20 transition-all duration-300 cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className="p-1 rounded-lg bg-white/6 flex items-center justify-center">
                          <IconDisplay iconValue={card.icon} className="text-lg text-white/60" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2 text-white">
                            {card.title}
                          </h3>
                          <p className="text-sm text-white/60 group-hover:text-white/80 break-words" style={{ hyphens: 'auto' }}>
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {homepage.faqButton && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex justify-end pt-8 border-t border-white/10"
            >
              <Link href={homepage.faqButton.href}>
                <div className="group flex items-center gap-2 px-6 py-3 rounded-lg bg-transparent hover:bg-white/5 transition-all">
                  <span className="font-medium text-white">{homepage.faqButton.label}</span>
                  <svg className="w-5 h-5 text-white transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </motion.div>
          )}
          {/* Homepage Next footer */}
          {navNext && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href={navNext.href} className={`block w-full no-underline md:col-span-2`}>
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
            </div>
          )}
          {/* TOC for homepage if it has sections */}
          <PageTOC
            sections={(homepage as any).sections?.map((s: any, idx: number) => ({ title: s.title, id: `homepage-section-${idx}` }))}
            activeId={activeSectionId}
            onClick={(id) => {
            const el = document.getElementById(id);
            if (!el) return;
            try {
              const r = el.getBoundingClientRect();
              const fullyVisible = r.top >= 0 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight);
              if (!fullyVisible) {
                try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                catch (e) { smoothScrollTo(el, 280); }
              }
            } catch (e) { try { smoothScrollTo(el, 280); } catch (err) {} }
            el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
            // Keep this clicked entry active and prevent auto-updates briefly
            manualActiveRef.current.id = id;
            manualActiveRef.current.clearOnScroll = true;
            if (manualActiveRef.current.timeout) {
              window.clearTimeout(manualActiveRef.current.timeout);
            }
            manualActiveRef.current.timeout = window.setTimeout(() => {
              manualActiveRef.current.id = null;
              manualActiveRef.current.timeout = null;
            }, 700);
            setActiveSectionId(id);
            setTimeout(() => el.classList.remove('flash'), 800);
          }} />
        </div>
      </main>
    </div>
  );
}
