'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  X,
  CheckCircle2,
  Smartphone,
  Landmark,
  ArrowRightLeft,
  Loader2,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export interface BuyerPaymentCheckoutData {
  mode: 'fund_escrow' | 'release_payout';
  cropName: string;
  farmerName: string;
  quantityLabel: string;
  deliveryDestination: string;
  logisticsSummary?: string;
  subtotalAmount: number;
  logisticsAmount: number;
  totalAmount: number;
  weighbridgeSlipId?: string;
  weighbridgeNetTonnes?: number;
  payoutDestination?: string;
}

export interface BuyerPaymentReceipt {
  paymentMethod: 'UPI' | 'NetBanking' | 'NEFT/RTGS';
  paymentReference: string;
  utrNumber: string;
}

interface Props {
  isOpen: boolean;
  checkout: BuyerPaymentCheckoutData | null;
  onClose: () => void;
  onConfirmPayment: (receipt: BuyerPaymentReceipt) => Promise<void> | void;
  onDone?: () => void;
}

const CORPORATE_BANKS = ['SBI Corporate', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'];

export default function BuyerPaymentModal({
  isOpen,
  checkout,
  onClose,
  onConfirmPayment,
  onDone,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NetBanking' | 'NEFT/RTGS'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState(CORPORATE_BANKS[0]);
  const [bankRefNote, setBankRefNote] = useState('');
  const [neftRef, setNeftRef] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedReceipt, setConfirmedReceipt] = useState<BuyerPaymentReceipt | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPaymentMethod('UPI');
    setUpiId('');
    setSelectedBank(CORPORATE_BANKS[0]);
    setBankRefNote('');
    setNeftRef('');
    setError('');
    setIsProcessing(false);
    setConfirmedReceipt(null);
  }, [isOpen, checkout]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !checkout) return null;

  const isReleaseMode = checkout.mode === 'release_payout';

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || confirmedReceipt) return;
    setError('');

    let reference = '';
    if (paymentMethod === 'UPI') {
      const cleaned = upiId.trim();
      if (!cleaned || !cleaned.includes('@') || cleaned.length < 5) {
        setError('Please enter a valid UPI ID (e.g. company@okicici).');
        return;
      }
      reference = cleaned;
    } else if (paymentMethod === 'NetBanking') {
      reference = bankRefNote.trim()
        ? `${selectedBank} (${bankRefNote.trim()})`
        : selectedBank;
    } else {
      const cleanedRef = neftRef.trim();
      if (!cleanedRef || cleanedRef.length < 4) {
        setError('Please enter your NEFT/RTGS bank transfer reference number (min 4 characters).');
        return;
      }
      reference = cleanedRef;
    }

    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const receipt: BuyerPaymentReceipt = {
        paymentMethod,
        paymentReference: reference,
        utrNumber: `UTR${Date.now().toString().slice(-10)}`,
      };
      await onConfirmPayment(receipt);
      setConfirmedReceipt(receipt);
    } catch (err: any) {
      setError(err?.message || 'Escrow gateway confirmation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buyer-escrow-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-elevated border border-earth-border overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-forest text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="buyer-escrow-modal-title" className="text-base sm:text-lg font-bold">
                StrawSync Secure Escrow Checkout
              </h3>
              <p className="text-[11px] text-white/80">
                {isReleaseMode
                  ? 'Confirm Weighbridge Receipt & Release Escrow Payout to Farmer'
                  : 'Fund Verified Escrow Protection Before Farmer Dispatch'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            aria-label="Close escrow checkout"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Order / Listing Summary */}
          <div className="p-4 rounded-2xl bg-sand border border-earth-border text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-charcoal text-sm">{checkout.cropName}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-forest font-bold text-[10px] uppercase">
                {checkout.quantityLabel}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-charcoal-muted">
              <div>
                Farmer: <strong className="text-charcoal">{checkout.farmerName}</strong>
              </div>
              <div>
                Destination: <strong className="text-charcoal">{checkout.deliveryDestination}</strong>
              </div>
              {checkout.logisticsSummary && (
                <div className="sm:col-span-2">
                  Assigned Logistics: <strong className="text-forest">{checkout.logisticsSummary}</strong>
                </div>
              )}
              {isReleaseMode && checkout.weighbridgeSlipId && (
                <div>
                  Weighbridge:{' '}
                  <strong className="text-forest">
                    #{checkout.weighbridgeSlipId} ({checkout.weighbridgeNetTonnes}t Net)
                  </strong>
                </div>
              )}
              {isReleaseMode && checkout.payoutDestination && (
                <div>
                  Payout Target: <strong className="text-charcoal">{checkout.payoutDestination}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="p-4 rounded-2xl bg-forest-50/50 border border-forest-200 text-xs space-y-2">
            <div className="flex justify-between text-charcoal-soft">
              <span>Produce / Biomass Subtotal</span>
              <span className="font-semibold text-charcoal">
                ₹{checkout.subtotalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-charcoal-soft">
              <span>Estimated Logistics &amp; Weighbridge Escrow</span>
              <span className="font-semibold text-charcoal">
                ₹{checkout.logisticsAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="pt-2 border-t border-forest-200 flex items-center justify-between">
              <span className="font-bold text-charcoal text-sm">
                {isReleaseMode ? 'Net Farmer Payout Released' : 'Total Escrow Amount Payable'}
              </span>
              <span className="text-lg font-extrabold text-forest">
                ₹{checkout.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {confirmedReceipt ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-forest-200 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center mx-auto shadow-subtle">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-forest-900">
                  {isReleaseMode
                    ? 'Escrow Settled & Released to Farmer'
                    : 'Payment Confirmed & Locked in Escrow'}
                </h4>
                <p className="text-xs text-forest-700 mt-1">
                  ₹{checkout.totalAmount.toLocaleString('en-IN')} confirmed via{' '}
                  <strong>{confirmedReceipt.paymentMethod}</strong> ({confirmedReceipt.paymentReference})
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-forest-200 inline-block text-xs">
                <span className="text-[10px] uppercase font-bold text-charcoal-muted block">
                  Official UTR Reference
                </span>
                <span className="font-mono font-extrabold text-forest text-sm">
                  {confirmedReceipt.utrNumber}
                </span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => (onDone ? onDone() : onClose())}
                  className="w-full py-3 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-2 transition"
                >
                  <span>{onDone ? 'Done & View Orders' : 'Done'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePaySubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-2">
                  Select Escrow Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setPaymentMethod('UPI');
                      setError('');
                    }}
                    className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition ${
                      paymentMethod === 'UPI'
                        ? 'border-forest bg-forest-50 text-forest'
                        : 'border-earth-border bg-white text-charcoal-muted hover:text-charcoal'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI Instant</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setPaymentMethod('NetBanking');
                      setError('');
                    }}
                    className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition ${
                      paymentMethod === 'NetBanking'
                        ? 'border-forest bg-forest-50 text-forest'
                        : 'border-earth-border bg-white text-charcoal-muted hover:text-charcoal'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    <span>NetBanking</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setPaymentMethod('NEFT/RTGS');
                      setError('');
                    }}
                    className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition ${
                      paymentMethod === 'NEFT/RTGS'
                        ? 'border-forest bg-forest-50 text-forest'
                        : 'border-earth-border bg-white text-charcoal-muted hover:text-charcoal'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>NEFT / RTGS</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'UPI' && (
                <div className="p-4 rounded-2xl bg-sand border border-earth-border grid grid-cols-1 sm:grid-cols-12 gap-4 items-center text-xs">
                  <div className="sm:col-span-4 flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-earth-border">
                    <svg
                      viewBox="0 0 64 64"
                      className="w-20 h-20 text-charcoal"
                      aria-label="StrawSync Escrow UPI QR"
                    >
                      <rect x="2" y="2" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="4" />
                      <rect x="8" y="8" width="6" height="6" fill="currentColor" />
                      <rect x="44" y="2" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="4" />
                      <rect x="50" y="8" width="6" height="6" fill="currentColor" />
                      <rect x="2" y="44" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="4" />
                      <rect x="8" y="50" width="6" height="6" fill="currentColor" />
                      <path
                        d="M26 6h6v6h-6zM34 14h6v6h-6zM26 26h12v12H26zM44 26h6v10h-6zM54 26h8v6h-8zM26 44h8v8h-8zM40 42h10v6H40zM54 44h8v18h-8zM38 54h12v8H38z"
                        fill="#245C43"
                      />
                    </svg>
                    <span className="text-[10px] font-bold text-charcoal-muted mt-1">
                      Escrow QR • ₹{checkout.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="sm:col-span-8 space-y-2">
                    <label className="block text-[11px] font-bold text-charcoal-muted uppercase">
                      Corporate / Buyer UPI ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. company@okicici"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3.5 py-2.5 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                      required
                    />
                    <p className="text-[10px] text-charcoal-muted">
                      Zero convenience fee • Protected in RBI-compliant nodal escrow until weighbridge verification.
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === 'NetBanking' && (
                <div className="p-4 rounded-2xl bg-sand border border-earth-border space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                      Select Corporate Bank
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3.5 py-2.5 bg-white border border-earth-border rounded-xl font-bold text-charcoal focus:outline-none focus:border-forest"
                    >
                      {CORPORATE_BANKS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                      Corporate Approval / PO Voucher Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CORP-PO-2026-14"
                      value={bankRefNote}
                      onChange={(e) => setBankRefNote(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3.5 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'NEFT/RTGS' && (
                <div className="p-4 rounded-2xl bg-sand border border-earth-border space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-earth-border grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-charcoal-muted block">Virtual Escrow A/C</span>
                      <strong className="font-mono text-charcoal">STRAW202699801122</strong>
                    </div>
                    <div>
                      <span className="text-charcoal-muted block">Escrow IFSC Code</span>
                      <strong className="font-mono text-forest">SBIN0004811</strong>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                      Transfer Reference / UTR Confirmation *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NEFT26119044"
                      value={neftRef}
                      onChange={(e) => setNeftRef(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3.5 py-2.5 bg-white border border-earth-border rounded-xl font-mono font-semibold text-charcoal focus:outline-none focus:border-forest"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-earth-border">
                <span className="text-[10px] text-charcoal-muted flex items-center gap-1">
                  <Lock className="w-3 h-3 text-forest" />
                  No passwords or CVVs stored
                </span>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-forest hover:bg-forest-700 disabled:bg-forest/70 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center gap-2 transition"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Escrow Payment with Bank Gateway...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isReleaseMode
                          ? `Release ₹${checkout.totalAmount.toLocaleString('en-IN')} Payout`
                          : `Authorize ₹${checkout.totalAmount.toLocaleString('en-IN')} Escrow`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
