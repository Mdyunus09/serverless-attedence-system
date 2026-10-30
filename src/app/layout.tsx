import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cadence • Class Attendance Management System',
  description: 'High-precision attendance intelligence and compliance system powered by Neon PostgreSQL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#08090b] text-[#f3efe6] antialiased selection:bg-[#d9ad3c]/20 selection:text-[#f3efe6]">
        {children}
      </body>
    </html>
  );
}

