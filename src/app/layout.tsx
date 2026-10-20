import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F4FBFF] text-[#172B4D] selection:bg-[#00A9E8]/20 selection:text-[#073B8C]">
        {children}
      </body>
    </html>
  );
}
