import React, { useState } from 'react';
import { Printer, Download, ArrowLeft, Users, Layers, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import officialLogoImg from '../assets/logo_new.png';
import { 
  formatIndianCurrency, 
  formatDateIndian, 
  numberToWordsIndian, 
  calculateClientLedger,
  calculateAllSitesSummary 
} from '../utils/formatters';

export default function QuotationPrintView({ 
  quotation = {}, 
  companyInfo = {}, 
  clients = [], 
  transactions = [], 
  customLogoUrl = null,
  onUploadLogo,
  onRemoveCustomLogo,
  onBackToLedger,
  onSelectClientForPrint 
}) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Safe fallback objects
  const safeQuotation = quotation || {};
  const safeCompanyInfo = companyInfo || {
    name: 'SMART TECH',
    tagline: 'INTERIOR & EXTERIOR SOLUTIONS',
    address: 'Nurani Junction, Palakkad, Kerala',
    phones: '+91 9995984554, +91 8921889770',
    email: 'info@smarttech.com',
    sloganQuote: '"We Craft Your Dream Space into a Colourful Reality."',
    sloganSub: 'Smart Tech - Always with You.'
  };

  const watermarkLogo = customLogoUrl || officialLogoImg;

  // Check if viewing consolidated All Sites mode
  const isAllSitesMode = safeQuotation.clientId === 'ALL_SITES';

  // All Sites Summary Data
  const allSitesData = calculateAllSitesSummary(clients, transactions);

  // Selected Client (when in single client mode)
  const selectedClient = isAllSitesMode ? {
    id: 'ALL_SITES',
    name: 'All Sites & Project Accounts Portfolio',
    siteLocation: `Consolidated Master Statement (${allSitesData.totalSites} Sites)`,
    address: 'Palakkad & All Active Project Branches',
    openingBalance: allSitesData.grandTotalOpening
  } : (clients.find(c => c && c.id === safeQuotation.clientId) || clients[0] || {
    id: 'default',
    name: 'Valued Client',
    siteLocation: 'Palakkad',
    address: 'Kerala',
    openingBalance: 0
  });

  // Single Client Tally Ledger Calculations
  const { processedTxs = [], netBalance: singleNetBalance = 0 } = isAllSitesMode 
    ? { processedTxs: [], netBalance: allSitesData.grandTotalBalance } 
    : calculateClientLedger(selectedClient, transactions);

  const netBalance = isAllSitesMode ? allSitesData.grandTotalBalance : singleNetBalance;
  const totalInWords = numberToWordsIndian(netBalance);

  // Editable State
  const [refNo, setRefNo] = useState(safeQuotation.refNo || (isAllSitesMode ? 'SMRT/MASTER/001' : 'SMRT/2024-25'));
  const [quotDate, setQuotDate] = useState(new Date().toISOString().split('T')[0]);
  const [placeOfSupply, setPlaceOfSupply] = useState('Kerala');
  const [countryOfSupply, setCountryOfSupply] = useState('India');
  const [masterViewMode, setMasterViewMode] = useState('summary'); // 'summary' | 'detailed'

  // Print directly — all live Tailwind CSS is already loaded so output is 100% identical to screen
  const handlePrintCommand = () => {
    window.print();
  };

  // Download PDF — html2canvas captures exact rendered pixels from the live DOM (what you see = what you get)
  const handleDownloadPDF = async () => {
    const element = document.querySelector('.quotation-sheet-container');
    if (!element) {
      handlePrintCommand();
      return;
    }

    try {
      setIsGeneratingPDF(true);

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;

      // Capture at exact rendered size so colors, fonts & layout are pixel-perfect
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollX: 0,
        scrollY: -window.scrollY,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;  // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10;      // Equal 10mm margin for both horizontal & vertical
      const contentWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      // If content fits in one page, render as-is with equal vertical & horizontal margin
      if (imgHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);
      } else {
        // Multi-page: slice canvas into A4-height segments
        const pageContentHeightPx = (pageHeight - margin * 2) * canvas.width / contentWidth;
        let offsetY = 0;
        let pageNum = 0;
        while (offsetY < canvas.height) {
          if (pageNum > 0) pdf.addPage();
          const sliceCanvas = document.createElement('canvas');
          const sliceHeight = Math.min(pageContentHeightPx, canvas.height - offsetY);
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          const sliceData = sliceCanvas.toDataURL('image/png', 1.0);
          const sliceImgHeight = (sliceHeight * contentWidth) / canvas.width;
          pdf.addImage(sliceData, 'PNG', margin, margin, contentWidth, sliceImgHeight);
          offsetY += pageContentHeightPx;
          pageNum++;
        }
      }
      
      const clientNameClean = (selectedClient?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Quotation_${refNo.replace(/[^a-zA-Z0-9]/g, '_')}_${clientNameClean}.pdf`);
    } catch (err) {
      console.error('PDF export failed, falling back to print:', err);
      handlePrintCommand();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4 print:p-0 print:m-0 print:max-w-full print:block">
      
      {/* Top Action Bar (Hidden when printing) */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 no-print">
        <button
          onClick={onBackToLedger}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tally Ledger</span>
        </button>

        {/* Client / Master Account Selector */}
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-amber-400" />
          <select
            value={isAllSitesMode ? 'ALL_SITES' : (selectedClient?.id || '')}
            onChange={(e) => {
              if (e.target.value === 'ALL_SITES') {
                if (onSelectClientForPrint) onSelectClientForPrint({ id: 'ALL_SITES', name: 'All Sites Master Summary' });
              } else {
                const target = clients.find(c => c && c.id === e.target.value);
                if (target && onSelectClientForPrint) onSelectClientForPrint(target);
              }
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
          >
            <option value="ALL_SITES" className="font-bold text-amber-400 bg-slate-900">
              🌟 [ADMIN] Master Quotation — All Sites Summary ({allSitesData.totalSites} Sites)
            </option>
            <optgroup label="── Individual Site Accounts ──" className="text-slate-300 bg-slate-950">
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.siteLocation})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Master View Mode Toggle (Only in All Sites Mode) */}
        {isAllSitesMode && (
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMasterViewMode('summary')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                masterViewMode === 'summary'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 Portfolio Overview
            </button>
            <button
              onClick={() => setMasterViewMode('detailed')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                masterViewMode === 'detailed'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📑 Detailed Audit
            </button>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {/* Direct PDF Download Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {/* Browser Print Button */}
          <button
            onClick={handlePrintCommand}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print {isAllSitesMode ? 'Master Quotation' : 'Quotation'}</span>
          </button>
        </div>
      </div>

      {/* 
        On-Screen Quotation Sheet Container - Luxury Architectural Dual-Border Margin Frame with Watermark
      */}
      <div 
        className="quotation-sheet-container bg-white text-slate-800 p-8 rounded-none font-sans mx-auto relative shadow-2xl overflow-hidden" 
        style={{ 
          border: '2.5px solid #b45309',
          outline: '1.5px solid #f59e0b',
          outlineOffset: '-6px',
          boxShadow: '0 0 0 6px #fff7ed, 0 20px 45px -10px rgba(0, 0, 0, 0.25)',
          maxWidth: '860px'
        }}
      >
        {/* ── 4 Corner Decorative Flourishes / Accents ── */}
        <div className="absolute top-2 left-2 w-5 h-5 pointer-events-none select-none text-amber-700 flex items-center justify-center font-serif text-sm z-20">
          ✤
        </div>
        <div className="absolute top-2 right-2 w-5 h-5 pointer-events-none select-none text-amber-700 flex items-center justify-center font-serif text-sm z-20">
          ✤
        </div>
        <div className="absolute bottom-2 left-2 w-5 h-5 pointer-events-none select-none text-amber-700 flex items-center justify-center font-serif text-sm z-20">
          ✤
        </div>
        <div className="absolute bottom-2 right-2 w-5 h-5 pointer-events-none select-none text-amber-700 flex items-center justify-center font-serif text-sm z-20">
          ✤
        </div>

        {/* ── Background Watermark Logo (Visible & Elegant) ── */}
        <div 
          className="quotation-watermark absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          <img 
            src={watermarkLogo} 
            alt="" 
            className="w-[68%] max-w-[520px] opacity-[0.14] object-contain pointer-events-none"
            style={{
              filter: 'contrast(130%) brightness(102%)',
              transform: 'scale(1.08)'
            }}
          />
        </div>

        {/* ── Foreground Quotation Content ── */}
        <div className="relative z-10 space-y-4">
        
          {/* ── TOP: Logo centered ── */}
          <div className="text-center mb-3">
            <Logo 
              customLogoUrl={customLogoUrl} 
              variant="full" 
              printMode={true} 
            />
          </div>

          {/* ── Slogan / Tagline ── */}
          <div className="text-center mb-6">
            <p className="text-xs font-medium text-slate-800 tracking-wide">
              &ldquo;We Craft Your Dream Space into a Colourful Reality. <strong className="font-extrabold text-slate-950">Smart Tech</strong> &ndash; Always with You.&rdquo;
            </p>
          </div>

          {/* ── From / To two-column section ── */}
          <div className="flex justify-between gap-6 mb-3">

          {/* Left: From (Company info + Ref + Mob) */}
          <div 
            className="w-1/2 p-4 rounded-xl border text-xs text-slate-700"
            style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}
          >
            <h3 className="font-bold text-xs tracking-wide mb-1.5" style={{ color: '#d97706' }}>
              From
            </h3>
            <div className="font-bold text-slate-900 text-xs mb-0.5">{safeCompanyInfo.name}</div>
            <p className="leading-snug text-slate-600 text-[11px] mb-1">{safeCompanyInfo.address}</p>
            <div className="text-[11px] font-medium text-slate-800">
              Ref NO : <span className="font-bold">{refNo}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-800">
              Mob : <span className="font-bold">{safeCompanyInfo.phones}</span>
            </div>
          </div>

          {/* Right: To (Client / All Sites Portfolio info) */}
          <div 
            className="w-1/2 p-4 rounded-xl border text-xs text-slate-700"
            style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}
          >
            <h3 className="font-bold text-xs tracking-wide mb-1.5" style={{ color: '#d97706' }}>
              {isAllSitesMode ? 'Consolidated Portfolio To' : 'To'}
            </h3>
            <div className="font-bold text-slate-900 text-xs mb-0.5">{selectedClient.name}</div>
            <p className="leading-snug text-slate-600 text-[11px] mb-1">
              {selectedClient.siteLocation || selectedClient.address || 'Palakkad, Kerala'}
            </p>
            {isAllSitesMode ? (
              <div className="text-[10px] font-bold text-amber-700 mt-1 uppercase tracking-wider">
                Total Sites Included: {allSitesData.totalSites} Sites Portfolio
              </div>
            ) : (
              selectedClient.phone && (
                <div className="text-[11px] font-medium text-slate-800">
                  Mob : <span className="font-bold">{selectedClient.phone}</span>
                </div>
              )
            )}
          </div>

        </div>

        {/* ── Date (left) + "Quotation" title (center) row ── */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-xs font-bold text-slate-800">
            Date : <span className="font-extrabold text-slate-900">{formatDateIndian(quotDate)}</span>
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-extrabold tracking-tight" style={{ color: '#ea580c' }}>
              {isAllSitesMode ? 'Master Quotation' : 'Quotation'}
            </h2>
            {isAllSitesMode && (
              <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                [ All Sites Consolidated Statement ]
              </span>
            )}
          </div>
          <div className="w-24 text-right text-[10px] font-bold text-slate-500">
            {isAllSitesMode ? `${allSitesData.totalSites} Sites` : ''}
          </div>
        </div>

        {/* ── MASTER MODE: Executive KPI Cards Strip ── */}
        {isAllSitesMode && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Sites</div>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">{allSitesData.totalSites} Projects</div>
            </div>
            <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Billed (+)</div>
              <div className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">₹ {formatIndianCurrency(allSitesData.grandTotalDebits)}</div>
            </div>
            <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Received (-)</div>
              <div className="text-xs font-mono font-extrabold text-emerald-700 mt-0.5">₹ {formatIndianCurrency(allSitesData.grandTotalCredits)}</div>
            </div>
            <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
              <div className="text-[9px] uppercase font-bold text-amber-700 tracking-wider">Net Balance Due</div>
              <div className="text-xs font-mono font-black text-slate-950 mt-0.5">₹ {formatIndianCurrency(allSitesData.grandTotalBalance)}</div>
            </div>
          </div>
        )}

        {/* ── Statement Table ── */}
        <div className="mb-4 overflow-hidden rounded-lg border border-orange-200/60 shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                <th className="py-2.5 px-3 font-bold text-xs text-white w-14" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                  {isAllSitesMode ? 'Sl No' : 'Date'}
                </th>
                <th className="py-2.5 px-3 font-bold text-xs text-white" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                  {isAllSitesMode ? 'Site Project / Client Details' : 'Particulars / Description'}
                </th>
                <th className="py-2.5 px-2 font-bold text-xs text-white text-center w-16" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>Type</th>
                {isAllSitesMode && (
                  <th className="py-2.5 px-2 font-bold text-xs text-white text-right w-24" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                    Opening (₹)
                  </th>
                )}
                <th className="py-2.5 px-3 font-bold text-xs text-white text-right w-24" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                  {isAllSitesMode ? 'Total Billed (+)' : 'Debit (+)'}
                </th>
                <th className="py-2.5 px-3 font-bold text-xs text-white text-right w-24" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                  {isAllSitesMode ? 'Advance Paid (-)' : 'Credit (-)'}
                </th>
                <th className="py-2.5 px-3 font-bold text-xs text-white text-right w-28" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                  {isAllSitesMode ? 'Site Balance' : 'Balance'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              
              {/* ── ALL SITES MASTER MODE ROWS ── */}
              {isAllSitesMode ? (
                <>
                  {allSitesData.siteSummaries.map((site, idx) => (
                    <React.Fragment key={site.id || idx}>
                      <tr 
                        style={{ backgroundColor: idx % 2 === 1 ? '#fff7ed' : '#ffffff' }}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-800 text-center text-[11px] font-bold">
                          {String(site.slNo).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 font-semibold text-xs leading-snug">
                          <div className="font-bold text-slate-950">{site.clientName}</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            📍 {site.siteLocation} {site.phone ? `• 📞 ${site.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700 text-[11px]">
                          SITE
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-700 text-xs">
                          {site.openingBalance > 0 ? `₹ ${formatIndianCurrency(site.openingBalance)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-xs">
                          ₹ {formatIndianCurrency(site.totalDebits)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-xs">
                          {site.totalCredits > 0 ? `₹ ${formatIndianCurrency(site.totalCredits)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                          ₹ {formatIndianCurrency(site.netBalance)}
                        </td>
                      </tr>

                      {/* Detailed transaction list under each site if detailed mode is active */}
                      {masterViewMode === 'detailed' && site.processedTxs && site.processedTxs.length > 0 && (
                        <tr className="bg-slate-50">
                          <td colSpan={7} className="px-6 py-2 bg-slate-50/80 border-b border-orange-200/40">
                            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                              ↳ Detailed Transactions for {site.clientName}:
                            </div>
                            <div className="space-y-0.5 text-[10px] font-mono">
                              {site.processedTxs.map((tx, tIdx) => (
                                <div key={tx.id || tIdx} className="flex justify-between items-center text-slate-700 py-0.5 border-b border-slate-200/60 last:border-none">
                                  <span>{formatDateIndian(tx.date)} — {tx.description} ({tx.type})</span>
                                  <span className="font-semibold">{tx.type === 'BILL' ? `+ ₹${formatIndianCurrency(tx.amount)}` : `- ₹${formatIndianCurrency(tx.amount)}`}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Subtotal breakdown row */}
                  <tr className="bg-orange-50/60 font-medium text-[11px]" style={{ backgroundColor: '#fff7ed' }}>
                    <td colSpan={3} className="py-2 px-3 text-right font-bold text-slate-700 uppercase">
                      Portfolio Subtotals:
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">
                      ₹ {formatIndianCurrency(allSitesData.grandTotalOpening)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      ₹ {formatIndianCurrency(allSitesData.grandTotalDebits)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      ₹ {formatIndianCurrency(allSitesData.grandTotalCredits)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-950">
                      ₹ {formatIndianCurrency(allSitesData.grandTotalBalance)}
                    </td>
                  </tr>

                  {/* Grand Balance Due Row */}
                  <tr style={{ backgroundColor: '#fff7ed' }}>
                    <td colSpan={6} className="py-3 px-3 text-right font-black text-xs text-slate-900 uppercase tracking-wider">
                      TOTAL BALANCE DUE (ALL SITES COMBINED):
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-sm">
                      ₹ {formatIndianCurrency(allSitesData.grandTotalBalance)}
                    </td>
                  </tr>
                </>
              ) : (
                /* ── SINGLE SITE MODE ROWS ── */
                <>
                  {/* Opening Balance Row */}
                  {selectedClient && selectedClient.openingBalance > 0 && (
                    <tr style={{ backgroundColor: '#fff7ed' }}>
                      <td className="py-2.5 px-3 font-mono text-slate-800 text-center text-[11px]">
                        {formatDateIndian(selectedClient.createdAt || quotDate)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-semibold text-xs">Opening Balance Brought Forward</td>
                      <td className="py-2.5 px-2 text-center font-bold text-orange-600 text-[11px]">OPENING</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">-</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">-</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                        ₹ {formatIndianCurrency(selectedClient.openingBalance)}
                      </td>
                    </tr>
                  )}

                  {/* Transaction Rows */}
                  {processedTxs.map((tx, idx) => {
                    const isDebit = tx.type === 'BILL' || tx.type === 'DEBIT';
                    return (
                      <tr 
                        key={tx.id || idx}
                        style={{ backgroundColor: idx % 2 === 1 ? '#fff7ed' : '#ffffff' }}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-800 text-center text-[11px]">
                          {formatDateIndian(tx.date)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 font-semibold text-xs leading-snug">
                          {tx.description}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700 text-[11px]">
                          {tx.type}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-xs">
                          {isDebit ? `₹ ${formatIndianCurrency(tx.amount)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-xs">
                          {!isDebit ? `₹ ${formatIndianCurrency(tx.amount)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                          ₹ {formatIndianCurrency(tx.currentRunningBalance)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Fallback demo row if empty */}
                  {processedTxs.length === 0 && !selectedClient.openingBalance && (
                    <tr className="bg-white">
                      <td className="py-2.5 px-3 font-mono text-slate-800 text-center text-[11px]">{formatDateIndian(quotDate)}</td>
                      <td className="py-2.5 px-3 text-slate-900 font-semibold text-xs">Basic Interior & Exterior Design Work</td>
                      <td className="py-2.5 px-2 text-center font-bold text-orange-600 text-[11px]">BILL</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-xs">₹ 95,950.00</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">-</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">₹ 95,950.00</td>
                    </tr>
                  )}

                  {/* Current Balance Due row */}
                  <tr style={{ backgroundColor: '#fff7ed' }}>
                    <td colSpan={5} className="py-2.5 px-3 text-right font-bold text-xs text-slate-900 uppercase tracking-wide">
                      CURRENT BALANCE DUE:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950 text-sm">
                      ₹ {formatIndianCurrency(netBalance)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Total in Words & Audit Notes ── */}
        <div className="flex justify-between items-start text-xs border-t border-orange-200/60 pt-3 mb-4 gap-4">
          <div className="w-1/2 space-y-1">
            <div className="font-bold text-slate-700 text-[11px]">
              {isAllSitesMode ? 'Portfolio Audit Notes & Status:' : 'Terms & Conditions:'}
            </div>
            {isAllSitesMode ? (
              <p className="text-[10px] text-slate-600 leading-snug">
                This master quotation consolidates all active project sites across the SMART TECH portfolio. 
                Payment collection rate stands at <span className="font-bold text-emerald-700">{allSitesData.collectionRate}%</span> with <span className="font-bold">{allSitesData.totalSites} sites</span> accounted for.
              </p>
            ) : (
              <p className="text-[10px] text-slate-600 leading-snug">
                Please pay within 15 days from bill date. All constructions and works managed by SMART TECH.
              </p>
            )}
          </div>

          <div className="w-1/2 text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {isAllSitesMode ? 'CONSOLIDATED TOTAL (IN WORDS):' : 'INVOICE TOTAL (IN WORDS):'}
            </div>
            <div className="text-xs font-bold text-slate-900 mt-0.5 leading-tight">
              {totalInWords}
            </div>
          </div>
        </div>

        {/* ── Footer: Stamp left | Signature right ── */}
        <div className="flex justify-between items-end pt-2">

          {/* Left: Company stamp */}
          <div className="text-[11px] text-slate-800">
            <div className="font-extrabold text-slate-900 text-xs">
              {safeCompanyInfo.name} ™
            </div>
            <div className="italic text-slate-500 text-[10px]">Authorized Signature &amp; Seal</div>
          </div>

          {/* Right: For SMART TECH with signature line */}
          <div className="text-right">
            <div className="h-8"></div>
            <div className="border-t border-slate-800 pt-1 px-4 inline-block text-xs font-bold text-slate-900">
              For {safeCompanyInfo.name}
            </div>
          </div>

        </div>

        </div>

      </div>
    </div>
  );
}

