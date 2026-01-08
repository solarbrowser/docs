'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { getIconSvg } from '@/components/Icons';

interface InlineSearchProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  runSearchImmediate: (q: string) => void;
  showResultsDropdown: boolean;
  setShowResultsDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  searchResults: any[];
  setSearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  inlineInputRef: React.RefObject<HTMLInputElement | null>;
  inlinePanelRef: React.RefObject<HTMLDivElement | null>;
  openSectionForHref: (href: string) => void;
  setOpenSections: React.Dispatch<React.SetStateAction<string[]>>;
  router: any;
  autoNavigateTimer: React.MutableRefObject<number | null>;
  navigateTo: (href: string) => void;
}

function InlineSearchComponent(props: InlineSearchProps) {
  const {
    searchQuery,
    setSearchQuery,
    runSearchImmediate,
    showResultsDropdown,
    setShowResultsDropdown,
    searchResults,
    setSearchResults,
    selectedIndex,
    setSelectedIndex,
    inlineInputRef,
    inlinePanelRef,
    openSectionForHref,
    setOpenSections,
    router,
    autoNavigateTimer,
  } = props;
  const { navigateTo } = props;

  return (
            <div className="relative w-full">
      <div className="bg-[#1b1a1b] border border-white/10 rounded-md w-full">
        <div className="p-3">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inlineInputRef}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); runSearchImmediate(e.target.value); }}
              onFocus={() => { setShowResultsDropdown(true); }}
              onKeyDown={() => { /* no-op logging here */ }}
              placeholder="Search..."
                className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showResultsDropdown && (
          <motion.div
            ref={inlinePanelRef as any}
            key={'inline-results-popup'}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 z-40 bg-[#1b1a1b] border border-white/10 rounded-md max-h-64 overflow-y-auto shadow-sm"
          >
            {searchResults.length > 0 ? (
              <div>
                {searchResults.map((r, idx) => (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={-1}
                    onMouseDown={(ev) => {
                      try {
                        ev.preventDefault();
                        if (autoNavigateTimer.current) { window.clearTimeout(autoNavigateTimer.current); autoNavigateTimer.current = null; }
                        if (r.type === 'section') setOpenSections((prev) => (prev.includes(r.title) ? prev : [...prev, r.title]));
                        if (r.type === 'page') openSectionForHref(r.href);
                        try { window.sessionStorage.setItem('docs-flash', r.href); } catch (e) { /* ignore */ }
                        navigateTo(r.href);
                      } catch (err) {
                        // ignore
                      }
                    }}
                    onClick={(ev) => {
                      // prevent default click handling because navigation is handled on mouseDown
                      ev.preventDefault();
                      try { setSearchQuery(''); setSearchResults([]); setShowResultsDropdown(false); } catch (e) {}
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-white/5 transition-colors ${idx === selectedIndex ? 'bg-white/10 text-white' : 'text-white/80'}`}
                  >
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className="text-xs text-white/60">{r.parentTitle || (r.type === 'section' ? 'Section' : r.type)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-white/60">No results</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SidebarSection {
  title: string;
  icon: string;
  description?: string;
  items: {
    title: string;
    href: string;
  }[];
}
interface DocsSidebarProps {
  sections: SidebarSection[];
}
export default function DocsSidebar({ sections }: DocsSidebarProps) {
  const [openSections, setOpenSections] = useState<string[]>(sections.map((s: SidebarSection) => s.title));
  const [collapsed, setCollapsed] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const normalize = (h: string) => {
    if (!h) return '/';
    try {
      if (h === '/') return '/';
      let s = h.replace(/\\/g, '/');
      s = s.split(/[?#]/)[0];
      if (s !== '/' && s.endsWith('/')) s = s.replace(/\/\/+$/g, '');
      return s || '/';
    } catch (e) { return h; }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const autoNavigateTimer = useRef<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const searchTimeout = useRef<number | null>(null);
  const [overlayDirection, setOverlayDirection] = useState<'left'|'right'>('right');
  const collapsedInputRef = useRef<HTMLInputElement | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const collapsedPanelRef = useRef<HTMLDivElement | null>(null);
  const [collapsedPanelWidth, setCollapsedPanelWidth] = useState<number | null>(null);
  const [collapsedPanelRect, setCollapsedPanelRect] = useState<{ left: number; top: number; bottom: number } | null>(null);
  const collapsedButtonRef = useRef<HTMLButtonElement | null>(null);
  const inlinePanelRef = useRef<HTMLDivElement | null>(null);
  const [collapsedFully, setCollapsedFully] = useState(false);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);
  const [overlayPos, setOverlayPos] = useState<{ top: number; left: number } | null>(null);
  const lastMouseDownTarget = useRef<Node | null>(null);

  const toggleSection = (title: string) => {
    setOpenSections((prev: string[]) =>
      prev.includes(title)
        ? prev.filter((t: string) => t !== title)
        : [...prev, title]
    );
  };

  const openSectionForHref = (href: string) => {
    const normalizedHref = normalize(href);
    for (const section of sections) {
      for (const item of section.items || []) {
        if (normalize(item.href) === normalizedHref) {
          setOpenSections((prev) => (prev.includes(section.title) ? prev : [...prev, section.title]));
          return;
        }
      }
    }
  };

  const navigateTo = (href: string) => {
    if (!href) return;
    try {
      if (typeof window === 'undefined') {
        try { router.push(href); } catch (e) { /* ignore */ }
        return;
      }
      if (typeof href === 'string' && href.startsWith('#')) {
        const hashOnly = href.replace('#', '');
        try { window.sessionStorage.setItem('docs-flash', `${window.location.pathname}#${hashOnly}`); } catch (e) {}
        window.location.hash = hashOnly;
        return;
      }
      try { window.location.href = href; } catch (e) {
        try { router.push(href); } catch (er) { window.location.href = href; }
      }
    } catch (e) {
      try { router.push(href); } catch (err) { /* ignore */ }
    }
  };

  const SearchCard = ({ isCollapsed, isAttached }: { isCollapsed?: boolean, isAttached?: boolean }) => (
        <div className={`${isCollapsed ? 'rounded-md' : 'rounded-md shadow-sm'} ${isAttached ? 'rounded-l-none border-l-0' : ''} bg-[#1b1a1b] border border-white/10 overflow-hidden w-full`}> 
      {!isAttached && (
        <div className={`flex items-center gap-2 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <div className="relative w-full">
            {!isCollapsed && (
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            {isCollapsed && (
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}

            {!isAttached && (
              <>
              <input
                ref={(el) => {
                  if (isCollapsed) collapsedInputRef.current = el;
                }}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchQuery(e.target.value); runSearchImmediate(e.target.value); }}
                onFocus={() => { setShowResultsDropdown(true); if (isCollapsed) setCollapsedFully(true); }}
                placeholder={isCollapsed ? 'Search' : 'Search documentation...'}
                className={`w-full ${isCollapsed ? 'pl-10 pr-10 h-9 text-sm' : 'pl-10 pr-10 py-2 text-sm'} bg-transparent transition-colors text-white outline-none focus:outline-none focus:ring-0 placeholder-white/40 border-b border-white/10`}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Escape') {
                    setSearchQuery(''); setSearchResults([]); setShowResultsDropdown(false);
                  }
                }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResultsDropdown(false); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white p-1">×</button>
              )}
              </>
            )}
          </div>
          
        </div>
      )}
          <AnimatePresence>
          {showResultsDropdown && (searchResults.length > 0 ? (
          <motion.div key={isCollapsed ? 'c-results' : 's-results'} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className={(() => {
            if (isAttached && isCollapsed) return 'rounded-b-md border-t-0 bg-[#1b1a1b] mt-0';
            return ` ${isCollapsed ? 'rounded-md' : 'rounded-b-md'} border-t border-white/10 bg-[#1b1a1b] ${isAttached ? 'mt-0' : (isCollapsed ? 'mt-2' : '')}`;
          })()}>
            <div className="max-h-64 overflow-y-auto">
                {searchResults.map((r, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={-1}
                  onMouseDown={(ev) => {
                    try {
                      ev.preventDefault();
                      if (autoNavigateTimer.current) { window.clearTimeout(autoNavigateTimer.current); autoNavigateTimer.current = null; }
                      if (r.type === 'section') setOpenSections((prev) => (prev.includes(r.title) ? prev : [...prev, r.title]));
                      if (r.type === 'page') openSectionForHref(r.href);
                      try { window.sessionStorage.setItem('docs-flash', r.href); } catch (e) { /* ignore */ }
                      navigateTo(r.href);
                    } catch (err) { /* ignore */ }
                  }}
                  onClick={(ev) => {
                    ev.preventDefault();
                    try { setSearchQuery(''); setSearchResults([]); setShowResultsDropdown(false); } catch (e) {}
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-white/5 transition-colors ${idx === selectedIndex ? 'bg-white/10 text-white' : 'text-white/80'}`}
                >
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-white/60">{r.parentTitle || (r.type === 'section' ? 'Section' : r.type)}</div>
                </div>
              ))}
            </div>
          </motion.div>
          ) : (
            <motion.div key={'no-results'} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className={`${isCollapsed ? `p-2 rounded-md ${isAttached ? 'mt-0' : 'mt-2'} text-sm text-white/60 border-t border-white/10` : 'p-3 text-sm text-white/60 rounded-b-md border-t border-white/10'}`}>No results</motion.div>
          ))}
          </AnimatePresence>
    </div>
  );


  useEffect(() => {
    const onMouseDown = (ev: MouseEvent) => { lastMouseDownTarget.current = ev.target as Node | null; };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    if (searchExpanded) {
      if (collapsedButtonRef.current) {
        const rect = collapsedButtonRef.current.getBoundingClientRect();
        const maxAllowed = Math.max(240, Math.min(560, window.innerWidth - 48));
        const availableRight = window.innerWidth - rect.right - 12;
        if (availableRight >= 240) {
          setOverlayDirection('right');
          setOverlayWidth(Math.min(maxAllowed, availableRight));
          setOverlayPos({ top: rect.top + rect.height / 2, left: rect.right - 1 });
        } else {
          const availableLeft = rect.left - 12;
          setOverlayDirection('left');
          setOverlayWidth(Math.min(maxAllowed, Math.max(160, availableLeft)));
          setOverlayPos({ top: rect.top + rect.height / 2, left: rect.left - Math.min(maxAllowed, Math.max(160, availableLeft)) - 8 });
        }
      }
      requestAnimationFrame(() => {
        try { collapsedInputRef.current && collapsedInputRef.current.focus(); } catch (e) { /* ignore */ }
      });
      requestAnimationFrame(() => {
        try {
          const el = collapsedPanelRef.current;
          if (el && el.firstElementChild) {
            const rect = (el.firstElementChild as HTMLElement).getBoundingClientRect();
            setCollapsedPanelWidth(Math.round(rect.width));
            setCollapsedPanelRect({ left: Math.round(rect.left), top: Math.round(rect.top), bottom: Math.round(rect.bottom) });
          }
        } catch (e) { /* ignore */ }
      });
    }
  }, [searchExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apply = () => {
      setCollapsed(window.innerWidth < 1024);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  const firstLoadRef = useRef(true);
  useEffect(() => {
    if (!sections || sections.length === 0) return;
    if (firstLoadRef.current) {
      setOpenSections([sections[0].title]);
      firstLoadRef.current = false;
      return;
    }
    try {
      const normPath = normalize(pathname || '/');
      let matchedTitle: string | null = null;
      for (const s of sections) {
        for (const it of s.items || []) {
          if (normalize(it.href) === normPath) {
            matchedTitle = s.title;
            break;
          }
          const base = normalize(it.href).split('#')[0];
          if (normPath.startsWith(base + '/')) { matchedTitle = s.title; break; }
        }
        if (matchedTitle) break;
      }
      if (matchedTitle) setOpenSections([matchedTitle]);
      else setOpenSections([]);
    } catch (e) {}
  }, [pathname, sections]);
  useEffect(() => {
    if (!searchExpanded) return;
    const handler = () => {
      try {
        const el = collapsedPanelRef.current;
        if (el && el.firstElementChild) {
          const rect = (el.firstElementChild as HTMLElement).getBoundingClientRect();
          setCollapsedPanelWidth(Math.round(rect.width));
          setCollapsedPanelRect({ left: Math.round(rect.left), top: Math.round(rect.top), bottom: Math.round(rect.bottom) });
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [searchExpanded]);

  useEffect(() => {
    if (!searchExpanded) return;
    const handler = () => {
      if (!collapsedButtonRef.current) return;
      const rect = collapsedButtonRef.current.getBoundingClientRect();
      const maxAllowed = Math.max(240, Math.min(560, window.innerWidth - 48));
      const availableRight = window.innerWidth - rect.right - 12;
      if (availableRight >= 240) {
        setOverlayDirection('right');
        setOverlayWidth(Math.min(maxAllowed, availableRight));
        setOverlayPos({ top: rect.top + rect.height / 2, left: rect.right - 1 });
      } else {
        const availableLeft = rect.left - 12;
        setOverlayDirection('left');
        setOverlayWidth(Math.min(maxAllowed, Math.max(160, availableLeft)));
        setOverlayPos({ top: rect.top + rect.height / 2, left: rect.left - Math.min(maxAllowed, Math.max(160, availableLeft)) - 8 });
      }
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler);
    };
  }, [searchExpanded]);

  useEffect(() => {
    if (searchExpanded) setSelectedIndex(0);
  }, [searchExpanded]);

  useEffect(() => {
    if (!searchExpanded) return;
    const handler = (ev: MouseEvent) => {
      const t = ev.target as Node | null;
      if (!collapsedPanelRef.current) return;
      if (t && (collapsedPanelRef.current.contains(t) || (collapsedButtonRef.current && collapsedButtonRef.current.contains(t)))) return;
      setSearchExpanded(false);
      setShowResultsDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchExpanded]);

  const runSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    try {
      const response = await fetch(`/api/docs/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        setSearchResults([]);
        return;
      }

      const data = await response.json();
      if (data.ok && data.results) {
        setSearchResults(data.results);
        setShowResultsDropdown(true);
        setSelectedIndex(0);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }

    if (autoNavigateTimer.current) {
      window.clearTimeout(autoNavigateTimer.current);
      autoNavigateTimer.current = null;
    }
  };

  const runSearchImmediate = (q: string) => {
    if (searchTimeout.current) {
      window.clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }
    setSelectedIndex(0);

    if (!q || q.length < 2) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    searchTimeout.current = window.setTimeout(() => runSearch(q), 300) as any;
  };

  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    if (!searchQuery) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }
    searchTimeout.current = window.setTimeout(() => runSearch(searchQuery), 300) as any;
    return () => {
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
      if (autoNavigateTimer.current) { window.clearTimeout(autoNavigateTimer.current); autoNavigateTimer.current = null; }
    };
  }, [searchQuery]);

  if (collapsed) {
    return (
      <div className="fixed top-6 left-6 z-50">
          <div className={`flex rounded-lg bg-[#1a1a1a] border border-white/10 shadow-lg overflow-visible relative`}>
          <button
            onClick={() => setCollapsed(false)}
            className="p-3 text-white/60 hover:text-white hover:bg-white/5 transition-all border-r border-white/10"
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <motion.div initial={false} transition={{ duration: 0.2 }} className="relative flex items-center">
            {!searchExpanded ? (
              <button
                ref={(el) => { collapsedButtonRef.current = el; return; }}
                onClick={() => {
                  setSearchExpanded(true);
                  setShowResultsDropdown(Boolean(searchQuery));
                }}
                className={`p-3 text-white/60 hover:text-white hover:bg-white/5 transition-all rounded-md`}
                title="Open search"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            ) : (
              <div ref={(el) => { collapsedPanelRef.current = el as HTMLDivElement | null; }} className="ml-2 z-50">
                <div className="bg-[#1b1a1b] px-3 h-9 rounded-full shadow-sm w-52 min-w-[160px]">
                  <div className="flex items-center gap-2 h-full">
                    <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={(el) => { collapsedInputRef.current = el; }}
                      onFocus={() => { setShowResultsDropdown(true); }}
                      onBlur={() => {
                        requestAnimationFrame(() => {
                          const last = lastMouseDownTarget.current;
                          if (last && collapsedPanelRef.current && collapsedPanelRef.current.contains(last)) return;
                          if (!(last && collapsedPanelRef.current && collapsedPanelRef.current.contains(last))) {
                            setSearchExpanded(false);
                            setShowResultsDropdown(false);
                          }
                        });
                      }}
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); runSearchImmediate(e.target.value); }}
                      placeholder="Search"
                      className="bg-transparent flex-1 min-w-0 h-full text-sm text-white placeholder-white/40 outline-none focus:outline-none focus:ring-0 px-1 truncate"
                    />
                    {searchQuery && (
                      <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResultsDropdown(false); }} className="text-white/60 hover:text-white p-1">×</button>
                    )}
                  </div>
                </div>
                {showResultsDropdown && typeof document !== 'undefined' && collapsedPanelRect && (
                  createPortal(
                    <div
                      style={{
                          position: 'absolute',
                          left: (collapsedPanelRect.left + window.scrollX) + 8,
                          top: collapsedPanelRect.bottom + window.scrollY + 8,
                          width: collapsedPanelWidth ? `${Math.max(collapsedPanelWidth - 8, 120)}px` : undefined,
                          zIndex: 9999,
                        }}
                      className="bg-[#1b1a1b] border border-white/10 rounded-md max-h-60 overflow-y-auto shadow-lg"
                    >
                      {searchResults.length > 0 ? (
                        <div>
                          {searchResults.map((r, idx) => (
                            <div
                              key={idx}
                              role="button"
                              tabIndex={-1}
                              onMouseDown={(ev) => {
                                try {
                                  ev.preventDefault();
                                  if (autoNavigateTimer.current) { window.clearTimeout(autoNavigateTimer.current); autoNavigateTimer.current = null; }
                                  if (r.type === 'section') setOpenSections((prev) => (prev.includes(r.title) ? prev : [...prev, r.title]));
                                  if (r.type === 'page') openSectionForHref(r.href);
                                  try { window.sessionStorage.setItem('docs-flash', r.href); } catch (e) { /* ignore */ }
                                  navigateTo(r.href);
                                } catch (err) { /* ignore */ }
                              }}
                              onClick={(ev) => { ev.preventDefault(); try { setSearchQuery(''); setSearchResults([]); setShowResultsDropdown(false); } catch (e) {} }}
                              className={`w-full text-left px-3 py-2 hover:bg-white/5 transition-colors ${idx === selectedIndex ? 'bg-white/10 text-white' : 'text-white/80'}`}
                            >
                              <div className="text-sm font-medium">{r.title}</div>
                              <div className="text-xs text-white/60">{r.parentTitle || (r.type === 'section' ? 'Section' : r.type)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-white/60">No results</div>
                      )}
                    </div>,
                    document.body
                  )
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <aside className="flex w-64 fixed left-0 top-0 bottom-0 border-r border-white/10 bg-[#1a1a1a] flex-col z-10">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Solar" className="w-8 h-8" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">Solar</span>
              <span className="text-xl font-normal text-white/60">Docs</span>
            </div>
          </Link>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      <div className="px-6 pb-6">
        <div className="relative">
                  <InlineSearchComponent
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    runSearchImmediate={runSearchImmediate}
                    showResultsDropdown={showResultsDropdown}
                    setShowResultsDropdown={setShowResultsDropdown}
                    searchResults={searchResults}
                    setSearchResults={setSearchResults}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    inlineInputRef={inlineInputRef}
                    inlinePanelRef={inlinePanelRef}
                    openSectionForHref={openSectionForHref}
                    setOpenSections={setOpenSections}
                    router={router}
                    autoNavigateTimer={autoNavigateTimer}
                    navigateTo={navigateTo}
                  />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {sections.map((section: SidebarSection, idx: number) => (
          <div key={idx}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full mb-2 text-white/80 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: getIconSvg(section.icon) }} />
                <span className="font-semibold text-sm">{section.title}</span>
              </div>
              <motion.svg
                animate={{ rotate: openSections.includes(section.title) ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>

            <AnimatePresence>
              {openSections.includes(section.title) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-1 ml-7 mb-2"
                >
                  {section.items.map((item: any, itemIdx: number) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={itemIdx}
                        href={item.href}
                        className={`block py-2 px-3 text-sm rounded-lg transition-all ${
                              isActive
                                ? 'bg-white/10 text-white font-medium'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}>
                        {item.title}
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-white/10 bg-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <a href="https://github.com/solarbrowser" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </aside>
  );
}
