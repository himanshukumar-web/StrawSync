import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'StrawSync — Agricultural Residue Liquidity & Smart Logistics Platform',
  description: "Don't Burn It, Earn From It! Monetize agricultural residue, match with biomass industries, and streamline smart rural dispatch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-sand font-sans text-charcoal selection:bg-sage selection:text-forest-900">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
