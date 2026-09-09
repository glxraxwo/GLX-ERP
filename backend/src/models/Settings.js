import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: false,
        default: 'GLX Industries'
    },
    companyAddress: String,
    companyPhone: String,
    companyEmail: String,
    companyLogo: String,
    taxId: String,
    currency: {
        type: String,
        default: 'LKR'
    },
    currencySymbol: {
        type: String,
        default: 'Rs.'
    },
    managerSmsPhone: {
        type: String,
        default: '+94716666888'
    },
    bossSignature: {
        type: String,
        default: ''
    },
    bossTitle: {
        type: String,
        default: 'Authorized Signature / Managing Director'
    },
    defaultTaxRate: {
        type: Number,
        default: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 10
    },
    // Custom Print Templates
    invoiceCustomTemplateUrl: String,
    quotationCustomTemplateUrl: String,
    activeInvoiceTemplate: {
        type: String,
        enum: ['default', 'custom'],
        default: 'default'
    },
    activeQuotationTemplate: {
        type: String,
        enum: ['default', 'custom'],
        default: 'default'
    },
    // Salary Payment Configuration
    salaryPaymentDay: {
        type: Number,
        default: 25,
        min: 1,
        max: 31,
        description: 'Day of month when salary is paid (1-31)'
    },
    salaryPaymentDayType: {
        type: String,
        enum: ['fixed_day', 'last_working_day'],
        default: 'fixed_day',
        description: 'Whether to pay on fixed day or last working day of month'
    },
    allowEarlySalaryPayment: {
        type: Boolean,
        default: false,
        description: 'Allow salary payment before scheduled date'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
