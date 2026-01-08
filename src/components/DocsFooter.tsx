'use client';

import { useTheme } from '@/context/ThemeContext';

export default function DocsFooter() {
  const { theme } = useTheme();

  return (
    <footer className={`border-t mt-20 transition-colors ${
      theme === 'dark' ? 'border-white/10' : 'border-black/10'
    }`}>
      <div className="max-w-4xl px-6 md:px-12 pl-8 md:pl-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
            © 2024 Solar Browser. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/solarbrowser"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm transition-colors ${
                theme === 'dark' 
                  ? 'text-white/60 hover:text-white' 
                  : 'text-black/60 hover:text-black'
              }`}
            >
              GitHub
            </a>
            <a
              href="/privacy-policy"
              className={`text-sm transition-colors ${
                theme === 'dark' 
                  ? 'text-white/60 hover:text-white' 
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Privacy
            </a>
            <a
              href="/terms-of-use"
              className={`text-sm transition-colors ${
                theme === 'dark' 
                  ? 'text-white/60 hover:text-white' 
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
