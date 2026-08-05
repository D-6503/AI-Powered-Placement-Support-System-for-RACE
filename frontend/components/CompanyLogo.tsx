"use client";

import React, { useState } from "react";

interface CompanyLogoProps {
  company: string;
  employerLogo?: string | null;
  className?: string;
}

// Domain resolution map for real official company logos
const DOMAIN_MAP: Record<string, string> = {
  "google": "google.com",
  "microsoft": "microsoft.com",
  "amazon": "amazon.com",
  "walmart": "walmart.com",
  "flipkart": "flipkart.com",
  "wipro": "wipro.com",
  "infosys": "infosys.com",
  "tcs": "tata.com",
  "tata": "tata.com",
  "tata consultancy services": "tata.com",
  "cognizant": "cognizant.com",
  "ibm": "ibm.com",
  "accenture": "accenture.com",
  "ey": "ey.com",
  "ernst & young": "ey.com",
  "pwc": "pwc.com",
  "kpmg": "kpmg.com",
  "deloitte": "deloitte.com",
  "capgemini": "capgemini.com",
  "oracle": "oracle.com",
  "nvidia": "nvidia.com",
  "cisco": "cisco.com",
  "qualcomm": "qualcomm.com",
  "barclays": "barclays.com",
  "zoho": "zoho.com",
  "freshworks": "freshworks.com",
  "zomato": "zomato.com",
  "swiggy": "swiggy.com",
  "paytm": "paytm.com",
  "jio": "jio.com",
  "reliance jio": "jio.com",
  "hdfc": "hdfcbank.com",
  "hdfc bank": "hdfcbank.com",
  "shopee": "shopee.sg",
  "solventum": "solventum.com",
  "rubrik": "rubrik.com",
  "razorpay": "razorpay.com",
  "cred": "cred.club",
  "stripe": "stripe.com"
};

export default function CompanyLogo({ company, employerLogo, className = "w-full h-full object-contain" }: CompanyLogoProps) {
  // loadState: 0 = Primary Google S2 High-Res Favicon API / employerLogo, 1 = DuckDuckGo Icon API, 2 = Clearbit, 3 = Fallback Initial Badge
  const [loadState, setLoadState] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const rawClean = (company || "").toLowerCase().trim();

  // 1. Resolve Company Domain
  let domain = "";
  for (const [key, val] of Object.entries(DOMAIN_MAP)) {
    if (rawClean.includes(key)) {
      domain = val;
      break;
    }
  }

  if (!domain) {
    const cleanName = rawClean
      .replace(/\b(india|gmbh|co|ltd|pvt|private|limited|inc|corporation|systems|technologies|solutions|group|labs|consulting)\b/gi, "")
      .replace(/[^a-z0-9]/gi, "").trim();
    domain = cleanName ? `${cleanName}.com` : "google.com";
  }

  // 2. Select Real Official Company Logo Source
  let logoSrc = "";
  if (loadState === 0) {
    if (employerLogo && employerLogo.startsWith("http") && !employerLogo.includes("ui-avatars.com") && !employerLogo.includes("encrypted-tbn")) {
      logoSrc = employerLogo;
    } else {
      // Primary: Official Google S2 High-Res Brand Favicon API (returns real company logo images)
      logoSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
  } else if (loadState === 1) {
    // Secondary: DuckDuckGo Icon API
    logoSrc = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  } else if (loadState === 2) {
    // Tertiary: Clearbit Logo API
    logoSrc = `https://logo.clearbit.com/${domain}`;
  }

  // 3. Fallback Initial Badge if all dynamic image endpoints fail
  if (loadState >= 3) {
    const initials = company
      .split(" ")
      .map(n => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "CO";

    return (
      <div className="w-full h-full flex items-center justify-center font-black bg-gradient-to-br from-slate-800 to-slate-900 text-white text-[10px] rounded-lg font-mono uppercase tracking-wider border border-slate-700 shadow-xs">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white rounded-lg overflow-hidden p-0.5">
      <img 
        src={logoSrc}
        alt={`${company} Real Logo`}
        className={`${className} ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-90 scale-100'} transition-all duration-150 object-contain`}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageLoaded(false);
          setLoadState(prev => prev + 1);
        }}
      />
    </div>
  );
}


