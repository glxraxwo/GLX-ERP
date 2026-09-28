import React, { forwardRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getDocTranslation, translateCondition, defaultConditions } from '../../utils/documentTranslations';
import { useAuthStore } from '../../store/authStore';

/* ─── format helpers ─────────────────────────────────────────────────── */
const fmt = (num, min = 2, max = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${String(d.getDate()).padStart(2,'0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
    } catch { return String(dateStr); }
};

const fmtTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    } catch { return ''; }
};

const fmtPrintTs = (d = new Date()) => {
    try {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const day   = String(d.getDate()).padStart(2,'0');
        const mon   = months[d.getMonth()];
        const yr    = d.getFullYear();
        let h       = d.getHours();
        const mi    = String(d.getMinutes()).padStart(2,'0');
        const se    = String(d.getSeconds()).padStart(2,'0');
        const ampm  = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${day}/${mon}/${yr}   ${h}:${mi}:${se}${ampm}`;
    } catch { return new Date().toLocaleString(); }
};

/* ─── component ───────────────────────────────────────────────────── */
const DocumentPrintView = forwardRef(({ document: doc, companyInfo, useSinhalaLanguage = false, hideToolbar = false, hideLetterheadHeader = false }, ref) => {
    if (!doc) return null;

    const { user: currentUser } = useAuthStore();
    const [signatureScale, setSignatureScale] = useState('standard'); // 'standard' (72px) or 'large' (88px)
    const [signerChoice, setSignerChoice] = useState('auto'); // 'auto', 'my', 'company'

    const [lang, setLang]                   = useState(useSinhalaLanguage ? 'si' : 'en');
    const [showLetterheadHeader, setShowLH] = useState(!hideLetterheadHeader);
    const [showPhotosInPrint, setShowPhotos] = useState(true);
    const [isQuickEdit, setIsQuickEdit]     = useState(false);
    const [editedValues, setEditedValues]   = useState({});

    useEffect(() => {
        setShowLH(!hideLetterheadHeader);
    }, [hideLetterheadHeader]);

    useEffect(() => {
        if (useSinhalaLanguage) {
            setLang('si');
        }
    }, [useSinhalaLanguage]);

    const t = getDocTranslation(lang);

    /* ── active signature & signer resolution ── */
    let activeSignature = null;
    let signerName = '';
    let signerTitle = '';

    if (signerChoice === 'company') {
        activeSignature = companyInfo?.bossSignature || '';
        signerName = '';
        signerTitle = companyInfo?.bossTitle || 'Authorized Signature';
    } else if (signerChoice === 'my' && currentUser?.signature) {
        activeSignature = currentUser.signature;
        signerName = currentUser.fullName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
        signerTitle = currentUser.jobTitle || (currentUser.role === 'admin' ? 'Managing Director' : 'Manager');
    } else {
        // Auto: prioritize logged in manager's signature, then creator's signature, then document signature, then company default
        if (currentUser?.signature) {
            activeSignature = currentUser.signature;
            signerName = currentUser.fullName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
            signerTitle = currentUser.jobTitle || (currentUser.role === 'admin' ? 'Managing Director' : 'Manager');
        } else if (doc.createdBy?.signature) {
            activeSignature = doc.createdBy.signature;
            signerName = `${doc.createdBy.firstName || ''} ${doc.createdBy.lastName || ''}`.trim();
            signerTitle = doc.createdBy.jobTitle || 'Manager';
        } else if (doc.signature) {
            activeSignature = doc.signature;
            signerName = doc.signerName || '';
            signerTitle = doc.signerTitle || '';
        } else {
            activeSignature = companyInfo?.bossSignature || '';
            signerName = '';
            signerTitle = companyInfo?.bossTitle || 'Authorized Signature';
        }
    }

    /* ── doc-type flags ── */
    const isProforma  = doc.invoiceType === 'proforma' || doc.documentType === 'proforma' || (doc.invoiceNumber && (doc.invoiceNumber.startsWith('PI') || doc.invoiceNumber.includes('/PI/')));
    const isEstimate  = !isProforma && (doc.documentType === 'estimate' || (doc.quoteNumber && (doc.quoteNumber.startsWith('EST') || doc.quoteNumber.includes('/EST/'))));
    const isInvoice   = !isProforma && !isEstimate && (!!doc.invoiceNumber || doc.documentType === 'invoice');
    const isQuotation = !isProforma && !isEstimate && !isInvoice;

    const leftHeaderTitle = isProforma 
        ? (lang === 'si' ? 'PROFORMA QUOTATION / ප්‍රොෆෝමා මිල ගණන්' : lang === 'ta' ? 'PROFORMA QUOTATION / முன் விலைப்புள்ளி' : 'PROFORMA QUOTATION')
        : isEstimate
        ? (lang === 'si' ? 'ESTIMATE / ඇස්තමේන්තුව' : lang === 'ta' ? 'ESTIMATE / மதிப்பீடு' : 'ESTIMATE')
        : isInvoice
        ? (lang === 'si' ? 'INVOICE / ඉන්වොයිසිය' : lang === 'ta' ? 'INVOICE / விலைப்பட்டியல்' : 'INVOICE')
        : (lang === 'si' ? 'QUOTATION / මිල ගණන් කැඳවීම' : lang === 'ta' ? 'QUOTATION / விலைப்புள்ளி' : 'QUOTATION');

    const docNumberLabel = (isInvoice || isProforma)
        ? (lang === 'si' ? 'ඉන්වොයිස් අංකය' : lang === 'ta' ? 'விலைப்பட்டியல் எண்' : 'Invoice No.')
        : isEstimate
        ? (lang === 'si' ? 'ඇස්තමේන්තු අංකය' : lang === 'ta' ? 'மதிப்பீடு எண்' : 'Estimate No.')
        : (lang === 'si' ? 'මිල ගණන් අංකය' : lang === 'ta' ? 'விலைப்புள்ளி எண்' : 'Quotation No.');

    let docLabel = t.quotation;
    if (isEstimate)  docLabel = t.estimate;
    if (isInvoice)   docLabel = t.invoice;
    if (isProforma)  docLabel = t.proforma;

    /* ── meta ── */
    const docNumber       = doc.proformaNumber || doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || 'N/A';
    const customerName    = doc.customerName  || doc.vehicleOwner || doc.customerSnapshot?.name || 'Customer';
    const customerAddress = doc.customerAddress || doc.billingAddress?.line1 || '';
    const customerPhone   = doc.customerPhone || doc.customerSnapshot?.contactName || '';
    const vehicleNo       = doc.vehicleNo || '';
    const salesRep        = doc.salesRep  || 'Asanka';
    const branch          = doc.branch    || 'JA-ELA';
    const docDate         = doc.date || doc.invoiceDate || doc.createdAt || new Date();
    const printTimestamp  = fmtPrintTs(new Date());

    /* ── effective quick-edited meta ── */
    const customerNameVal    = editedValues.customerName !== undefined ? editedValues.customerName : customerName;
    const customerAddressVal = editedValues.customerAddress !== undefined ? editedValues.customerAddress : customerAddress;
    const customerPhoneVal   = editedValues.customerPhone !== undefined ? editedValues.customerPhone : customerPhone;
    const vehicleNoVal       = editedValues.vehicleNo !== undefined ? editedValues.vehicleNo : vehicleNo;
    const salesRepVal        = editedValues.salesRep !== undefined ? editedValues.salesRep : salesRep;
    const branchVal          = editedValues.branch !== undefined ? editedValues.branch : branch;

    /* ── items & totals ── */
    const items = doc.items || [];
    let subtotal = 0, totalLineDiscount = 0;

    items.forEach(item => {
        const qty      = Number(item.quantity) || 1;
        const rate     = Number(item.unitPrice || item.rate || 0);
        const discRate = Number(item.discount  || 0);
        const discAmt  = discRate > 0
            ? discRate * qty
            : Number(item.discountAmount || item.lineDiscount ||
                (item.discountPercent ? (qty * rate * item.discountPercent / 100) : 0));
        subtotal           += qty * rate;
        totalLineDiscount  += discAmt;
    });

    const extraDiscount = Number(doc.discount || doc.totalDiscount || 0);
    const totalDiscount = Math.max(totalLineDiscount, extraDiscount);
    const laborCost     = Number(doc.laborCost || 0);
    const tax           = Number(doc.tax || doc.totalTax || 0);
    const grandTotal    = doc.grandTotal !== undefined
        ? Number(doc.grandTotal)
        : (subtotal + laborCost + tax - totalDiscount);
    const advancePaid   = Number(doc.advanceAmount || doc.amountPaid || 0);
    const balanceDue    = doc.balanceAmount !== undefined
        ? Number(doc.balanceAmount)
        : (doc.balanceDue !== undefined ? Number(doc.balanceDue) : Math.max(0, grandTotal - advancePaid));

    /* ── dynamic trilingual terms & conditions ── */
    const rawPayCond = doc.conditionOfPayments || defaultConditions.conditionOfPayments.en;
    const rawCompWork = doc.completionOfWork || defaultConditions.completionOfWork.en;
    const rawValQuote = doc.validityQuotation || (doc.terms?.paymentTerms || defaultConditions.validityQuotation.en);
    const rawWarCond = doc.warrantyCondition || doc.warrantyInfo || defaultConditions.warrantyCondition.en;

    const dynamicPayCond  = translateCondition('conditionOfPayments', rawPayCond, lang);
    const dynamicCompWork = translateCondition('completionOfWork', rawCompWork, lang);
    const dynamicValQuote = translateCondition('validityQuotation', rawValQuote, lang);
    const dynamicWarCond  = translateCondition('warrantyCondition', rawWarCond, lang);

    const conditionOfPayments = editedValues.conditionOfPayments !== undefined ? editedValues.conditionOfPayments : dynamicPayCond;
    const completionOfWork    = editedValues.completionOfWork    !== undefined ? editedValues.completionOfWork    : dynamicCompWork;
    const validityQuotation   = editedValues.validityQuotation   !== undefined ? editedValues.validityQuotation   : dynamicValQuote;
    const warrantyCondition   = editedValues.warrantyCondition   !== undefined ? editedValues.warrantyCondition   : dynamicWarCond;
    const remarksText         = editedValues.remarks             !== undefined ? editedValues.remarks             : (doc.remarks || doc.notes || '');

    /* ── photo attachments collection ── */
    const allPhotos = [];
    if (doc.numberPlateImage) {
        allPhotos.push({ title: 'Vehicle Number Plate Photo', src: doc.numberPlateImage });
    }
    if (doc.lorryBodyImage) {
        allPhotos.push({ title: 'Vehicle / Lorry Body Condition', src: doc.lorryBodyImage });
    }
    if (Array.isArray(doc.photos)) {
        doc.photos.forEach((src, idx) => {
            if (src && !allPhotos.some(p => p.src === src)) {
                allPhotos.push({ title: `Inspection Photo ${allPhotos.length + 1}`, src });
            }
        });
    }
    if (Array.isArray(doc.inspectionPhotos)) {
        doc.inspectionPhotos.forEach((src, idx) => {
            if (src && !allPhotos.some(p => p.src === src)) {
                allPhotos.push({ title: `Inspection Photo ${allPhotos.length + 1}`, src });
            }
        });
    }

    /* ── QR string ── */
    const qrString = JSON.stringify({
        type: docLabel, number: docNumber, date: fmtDate(docDate),
        customer: customerNameVal, vehicleNo: vehicleNoVal || 'N/A',
        grandTotal, branch: branchVal, sales: salesRepVal,
    });

    const hasEdits = Object.keys(editedValues).length > 0;
    const editNum = Number(doc.editCount || (doc.version > 1 ? doc.version - 1 : 0) || (hasEdits ? 1 : 0));
    const revisionCode = editNum > 0 ? `E${editNum}` : 'E0';

    /* ── inline print styles ── */
    const printStyles = `
        @page {
            size: A4 portrait;
            margin: 0.25in; /* 0.25in on all sides = 0.5in width & height reduction on A4 */
        }
        @media print {
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .print-container {
                width: calc(210mm - 0.5in) !important;
                max-width: calc(210mm - 0.5in) !important;
                min-height: calc(297mm - 0.5in) !important;
                padding: 10px 14px !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
            }
            body { margin: 0; background: #fff !important; }
            input, textarea { border: none !important; background: transparent !important; box-shadow: none !important; resize: none !important; }
        }
    `;

    return (
        <div style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, Helvetica, sans-serif", color: '#222', background: '#fff', width: '100%', maxWidth: 'calc(210mm - 0.5in)', margin: '0 auto', fontSize: 12.5 }}>
            <style>{printStyles}</style>

            {/* ── Toolbar (no-print) ── */}
            {!hideToolbar && (
                <div className="no-print" style={{ marginBottom: 12, padding: '10px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
                    {/* Left: Language switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>Language / භාෂාව:</span>
                        <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                            {['en','si','ta'].map(l => (
                                <button key={l} type="button" onClick={() => setLang(l)} style={{
                                    padding: '4px 11px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11.5,
                                    background: lang === l ? '#0284c7' : 'transparent',
                                    color: lang === l ? '#fff' : '#374151',
                                    borderRadius: 0,
                                    transition: 'all 0.15s'
                                }}>
                                    {l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Quick Edit, Letterhead toggle, Photo toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Quick Edit toggle */}
                        <button 
                            type="button" 
                            onClick={() => setIsQuickEdit(e => !e)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: 7,
                                fontWeight: 600,
                                fontSize: 11.5,
                                cursor: 'pointer',
                                background: isQuickEdit ? '#2563eb' : '#fff',
                                color: isQuickEdit ? '#fff' : '#1d4ed8',
                                border: '1px solid #93c5fd',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: isQuickEdit ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                            title="Quick-edit text, conditions, remarks before printing or downloading"
                        >
                            {isQuickEdit ? '✓ Done Editing' : '✏️ Quick Edit Mode'}
                        </button>

                        {hasEdits && (
                            <button
                                type="button"
                                onClick={() => setEditedValues({})}
                                style={{
                                    padding: '4px 9px',
                                    borderRadius: 7,
                                    fontWeight: 600,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    border: '1px solid #fca5a5'
                                }}
                                title="Reset all in-place edits to original"
                            >
                                ↺ Reset
                            </button>
                        )}

                        {allPhotos.length > 0 && (
                            <button type="button" onClick={() => setShowPhotos(p => !p)} style={{
                                padding: '4px 10px', borderRadius: 7, fontWeight: 600, fontSize: 11, cursor: 'pointer',
                                background: showPhotosInPrint ? '#e0e7ff' : '#f3f4f6',
                                color: showPhotosInPrint ? '#3730a3' : '#6b7280',
                                border: '1px solid #cbd5e1'
                            }}>
                                📷 {showPhotosInPrint ? `Hide Photos (${allPhotos.length})` : `Show Photos (${allPhotos.length})`}
                            </button>
                        )}

                        {/* Letterhead Header Toggle */}
                        <button type="button" onClick={() => setShowLH(p => !p)} style={{
                            padding: '4px 12px', borderRadius: 7, fontWeight: 600, fontSize: 11, cursor: 'pointer', border: '1px solid #cbd5e1',
                            background: !showLetterheadHeader ? '#b45309' : '#fff',
                            color: !showLetterheadHeader ? '#fff' : '#374151',
                        }}>
                            {!showLetterheadHeader ? '✓ Without Header (Pre-printed)' : 'With Header (Letterhead)'}
                        </button>

                        {/* Signature Scale Button */}
                        <button 
                            type="button" 
                            onClick={() => setSignatureScale(s => s === 'large' ? 'standard' : 'large')} 
                            style={{
                                padding: '4px 10px', 
                                borderRadius: 7, 
                                fontWeight: 600, 
                                fontSize: 11, 
                                cursor: 'pointer', 
                                border: '1px solid #cbd5e1',
                                background: signatureScale === 'large' ? '#e0f2fe' : '#fff',
                                color: signatureScale === 'large' ? '#0369a1' : '#374151',
                            }}
                            title="Toggle signature size for print balance (Standard 72px / Large 88px)"
                        >
                            ✍️ Sig: {signatureScale === 'large' ? 'Large (88px)' : 'Standard (72px)'}
                        </button>

                        {/* Signer Switcher (if current user has their own signature) */}
                        {currentUser?.signature && (
                            <button
                                type="button"
                                onClick={() => setSignerChoice(c => c === 'company' ? 'auto' : 'company')}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 7,
                                    fontWeight: 600,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    border: '1px solid #cbd5e1',
                                    background: signerChoice !== 'company' ? '#dcfce7' : '#fff',
                                    color: signerChoice !== 'company' ? '#15803d' : '#4b5563',
                                }}
                                title="Click to toggle between your personal manager signature and company default signature"
                            >
                                👤 {signerChoice !== 'company' ? `Signed by: ${currentUser.firstName || 'My Sig'}` : 'Signed by: Company Seal'}
                            </button>
                        )}
                    </div>

                    {isQuickEdit && (
                        <div style={{ width: '100%', padding: '6px 10px', background: '#eff6ff', border: '1px dashed #93c5fd', borderRadius: 6, fontSize: 11, color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>✏️ <strong>Quick Edit Active:</strong> You can edit Customer info, Vehicle No, Remarks, and Terms &amp; Conditions inline below. When finished, click <em>'Done Editing'</em> or proceed directly to Print/PDF.</span>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════
                PRINTABLE AREA (100% Matches GLX physical print)
            ══════════════════════════════════════════════════ */}
            <div 
                ref={ref} 
                className="print-container" 
                style={{ 
                    background: '#fff', 
                    padding: '12px 18px', 
                    width: '100%',
                    maxWidth: 'calc(210mm - 0.5in)',
                    minHeight: 'calc(297mm - 0.5in)',
                    boxSizing: 'border-box',
                    margin: '0 auto' 
                }}
            >

                {/* ── COMPANY HEADER ── */}
                {showLetterheadHeader && (
                    <div style={{ borderBottom: '1.5px solid #555', paddingBottom: 8, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            {/* Logo */}
                            <div style={{ flexShrink: 0, width: 72, marginTop: 2 }}>
                                <img src="/logo.jpg" alt="GLX Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'grayscale(100%)' }} />
                            </div>

                            {/* Middle & Right: Company name + subtitle + address cols */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: 0.5, lineHeight: 1.1 }}>
                                    GLX TRUCK BODY ENGINEERS
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 0.8, color: '#444', marginBottom: 5 }}>
                                    ALUMINIUM , STEEL &amp; FREEZER BOX MANUFACTURE
                                </div>
                                {/* 3 Column Address & Contact Block */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 11, lineHeight: 1.55 }}>
                                    <div>
                                        No.14,Negambo Road,<br />
                                        Thudella,Ja-Ela,<br />
                                        Sri Lanka.<br />
                                        (11350)
                                    </div>
                                    <div>
                                        No.2020/3L,2,Seeduwa Road,<br />
                                        Kotugoda,Ja-Ela.<br />
                                        Sri Lanka.<br />
                                        (11390)
                                    </div>
                                    <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                                        <div><span style={{ display: 'inline-block', width: 48, fontWeight: 500 }}>Mobile</span> : 071 6666 888</div>
                                        <div><span style={{ display: 'inline-block', width: 48, fontWeight: 500 }}>Tel</span> : 011 740 4446</div>
                                        <div><span style={{ display: 'inline-block', width: 48, fontWeight: 500 }}>Email</span> : glx.engi@gmail.com</div>
                                        <div><span style={{ display: 'inline-block', width: 48, fontWeight: 500 }}>Web</span> : www.glx.lk</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CUSTOMER + DOCUMENT META ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, fontSize: 12.5 }}>
                    {/* Left: Customer Block */}
                    <div style={{ maxWidth: '52%', lineHeight: 1.6 }}>
                        <div style={{
                            fontSize: 15,
                            fontWeight: 700,
                            letterSpacing: 0.6,
                            color: '#111827',
                            marginBottom: 8,
                            textTransform: 'uppercase',
                        }}>
                            {leftHeaderTitle}
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: 1, color: '#374151' }}>{t.billTo || 'Customer'}</div>
                        {isQuickEdit ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                                <input
                                    type="text"
                                    value={customerNameVal}
                                    onChange={(e) => setEditedValues(prev => ({ ...prev, customerName: e.target.value }))}
                                    placeholder="Customer Name"
                                    className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40 font-semibold"
                                />
                                <input
                                    type="text"
                                    value={customerAddressVal}
                                    onChange={(e) => setEditedValues(prev => ({ ...prev, customerAddress: e.target.value }))}
                                    placeholder="Customer Address"
                                    className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                />
                                <input
                                    type="text"
                                    value={customerPhoneVal}
                                    onChange={(e) => setEditedValues(prev => ({ ...prev, customerPhone: e.target.value }))}
                                    placeholder="Phone Number"
                                    className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                />
                                <input
                                    type="text"
                                    value={vehicleNoVal}
                                    onChange={(e) => setEditedValues(prev => ({ ...prev, vehicleNo: e.target.value }))}
                                    placeholder="Vehicle Number (e.g. WP CAA-1234)"
                                    className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40 font-mono font-bold"
                                />
                            </div>
                        ) : (
                            <>
                                <div style={{ fontWeight: 500 }}>{customerNameVal}</div>
                                {customerAddressVal && <div>{customerAddressVal}</div>}
                                {customerPhoneVal   && <div>{customerPhoneVal}</div>}
                                {vehicleNoVal && (
                                    <div style={{ fontWeight: 600, fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 13, marginTop: 4 }}>
                                        {vehicleNoVal}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right: Meta Details */}
                    <div style={{ textAlign: 'left', minWidth: 220 }}>
                        {/* Revision Indicator & Print Time Stamp at the right-hand corner */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'flex-end', 
                            alignItems: 'center', 
                            gap: 6, 
                            marginBottom: 4,
                            paddingBottom: 2
                        }}>
                            <span 
                                title={`Document Revision: ${revisionCode}`}
                                style={{
                                    fontFamily: "'Consolas', 'Segoe UI Mono', monospace",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: editNum > 0 ? '#b91c1c' : '#475569',
                                    background: editNum > 0 ? '#fef2f2' : '#f8fafc',
                                    border: `1px solid ${editNum > 0 ? '#fecaca' : '#e2e8f0'}`,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    letterSpacing: 0.5
                                }}
                            >
                                {revisionCode}
                            </span>
                            <span style={{ 
                                fontFamily: "'Consolas', 'Segoe UI Mono', monospace", 
                                fontSize: 10.5, 
                                color: '#64748b' 
                            }}>
                                {printTimestamp}
                            </span>
                        </div>

                        {[
                            [docNumberLabel, docNumber],
                            [t.sales || 'Sales', isQuickEdit ? (
                                <input
                                    type="text"
                                    value={salesRepVal}
                                    onChange={(e) => setEditedValues(prev => ({ ...prev, salesRep: e.target.value }))}
                                    className="text-xs p-0.5 border border-blue-300 rounded bg-blue-50/40 w-28"
                                />
                            ) : salesRepVal],
                            [t.branch || 'Branch', isQuickEdit ? (
                                <input
                                    type="text"
                                    value={branchVal}
                                    onChange={(e) => setEditedValues(prev => ({ ...prev, branch: e.target.value }))}
                                    className="text-xs p-0.5 border border-blue-300 rounded bg-blue-50/40 w-28"
                                />
                            ) : branchVal],
                            [t.date || 'Date', <>
                                <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmtDate(docDate)}</span>
                                {fmtTime(docDate) && <><br/><span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 11 }}>{fmtTime(docDate)}</span></>}
                            </>],
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', columnGap: 4, lineHeight: 1.65 }}>
                                <span style={{ fontWeight: 600 }}>{label}</span>
                                <span>: &nbsp;{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── ITEMS TABLE ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginBottom: 0 }}>
                    <thead>
                        <tr style={{ borderTop: '1.5px solid #333', borderBottom: '1.5px solid #333' }}>
                            <th style={{ padding: '5px 4px 5px 0', textAlign: 'left',   fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {t.description || 'DESCRIPTION'}
                            </th>
                            <th style={{ padding: '5px 4px', textAlign: 'right',  fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, width: 90 }}>
                                {t.rate || 'RATE'}
                            </th>
                            <th style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, width: 50 }}>
                                {t.qty || 'QTY'}
                            </th>
                            <th style={{ padding: '5px 4px 5px 0', textAlign: 'right',  fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, width: 100 }}>
                                {t.amount || 'AMOUNT'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const qty        = Number(item.quantity) || 1;
                            const rate       = Number(item.unitPrice || item.rate || 0);
                            const grossAmt   = qty * rate;
                            const discRate   = Number(item.discount || 0);
                            const discAmt    = discRate > 0
                                ? discRate * qty
                                : Number(item.discountAmount || item.lineDiscount ||
                                    (item.discountPercent ? (grossAmt * item.discountPercent / 100) : 0));
                            const effDiscRate = discRate > 0 ? discRate : (qty > 0 ? +(discAmt / qty).toFixed(2) : 0);

                            const title = lang !== 'en'
                                ? (item.productTranslation || item.productName || item.description || 'Line Item')
                                : (item.productName || item.description || 'Line Item');
                            const descExtra = item.description && item.description !== title ? item.description : '';

                            return (
                                <React.Fragment key={idx}>
                                    <tr style={{ verticalAlign: 'top' }}>
                                        <td style={{ padding: '5px 4px 2px 0', lineHeight: 1.45 }}>
                                            <div style={{ fontWeight: 500 }}>{title}</div>
                                            {descExtra && (
                                                <div style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, color: '#4b5563', marginTop: 1 }}>
                                                    {descExtra}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '5px 4px 2px', textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 12.5 }}>{fmt(rate)}</td>
                                        <td style={{ padding: '5px 4px 2px', textAlign: 'center', fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 12.5 }}>{qty}</td>
                                        <td style={{ padding: '5px 0   2px', textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", fontSize: 12.5 }}>{fmt(grossAmt)}</td>
                                    </tr>
                                    {(discAmt > 0 || effDiscRate > 0) && (
                                        <tr>
                                            <td style={{ paddingBottom: 5, paddingRight: 4, color: '#555', fontSize: 12 }}>Discount</td>
                                            <td style={{ textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", paddingBottom: 5, color: '#555', fontSize: 12 }}>-{fmt(effDiscRate)}</td>
                                            <td style={{ textAlign: 'center', fontFamily: "'Consolas', 'Segoe UI Mono', monospace", paddingBottom: 5, color: '#555', fontSize: 12 }}>{qty}</td>
                                            <td style={{ textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace", paddingBottom: 5, color: '#555', fontSize: 12 }}>-{fmt(discAmt)}</td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {laborCost > 0 && (
                            <tr style={{ verticalAlign: 'top' }}>
                                <td style={{ padding: '5px 4px 2px 0', fontWeight: 500 }}>Labor Charge / Workmanship</td>
                                <td style={{ padding: '5px 4px 2px', textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmt(laborCost)}</td>
                                <td style={{ padding: '5px 4px 2px', textAlign: 'center', fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>1</td>
                                <td style={{ padding: '5px 0   2px', textAlign: 'right',  fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmt(laborCost)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* ── SUBTOTALS + REMARKS ── */}
                <div style={{ borderTop: '1.5px solid #333', marginTop: 2, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, fontSize: 12.5 }}>
                    {/* Left: Remarks */}
                    <div style={{ maxWidth: '45%', lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 600 }}>{t.remarks || 'Remarks'}</span>
                        {isQuickEdit ? (
                            <input
                                type="text"
                                value={remarksText}
                                onChange={(e) => setEditedValues(prev => ({ ...prev, remarks: e.target.value }))}
                                placeholder="Add remarks..."
                                className="w-full text-xs p-1 mt-1 border border-blue-300 rounded bg-blue-50/40"
                            />
                        ) : (
                            remarksText ? <> &nbsp;: &nbsp;{remarksText}</> : ' &nbsp;:'
                        )}
                    </div>

                    {/* Right: Totals block */}
                    <div style={{ minWidth: 260 }}>
                        {/* SUB TOTAL */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: 2 }}>
                            <span>SUB TOTAL</span>
                            <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmt(subtotal + laborCost)}</span>
                        </div>
                        {/* DISCOUNT */}
                        {totalDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: 2 }}>
                                <span>DISCOUNT</span>
                                <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>-{fmt(totalDiscount)}</span>
                            </div>
                        )}
                        {/* GRAND TOTAL */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13.5, borderTop: '1.5px solid #333', borderBottom: '3px double #333', padding: '3px 0' }}>
                            <span>GRAND TOTAL</span>
                            <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmt(grandTotal)}</span>
                        </div>

                        {/* Optional Advance Paid & Balance Due (only if explicit) */}
                        {(advancePaid > 0 && (doc.showAdvanceOnInvoice || isInvoice)) && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 4, color: '#166534' }}>
                                    <span>ADVANCE PAID</span>
                                    <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>-{fmt(advancePaid)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 2, color: '#92400e' }}>
                                    <span>BALANCE DUE</span>
                                    <span style={{ fontFamily: "'Consolas', 'Segoe UI Mono', monospace" }}>{fmt(balanceDue)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── TERMS & CONDITIONS (Colon-aligned matching physical print) ── */}
                <div style={{ borderTop: '1px solid #ccc', paddingTop: 8, fontSize: lang === 'en' ? 11.5 : 11, lineHeight: 1.65, marginBottom: 10 }}>
                    {!isInvoice && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '175px 15px 1fr', gap: '2px 4px', alignItems: 'start' }}>
                                <span style={{ fontWeight: 600, color: '#374151' }}>{t.conditionOfPayments || 'Condition of Payments'}</span>
                                <span>:</span>
                                <div>
                                    {isQuickEdit ? (
                                        <textarea
                                            rows={2}
                                            value={conditionOfPayments}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, conditionOfPayments: e.target.value }))}
                                            className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                        />
                                    ) : (
                                        <div style={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>{conditionOfPayments}</div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '175px 15px 1fr', gap: '2px 4px', alignItems: 'start', marginTop: 3 }}>
                                <span style={{ fontWeight: 600, color: '#374151' }}>{t.completionOfWork || 'Completion of Work'}</span>
                                <span>:</span>
                                <div>
                                    {isQuickEdit ? (
                                        <input
                                            type="text"
                                            value={completionOfWork}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, completionOfWork: e.target.value }))}
                                            className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                        />
                                    ) : (
                                        <div style={{ fontWeight: 500 }}>{completionOfWork}</div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '175px 15px 1fr', gap: '2px 4px', alignItems: 'start', marginTop: 3 }}>
                                <span style={{ fontWeight: 600, color: '#374151' }}>{t.validity || 'Validity'} &nbsp;({isInvoice || isProforma ? 'Invoice' : isEstimate ? 'Estimate' : 'Quotation'})</span>
                                <span>:</span>
                                <div>
                                    {isQuickEdit ? (
                                        <input
                                            type="text"
                                            value={validityQuotation}
                                            onChange={(e) => setEditedValues(prev => ({ ...prev, validityQuotation: e.target.value }))}
                                            className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40 font-semibold"
                                        />
                                    ) : (
                                        <div style={{ fontWeight: 600 }}>{validityQuotation}</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '175px 15px 1fr', gap: '2px 4px', alignItems: 'start', marginTop: 3 }}>
                        <span style={{ fontWeight: 600, color: '#374151' }}>{t.warranty || 'Warranty'}</span>
                        <span>:</span>
                        <div>
                            {isQuickEdit ? (
                                <textarea
                                    rows={2}
                                    value={warrantyCondition}
                                    onChange={(e) => setEditedValues(prev => ({ ...prev, warrantyCondition: e.target.value }))}
                                    className="w-full text-xs p-1 border border-blue-300 rounded bg-blue-50/40"
                                />
                            ) : (
                                <div style={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>{warrantyCondition}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── PHOTO ATTACHMENTS (Vehicle & Inspection Photos) ── */}
                {showPhotosInPrint && allPhotos.length > 0 && (
                    <div style={{ marginTop: 14, marginBottom: 14, border: '1px solid #cbd5e1', borderRadius: 8, padding: 12, background: '#f8fafc', pageBreakInside: 'avoid' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#1e293b', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                            Vehicle Verification &amp; Inspection Photo Attachments ({allPhotos.length} Photos)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: allPhotos.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                            {allPhotos.map((photo, pIdx) => (
                                <div key={pIdx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                                        {photo.title}
                                    </div>
                                    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                        <img 
                                            src={photo.src} 
                                            alt={photo.title} 
                                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── FOOTER: Signature (left) + QR Code (right) ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, pageBreakInside: 'avoid' }}>
                    {/* Signature block */}
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
                            {lang === 'si' ? 'ඔබේ විශ්වාසවන්ත,' : lang === 'ta' ? 'உங்கள் உண்மையுள்ள,' : 'Yours Faithfully,'}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                            {companyInfo?.companyName || 'GLX INDUSTRIES'} - {branch}
                        </div>

                        {/* Seal + Signature image area */}
                        <div style={{ position: 'relative', minHeight: 76, paddingTop: 10 }}>
                            {companyInfo?.companySeal && (
                                <img
                                    src={companyInfo.companySeal}
                                    alt="Official Company Seal"
                                    style={{ 
                                        position: 'absolute', 
                                        top: -14, 
                                        left: 100, 
                                        width: 86, 
                                        height: 86, 
                                        objectFit: 'contain', 
                                        opacity: 0.82, 
                                        pointerEvents: 'none', 
                                        zIndex: 1 
                                    }}
                                />
                            )}
                            {activeSignature ? (
                                <img
                                    src={activeSignature}
                                    alt="Authorized Signature"
                                    style={{ 
                                        height: signatureScale === 'large' ? 88 : 72, 
                                        maxWidth: 240, 
                                        objectFit: 'contain', 
                                        marginBottom: 4, 
                                        position: 'relative', 
                                        zIndex: 2, 
                                        display: 'block' 
                                    }}
                                />
                            ) : (
                                <div style={{ height: 48 }} />
                            )}
                            {/* Dotted signature line matching physical print */}
                            <div style={{ fontSize: 14, letterSpacing: 1, color: '#666', lineHeight: 0.8 }}>
                                ............................................................
                            </div>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#333', marginTop: 4, fontWeight: 500 }}>
                            {signerName ? (
                                <span>
                                    <strong>{signerName}</strong> &nbsp;—&nbsp; {signerTitle || (lang === 'si' ? 'බලයලත් නිලධාරී' : 'Authorized Officer')}
                                </span>
                            ) : (
                                <span>
                                    {t.authorizedSignature || (lang === 'si' ? 'බලයලත් නිලධාරී' : 'Authorized Person')}
                                    {signerTitle ? ` (${signerTitle})` : ''}
                                </span>
                            )}
                        </div>

                        {/* Print timestamp */}
                        <div style={{ fontSize: 10, color: '#e74c3c', fontFamily: 'monospace', marginTop: 16 }}>
                            Printed at &nbsp;&nbsp; {printTimestamp} &nbsp;&nbsp; <strong style={{ color: '#b91c1c' }}>[{revisionCode}]</strong>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ padding: 4, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}>
                            <QRCodeSVG value={qrString} size={105} level="M" />
                        </div>
                    </div>
                </div>

            </div>{/* /print-container */}
        </div>
    );
});

DocumentPrintView.displayName = 'DocumentPrintView';
export default DocumentPrintView;