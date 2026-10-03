import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  Users, 
  Layers, 
  ShieldCheck, 
  Eye, 
  X, 
  ZoomIn, 
  ZoomOut, 
  FileCheck,
  Calendar,
  Hash,
  SlidersHorizontal,
  Sparkles 
} from 'lucide-react';
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
  theme = 'night',
  authUser = null,
  onUploadLogo,
  onRemoveCustomLogo,
  onBackToLedger,
  onSelectClientForPrint 
}) {
  const isDay = theme === 'day';
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);

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

  // Admin Print Header Display Mode: 'both' | 'quot_only' (Quotation No instead of Date) | 'date_only'
  const [printHeaderMode, setPrintHeaderMode] = useState(() => {
    try {
      return localStorage.getItem('smarttech_quot_print_header_mode') || 'both';
    } catch (e) {
      return 'both';
    }
  });

  const handleSetHeaderMode = (mode) => {
    setPrintHeaderMode(mode);
    try {
      localStorage.setItem('smarttech_quot_print_header_mode', mode);
    } catch (e) {}
  };

  // Table Row Column Mode: 'number' (1, 2, 3...) | 'date' (DD-MM-YYYY) | 'both' (Sl No & Date)
  const [itemNumberingMode, setItemNumberingMode] = useState(() => {
    try {
      return localStorage.getItem('smarttech_quot_item_numbering_mode') || 'number';
    } catch (e) {
      return 'number';
    }
  });

  const handleSetItemNumberingMode = (mode) => {
    setItemNumberingMode(mode);
    try {
      localStorage.setItem('smarttech_quot_item_numbering_mode', mode);
    } catch (e) {}
  };

  // Print directly — uses Electron native printer or standard browser print
  const handlePrintCommand = () => {
    if (window.electronAPI && typeof window.electronAPI.printDocument === 'function') {
      window.electronAPI.printDocument();
    } else {
      window.print();
    }
  };

  // Download PDF — uses native Chromium printToPDF in Electron, or html2canvas + jsPDF with equal 10mm margin
  const handleDownloadPDF = async () => {
    const clientNameClean = (selectedClient?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Quotation_${refNo.replace(/[^a-zA-Z0-9]/g, '_')}_${clientNameClean}.pdf`;

    // 1. If running in Electron desktop app, use native printToPDF for 100% pixel-perfect vector print
    if (window.electronAPI && typeof window.electronAPI.printToPDF === 'function') {
      try {
        setIsGeneratingPDF(true);
        const data = await window.electronAPI.printToPDF();
        if (data && data.length > 0) {
          const blob = new Blob([data], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      } catch (electronErr) {
        console.warn('Electron printToPDF fallback to html2canvas:', electronErr);
      } finally {
        setIsGeneratingPDF(false);
      }
    }

    // 2. Web browser html2canvas + jsPDF engine
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

      const pageWidth = 210;  // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10;      // Equal 10mm margin on all 4 sides (length & breadth)
      const contentWidth = pageWidth - margin * 2;   // 190mm
      const contentHeight = pageHeight - margin * 2; // 277mm

      // Exact 190mm x 277mm aspect ratio canvas (ratio = 277/190 = 1.4578947)
      const targetWidthPx = 800;
      const targetHeightPx = Math.round(targetWidthPx * (contentHeight / contentWidth)); // 1166px

      // Capture at exact rendered size with clean background and no box-shadow bleed
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('.quotation-sheet-container');
          if (clonedElement) {
            // Isolate clonedElement in body so no header/offset pushes it down
            clonedDoc.body.innerHTML = '';
            clonedDoc.body.style.margin = '0';
            clonedDoc.body.style.padding = '0';
            clonedDoc.body.style.background = '#ffffff';
            clonedDoc.body.appendChild(clonedElement);

            clonedElement.style.boxShadow = 'none';
            clonedElement.style.position = 'static';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.width = `${targetWidthPx}px`;
            clonedElement.style.maxWidth = `${targetWidthPx}px`;
            clonedElement.style.minHeight = `${targetHeightPx}px`;
            clonedElement.style.height = `${targetHeightPx}px`;
            clonedElement.style.maxHeight = `${targetHeightPx}px`;
            clonedElement.style.boxSizing = 'border-box';
            clonedElement.style.display = 'flex';
            clonedElement.style.flexDirection = 'column';
            clonedElement.style.justifyContent = 'space-between';
            clonedElement.style.padding = '20px 24px';
            clonedElement.style.overflow = 'hidden';

            const innerDiv = clonedElement.querySelector('.relative.z-10');
            if (innerDiv) {
              innerDiv.style.minHeight = '0';
              innerDiv.style.height = '100%';
              innerDiv.style.flex = '1';
              innerDiv.style.display = 'flex';
              innerDiv.style.flexDirection = 'column';
              innerDiv.style.justifyContent = 'space-between';
            }
          }
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
      pdf.save(fileName);
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
      <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 no-print transition-colors`}>
        <button
          onClick={onBackToLedger}
          className={`flex items-center space-x-1.5 text-xs font-semibold ${isDay ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200' : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700'} px-3 py-1.5 rounded-xl transition-all`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tally Ledger</span>
        </button>

        {/* Client / Master Account Selector */}
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-amber-500" />
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
            className={`${isDay ? 'bg-slate-50 border-slate-300 text-amber-800 focus:bg-white' : 'bg-slate-950 border-slate-800 text-amber-300'} border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors`}
          >
            <option value="ALL_SITES" className="font-bold text-amber-500 bg-slate-900">
              🌟 [ADMIN] Master Quotation — All Sites Summary ({allSitesData.totalSites} Sites)
            </option>
            <optgroup label="── Individual Site Accounts ──" className={isDay ? "text-slate-700 bg-white" : "text-slate-300 bg-slate-950"}>
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
          <div className={`flex items-center space-x-1 ${isDay ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'} p-1 rounded-xl border`}>
            <button
              onClick={() => setMasterViewMode('summary')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                masterViewMode === 'summary'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 Portfolio Overview
            </button>
            <button
              onClick={() => setMasterViewMode('detailed')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                masterViewMode === 'detailed'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📑 Detailed Audit
            </button>
          </div>
        )}

        <div className="flex items-center space-x-2.5">
          {/* Interactive Print Preview Button */}
          <button
            onClick={() => setShowPreviewModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-all"
            title="Open Interactive A4 Print Preview"
          >
            <Eye className="w-4 h-4" />
            <span>Print Preview</span>
          </button>

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

      {/* ── Admin Suggestion & Print Display Customizer Bar ── */}
      <div className={`${isDay ? 'bg-amber-50/80 border-amber-200 shadow-sm' : 'bg-slate-900/90 border-slate-800'} border p-3 rounded-2xl space-y-2.5 text-xs no-print transition-colors`}>
        {/* Row 1: Header Mode & Quick Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold">
              <SlidersHorizontal className="w-4 h-4" />
              <span className={isDay ? 'text-slate-900' : 'text-white'}>Header Display:</span>
            </div>

            {/* Mode Switcher: Both | Quotation No Only | Date Only */}
            <div className={`flex items-center p-0.5 rounded-xl border ${
              isDay ? 'bg-white border-slate-200 shadow-inner' : 'bg-slate-950 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => handleSetHeaderMode('both')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  printHeaderMode === 'both'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="Prints Quotation Number on Left and Date on Right"
              >
                <span>Both (No & Date)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetHeaderMode('quot_only')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  printHeaderMode === 'quot_only'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="Prints Quotation Number instead of Date"
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Quotation No Only</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetHeaderMode('date_only')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  printHeaderMode === 'date_only'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="Prints Date only without Quotation Number on date line"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Date Only</span>
              </button>
            </div>
          </div>

          {/* Quick Edit for Quotation / Ref No and Date */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-semibold ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
                Quot No:
              </span>
              <input
                type="text"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="e.g. SMRT/2026/001"
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border focus:outline-none focus:border-amber-500 transition-colors ${
                  isDay ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-amber-300'
                }`}
                style={{ width: '145px' }}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-semibold ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
                Date:
              </span>
              <input
                type="date"
                value={quotDate}
                onChange={(e) => setQuotDate(e.target.value)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold border focus:outline-none focus:border-amber-500 transition-colors ${
                  isDay ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Table Column Selection: 1, 2, 3 (Serial No) vs Date vs Both */}
        <div className={`pt-2 border-t flex flex-wrap items-center justify-between gap-3 ${
          isDay ? 'border-amber-200/80' : 'border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold">
              <Layers className="w-4 h-4" />
              <span className={isDay ? 'text-slate-900' : 'text-white'}>Table Particulars Column:</span>
            </div>

            <div className={`flex items-center p-0.5 rounded-xl border ${
              isDay ? 'bg-white border-slate-200 shadow-inner' : 'bg-slate-950 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => handleSetItemNumberingMode('number')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  itemNumberingMode === 'number'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="Shows item serial numbers 1, 2, 3 for each description"
              >
                <span>🔢 1, 2, 3 (Sl No)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetItemNumberingMode('date')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  itemNumberingMode === 'date'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="Shows transaction Date for each description"
              >
                <span>📅 Date (DD-MM-YYYY)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetItemNumberingMode('both')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  itemNumberingMode === 'both'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
                title="Shows both Sl No (1, 2, 3) and Date columns"
              >
                <span>✨ Both (Sl No & Date)</span>
              </button>
            </div>
          </div>

          <span className={`text-[11px] font-medium ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
            {itemNumberingMode === 'number' && '✓ Each particular item displays number 1, 2, 3... in place of date'}
            {itemNumberingMode === 'date' && '✓ Standard date column (e.g. 01-07-2026) for each transaction'}
            {itemNumberingMode === 'both' && '✓ Dual columns: Sl No (1, 2, 3) + Date side-by-side'}
          </span>
        </div>
      </div>

      {/* 
        On-Screen Quotation Sheet Container - Luxury Architectural Dual-Border Margin Frame with Watermark
      */}
      <div 
        className="quotation-sheet-container bg-white text-slate-800 p-6 rounded-none font-sans mx-auto relative shadow-2xl flex flex-col justify-between" 
        style={{ 
          border: '2.5px solid #b45309',
          outline: '1.5px solid #f59e0b',
          outlineOffset: '-6px',
          boxShadow: '0 0 0 6px #fff7ed, 0 20px 45px -10px rgba(0, 0, 0, 0.25)',
          maxWidth: '860px',
          minHeight: '920px'
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
        <div className="relative z-10 flex flex-col justify-between h-full flex-1">
          
          <div>
            {/* ── TOP: Logo centered ── */}
            <div className="text-center mb-1.5">
              <Logo 
                customLogoUrl={customLogoUrl} 
                variant="full" 
                printMode={true} 
              />
            </div>

            {/* ── Slogan / Tagline ── */}
            <div className="text-center mb-2">
              <p className="text-[11px] font-medium text-slate-800 tracking-wide">
                &ldquo;We Craft Your Dream Space into a Colourful Reality. <strong className="font-extrabold text-slate-950">Smart Tech</strong> &ndash; Always with You.&rdquo;
              </p>
            </div>

            {/* ── From / To two-column section ── */}
            <div className="flex justify-between gap-4 mb-2">

            {/* Left: From (Company info + Ref + Mob) */}
            <div 
              className="w-1/2 p-2.5 px-3.5 rounded-xl border text-[11px] text-slate-700"
              style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}
            >
              <h3 className="font-bold text-[11px] tracking-wide mb-1" style={{ color: '#d97706' }}>
                From
              </h3>
              <div className="font-bold text-slate-900 text-xs mb-0.5">{safeCompanyInfo.name}</div>
              <p className="leading-tight text-slate-600 text-[10.5px] mb-1">{safeCompanyInfo.address}</p>
              <div className="text-[10.5px] font-medium text-slate-800">
                Ref NO : <span className="font-bold">{refNo}</span>
              </div>
              <div className="text-[10.5px] font-medium text-slate-800">
                Mob : <span className="font-bold">{safeCompanyInfo.phones}</span>
              </div>
            </div>

            {/* Right: To (Client / All Sites Portfolio info) */}
            <div 
              className="w-1/2 p-2.5 px-3.5 rounded-xl border text-[11px] text-slate-700"
              style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}
            >
              <h3 className="font-bold text-[11px] tracking-wide mb-1" style={{ color: '#d97706' }}>
                {isAllSitesMode ? 'Consolidated Portfolio To' : 'To'}
              </h3>
              <div className="font-bold text-slate-900 text-xs mb-0.5">{selectedClient.name}</div>
              <p className="leading-tight text-slate-600 text-[10.5px] mb-1">
                {selectedClient.siteLocation || selectedClient.address || 'Palakkad, Kerala'}
              </p>
              {isAllSitesMode ? (
                <div className="text-[9.5px] font-bold text-amber-700 mt-0.5 uppercase tracking-wider">
                  Total Sites Included: {allSitesData.totalSites} Sites Portfolio
                </div>
              ) : (
                selectedClient.phone && (
                  <div className="text-[10.5px] font-medium text-slate-800">
                    Mob : <span className="font-bold">{selectedClient.phone}</span>
                  </div>
                )
              )}
            </div>

          </div>

          {/* ── Date / Quotation No + "Quotation" title (center) row ── */}
          <div className="flex items-center justify-between mb-2 px-1">
            {/* Left Header Element */}
            <div className="text-xs font-bold text-slate-800 min-w-[130px]">
              {printHeaderMode === 'both' && (
                <div>
                  Quot No : <span className="font-extrabold text-slate-900 font-mono">{refNo}</span>
                </div>
              )}
              {printHeaderMode === 'quot_only' && (
                <div>
                  Quot No : <span className="font-extrabold text-slate-900 font-mono">{refNo}</span>
                </div>
              )}
              {printHeaderMode === 'date_only' && (
                <div>
                  Date : <span className="font-extrabold text-slate-900">{formatDateIndian(quotDate)}</span>
                </div>
              )}
            </div>

            {/* Center Header: Quotation Title */}
            <div className="flex-1 text-center">
              <h2 className="text-lg font-extrabold tracking-tight" style={{ color: '#ea580c' }}>
                {isAllSitesMode ? 'Master Quotation' : 'Quotation'}
              </h2>
              {isAllSitesMode && (
                <span className="text-[9px] uppercase font-bold text-amber-700 tracking-wider">
                  [ All Sites Consolidated Statement ]
                </span>
              )}
            </div>

            {/* Right Header Element */}
            <div className="w-32 text-right text-xs font-bold text-slate-800">
              {printHeaderMode === 'both' && (
                <div>
                  Date : <span className="font-extrabold text-slate-900">{formatDateIndian(quotDate)}</span>
                </div>
              )}
              {printHeaderMode !== 'both' && isAllSitesMode && (
                <span className="text-[10px] text-slate-500">{allSitesData.totalSites} Sites</span>
              )}
            </div>
          </div>

          {/* ── MASTER MODE: Executive KPI Cards Strip ── */}
          {isAllSitesMode && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="p-1.5 rounded-lg border text-center" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Sites</div>
                <div className="text-xs font-extrabold text-slate-900 mt-0.5">{allSitesData.totalSites} Projects</div>
              </div>
              <div className="p-1.5 rounded-lg border text-center" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Billed (+)</div>
                <div className="text-[11px] font-mono font-extrabold text-slate-900 mt-0.5 whitespace-nowrap">₹ {formatIndianCurrency(allSitesData.grandTotalDebits)}</div>
              </div>
              <div className="p-1.5 rounded-lg border text-center" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Received (-)</div>
                <div className="text-[11px] font-mono font-extrabold text-emerald-700 mt-0.5 whitespace-nowrap">₹ {formatIndianCurrency(allSitesData.grandTotalCredits)}</div>
              </div>
              <div className="p-1.5 rounded-lg border text-center" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <div className="text-[9px] uppercase font-bold text-amber-700 tracking-wider">Net Balance Due</div>
                <div className="text-[11px] font-mono font-black text-slate-950 mt-0.5 whitespace-nowrap">₹ {formatIndianCurrency(allSitesData.grandTotalBalance)}</div>
              </div>
            </div>
          )}

          {/* ── Statement Table ── */}
          <div className="mb-2 overflow-hidden rounded-lg border border-orange-200/60 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                  {/* First Column: Sl No or Date or Both based on itemNumberingMode */}
                  {isAllSitesMode ? (
                    <th className="py-1.5 px-2 font-bold text-xs text-white text-center whitespace-nowrap w-16" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                      Sl No
                    </th>
                  ) : (
                    <>
                      {(itemNumberingMode === 'number' || itemNumberingMode === 'both') && (
                        <th className="py-1.5 px-2 font-bold text-xs text-white text-center whitespace-nowrap w-14" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                          Sl No
                        </th>
                      )}
                      {(itemNumberingMode === 'date' || itemNumberingMode === 'both') && (
                        <th className="py-1.5 px-2 font-bold text-xs text-white text-center whitespace-nowrap w-24" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                          Date
                        </th>
                      )}
                    </>
                  )}
                  <th className="py-1.5 px-2.5 font-bold text-xs text-white" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                    {isAllSitesMode ? 'Site Project / Client Details' : 'Particulars / Description'}
                  </th>
                  <th className="py-1.5 px-2 font-bold text-xs text-white text-center whitespace-nowrap w-16" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>Type</th>
                  {isAllSitesMode && (
                    <th className="py-1.5 px-2.5 font-bold text-xs text-white text-right whitespace-nowrap w-28" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                      Opening (₹)
                    </th>
                  )}
                  <th className="py-1.5 px-2.5 font-bold text-xs text-white text-right whitespace-nowrap w-28" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                    {isAllSitesMode ? 'Total Billed (+)' : 'Debit (+)'}
                  </th>
                  <th className="py-1.5 px-2.5 font-bold text-xs text-white text-right whitespace-nowrap w-28" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                    {isAllSitesMode ? 'Advance Paid (-)' : 'Credit (-)'}
                  </th>
                  <th className="py-1.5 px-2.5 font-bold text-xs text-white text-right whitespace-nowrap w-32" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
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
                          <td className="py-1.5 px-2 font-mono text-slate-800 text-center text-[11px] font-bold whitespace-nowrap">
                            {String(site.slNo).padStart(2, '0')}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-900 font-semibold text-xs leading-snug">
                            <div className="font-bold text-slate-950">{site.clientName}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              📍 {site.siteLocation} {site.phone ? `• 📞 ${site.phone}` : ''}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-center font-bold text-slate-700 text-[11px] whitespace-nowrap">
                            SITE
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 text-xs whitespace-nowrap">
                            {site.openingBalance > 0 ? `₹ ${formatIndianCurrency(site.openingBalance)}` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-900 text-xs whitespace-nowrap">
                            ₹ {formatIndianCurrency(site.totalDebits)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-900 text-xs whitespace-nowrap">
                            {site.totalCredits > 0 ? `₹ ${formatIndianCurrency(site.totalCredits)}` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
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
                                    <span className="font-semibold whitespace-nowrap">{tx.type === 'BILL' ? `+ ₹${formatIndianCurrency(tx.amount)}` : `- ₹${formatIndianCurrency(tx.amount)}`}</span>
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
                      <td colSpan={3} className="py-1.5 px-3 text-right font-bold text-slate-700 uppercase">
                        Portfolio Subtotals:
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        ₹ {formatIndianCurrency(allSitesData.grandTotalOpening)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        ₹ {formatIndianCurrency(allSitesData.grandTotalDebits)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        ₹ {formatIndianCurrency(allSitesData.grandTotalCredits)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-extrabold text-slate-950 whitespace-nowrap">
                        ₹ {formatIndianCurrency(allSitesData.grandTotalBalance)}
                      </td>
                    </tr>

                    {/* Grand Balance Due Row */}
                    <tr style={{ backgroundColor: '#fff7ed' }}>
                      <td colSpan={6} className="py-2 px-3 text-right font-black text-xs text-slate-900 uppercase tracking-wider">
                        TOTAL BALANCE DUE (ALL SITES COMBINED):
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-950 text-sm whitespace-nowrap">
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
                        {(itemNumberingMode === 'number' || itemNumberingMode === 'both') && (
                          <td className="py-1.5 px-2 font-mono text-slate-900 text-center text-xs font-bold whitespace-nowrap">
                            1
                          </td>
                        )}
                        {(itemNumberingMode === 'date' || itemNumberingMode === 'both') && (
                          <td className="py-1.5 px-2 font-mono text-slate-800 text-center text-[11px] whitespace-nowrap">
                            {formatDateIndian(selectedClient.createdAt || quotDate)}
                          </td>
                        )}
                        <td className="py-1.5 px-2.5 text-slate-900 font-semibold text-xs">Opening Balance Brought Forward</td>
                        <td className="py-1.5 px-2 text-center font-bold text-orange-600 text-[11px] whitespace-nowrap">OPENING</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-600 text-xs whitespace-nowrap">-</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-600 text-xs whitespace-nowrap">-</td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                          ₹ {formatIndianCurrency(selectedClient.openingBalance)}
                        </td>
                      </tr>
                    )}

                    {/* Transaction Rows */}
                    {processedTxs.map((tx, idx) => {
                      const isDebit = tx.type === 'BILL' || tx.type === 'DEBIT';
                      const hasOpening = selectedClient && selectedClient.openingBalance > 0;
                      const rowSlNo = hasOpening ? idx + 2 : idx + 1;
                      return (
                        <tr 
                          key={tx.id || idx}
                          style={{ backgroundColor: idx % 2 === 1 ? '#fff7ed' : '#ffffff' }}
                        >
                          {(itemNumberingMode === 'number' || itemNumberingMode === 'both') && (
                            <td className="py-1.5 px-2 font-mono text-slate-900 text-center text-xs font-bold whitespace-nowrap">
                              {rowSlNo}
                            </td>
                          )}
                          {(itemNumberingMode === 'date' || itemNumberingMode === 'both') && (
                            <td className="py-1.5 px-2 font-mono text-slate-800 text-center text-[11px] whitespace-nowrap">
                              {formatDateIndian(tx.date)}
                            </td>
                          )}
                          <td className="py-1.5 px-2.5 text-slate-900 font-semibold text-xs leading-snug">
                            {tx.description}
                          </td>
                          <td className="py-1.5 px-2 text-center font-bold text-slate-700 text-[11px] whitespace-nowrap">
                            {tx.type}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-900 text-xs whitespace-nowrap">
                            {isDebit ? `₹ ${formatIndianCurrency(tx.amount)}` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-900 text-xs whitespace-nowrap">
                            {!isDebit ? `₹ ${formatIndianCurrency(tx.amount)}` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                            ₹ {formatIndianCurrency(tx.currentRunningBalance)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Fallback demo row if empty */}
                    {processedTxs.length === 0 && (!selectedClient || !selectedClient.openingBalance) && (
                      <tr className="bg-white">
                        {(itemNumberingMode === 'number' || itemNumberingMode === 'both') && (
                          <td className="py-1.5 px-2 font-mono text-slate-900 text-center text-xs font-bold whitespace-nowrap">1</td>
                        )}
                        {(itemNumberingMode === 'date' || itemNumberingMode === 'both') && (
                          <td className="py-1.5 px-2 font-mono text-slate-800 text-center text-[11px] whitespace-nowrap">{formatDateIndian(quotDate)}</td>
                        )}
                        <td className="py-1.5 px-2.5 text-slate-900 font-semibold text-xs">Basic Interior & Exterior Design Work</td>
                        <td className="py-1.5 px-2 text-center font-bold text-orange-600 text-[11px] whitespace-nowrap">BILL</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-900 text-xs whitespace-nowrap">₹ 95,950.00</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-600 text-xs whitespace-nowrap">-</td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">₹ 95,950.00</td>
                      </tr>
                    )}

                    {/* Current Balance Due row */}
                    <tr style={{ backgroundColor: '#fff7ed' }}>
                      <td colSpan={itemNumberingMode === 'both' ? 6 : 5} className="py-2 px-3 text-right font-bold text-xs text-slate-900 uppercase tracking-wide">
                        CURRENT BALANCE DUE:
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-950 text-sm whitespace-nowrap">
                        ₹ {formatIndianCurrency(netBalance)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom Section Anchored to Bottom ── */}
        <div className="pt-2 mt-auto">
          {/* ── Total in Words & Audit Notes ── */}
          <div className="flex justify-between items-start text-xs border border-orange-200/80 rounded-lg p-2.5 bg-orange-50/40 mb-2 gap-4">
            <div className="w-1/2 space-y-0.5">
              <div className="font-bold text-slate-700 text-[10.5px]">
                {isAllSitesMode ? 'Portfolio Audit Notes & Status:' : 'Terms & Conditions:'}
              </div>
              {isAllSitesMode ? (
                <p className="text-[9.5px] text-slate-600 leading-snug">
                  This master quotation consolidates all active project sites across the SMART TECH portfolio. 
                  Payment collection rate stands at <span className="font-bold text-emerald-700">{allSitesData.collectionRate}%</span> with <span className="font-bold">{allSitesData.totalSites} sites</span> accounted for.
                </p>
              ) : (
                <p className="text-[9.5px] text-slate-600 leading-snug">
                  Please pay within 15 days from bill date. All constructions and works managed by SMART TECH.
                </p>
              )}
            </div>

            <div className="w-1/2 text-right">
              <div className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">
                {isAllSitesMode ? 'CONSOLIDATED TOTAL (IN WORDS):' : 'INVOICE TOTAL (IN WORDS):'}
              </div>
              <div className="text-[11px] font-bold text-slate-900 mt-0.5 leading-tight">
                {totalInWords}
              </div>
            </div>
          </div>

          {/* ── Footer: Stamp left | Signature right ── */}
          <div className="flex justify-between items-end pt-1 pb-1">

            {/* Left: Company stamp */}
            <div className="text-[11px] text-slate-800">
              <div className="font-extrabold text-slate-900 text-xs">
                {safeCompanyInfo.name} ™
              </div>
              <div className="italic text-slate-500 text-[9.5px]">Authorized Signature &amp; Seal</div>
            </div>

            {/* Right: For SMART TECH with signature line */}
            <div className="text-right">
              <div className="h-6"></div>
              <div className="border-t border-slate-800 pt-1 px-4 inline-block text-xs font-bold text-slate-900">
                For {safeCompanyInfo.name}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>

      {/* ── Interactive A4 Print Preview Fullscreen Modal ── */}
      {showPreviewModal && (
        <div className={`fixed inset-0 z-50 ${isDay ? 'bg-slate-900/60' : 'bg-slate-950/95'} backdrop-blur-lg flex flex-col no-print animate-in fade-in duration-200`}>
          
          {/* Preview Navigation & Action Bar */}
          <div className={`h-16 px-6 ${isDay ? 'bg-white border-b border-slate-200 text-slate-800' : 'bg-slate-900 border-b border-slate-800 text-white'} flex items-center justify-between shrink-0 shadow-2xl transition-colors`}>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500 shadow-sm">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className={`text-sm font-bold ${isDay ? 'text-slate-900' : 'text-white'} tracking-wide`}>
                    SMART TECH Document Print Preview
                  </h3>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    A4 Ready
                  </span>
                </div>
                <p className={`text-[11px] ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                  Standard A4 (210mm × 297mm) • 300 DPI High-Resolution Layout
                </p>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className={`flex items-center space-x-2 ${isDay ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'} px-3 py-1.5 rounded-xl border shadow-inner`}>
              <button
                onClick={() => setPreviewZoom(prev => Math.max(0.6, Number((prev - 0.1).toFixed(1))))}
                className={`p-1 ${isDay ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'} rounded transition-all`}
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className={`text-xs font-mono font-bold ${isDay ? 'text-amber-700' : 'text-amber-400'} min-w-[50px] text-center select-none`}>
                {Math.round(previewZoom * 100)}%
              </span>
              <button
                onClick={() => setPreviewZoom(prev => Math.min(1.4, Number((prev + 0.1).toFixed(1))))}
                className={`p-1 ${isDay ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'} rounded transition-all`}
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewZoom(1)}
                className={`text-[10px] font-semibold ${isDay ? 'text-slate-600 hover:text-amber-700 hover:bg-slate-200' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'} px-2 py-0.5 rounded ml-1 transition-all`}
                title="Reset to 100%"
              >
                Fit Page
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPDF ? 'Generating...' : 'Save PDF'}</span>
              </button>

              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setTimeout(() => handlePrintCommand(), 150);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>

              <button
                onClick={() => setShowPreviewModal(false)}
                className={`p-1.5 ${isDay ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'} rounded-xl transition-all ml-1`}
                title="Close Print Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Scrollable Viewport */}
          <div className={`flex-1 overflow-auto p-8 flex justify-center ${isDay ? 'bg-slate-200/70' : 'bg-slate-950/80'} transition-colors`}>
            <div 
              style={{ 
                transform: `scale(${previewZoom})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
              className="my-auto drop-shadow-2xl"
            >
              {/* Paper Sheet Preview Container */}
              <div 
                className="bg-white text-slate-800 p-6 rounded-none font-sans mx-auto relative shadow-2xl flex flex-col justify-between" 
                style={{ 
                  border: '2.5px solid #b45309',
                  outline: '1.5px solid #f59e0b',
                  outlineOffset: '-6px',
                  boxShadow: '0 0 0 6px #fff7ed, 0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                  width: '800px',
                  minHeight: '1166px'
                }}
              >
                {/* 4 Corner Flourishes */}
                <div className="absolute top-2 left-2 text-amber-700 font-serif text-sm">✤</div>
                <div className="absolute top-2 right-2 text-amber-700 font-serif text-sm">✤</div>
                <div className="absolute bottom-2 left-2 text-amber-700 font-serif text-sm">✤</div>
                <div className="absolute bottom-2 right-2 text-amber-700 font-serif text-sm">✤</div>

                {/* Watermark Logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                  <img 
                    src={watermarkLogo} 
                    alt="" 
                    className="w-[68%] max-w-[520px] opacity-[0.14] object-contain pointer-events-none"
                    style={{ filter: 'contrast(130%) brightness(102%)', transform: 'scale(1.08)' }}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between h-full flex-1">
                  <div>
                  <div className="text-center mb-1.5">
                    <Logo customLogoUrl={customLogoUrl} variant="full" printMode={true} />
                  </div>
                  <div className="text-center mb-2">
                    <p className="text-[11px] font-medium text-slate-800 tracking-wide">
                      &ldquo;We Craft Your Dream Space into a Colourful Reality. <strong className="font-extrabold text-slate-950">Smart Tech</strong> &ndash; Always with You.&rdquo;
                    </p>
                  </div>

                  {/* Header Details Grid */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-amber-600/30">
                    <div className="text-xs space-y-1">
                      <div className="font-extrabold text-slate-900 text-sm tracking-wide">
                        {isAllSitesMode ? 'CONSOLIDATED STATEMENT FOR:' : 'BILLED TO:'}
                      </div>
                      <div className="text-sm font-bold text-amber-900">{selectedClient?.name}</div>
                      <div className="text-slate-600 font-medium">📍 {selectedClient?.siteLocation}</div>
                      <div className="text-slate-500 text-[11px]">{selectedClient?.address}</div>
                      {selectedClient?.phone && <div className="text-slate-600">📞 {selectedClient.phone}</div>}
                    </div>

                    <div className="text-right text-xs space-y-1">
                      <div className="inline-block bg-amber-50 border border-amber-300/80 px-3 py-1 rounded text-amber-900 font-extrabold text-xs mb-1">
                        {isAllSitesMode ? 'MASTER PORTFOLIO QUOTATION' : 'OFFICIAL QUOTATION'}
                      </div>
                      {printHeaderMode !== 'date_only' && (
                        <div><span className="text-slate-500">Quot No:</span> <strong className="font-mono text-slate-900">{refNo}</strong></div>
                      )}
                      {printHeaderMode !== 'quot_only' && (
                        <div><span className="text-slate-500">Date:</span> <strong className="text-slate-900">{formatDateIndian(quotDate)}</strong></div>
                      )}
                      <div><span className="text-slate-500">Place of Supply:</span> <strong className="text-slate-900">{placeOfSupply}</strong></div>
                    </div>
                  </div>

                  {/* Table summary */}
                  <div className="mt-4">
                    <table className="w-full text-xs border border-amber-600/30">
                      <thead className="bg-amber-100/70 text-slate-900 border-b border-amber-600/30">
                        <tr>
                          {(itemNumberingMode === 'number' || itemNumberingMode === 'both') && (
                            <th className="py-2 px-3 text-left font-extrabold w-14">#</th>
                          )}
                          {(itemNumberingMode === 'date' || itemNumberingMode === 'both') && (
                            <th className="py-2 px-3 text-left font-extrabold w-24">Date</th>
                          )}
                          <th className="py-2 px-3 text-left font-extrabold">Description / Work Item</th>
                          <th className="py-2 px-3 text-right font-extrabold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {isAllSitesMode ? (
                          allSitesData.siteSummaries.map((s, idx) => (
                            <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}>
                              {(itemNumberingMode === 'number' || itemNumberingMode === 'both') && (
                                <td className="py-2 px-3 text-slate-700 font-bold">{idx + 1}</td>
                              )}
                              {(itemNumberingMode === 'date' || itemNumberingMode === 'both') && (
                                <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{formatDateIndian(quotDate)}</td>
                              )}
                              <td className="py-2 px-3 font-medium text-slate-900">{s.name} ({s.siteLocation})</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(s.closingBalance)}</td>
                            </tr>
                          ))
                        ) : (
                          processedTxs.length > 0 ? (
                            processedTxs.map((t, idx) => {
                              const hasOpening = selectedClient && selectedClient.openingBalance > 0;
                              const rowSlNo = hasOpening ? idx + 2 : idx + 1;
                              return (
                                <tr key={t.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}>
                                  {(itemNumberingMode === 'number' || itemNumberingMode === 'both') && (
                                    <td className="py-2 px-3 text-slate-700 font-bold">{rowSlNo}</td>
                                  )}
                                  {(itemNumberingMode === 'date' || itemNumberingMode === 'both') && (
                                    <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{formatDateIndian(t.date)}</td>
                                  )}
                                  <td className="py-2 px-3 text-slate-900 font-medium">{t.description || (t.type === 'BILL' ? 'Project Service / Material Billing' : 'Payment Received')}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(t.amount)}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              {(itemNumberingMode === 'number' || itemNumberingMode === 'both') && (
                                <td className="py-2 px-3 text-slate-700 font-bold">1</td>
                              )}
                              {(itemNumberingMode === 'date' || itemNumberingMode === 'both') && (
                                <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{formatDateIndian(quotDate)}</td>
                              )}
                              <td className="py-2 px-3 text-slate-900 font-medium">Opening Balance & Account Settlement</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(netBalance)}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                      <tfoot className="bg-amber-100/50 border-t-2 border-amber-600/40 font-extrabold">
                        <tr>
                          <td colSpan={itemNumberingMode === 'both' ? 3 : 2} className="py-2.5 px-3 text-right uppercase text-slate-900">Total Net Balance Payable:</td>
                          <td className="py-2.5 px-3 text-right font-mono text-sm text-amber-900">{formatIndianCurrency(netBalance)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                  {/* Words & Signature */}
                  <div className="pt-6 mt-auto pb-2 border-t border-slate-200 flex justify-between items-start text-xs">
                    <div className="max-w-[60%]">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Amount in Words:</div>
                      <div className="font-bold text-slate-900">{totalInWords}</div>
                    </div>
                    <div className="text-right">
                      <div className="h-10"></div>
                      <div className="border-t border-slate-700 pt-1 font-bold text-xs text-slate-900">
                        Authorized Signatory • SMART TECH
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

