import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'yagent — workflow monitor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="h-full">
        <div id="app" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
