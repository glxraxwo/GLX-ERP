import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const quotationSchema = new mongoose.Schema({
    documentType: { type: String, enum: ['quotation', 'estimate'], default: 'quotation' },
    publicToken: { type: String, default: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) },
    quotationCode: { type: String, unique: true },
    quoteNumber: { type: String },
    // customerId can reference either Customer or be provided as a string name
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', set: v => v === '' ? undefined : v },
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerAddress: { type: String },
    
    // Vehicle & Body engineering metadata
    insuranceCompany: { type: String, default: '' },
    vehicleOwner: { type: String, default: '' },
    vehicleNo: { type: String, default: '' },
    vehicleModel: { type: String, default: '' },
    jobCaption: { type: String, default: '' },
    salesRep: { type: String, default: '' },
    introducer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    introducerName: { type: String, default: '' },
    biller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    billerName: { type: String, default: '' },
    branch: { type: String, default: 'JA-ELA' },

    // Photo Attachments (Number Plate photo, Lorry Body photo & Multiple Photos)
    numberPlateImage: { type: String, default: '' },
    lorryBodyImage: { type: String, default: '' },
    photos: [{ type: String }],

    // RMB Outside Body Dimensions & Warranty
    bodyDimensions: {
        length: { type: String, default: '' },
        width: { type: String, default: '' },
        height: { type: String, default: '' }
    },
    specifications: [{ type: String }],
    warrantyInfo: { type: String, default: '' },
    paymentConditions: [{ type: String }],

    // Terms & Conditions matching quotation/invoice print layout
    conditionOfPayments: { type: String, default: 'a). 0% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work' },
    completionOfWork: { type: String, default: '4 to 6 working Days after the Order Confirmation.' },
    validityQuotation: { type: String, default: '30 Working Days From the Issued Date..' },
    warrantyCondition: { type: String, default: 'a). Please See the Description..\nb). Warranty Will be Issued with the Invoice.' },
    remarks: { type: String, default: '' },

    version: { type: Number, default: 1 },
    editCount: { type: Number, default: 0 },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', set: v => v === '' || !v ? undefined : v },
        productName: { type: String },
        productTranslation: { type: String },
        description: { type: String },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 }
    }],
    totalAmount: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    advancePercentage: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    terms: {
        incoterm: { type: String, default: 'FOB' },
        paymentTerms: String,
        deliveryWeeks: Number,
        validUntil: Date,
        notes: String,
    },
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'draft' }, // draft, sent, accepted, rejected, converted
    convertedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    convertedProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    sentAt: Date,
    acceptedAt: Date,
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

quotationSchema.pre('validate', async function () {
    if (this.customerId === '') {
        this.customerId = undefined;
    }

    if (!this.quotationCode && this.quoteNumber && this.quoteNumber.trim() !== '') {
        this.quotationCode = this.quoteNumber.trim();
    }

    if (!this.quotationCode || this.quotationCode.trim() === '') {
        const isEstimate = this.documentType === 'estimate';
        const prefix = isEstimate ? 'JA/EST' : 'JA/QT';
        const seqKey = isEstimate ? 'estimate' : 'quotation';
        let seq = await getNextSequence(seqKey);
        let code = `${prefix}/${seq}`;
        while (await mongoose.model('Quotation').findOne({ $or: [{ quotationCode: code }, { quoteNumber: code }] })) {
            seq = await getNextSequence(seqKey);
            code = `${prefix}/${seq}`;
        }
        this.quotationCode = code;
        this.quoteNumber = this.quotationCode;
    } else if (!this.quoteNumber || this.quoteNumber.trim() === '') {
        this.quoteNumber = this.quotationCode;
    }
    // Auto-calculate grand total & balance
    this.totalAmount = (this.items || []).reduce((sum, i) => sum + (Number(i.quantity || 0) * Number(i.unitPrice || 0)), 0);
    const itemDiscounts = (this.items || []).reduce((sum, i) => sum + (Number(i.discount || 0) * Number(i.quantity || 1)), 0);
    const totalDiscount = Math.max(Number(this.discount || 0), itemDiscounts);
    this.discount = totalDiscount;
    this.grandTotal = (this.totalAmount || 0) + (this.laborCost || 0) + (this.tax || 0) - (this.discount || 0);

    // Compute advance amount from advancePercentage if specified
    if (this.advancePercentage > 0) {
        this.advanceAmount = +( (this.grandTotal * this.advancePercentage) / 100 ).toFixed(2);
        this.conditionOfPayments = `a). ${this.advancePercentage}% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work`;
    }

    this.balanceAmount = Math.max(0, +( (this.grandTotal || 0) - (this.advanceAmount || 0) ).toFixed(2));
});

export default mongoose.model('Quotation', quotationSchema);
