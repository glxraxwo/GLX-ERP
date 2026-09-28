import React, { forwardRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getDocTranslation } from '../../utils/documentTranslations';

/* ─── helpers ─────────────────────────────────────────────────────── */
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
        return `${day}/${mon}/${yr}  ${h}:${mi}:${se}${ampm}`;
    } catch { return new Date().toLocaleString(); }
};

/* ─── component ───────────────────────────────────────────────────── */
const DocumentPrintView = forwardRef(({ document: doc, companyInfo, useSinhalaLanguage = false, hideToolbar = false }, ref) => {
    if (!doc) return null;

    const [lang, setLang]                         = useState(useSinhalaLanguage ? 'si' : 'en');
    const [showLetterheadHeader, setShowLH]       = useState(true);
    const t = getDocTranslation(lang);

    /* ── doc-type flags ── */
    const isEstimate  = doc.documentType === 'estimate' || (doc.quoteNumber && doc.quoteNumber.startsWith('EST'));
    const isInvoice   = !!doc.invoiceNumber || doc.documentType === 'invoice';
    const isQuotation = !isEstimate && !isInvoice;

    let docLabel = t.quotation;
    if (isEstimate)  docLabel = t.estimate;
    if (isInvoice)   docLabel = t.invoice;

    /* ── meta ── */
    const docNumber      = doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || 'N/A';
    const customerName   = doc.customerName  || doc.vehicleOwner || doc.customerSnapshot?.name || 'Customer';
    const customerAddress = doc.customerAddress || doc.billingAddress?.line1 || '';
    const customerPhone  = doc.customerPhone || doc.customerSnapshot?.contactName || '';
    const vehicleNo      = doc.vehicleNo || '';
    const salesRep       = doc.salesRep  || 'Asanka';
    const branch         = doc.branch    || 'JA-ELA';
    const docDate        = doc.date || doc.invoiceDate || doc.createdAt || new Date();
    const printTimestamp = fmtPrintTs(new Date());

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

    /* ── terms ── */
    const conditionOfPayments = doc.conditionOfPayments || 'a). 0% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work';
    const completionOfWork    = doc.completionOfWork    || '4 to 6 working Days after the Order Confirmation.';
    const validityQuotation   = doc.validityQuotation   || (doc.terms?.paymentTerms || '30 Working Days From the Issued Date..');
    const warrantyCondition   = doc.warrantyCondition   || doc.warrantyInfo || 'a). Please See the Description..\nb). Warranty Will be Issued with the Invoice.';
    const remarksText         = doc.remarks || doc.notes || '';

    /* ── QR ── */
    const qrString = JSON.stringify({
        type: docLabel, number: docNumber, date: fmtDate(docDate),
        customer: customerName, vehicleNo: vehicleNo || 'N/A',
        grandTotal, branch, sales: salesRep,
    });

    /* ── inline print styles (scoped to this component) ── */
    const printStyles = `
        @media print {
            .no-print { display: none !important; }
            .print-container { padding: 0 !important; }
            body { margin: 0; }
        }
    `;

    return (
        <div style={{ fontFamily: "Arial, Helvetica, 'Liberation Sans', sans-serif", color: '#111', background: '#fff', width: '100%', maxWidth: 860, margin: '0 auto', fontSize: 13 }}>
            <style>{printStyles}</style>

            {/* ── Toolbar (no-print) ── */}
            {!hideToolbar && (
                <div className="no-print" style={{ marginBottom: 12, padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                    {/* Language switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>Language / භාෂාව:</span>
                        <div style={{ display: 'inline-flex', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                            {['en','si','ta'].map(l => (
                                <button key={l} type="button" onClick={() => setLang(l)} style={{
                                    padding: '3px 10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11,
                                    background: lang === l ? '#0284c7' : 'transparent',
                                    color: lang === l ? '#fff' : '#374151',
                                }}>
                                    {l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Letterhead toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>Letterhead Paper Mode:</span>
                        <button type="button" onClick={() => setShowLH(p => !p)} style={{
                            padding: '4px 12px', borderRadius: 7, fontWeight: 500, fontSize: 11, cursor: 'pointer', border: '1px solid #cbd5e1',
                            background: !showLetterheadHeader ? '#b45309' : '#fff',
                            color: !showLetterheadHeader ? '#fff' : '#374151',
                        }}>
                            {!showLetterheadHeader ? '✓ Pre-printed Paper (Header Hidden)' : 'Digital View (Header Shown)'}
                        </button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════
                PRINTABLE AREA
            ══════════════════════════════════════════════════ */}
            <div ref={ref} className="print-container" style={{ background: '#fff', padding: '16px 24px', minHeight: '270mm' }}>

                {/* ── COMPANY HEADER ── */}
                {showLetterheadHeader && (
                    <div style={{ borderBottom: '1.5px solid #555', paddingBottom: 8, marginBottom: 10 }}>
                        {/* Row 1: Logo | Company name + subtitle */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            {/* Logo */}
                            <div style={{ flexShrink: 0, width: 72, marginTop: 2 }}>
                                <img src="/logo.jpg" alt="GLX Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'grayscale(100%)' }} />
                            </div>

                            {/* Middle: Company name + subtitle + two address cols */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: 0.5, lineHeight: 1.1 }}>
                                    GLX TRUCK BODY ENGINEERS
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: '#333', marginBottom: 5 }}>
                                    ALUMINIUM , STEEL &amp; FREEZER BOX MANUFACTURE
                                </div>
                                {/* Two-column address block */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 11, lineHeight: 1.55 }}>
                                    <div>
                                        No.14, Negambo Road,<br />
                                        Thudella, Ja-Ela,<br />
                                        Sri Lanka.<br />
                                        (11350)
                                    </div>
                                    <div>
                                        No.2020/3L, 2, Seeduwa Road,<br />
                                        Kotugoda, Ja-Ela,<br />
                                        Sri Lanka.<br />
                                        (11390)
                                    </div>
                                    {/* Contact info (right column) */}
                                    <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                                        <div><span style={{ display: 'inline-block', width: 48, fontWeight: 600 }}>Mobile</span> : 071 6666 888</div>
                                        <div><span style={{ display: 'inline-block', width: 48, fontWeight: 600 }}>Tel</span> : 011 740 4445</div>
                                        <div><span style={{ display: 'inline-block', width: 48, fontWeight: 600 }}>Email</span> : glx.engi@gmail.com</div>
                                        <div><span style={{ display: 'inline-block', width: 48, fontWeight: 600 }}>Web</span> : www.glx.lk</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CUSTOMER + DOCUMENT META ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, fontSize: 12.5 }}>
                    {/* Left: Customer */}
                    <div style={{ maxWidth: '52%', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 700, marginBottom: 1 }}>Customer</div>
                        <div style={{ fontWeight: 600 }}>{customerName}</div>
                        {customerAddress && <div>{customerAddress}</div>}
                        {customerPhone   && <div>{customerPhone}</div>}
                        {vehicleNo && (
                            <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, marginTop: 4 }}>
                                {vehicleNo}
                            </div>
                        )}
                    </div>

                    {/* Right: Meta */}
                    <div style={{ textAlign: 'left', minWidth: 220 }}>
                        {[
                            [docLabel + ' No.', docNumber],
                            ['Sales',           salesRep],
                            ['Branch',          branch],
                            ['Date',            <>
                                <span style={{ fontFamily: 'monospace' }}>{fmtDate(docDate)}</span>
                                {fmtTime(docDate) && <><br/><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{fmtTime(docDate)}</span></>}
                            </>],
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', columnGap: 4, lineHeight: 1.65 }}>
                                <span style={{ fontWeight: 700 }}>{label}</span>
                                <span>: &nbsp;{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── ITEMS TABLE ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginBottom: 0 }}>
                    <thead>
                        <tr style={{ borderTop: '1.5px solid #333', borderBottom: '1.5px solid #333' }}>
                            <th style={{ padding: '5px 4px 5px 0', textAlign: 'left',   fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {t.description || 'DESCRIPTION'}
                            </th>
                            <th style={{ padding: '5px 4px', textAlign: 'right',  fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, width: 90 }}>
                                {t.rate || 'RATE'}
                            </th>
                            <th style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, width: 50 }}>
                                {t.qty || 'QTY'}
                            </th>
                            <th style={{ padding: '5px 4px 5px 0', textAlign: 'right',  fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, width: 100 }}>
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
                                            <div style={{ fontWeight: 600 }}>{title}</div>
                                            {descExtra && (
                                                <div style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, color: '#333', marginTop: 1 }}>
                                                    {descExtra}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '5px 4px 2px', textAlign: 'right',  fontFamily: 'monospace', fontSize: 12.5 }}>{fmt(rate)}</td>
                                        <td style={{ padding: '5px 4px 2px', textAlign: 'center', fontFamily: 'monospace', fontSize: 12.5 }}>{qty}</td>
                                        <td style={{ padding: '5px 0   2px', textAlign: 'right',  fontFamily: 'monospace', fontSize: 12.5 }}>{fmt(grossAmt)}</td>
                                    </tr>
                                    {(discAmt > 0 || effDiscRate > 0) && (
                                        <tr>
                                            <td style={{ paddingBottom: 5, paddingRight: 4, color: '#555', fontSize: 12 }}>Discount</td>
                                            <td style={{ textAlign: 'right',  fontFamily: 'monospace', paddingBottom: 5, color: '#555', fontSize: 12 }}>-{fmt(effDiscRate)}</td>
                                            <td style={{ textAlign: 'center', fontFamily: 'monospace', paddingBottom: 5, color: '#555', fontSize: 12 }}>{qty}</td>
                                            <td style={{ textAlign: 'right',  fontFamily: 'monospace', paddingBottom: 5, color: '#555', fontSize: 12 }}>-{fmt(discAmt)}</td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {laborCost > 0 && (
                            <tr style={{ verticalAlign: 'top' }}>
                                <td style={{ padding: '5px 4px 2px 0', fontWeight: 600 }}>Labor Charge / Workmanship</td>
                                <td style={{ padding: '5px 4px 2px', textAlign: 'right',  fontFamily: 'monospace' }}>{fmt(laborCost)}</td>
                                <td style={{ padding: '5px 4px 2px', textAlign: 'center', fontFamily: 'monospace' }}>1</td>
                                <td style={{ padding: '5px 0   2px', textAlign: 'right',  fontFamily: 'monospace' }}>{fmt(laborCost)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* ── SUBTOTALS + REMARKS ── */}
                <div style={{ borderTop: '1.5px solid #333', marginTop: 2, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, fontSize: 12.5 }}>
                    {/* Left: Remarks */}
                    <div style={{ maxWidth: '45%', lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 700 }}>Remarks</span>
                        {remarksText ? <> : {remarksText}</> : ' :'}
                    </div>

                    {/* Right: Totals block */}
                    <div style={{ minWidth: 260 }}>
                        {/* SUB TOTAL */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 2 }}>
                            <span>SUB TOTAL</span>
                            <span style={{ fontFamily: 'monospace' }}>{fmt(subtotal + laborCost)}</span>
                        </div>
                        {/* DISCOUNT */}
                        {totalDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 2, borderBottom: '1px solid #555' }}>
                                <span>DISCOUNT</span>
                                <span style={{ fontFamily: 'monospace' }}>-{fmt(totalDiscount)}</span>
                            </div>
                        )}
                        {/* GRAND TOTAL */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 13.5, borderTop: '1.5px solid #333', borderBottom: '3px double #333', padding: '3px 0' }}>
                            <span>GRAND TOTAL</span>
                            <span style={{ fontFamily: 'monospace' }}>{fmt(grandTotal)}</span>
                        </div>
                        {/* ADVANCE PAID */}
                        {advancePaid > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4, color: '#166534' }}>
                                <span>ADVANCE PAID</span>
                                <span style={{ fontFamily: 'monospace' }}>-{fmt(advancePaid)}</span>
                            </div>
                        )}
                        {/* BALANCE DUE */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 2, color: '#92400e' }}>
                            <span>BALANCE DUE</span>
                            <span style={{ fontFamily: 'monospace' }}>{fmt(balanceDue)}</span>
                        </div>
                    </div>
                </div>

                {/* ── TERMS & CONDITIONS ── */}
                <div style={{ borderTop: '1px solid #ccc', paddingTop: 8, fontSize: 11.5, lineHeight: 1.65, marginBottom: 10 }}>
                    {!isInvoice && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '165px 1fr', gap: 4 }}>
                                <span style={{ fontWeight: 700 }}>Condition of Payments :</span>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{conditionOfPayments}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '165px 1fr', gap: 4 }}>
                                <span style={{ fontWeight: 700 }}>Completion of Work :</span>
                                <div>{completionOfWork}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '165px 1fr', gap: 4 }}>
                                <span style={{ fontWeight: 700 }}>Validity ({docLabel}) :</span>
                                <div>{validityQuotation}</div>
                            </div>
                        </>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '165px 1fr', gap: 4 }}>
                        <span style={{ fontWeight: 700 }}>{t.warranty || 'Warranty'} :</span>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{warrantyCondition}</div>
                    </div>
                </div>

                {/* ── VEHICLE PHOTOS (Estimate only) ── */}
                {(doc.numberPlateImage || doc.lorryBodyImage) && (
                    <div style={{ marginBottom: 12, border: '1px solid #d1d5db', borderRadius: 8, padding: 10, pageBreakInside: 'avoid' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                            Vehicle Verification &amp; Condition Inspection Photos
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {doc.numberPlateImage && (
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>1. Vehicle Number Plate Photo</div>
                                    <div style={{ border: '1px solid #d1d5db', borderRadius: 6, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        <img src={doc.numberPlateImage} alt="Number Plate" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                    </div>
                                </div>
                            )}
                            {doc.lorryBodyImage && (
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>2. Vehicle / Body Structure Condition</div>
                                    <div style={{ border: '1px solid #d1d5db', borderRadius: 6, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        <img src={doc.lorryBodyImage} alt="Body Structure" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── FOOTER: Signature (left) + QR Code (right) ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10, pageBreakInside: 'avoid' }}>
                    {/* Signature block */}
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                            {lang === 'si' ? 'ඔබේ විශ්වාසවන්ත,' : lang === 'ta' ? 'உங்கள் உண்மையுள்ள,' : 'Yours Faithfully,'}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                            {companyInfo?.companyName || 'GLX INDUSTRIES'} - {branch}
                        </div>

                        {/* Seal + Signature image area */}
                        <div style={{ position: 'relative', minHeight: 70, paddingTop: 8 }}>
                            {companyInfo?.companySeal && (
                                <img
                                    src={companyInfo.companySeal}
                                    alt="Official Seal"
                                    style={{ position: 'absolute', top: 0, left: 88, width: 72, height: 72, objectFit: 'contain', opacity: 0.85, pointerEvents: 'none' }}
                                />
                            )}
                            {companyInfo?.bossSignature && (
                                <img
                                    src={companyInfo.bossSignature}
                                    alt="Authorized Signature"
                                    style={{ height: 48, maxWidth: 170, objectFit: 'contain', marginBottom: 2, position: 'relative', zIndex: 1 }}
                                />
                            )}
                            {/* Dashed signature line */}
                            <div style={{ borderBottom: '1px dashed #888', width: 210 }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#444', marginTop: 3 }}>
                            {t.authorizedSignature || 'Authorized Person'}
                            {companyInfo?.bossTitle ? ` (${companyInfo.bossTitle})` : ''}
                        </div>

                        {/* Print timestamp */}
                        <div style={{ fontSize: 10, color: '#e74c3c', fontFamily: 'monospace', marginTop: 18 }}>
                            Printed at &nbsp;&nbsp; {printTimestamp}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ padding: 4, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}>
                            <QRCodeSVG value={qrString} size={100} level="M" />
                        </div>
                    </div>
                </div>

            </div>{/* /print-container */}
        </div>
    );
});

DocumentPrintView.displayName = 'DocumentPrintView';
export default DocumentPrintView;