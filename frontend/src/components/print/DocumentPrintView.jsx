import React, { forwardRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const formatNumber = (num, minDecimals = 2, maxDecimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
    });
};

const formatDateOnly = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return String(dateStr);
    }
};

const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const secs = String(d.getSeconds()).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    } catch {
        return '';
    }
};

const formatPrintTimestamp = (d = new Date()) => {
    try {
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${day}/${month}/${year}   ${hours}:${minutes}:${seconds}${ampm}`;
    } catch {
        return new Date().toLocaleString();
    }
};

/**
 * Standard Printable Document Component matching exact GLX layout
 * (Supports both Quotation, Estimate, and Invoice)
 */
const DocumentPrintView = forwardRef(({ document: doc, companyInfo, useSinhalaLanguage = false, hideToolbar = false }, ref) => {
    if (!doc) return null;

    const isEstimate = doc.documentType === 'estimate' || (doc.quoteNumber && doc.quoteNumber.startsWith('EST'));
    const isInvoice = !!doc.invoiceNumber || doc.documentType === 'invoice';
    const isQuotation = !isEstimate && !isInvoice;

    let docLabel = 'Quotation';
    if (isEstimate) docLabel = 'Estimate';
    if (isInvoice) docLabel = 'Invoice';

    if (useSinhalaLanguage) {
        if (isEstimate) docLabel = 'ඇස්තමේන්තු';
        if (isInvoice) docLabel = 'ඉන්වොයිස්';
        if (isQuotation) docLabel = 'මිල ගණන්';
    }

    const docNumber = doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || 'N/A';
    const customerName = doc.customerName || doc.vehicleOwner || doc.customerSnapshot?.name || 'Customer';
    const customerAddress = doc.customerAddress || doc.billingAddress?.line1 || '';
    const customerPhone = doc.customerPhone || doc.customerSnapshot?.contactName || '';
    const vehicleNo = doc.vehicleNo || '';
    const salesRep = doc.salesRep || 'Asanka';
    const branch = doc.branch || 'JA-ELA';

    const docDate = doc.date || doc.invoiceDate || doc.createdAt || new Date();
    const formattedDate = formatDateOnly(docDate);
    const formattedTime = formatTimeOnly(docDate);
    const printTimestamp = formatPrintTimestamp(new Date());

    // Letterhead toggle: Show by default on screen/PDF, can be hidden for pre-printed letterhead paper
    const [showLetterheadHeader, setShowLetterheadHeader] = useState(true);

    const items = doc.items || [];

    // Calculate line item totals & discounts
    let subtotal = 0;
    let totalLineDiscount = 0;

    items.forEach(item => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.unitPrice || item.rate || 0);
        const lineGross = qty * rate;
        const discRate = Number(item.discount || 0);
        const discAmount = discRate > 0 ? (discRate * qty) : Number(item.discountAmount || item.lineDiscount || 0);

        subtotal += lineGross;
        totalLineDiscount += discAmount;
    });

    // If doc has extra doc-level discount or specified total
    const extraDiscount = Number(doc.discount || doc.totalDiscount || 0);
    const totalDiscount = Math.max(totalLineDiscount, extraDiscount);
    const laborCost = Number(doc.laborCost || 0);
    const tax = Number(doc.tax || doc.totalTax || 0);
    const grandTotal = doc.grandTotal !== undefined 
        ? Number(doc.grandTotal) 
        : (subtotal + laborCost + tax - totalDiscount);

    const advancePaid = Number(doc.advanceAmount || doc.amountPaid || 0);
    const balanceDue = doc.balanceAmount !== undefined 
        ? Number(doc.balanceAmount) 
        : (doc.balanceDue !== undefined ? Number(doc.balanceDue) : Math.max(0, grandTotal - advancePaid));

    // Terms & conditions
    const conditionOfPayments = doc.conditionOfPayments || 'a). 0% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work';
    const completionOfWork = doc.completionOfWork || '4 to 6 working Days after the Order Confirmation.';
    const validityQuotation = doc.validityQuotation || (doc.terms?.paymentTerms ? `${doc.terms.paymentTerms}` : '30 Working Days From the Issued Date..');
    const warrantyCondition = doc.warrantyCondition || doc.warrantyInfo || 'a). Please See the Description..\nb). Warranty Will be Issued with the Invoice.';
    const remarksText = doc.remarks || doc.notes || '';

    // QR Verification Data
    const qrDataObj = {
        type: docLabel,
        number: docNumber,
        date: formattedDate,
        customer: customerName,
        vehicleNo: vehicleNo || 'N/A',
        grandTotal: grandTotal,
        branch: branch,
        sales: salesRep
    };
    const qrString = JSON.stringify(qrDataObj);

    return (
        <div className="font-calibri text-gray-900 bg-white w-full max-w-[850px] mx-auto text-sm leading-relaxed p-4 sm:p-8" style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}>
            
            {/* Toolbar for Print options */}
            {!hideToolbar && (
                <div className="no-print mb-4 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Letterhead Paper Mode:</span>
                        <button
                            type="button"
                            onClick={() => setShowLetterheadHeader(prev => !prev)}
                            className={`px-3 py-1.5 rounded-lg font-medium transition ${
                                !showLetterheadHeader 
                                    ? 'bg-amber-600 text-white shadow-sm' 
                                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                            {!showLetterheadHeader ? '✓ Pre-printed Paper (Header Hidden)' : 'Digital View (Header Shown)'}
                        </button>
                    </div>
                    <span className="text-gray-500 text-[11px]">
                        {!showLetterheadHeader ? 'Top header hidden for feeding pre-printed letterhead paper' : 'Standard company letterhead header included'}
                    </span>
                </div>
            )}

            {/* Document Printable Container */}
            <div ref={ref} className="print-area print-container bg-white p-2 sm:p-6" style={{ minHeight: '270mm' }}>
                
                {/* Optional Company Header for Digital / PDF / Plain Paper */}
                {showLetterheadHeader && (
                    <div className="print-header pb-4 border-b border-gray-300 mb-6 font-calibri">
                        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
                            {/* Logo */}
                            <div className="w-16 h-16 flex-shrink-0 mx-auto sm:mx-0">
                                <img src="/logo.jpg" alt="GLX Logo" className="w-full h-full object-contain filter grayscale" />
                            </div>
                            
                            {/* Addresses & Contact */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-xs text-gray-900">
                                <div className="text-center sm:text-left">
                                    <p className="font-bold text-sm uppercase tracking-wide">GLX Industries (Pvt) Ltd</p>
                                    <p className="mt-1 text-[11px] leading-tight text-gray-600">
                                        No.14, Negambo Road,<br />
                                        Thudella, Ja-Ela,<br />
                                        Sri Lanka. (11350)
                                    </p>
                                </div>
                                <div className="text-center sm:text-left">
                                    <p className="font-bold text-sm uppercase tracking-wide">GLX TRUCK BODY ENGINEERS</p>
                                    <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-tighter leading-none mt-0.5">
                                        ALUMINIUM, STEEL & FREEZER BOX MANUFACTURE
                                    </p>
                                    <p className="mt-1.5 text-[11px] leading-tight text-gray-600">
                                        No.2020/3L, 2, Seeduwa Road,<br />
                                        Kotugoda, Ja-Ela. (11390)
                                    </p>
                                </div>
                                <div className="text-[11px] leading-snug font-mono text-center sm:text-right flex flex-col items-center sm:items-end">
                                    <div className="text-left font-mono inline-block">
                                        <p><span className="font-semibold">Mobile :</span> 071 6666 888</p>
                                        <p><span className="font-semibold">Tel &nbsp;&nbsp;&nbsp;&nbsp;:</span> 011 740 4446</p>
                                        <p><span className="font-semibold">Email &nbsp;:</span> glx.engi@gmail.com</p>
                                        <p><span className="font-semibold">Web &nbsp;&nbsp;&nbsp;:</span> www.glx.lk</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Section: Customer Info on Left, Quotation/Invoice Meta on Right */}
                <div className="flex justify-between items-start mb-6 text-[13px] leading-snug">
                    {/* Left: Customer Block */}
                    <div className="space-y-0.5 max-w-[55%]">
                        <p className="font-bold text-gray-900">{useSinhalaLanguage ? 'පාරිභෝගික' : 'Customer'}</p>
                        <p className="font-medium text-gray-900">{customerName}</p>
                        {customerAddress && <p className="text-gray-800">{customerAddress}</p>}
                        {customerPhone && <p className="text-gray-800">{customerPhone}</p>}
                        
                        {vehicleNo && (
                            <p className="font-bold text-gray-900 pt-3 text-sm tracking-wide font-mono">
                                {vehicleNo}
                            </p>
                        )}
                    </div>

                    {/* Right: Meta Details (Aligned exactly as sample) */}
                    <div className="text-left w-64">
                        <div className="grid grid-cols-[110px_1fr] gap-y-1 text-[13px]">
                            <span className="font-bold text-gray-900">{docLabel} No.</span>
                            <span className="font-bold text-gray-900 font-mono">{docNumber}</span>

                            <span className="font-bold text-gray-900">{useSinhalaLanguage ? 'විකිණුම්' : 'Sales'}</span>
                            <span className="text-gray-900">{salesRep}</span>

                            <span className="font-bold text-gray-900">{useSinhalaLanguage ? 'ශාඛාව' : 'Branch'}</span>
                            <span className="text-gray-900">{branch}</span>

                            <span className="font-bold text-gray-900">{useSinhalaLanguage ? 'දිනය' : 'Date'}</span>
                            <div className="text-gray-900 font-mono text-xs">
                                <div>{formattedDate}</div>
                                {formattedTime && <div>{formattedTime}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table of Items */}
                <div className="mb-6">
                    <table className="w-full text-[13px] border-collapse">
                        <thead>
                            <tr className="border-b border-t border-gray-400">
                                <th className="py-2 text-left font-bold text-gray-900 uppercase tracking-wide">{useSinhalaLanguage ? 'විස්තරය' : 'DESCRIPTION'}</th>
                                <th className="py-2 text-right font-bold text-gray-900 uppercase tracking-wide w-28">{useSinhalaLanguage ? 'අනුපාතය' : 'RATE'}</th>
                                <th className="py-2 text-center font-bold text-gray-900 uppercase tracking-wide w-16">{useSinhalaLanguage ? 'ප්‍රමාණය' : 'QTY'}</th>
                                <th className="py-2 text-right font-bold text-gray-900 uppercase tracking-wide w-32">{useSinhalaLanguage ? 'මුදල' : 'AMOUNT'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const qty = Number(item.quantity) || 1;
                                const rate = Number(item.unitPrice || item.rate || 0);
                                const grossAmount = qty * rate;
                                const discRate = Number(item.discount || 0);
                                const discAmount = discRate > 0 ? (discRate * qty) : Number(item.discountAmount || item.lineDiscount || (item.discountPercent ? (grossAmount * item.discountPercent / 100) : 0));
                                const effectiveDiscRate = discRate > 0 ? discRate : (qty > 0 ? +(discAmount / qty).toFixed(2) : 0);

                                const title = useSinhalaLanguage 
                                    ? (item.productTranslation || item.productName || item.description || 'Line Item') 
                                    : (item.productName || item.description || 'Line Item');
                                const descText = item.description && item.description !== title ? item.description : '';

                                return (
                                    <React.Fragment key={idx}>
                                        <tr className="align-top">
                                            <td className="pt-3 pb-1 pr-3">
                                                <div className="font-semibold text-gray-900">{title}</div>
                                                {descText && (
                                                    <div className="whitespace-pre-wrap text-gray-800 text-[12px] leading-relaxed mt-0.5">
                                                        {descText}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="pt-3 pb-1 text-right font-mono text-gray-900">{formatNumber(rate)}</td>
                                            <td className="pt-3 pb-1 text-center font-mono text-gray-900">{qty}</td>
                                            <td className="pt-3 pb-1 text-right font-mono text-gray-900">{formatNumber(grossAmount)}</td>
                                        </tr>

                                        {/* Red Discount row beneath item if discount > 0 */}
                                        {(discAmount > 0 || effectiveDiscRate > 0) && (
                                            <tr className="text-red-600">
                                                <td className="pt-0.5 pb-2 pr-3">{useSinhalaLanguage ? 'වට්ටම්' : 'Discount'}</td>
                                                <td className="pt-0.5 pb-2 text-right font-mono">-{formatNumber(effectiveDiscRate)}</td>
                                                <td className="pt-0.5 pb-2 text-center font-mono">{qty}</td>
                                                <td className="pt-0.5 pb-2 text-right font-mono">-{formatNumber(discAmount)}</td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}

                            {/* Labor Cost Row if present */}
                            {laborCost > 0 && (
                                <tr className="align-top">
                                    <td className="pt-3 pb-1 pr-3">
                                        <div className="font-semibold text-gray-900 uppercase">Labor Charge / Workmanship</div>
                                    </td>
                                    <td className="pt-3 pb-1 text-right font-mono text-gray-900">{formatNumber(laborCost)}</td>
                                    <td className="pt-3 pb-1 text-center font-mono text-gray-900">1</td>
                                    <td className="pt-3 pb-1 text-right font-mono text-gray-900">{formatNumber(laborCost)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Subtotals & Remarks Grid */}
                <div className="pt-3 border-t border-gray-400 flex justify-between items-start text-[13px] mb-6">
                    <div className="max-w-sm text-gray-900">
                        <span className="font-bold">{useSinhalaLanguage ? 'සටහන්' : 'Remarks'} &nbsp;: &nbsp;</span>
                        <span className="text-gray-800">{remarksText}</span>
                    </div>

                    <div className="w-72 space-y-1 text-right">
                        <div className="flex justify-between font-bold text-gray-900">
                            <span>{useSinhalaLanguage ? 'උප එකතුව' : 'SUB TOTAL'}</span>
                            <span className="font-mono">{formatNumber(subtotal + laborCost)}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between font-bold text-red-600">
                                <span>{useSinhalaLanguage ? 'වට්ටම්' : 'DISCOUNT'}</span>
                                <span className="font-mono">-{formatNumber(totalDiscount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-gray-900 text-sm pt-1 border-t border-gray-400">
                            <span>{useSinhalaLanguage ? 'මුළු එකතුව' : 'GRAND TOTAL'}</span>
                            <span className="font-mono">{formatNumber(grandTotal)}</span>
                        </div>

                        {/* Invoice specific advance and balance */}
                        {isInvoice && advancePaid > 0 && (
                            <div className="flex justify-between font-bold text-emerald-700 pt-1">
                                <span>{useSinhalaLanguage ? 'ඉදිරි ගෙවීම්' : 'ADVANCE PAID'}</span>
                                <span className="font-mono">-{formatNumber(advancePaid)}</span>
                            </div>
                        )}
                        {isInvoice && (
                            <div className="flex justify-between font-black text-amber-900 pt-1">
                                <span>{useSinhalaLanguage ? 'ඉතිරි මුදල' : 'BALANCE DUE'}</span>
                                <span className="font-mono">{formatNumber(balanceDue)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Terms and Conditions Section */}
                <div className="border-t border-gray-300 pt-4 text-[12px] space-y-2 mb-8 leading-relaxed">
                    <div className="grid grid-cols-[170px_1fr] gap-2">
                        <span className="font-bold text-gray-900">Condition of Payments &nbsp;:</span>
                        <div className="text-gray-800 whitespace-pre-wrap">{conditionOfPayments}</div>
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-2">
                        <span className="font-bold text-gray-900">Completion of Work &nbsp;:</span>
                        <div className="text-gray-800">{completionOfWork}</div>
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-2">
                        <span className="font-bold text-gray-900">Validity ({docLabel}) &nbsp;:</span>
                        <div className="text-gray-800">{validityQuotation}</div>
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-2">
                        <span className="font-bold text-gray-900">Warranty &nbsp;:</span>
                        <div className="text-gray-800 whitespace-pre-wrap">{warrantyCondition}</div>
                    </div>
                </div>

                {/* Footer: Signature Block on Left, QR Code on Right */}
                <div className="flex justify-between items-end pt-4">
                    <div className="space-y-0.5">
                        <p className="font-bold text-gray-900 text-xs">{useSinhalaLanguage ? 'ඔබේ විශ්වාසවන්ත,' : 'Yours Faithfully,'}</p>
                        <p className="font-bold text-gray-900 text-xs">GLX INDUSTRIES - Ja Ela</p>
                        
                        <div className="pt-10 border-b border-dotted border-gray-400 w-48"></div>
                        <p className="text-[11px] text-gray-700 mt-1">{useSinhalaLanguage ? 'බලයලත් පුද්ගලයා' : 'Authorized Person'}</p>
                        
                        <p className="text-[10px] text-red-600 font-mono pt-4">
                            Printed at &nbsp;&nbsp; {printTimestamp}
                        </p>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                        <div className="p-1 border border-gray-200 rounded bg-white">
                            <QRCodeSVG value={qrString} size={88} level="M" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
});

DocumentPrintView.displayName = 'DocumentPrintView';
export default DocumentPrintView;