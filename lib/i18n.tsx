'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'hi';

const LANG_STORAGE_KEY = 'strawsync_lang';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navbar & Navigation
    'nav.overview': 'Overview',
    'nav.farmerHub': 'Farmer Hub',
    'nav.myListings': 'My Listings',
    'nav.myOrders': 'My Orders',
    'nav.buyerDashboard': 'Buyer Dashboard',
    'nav.buyerMarketplace': 'Buyer Marketplace',
    'nav.smartLogistics': 'Smart Logistics',
    'nav.adminOversight': 'Admin Oversight',
    'nav.calculator': 'Calculator',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.logout': 'Logout',
    'nav.myDashboard': 'My Dashboard',
    'nav.tagline': "Don't Burn It, Earn From It!",
    'nav.alertsHeading': 'Alerts & Escrow Updates',
    'nav.markAllRead': 'Mark all read',

    // Landing Hero & Roles
    'hero.banner': 'Harvest Season Active: Convert crop residue & farm produce directly into verified income.',
    'hero.calcLink': 'Calculate Field Value →',
    'hero.badge': 'Agricultural Residue Liquidity & Smart Logistics',
    'hero.headlinePrefix': 'Turn Agricultural Waste Into',
    'hero.headlineHighlight': 'Opportunity.',
    'hero.subtext':
      'Connect verified farmers selling paddy straw, wheat husk, bagasse, and farm produce directly with biomass power plants, ethanol refineries, and wholesale buyers.',
    'hero.tagline': "Don't Burn It, Earn From It!",
    'hero.taglineSub':
      'Preventing toxic stubble smog while generating ₹1,400 – ₹2,400/tonne net income directly for farming households.',
    'hero.farmerCta': 'Farmer: List Residue & Earn',
    'hero.buyerCta': 'Buyer: Source Biomass',
    'hero.calcCta': 'Estimate Field Yield',
    'hero.instantAccess': 'Instant Portal Access:',

    'role.farmer': 'Farmer',
    'role.farmerFull': 'Farmer / FPO',
    'role.buyer': 'Buyer',
    'role.buyerFull': 'Biomass Buyer',
    'role.logistics': 'Logistics',
    'role.logisticsFull': 'Logistics Fleet',
    'role.admin': 'Admin',
    'role.adminFull': 'Admin Cell',

    // Auth Pages
    'auth.signInTitle': 'Sign In to StrawSync',
    'auth.signInSub':
      'Access your agricultural dashboard, live matching engine, and GPS dispatch tracking.',
    'auth.quickDemoTitle': 'Live Demo Accounts (1-Click Instant Login)',
    'auth.judgesBadge': 'Judges & Testers',
    'auth.enterCredentials': 'Enter Your Credentials',
    'auth.needAccount': 'Need an account? Register',
    'auth.selectRole': 'Select Your Role:',
    'auth.emailOrPhone': 'Mobile Number / Registered Email',
    'auth.useDemo': 'Use Demo Account',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.signInBtn': 'Sign In',
    'auth.registerTitle': 'Register for StrawSync',
    'auth.registerSub':
      "Join India's agricultural residue liquidity network. Convert stubble liability into income.",
    'auth.createProfile': 'Create Your Profile',
    'auth.existingUser': 'Existing user? Sign In',
    'auth.fullName': 'Full Name / Farm or Company Name *',
    'auth.emailAddress': 'Email Address',
    'auth.mobileNumber': '10-Digit Mobile Number',
    'auth.confirmPassword': 'Confirm Password *',
    'auth.districtState': 'Primary District & State *',
    'auth.completeRegister': 'Complete Registration',

    // Dashboard Layout
    'layout.menuNav': 'Menu Navigation',
    'layout.returnHome': 'Return to Landing Page',
    'layout.signOut': 'Sign Out Session',
    'layout.farmerPortal': 'Farmer Portal',
    'layout.buyerPortal': 'Biomass Buyer Portal',
    'layout.logisticsPortal': 'Logistics Fleet',
    'layout.adminPortal': 'State Oversight Cell',
    'layout.overviewDashboard': 'Overview Dashboard',
    'layout.residueListings': 'My Residue Listings',
    'layout.dispatchesOrders': 'Dispatches & Orders',
    'layout.procurementDashboard': 'Procurement Dashboard',
    'layout.browseSupply': 'Browse Residue Supply',
    'layout.purchaseOrders': 'Purchase Orders',
    'layout.fleetDispatches': 'Fleet & Dispatches',
    'layout.adminCommand': 'Admin Command',

    // Farmer Dashboard, Listings & Orders
    'farmer.kisanDashboard': 'Kisan Dashboard',
    'farmer.listNewLot': 'List New Residue Lot',
    'farmer.totalRegistered': 'Total Residue Registered',
    'farmer.availablePickup': 'Available for Pickup',
    'farmer.totalSold': 'Total Sold Quantity',
    'farmer.activeDispatches': 'Active Dispatches',
    'farmer.settledEarnings': 'Settled Earnings',
    'farmer.inEscrow': 'In Escrow',
    'farmer.incomingRequests': 'Incoming Purchase Requests from Buyers',
    'farmer.acceptRequest': 'Accept Request',
    'farmer.rejectRequest': 'Reject Request',
    'farmer.recentListings': 'Recent Residue Listings',
    'farmer.manageAllListings': 'Manage All Listings',
    'farmer.payoutHeading': 'Payment & Escrow Settlement',
    'farmer.payoutSub':
      'Configure your UPI ID or Bank Account for instant escrow release upon delivery settlement',
    'farmer.upiLabel': 'Farmer UPI ID (Preferred Instant Payout)',
    'farmer.accountHolder': 'Account Holder Name',
    'farmer.ifscCode': 'IFSC Code',
    'farmer.bankAccount': 'Bank Account Number (NEFT / IMPS Fallback)',
    'farmer.savePayout': 'Save Payout Details',
    'farmer.settledLedger': 'Settled Payout & UTR Ledger',

    // Modals & Land/Weight Units
    'modal.cropType': 'Crop Residue / Farm Produce Type',
    'modal.lotLabel': 'Produce Variety / Lot Label (Optional)',
    'modal.quantity': 'Quantity',
    'modal.weightUnit': 'Weight Unit',
    'modal.pricePerUnit': 'Expected Price',
    'modal.landArea': 'Land Area',
    'modal.acres': 'Acres',
    'modal.bigha': 'Bigha',
    'modal.hectare': 'Hectare',
    'modal.kanal': 'Kanal',
    'modal.guntha': 'Guntha',
    'modal.packaging': 'Form / Packaging',
    'modal.moisture': 'Moisture %',
    'modal.uploadPhoto': 'Upload Product Photo',
    'modal.replacePhoto': 'Replace Photo',
    'modal.remove': 'Remove',
    'modal.publishListing': 'Confirm & Publish Listing',
    'modal.cancel': 'Cancel',
    'modal.editListing': 'Edit Listing',
    'modal.saveChanges': 'Save Changes',

    // Calculator Modal
    'calc.title': 'StrawSync Field Yield & Cost Calculator',
    'calc.subtitle': 'Supports Indian land units, zero area inputs, order cost planning & saved history',
    'calc.farmerTab': 'Field Yield Estimator (Farmer)',
    'calc.buyerTab': 'Quantity & Order Cost (Buyer)',
    'calc.saveBtn': 'Save Calculation',
    'calc.savedHeading': 'Saved Calculations',
    'calc.load': 'Load',
    'calc.useListing': 'Use in Listing',
    'calc.useOrder': 'Use in Order',

    // Order Statuses
    'status.requested': 'Pending Farmer Approval',
    'status.accepted': 'Accepted by Farmer',
    'status.logistics_assigned': 'Logistics Assigned',
    'status.pickup_en_route': 'Truck En Route',
    'status.loaded_and_weighed': 'Loaded & Weighed',
    'status.in_transit': 'In Transit',
    'status.delivered': 'Delivered',
    'status.settled': 'Payment Settled',
    'status.cancelled': 'Cancelled',
  },
  hi: {
    // Navbar & Navigation
    'nav.overview': 'मुख्य पृष्ठ',
    'nav.farmerHub': 'किसान केंद्र',
    'nav.myListings': 'मेरी फसल सूची',
    'nav.myOrders': 'मेरे ऑर्डर',
    'nav.buyerDashboard': 'खरीदार डैशबोर्ड',
    'nav.buyerMarketplace': 'खरीदार बाज़ार',
    'nav.smartLogistics': 'स्मार्ट लॉजिस्टिक्स',
    'nav.adminOversight': 'एडमिन निगरानी',
    'nav.calculator': 'कैलकुलेटर',
    'nav.login': 'लॉगिन',
    'nav.register': 'पंजीकरण',
    'nav.logout': 'लॉगआउट',
    'nav.myDashboard': 'मेरा डैशबोर्ड',
    'nav.tagline': 'जलाएं नहीं, इससे कमाएं!',
    'nav.alertsHeading': 'सूचनाएं और भुगतान अपडेट',
    'nav.markAllRead': 'सभी पढ़ा हुआ चिह्नित करें',

    // Landing Hero & Roles
    'hero.banner': 'फसल सीज़न सक्रिय: पराली और कृषि उपज से सीधे पक्की कमाई करें।',
    'hero.calcLink': 'खेत की कमाई का अनुमान लगाएं →',
    'hero.badge': 'कृषि अवशेष बाज़ार और स्मार्ट लॉजिस्टिक्स',
    'hero.headlinePrefix': 'पराली और कृषि अपशिष्ट को बदलें',
    'hero.headlineHighlight': 'कमाई के अवसर में।',
    'hero.subtext':
      'धान की पराली, गेहूं का भूसा, गन्ने की खोई और ताज़ी कृषि उपज बेचने वाले किसानों को सीधे बायोमास प्लांट, इथेनॉल रिफाइनरी और खरीदारों से जोड़ें।',
    'hero.tagline': 'जलाएं नहीं, इससे कमाएं!',
    'hero.taglineSub':
      'पराली जलाने से होने वाले प्रदूषण को रोकें और किसानों के लिए ₹1,400 – ₹2,400/टन अतिरिक्त आय बनाएं।',
    'hero.farmerCta': 'किसान: फसल सूचीबद्ध करें और कमाएं',
    'hero.buyerCta': 'खरीदार: बायोमास खरीदें',
    'hero.calcCta': 'उपज अनुमान लगाएं',
    'hero.instantAccess': 'त्वरित पोर्टल प्रवेश:',

    'role.farmer': 'किसान',
    'role.farmerFull': 'किसान / FPO',
    'role.buyer': 'खरीदार',
    'role.buyerFull': 'बायोमास खरीदार',
    'role.logistics': 'ट्रांसपोर्टर',
    'role.logisticsFull': 'लॉजिस्टिक्स फ्लीट',
    'role.admin': 'एडमिन',
    'role.adminFull': 'एडमिन सेल',

    // Auth Pages
    'auth.signInTitle': 'StrawSync में लॉगिन करें',
    'auth.signInSub':
      'अपने किसान या खरीदार डैशबोर्ड, मिलान इंजन और लाइव GPS ट्रैकिंग तक पहुंचें।',
    'auth.quickDemoTitle': 'लाइव डेमो खाते (1-क्लिक त्वरित लॉगिन)',
    'auth.judgesBadge': 'डेमो और परीक्षण',
    'auth.enterCredentials': 'अपना विवरण दर्ज करें',
    'auth.needAccount': 'नया खाता बनाएं? पंजीकरण',
    'auth.selectRole': 'अपनी भूमिका चुनें:',
    'auth.emailOrPhone': 'मोबाइल नंबर / पंजीकृत ईमेल',
    'auth.useDemo': 'डेमो खाता भरें',
    'auth.password': 'पासवर्ड',
    'auth.forgotPassword': 'पासवर्ड भूल गए?',
    'auth.signInBtn': 'लॉगिन करें',
    'auth.registerTitle': 'StrawSync पर पंजीकरण करें',
    'auth.registerSub':
      'भारत के कृषि अवशेष नेटवर्क से जुड़ें और फसल अवशेष से आय अर्जित करें।',
    'auth.createProfile': 'अपनी प्रोफ़ाइल बनाएं',
    'auth.existingUser': 'पहले से खाता है? लॉगिन करें',
    'auth.fullName': 'पूरा नाम / फ़ार्म या कंपनी का नाम *',
    'auth.emailAddress': 'ईमेल पता',
    'auth.mobileNumber': '10-अंकीय मोबाइल नंबर',
    'auth.confirmPassword': 'पासवर्ड की पुष्टि करें *',
    'auth.districtState': 'जिला और राज्य *',
    'auth.completeRegister': 'पंजीकरण पूरा करें',

    // Dashboard Layout
    'layout.menuNav': 'मेनू नेविगेशन',
    'layout.returnHome': 'मुख्य पृष्ठ पर लौटें',
    'layout.signOut': 'सत्र समाप्त करें',
    'layout.farmerPortal': 'किसान पोर्टल',
    'layout.buyerPortal': 'खरीदार पोर्टल',
    'layout.logisticsPortal': 'लॉजिस्टिक्स फ्लीट',
    'layout.adminPortal': 'प्रशासनिक निगरानी सेल',
    'layout.overviewDashboard': 'मुख्य डैशबोर्ड',
    'layout.residueListings': 'मेरी फसल सूची',
    'layout.dispatchesOrders': 'डिस्पैच और ऑर्डर',
    'layout.procurementDashboard': 'खरीद डैशबोर्ड',
    'layout.browseSupply': 'फसल बाज़ार देखें',
    'layout.purchaseOrders': 'खरीद ऑर्डर',
    'layout.fleetDispatches': 'ट्रक और डिस्पैच',
    'layout.adminCommand': 'एडमिन कमांड',

    // Farmer Dashboard, Listings & Orders
    'farmer.kisanDashboard': 'किसान डैशबोर्ड',
    'farmer.listNewLot': 'नई फसल / पराली जोड़ें',
    'farmer.totalRegistered': 'कुल पंजीकृत फसल',
    'farmer.availablePickup': 'पिकअप के लिए उपलब्ध',
    'farmer.totalSold': 'कुल बिक्री मात्रा',
    'farmer.activeDispatches': 'सक्रिय डिस्पैच',
    'farmer.settledEarnings': 'प्राप्त भुगतान',
    'farmer.inEscrow': 'एस्क्रो में सुरक्षित',
    'farmer.incomingRequests': 'खरीदारों के नए खरीद अनुरोध',
    'farmer.acceptRequest': 'अनुरोध स्वीकार करें',
    'farmer.rejectRequest': 'अस्वीकार करें',
    'farmer.recentListings': 'हाल की फसल सूचियां',
    'farmer.manageAllListings': 'सभी सूचियां प्रबंधित करें',
    'farmer.payoutHeading': 'भुगतान और बैंक / UPI विवरण',
    'farmer.payoutSub':
      'त्वरित भुगतान प्राप्त करने के लिए अपना UPI ID या बैंक खाता विवरण दर्ज करें',
    'farmer.upiLabel': 'किसान UPI ID (त्वरित भुगतान)',
    'farmer.accountHolder': 'खाताधारक का नाम',
    'farmer.ifscCode': 'IFSC कोड',
    'farmer.bankAccount': 'बैंक खाता संख्या (NEFT / IMPS)',
    'farmer.savePayout': 'भुगतान विवरण सहेजें',
    'farmer.settledLedger': 'पूर्ण भुगतान एवं UTR रसीद विवरण',

    // Modals & Land/Weight Units
    'modal.cropType': 'फसल का प्रकार / कृषि उपज',
    'modal.lotLabel': 'किस्म / विवरण (वैकल्पिक)',
    'modal.quantity': 'मात्रा',
    'modal.weightUnit': 'वज़न इकाई',
    'modal.pricePerUnit': 'अपेक्षित मूल्य',
    'modal.landArea': 'ज़मीन का क्षेत्रफल',
    'modal.acres': 'एकड़',
    'modal.bigha': 'बीघा',
    'modal.hectare': 'हेक्टेयर',
    'modal.kanal': 'कनाल',
    'modal.guntha': 'गुंठा',
    'modal.packaging': 'पैकिंग / रूप',
    'modal.moisture': 'नमी %',
    'modal.uploadPhoto': 'फ़ोटो अपलोड करें',
    'modal.replacePhoto': 'फ़ोटो बदलें',
    'modal.remove': 'हटाएं',
    'modal.publishListing': 'सूची प्रकाशित करें',
    'modal.cancel': 'रद्द करें',
    'modal.editListing': 'सूची संपादित करें',
    'modal.saveChanges': 'बदलाव सहेजें',

    // Calculator Modal
    'calc.title': 'StrawSync उपज और लागत कैलकुलेटर',
    'calc.subtitle': 'भारतीय भूमि इकाइयों (बीघा/एकड़/हेक्टेयर), शून्य क्षेत्र और सहेजे गए इतिहास का समर्थन',
    'calc.farmerTab': 'खेत उपज अनुमान (किसान)',
    'calc.buyerTab': 'मात्रा और ऑर्डर लागत (खरीदार)',
    'calc.saveBtn': 'गणना सहेजें',
    'calc.savedHeading': 'सहेजी गई गणनाएं',
    'calc.load': 'लोड करें',
    'calc.useListing': 'नई सूची में उपयोग करें',
    'calc.useOrder': 'ऑर्डर में उपयोग करें',

    // Order Statuses
    'status.requested': 'किसान की स्वीकृति बाकी',
    'status.accepted': 'किसान द्वारा स्वीकृत',
    'status.logistics_assigned': 'ट्रक आवंटित हो गया',
    'status.pickup_en_route': 'ट्रक खेत की ओर आ रहा है',
    'status.loaded_and_weighed': 'लोड और तौल पूर्ण',
    'status.in_transit': 'रास्ते में है',
    'status.delivered': 'डिलीवरी हो गई',
    'status.settled': 'भुगतान प्राप्त हुआ',
    'status.cancelled': 'रद्द किया गया',
  },
};

interface LanguageContextValue {
  lang: Language;
  setLang: (next: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key, fallback) => TRANSLATIONS.en[key] || fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') {
        setLangState(saved);
      }
    } catch {
      // ignore localStorage read errors
    }
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore localStorage write errors
    }
  };

  const t = (key: string, fallback?: string): string =>
    TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || fallback || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
