import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme/ThemeContext';

export const metadata: Metadata = {
  title: 'Robotics Lab of RKV (RLR) — Smart Entry & Attendance Management System',
  description: 'Smart biometric laboratory access management, real-time occupancy monitoring, and attendance analytics for Robotics Lab of RKV.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Anti-FOUC Theme Initializer */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('rlr_theme');
                  var theme = saved || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                  var meta = document.querySelector('meta[name="color-scheme"]');
                  if (meta) meta.content = theme === 'light' ? 'light' : 'dark';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen selection:bg-[#00A9E8]/20 selection:text-[#073B8C]">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
