import type { Metadata } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';

export const metadata: Metadata = {
  title: 'Global Time Use Explorer',
  description:
    'An interactive simulation of how people around the world spend their day, drillable by country, age, gender, employment, education, income, and location — grounded in real time-use survey data with transparent estimation where data is sparse.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
