import mongoose from 'mongoose';

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

    // Photo Attachments (Number Plate photo & Lorry Body photo)
    numberPlateImage: { type: String, default: '' },
    lorryBodyImage: { type: String, default: '' },

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

    if (!this.quotationCode) {
        const date = new Date();
        const year = date.getFullYear();
        const docPrefix = this.documentType === 'estimate' ? 'EST' : 'QUT';
        const searchRegex = new RegExp(`^(${docPrefix}|QUO)-${year}`);
        const count = await this.constructor.countDocuments({ quotationCode: { $regex: searchRegex } });
        const seq = String(count + 1).padStart(4, '0');
        this.quotationCode = `${docPrefix}-${year}-${seq}`;
        this.quoteNumber = this.quotationCode;
    }
    // Auto-calculate grand total & balance
    this.totalAmount = (this.items || []).reduce((sum, i) => sum + (Number(i.quantity || 0) * Number(i.unitPrice || 0)), 0);
    const itemDiscounts = (this.items || []).reduce((sum, i) => sum + (Number(i.discount || 0) * Number(i.quantity || 1)), 0);
    const totalDiscount = Math.max(Number(this.discount || 0), itemDiscounts);
    this.discount = totalDiscount;
    this.grandTotal = (this.totalAmount || 0) + (this.laborCost || 0) + (this.tax || 0) - (this.discount || 0);
    this.balanceAmount = Math.max(0, (this.grandTotal || 0) - (this.advanceAmount || 0));
});

export default mongoose.model('Quotation', quotationSchema);
