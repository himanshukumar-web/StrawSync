'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sprout, Heart, Shield, Leaf, Phone, Mail, Award, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Hide marketing footer on internal dashboard workspaces
  const isDashboard =
    pathname?.startsWith('/farmer') ||
    pathname?.startsWith('/buyer') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/logistics');

  if (isDashboard) {
    return null;
  }

  return (
    <footer className="bg-sand-200/50 border-t border-earth-border mt-20 pt-14 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-white">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-forest-700">
                  Straw<span className="text-moss">Sync</span>
                </span>
                <p className="text-[11px] text-charcoal-muted font-medium">
                  Don't Burn It, Earn From It!
                </p>
              </div>
            </div>

            <p className="text-xs text-charcoal-muted leading-relaxed">
              India's premier digital liquidity marketplace connecting farmgate crop residue with bio-pellet plants, ethanol refineries, and thermal power facilities.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-forest-100 text-[11px] font-semibold text-forest-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                MNRE & CPCB Co-Firing Aligned
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-4">
              Marketplace Portals
            </h4>
            <ul className="space-y-2 text-xs text-charcoal-soft font-medium">
              <li>
                <Link href="/farmer/dashboard" className="hover:text-forest transition">
                  Farmer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/farmer/listings" className="hover:text-forest transition">
                  Farmer Residue Listings
                </Link>
              </li>
              <li>
                <Link href="/buyer/dashboard" className="hover:text-forest transition">
                  Buyer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/buyer/marketplace" className="hover:text-forest transition">
                  Buyer Biomass Marketplace
                </Link>
              </li>
              <li>
                <Link href="/logistics/dashboard" className="hover:text-forest transition">
                  Rural Truck & Fleet Dispatch
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-forest transition">
                  State Pollution & Carbon Cell
                </Link>
              </li>
            </ul>
          </div>

          {/* Residue Liquidity Engine */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-4">
              Liquidity Engine
            </h4>
            <ul className="space-y-2 text-xs text-charcoal-soft font-medium">
              <li>Paddy Straw (Parali) Liquidity</li>
              <li>Mustard & Wheat Husk Aggregation</li>
              <li>Multi-Criteria Match Scoring</li>
              <li>Route & Haulage Freight Estimator</li>
              <li>Transparent Quality Testing Specs</li>
            </ul>
          </div>

          {/* Direct Support & Field Assistance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-4">
              Field Support & Kisan Helpline
            </h4>
            <p className="text-xs text-charcoal-muted mb-3 leading-relaxed">
              Assisting FPOs, cooperative societies, and industrial power plants across Punjab, Haryana, UP & Rajasthan.
            </p>
            <div className="space-y-2 text-xs text-charcoal-soft font-medium">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-forest" />
                <span>Toll-Free Kisan Desk: 1800-419-STRAW</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-forest" />
                <span>support@strawsync.agritech.in</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-earth-border flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-muted gap-4">
          <p>
            © {new Date().getFullYear()} StrawSync Technologies India. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="hover:text-forest cursor-pointer transition">Clean Air Protocol</span>
            <span className="hover:text-forest cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-forest cursor-pointer transition">Escrow Security</span>
            <span className="hover:text-forest cursor-pointer transition">Kisan Charter</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
