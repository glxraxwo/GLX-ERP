import mongoose from 'mongoose';

const salaryAdvanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true, default: Date.now },
    advanceType: { type: String, enum: ['amount', 'percentage'], default: 'amount' },
    requestedPercentage: { type: Number, default: 0, min: 0, max: 100 },
    calculatedAmount: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvalNotes: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectedReason: String,
    isDeducted: { type: Boolean, default: false },
    deductedPayrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    paidAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Installment & Repayment Tracking
    numberOfInstallments: { type: Number, default: 1, min: 1 },
    installmentAmount: { type: Number, default: 0 },
    installmentsPaid: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    remainingBalance: { type: Number, default: 0 },
    repayments: [
        {
            date: { type: Date, default: Date.now },
            amount: { type: Number, required: true },
            installmentNumber: { type: Number },
            notes: { type: String, default: '' },
            recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }
    ]
}, { timestamps: true });

salaryAdvanceSchema.pre('save', function (next) {
    const totalAmt = Number(this.amount) || 0;
    const count = Number(this.numberOfInstallments) || 1;
    if (totalAmt > 0 && (!this.installmentAmount || this.installmentAmount <= 0)) {
        this.installmentAmount = Number((totalAmt / count).toFixed(2));
    }
    const paid = Number(this.amountPaid) || 0;
    this.remainingBalance = Math.max(0, +(totalAmt - paid).toFixed(2));
    if (this.remainingBalance === 0 && paid > 0) {
        this.isDeducted = true;
    }
    next();
});

const SalaryAdvance = mongoose.model('SalaryAdvance', salaryAdvanceSchema);
export default SalaryAdvance;
