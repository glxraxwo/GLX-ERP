import { forwardRef } from 'react';
import DocumentPrintView from './DocumentPrintView';

/**
 * Printable invoice wrapper component.
 * Uses DocumentPrintView to ensure consistent vehicle metadata, photos, QR code and styling.
 */
const PrintableInvoice = forwardRef(({ companyInfo, invoice, payments = [], hideLetterheadHeader = false, hideToolbar = false, useSinhalaLanguage = false }, ref) => {
    if (!invoice) return null;

    return (
        <DocumentPrintView 
            ref={ref} 
            document={{ ...invoice, documentType: 'invoice' }} 
            companyInfo={companyInfo} 
            hideLetterheadHeader={hideLetterheadHeader}
            hideToolbar={hideToolbar}
            useSinhalaLanguage={useSinhalaLanguage}
        />
    );
});

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;