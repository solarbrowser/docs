'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconDisplay } from './Icons';

type TOCItem = {
  title: string;
  id?: string;
  peak?: boolean;
  icon?: string;
  children?: TOCItem[];
};

interface PageTOCProps {
  sections?: TOCItem[];
  onClick?: (id: string) => void;
  activeId?: string | null;
}

function RenderItem({ item, onClick, activeId, level = 0 }: { item: TOCItem; onClick?: (id: string) => void; activeId?: string | null; level?: number }) {
  const id = item.id || '';
  const isActive = id && (activeId === id);
  const padding = level === 0 ? 'py-2' : 'py-1.5';
  const handleClick = (idToUse: string) => {
    if (!idToUse) return;
    try {
      const el = document.getElementById(idToUse);
      if (el) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        catch (e) {
          const targetY = window.scrollY + el.getBoundingClientRect().top - (window.innerHeight / 2) + (el.getBoundingClientRect().height / 2);
          window.scrollTo({ left: 0, top: targetY, behavior: 'smooth' });
        }
        el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 800);
      }
    } catch (e) {}
    try { onClick && onClick(idToUse); } catch (e) {}
  };
  const textColor = isActive
    ? 'text-yellow-400'
    : level === 0
      ? 'text-white'
      : 'text-white/50';

  const fontWeight = isActive ? 'font-semibold' : level === 0 ? 'font-medium' : 'font-normal';

  return (
    <div>
      <button
        data-toc-id={id}
        onClick={() => id && handleClick(id)}
        className={`w-full text-left flex items-center gap-2 rounded transition-colors ${isActive ? 'bg-transparent' : 'bg-transparent hover:bg-white/5'}`}
      >
        <div className={`flex items-center justify-center ${padding} w-6`}>
          {item.icon && level === 0 ? (
            <IconDisplay iconValue={item.icon} className="w-4 h-4" />
          ) : (
            <div className="w-3" />
          )}
        </div>
        <div className={`flex-1 text-left text-sm ${textColor} ${fontWeight}`} style={{ paddingLeft: level ? level * 24 : 0 }}>
          {item.title}
        </div>
      </button>
      {item.children && item.children.length > 0 && (
        <div className="space-y-0.5">
          {item.children.map((c) => (
            <div key={c.id || c.title}>
              <RenderItem item={c} onClick={onClick} activeId={activeId} level={(level || 0) + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PageTOC({ sections = [], onClick, activeId }: PageTOCProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  const containerRef = useRef<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [barStyle, setBarStyle] = useState<{ top: number; height: number; visible: boolean; marker?: number; maxHeight: number }>({ top: 0, height: 0, visible: false, marker: 0, maxHeight: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const header = container.querySelector('.toc-header') as HTMLElement | null;
    if (!activeId) {
      setBarStyle((s) => ({ ...s, visible: false }));
      return;
    }
    const target = container.querySelector(`[data-toc-id="${activeId}"]`) as HTMLElement | null;
    if (!target || !header) {
      setBarStyle((s) => ({ ...s, visible: false }));
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const wrapper = wrapperRef.current || container.querySelector('.relative') as HTMLElement | null;
    const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : containerRect;

    const elementCenterRelative = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.top - wrapperRect.top + (el.offsetHeight || r.height) / 2 + (wrapper ? wrapper.scrollTop || 0 : 0);
    };

    const allItems = container.querySelectorAll('[data-toc-id]');
    const firstItem = allItems[0] as HTMLElement | null;
    const lastItem = allItems[allItems.length - 1] as HTMLElement | null;

    const firstTitleEl = firstItem ? (firstItem.querySelector('div:nth-child(2)') as HTMLElement | null) : null;
    const lastTitleEl = lastItem ? (lastItem.querySelector('div:nth-child(2)') as HTMLElement | null) : null;

    const firstCenter = firstTitleEl ? elementCenterRelative(firstTitleEl) : firstItem ? elementCenterRelative(firstItem) : Math.max(6, headerRect.bottom - wrapperRect.top + 6);
    const lastCenter = lastTitleEl ? elementCenterRelative(lastTitleEl) : lastItem ? elementCenterRelative(lastItem) : firstCenter;

    let top = 10;
    const titleEl = target.querySelector('div:nth-child(2)') as HTMLElement | null;
    const targetCenter = titleEl ? elementCenterRelative(titleEl) : elementCenterRelative(target);

    const maxHeight = Math.max(6, lastCenter - top + 10);
    let rawHeight = targetCenter - top;
    let height = Math.max(6, Math.min(rawHeight, maxHeight));

    const isLastItem = target === lastItem;
    if (isLastItem) {
      height = maxHeight;
    }

    let rawMarker = Math.max(top + 4, Math.min(targetCenter, top + height - 4));
    let marker = Math.max(top + 4, rawMarker - 2);

    if (isLastItem) {
      marker = top + height - 4;
    }

    setBarStyle({ top, height: Math.max(6, height), visible: true, marker, maxHeight });
  }, [activeId, sections]);

  if (!isClient) return null;
  if (!sections || sections.length === 0) return null;

  return createPortal(
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-6 right-6 z-50 inline-flex items-center justify-center gap-0 px-3 h-11 text-white/60 hover:text-white hover:bg-white/5 transition-all rounded-lg bg-[#1a1a1a] border border-white/10 shadow-lg"
        aria-label="Open On This Page"
      >
        <IconDisplay iconValue="document" className="w-5 h-5" />
      </button>

      <aside
        ref={containerRef as any}
        className="hidden lg:block"
        style={{ position: 'fixed', right: '4rem', top: '4rem', width: '16rem', maxHeight: 'calc(100vh - 8rem)' }}
      >
      <div className="flex items-center gap-2 mb-3 text-white/60 toc-header">
        <span className="text-xs font-semibold uppercase tracking-wider">On this page</span>
      </div>
      <div className="relative overflow-y-auto max-h-[calc(100vh-12rem)] pr-2 hide-scrollbar" ref={(el) => { wrapperRef.current = el as HTMLElement | null; }}>
        <div
          style={{
            position: 'absolute',
            left: 8,
            width: 3,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.1)',
            top: 10,
            height: barStyle.maxHeight,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 8,
            width: 3,
            borderRadius: 4,
            background: '#FFD700',
            top: barStyle.top,
            height: barStyle.visible ? barStyle.height : 0,
            transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1), top 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
            opacity: barStyle.visible ? 1 : 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 6.5,
            width: 6,
            height: 6,
            borderRadius: 999,
            background: '#FFD700',
            transform: 'translateY(-50%)',
            top: barStyle.marker || 0,
            transition: 'top 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
            opacity: barStyle.visible ? 1 : 0,
          }}
        />
        <div className="space-y-1 bg-transparent px-1">
          {sections.map((s) => (
            <RenderItem key={s.id || s.title} item={s} onClick={onClick} activeId={activeId} />
          ))}
        </div>
      </div>
    </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-white/10 rounded-t-lg max-h-[70vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white/60">
                <span>On this page</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-white/60 p-2">Close</button>
            </div>
            <div className="space-y-2">
              {sections.map((s) => (
                <div key={s.id || s.title}>
                  <RenderItem item={s} onClick={(id) => { setMobileOpen(false); onClick?.(id); }} activeId={activeId} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
