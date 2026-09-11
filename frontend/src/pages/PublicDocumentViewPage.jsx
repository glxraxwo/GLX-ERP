import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import DocumentPrintView from '../components/print/DocumentPrintView';
import { exportElementToPDF } from '../utils/dataExport';
import { getApiUrl } from '../api/config';
import { Download, Printer, FileText, CheckCircle2 } from 'lucide-react';

export default function PublicDocumentViewPage() {
    const { token } = useParams();
    const [doc, setDoc] = useState(null);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [docType, setDocType] = useState('quotation');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const printRef = useRef(null);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                // Determine API URL relative or configured base
                const apiUrl = `${getApiUrl()}/public/documents/${token}`;
                const response = await axios.get(apiUrl);
                if (response.data && response.data.success) {
                    setDoc(response.data.data);
                    setDocType(response.data.documentType);
                    setCompanyInfo(response.data.companyInfo);
                } else {
                    setError('Unable to load document details.');
                }
            } catch (err) {
                setError('Document not found or link has expired.');
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-calibri">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm font-bold uppercase tracking-wider text-gray-700">Loading Document...</p>
                    <p className="text-xs text-gray-400">GLX Industries Customer Portal</p>
                </div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-calibri p-4">
                <div className="text-center bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full">
                    <h1 className="text-lg font-bold text-red-600 mb-2">Access Error</h1>
                    <p className="text-sm text-gray-600 mb-4">{error || 'This link is invalid or expired.'}</p>
                    <div className="text-xs text-gray-400">If you believe this is a mistake, please contact GLX Truck Body Engineers.</div>
                </div>
            </div>
        );
    }

    // Map Quotation properties if needed for Print View
    const printDoc = {
        ...doc,
        documentType: docType
    };

    const docNumber = doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || 'Document';
    const docDisplayTitle = docType === 'estimate' ? 'Estimate' : (docType === 'invoice' ? 'Invoice' : 'Quotation');

    return (
        <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-2 sm:px-4 print:p-0 print:bg-white font-calibri">
            <div className="no-print max-w-[850px] mx-auto mb-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <FileText size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                GLX Document Portal
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 size={10} /> Verified Link
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                            {docDisplayTitle}: {docNumber}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => window.print()} 
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2 rounded-xl transition"
                    >
                        <Printer size={14} /> Print
                    </button>
                    <button 
                        onClick={() => exportElementToPDF(printRef.current, `${docType}_${docNumber.replace(/[\/\\:]/g, '_')}.pdf`)} 
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
                    >
                        <Download size={14} /> Download PDF
                    </button>
                </div>
            </div>
            
            <div className="max-w-[850px] mx-auto bg-white p-2 sm:p-6 md:p-8 shadow-sm border border-slate-200 rounded-2xl print:shadow-none print:border-0 print:p-0 overflow-hidden">
                <DocumentPrintView ref={printRef} document={printDoc} companyInfo={companyInfo} hideToolbar={true} />
            </div>
        </div>
    );
}
