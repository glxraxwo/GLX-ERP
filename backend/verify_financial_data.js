import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Product from './src/models/Product.js';
import Invoice from './src/models/Invoice.js';
import PettyCash from './src/models/PettyCash.js';

dotenv.config();

async function verify() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('=== VERIFYING EXACT FINANCIAL AMOUNTS & PRICES ===\n');

    // 1. Verify Invoices
    const sqlSales = JSON.parse(fs.readFileSync('./migration_data/tblSale.json', 'utf8').replace(/^\uFEFF/, ''));
    let sqlTotalAmount = 0;
    let sqlTotalBalance = 0;
    let sqlTotalDiscount = 0;
    for (const s of sqlSales) {
        sqlTotalAmount += parseFloat(s.gtotal) || parseFloat(s.total) || 0;
        sqlTotalBalance += parseFloat(s.balance) || 0;
        sqlTotalDiscount += Math.abs(parseFloat(s.discount) || 0);
    }

    const saleCodes = sqlSales.map(s => s.code?.trim().toUpperCase()).filter(Boolean);
    const mongoInvoices = await Invoice.find({ invoiceNumber: { $in: saleCodes } });
    let mongoTotalAmount = 0;
    let mongoTotalBalance = 0;
    let mongoTotalDiscount = 0;
    for (const inv of mongoInvoices) {
        mongoTotalAmount += inv.grandTotal || inv.totalAmount || 0;
        mongoTotalBalance += inv.balanceDue || inv.balance || 0;
        mongoTotalDiscount += inv.totalDiscount || inv.discountAmount || 0;
    }

    console.log('--- 1. INVOICE FINANCIAL TOTALS ---');
    console.log('SQL File Total Amount:     Rs.', sqlTotalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 }));
    console.log('MongoDB Live Total Amount: Rs.', mongoTotalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 }));
    console.log('SQL File Total Balance:    Rs.', sqlTotalBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 }));
    console.log('MongoDB Live Total Balance:Rs.', mongoTotalBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 }));
    console.log('SQL File Total Discount:   Rs.', sqlTotalDiscount.toLocaleString('en-LK', { minimumFractionDigits: 2 }));
    console.log('MongoDB Live Total Discount:Rs.', mongoTotalDiscount.toLocaleString('en-LK', { minimumFractionDigits: 2 }));

    const isMatch = Math.abs(sqlTotalAmount - mongoTotalAmount) < 0.01 && Math.abs(sqlTotalBalance - mongoTotalBalance) < 0.01;
    console.log('Invoice Match Status:', isMatch ? '✅ EXACT 100% MATCH!' : '⚠️ Check differences');

    // Sample Invoices Comparison
    console.log('\n--- 2. DETAILED SAMPLE INVOICE COMPARISONS ---');
    const samples = sqlSales.filter(s => parseFloat(s.gtotal) > 40000).slice(0, 3);
    for (const s of samples) {
        const invCode = s.code?.trim().toUpperCase();
        const mInv = await Invoice.findOne({ invoiceNumber: invCode });
        if (mInv) {
            console.log(`\n• Invoice [${invCode}]:`);
            console.log(`  Customer:      ${mInv.customerSnapshot?.name}`);
            console.log(`  SQL Amounts:   Total: Rs. ${parseFloat(s.gtotal).toLocaleString()} | Balance: Rs. ${parseFloat(s.balance).toLocaleString()} | Discount: Rs. ${Math.abs(parseFloat(s.discount))}`);
            console.log(`  Mongo Amounts: Total: Rs. ${(mInv.grandTotal || 0).toLocaleString()} | Balance: Rs. ${(mInv.balanceDue || 0).toLocaleString()} | Discount: Rs. ${(mInv.totalDiscount || 0).toLocaleString()}`);
            console.log(`  Line Items (${mInv.items.length} items):`);
            for (const it of mInv.items.slice(0, 2)) {
                console.log(`    - ${it.productName.trim()} | Qty: ${it.quantity} ${it.unitOfMeasure} @ Rs. ${it.unitPrice.toLocaleString()} = Rs. ${it.lineTotal.toLocaleString()}`);
            }
        }
    }

    // 3. Verify Petty Cash
    const sqlCash = JSON.parse(fs.readFileSync('./migration_data/tblcash.json', 'utf8').replace(/^\uFEFF/, ''));
    let sqlCashIn = 0;
    let sqlCashOut = 0;
    for (const c of sqlCash) {
        sqlCashIn += parseFloat(c.cash_in) || 0;
        sqlCashOut += parseFloat(c.cash_out) || 0;
    }

    const mongoCash = await PettyCash.find({});
    let mongoReceipts = 0;
    let mongoExpenses = 0;
    for (const c of mongoCash) {
        if (c.transactionType === 'receipt') mongoReceipts += c.amount || 0;
        else mongoExpenses += c.amount || 0;
    }

    console.log('\n--- 3. PETTY CASH AMOUNTS TOTAL ---');
    console.log('SQL Total Cash IN:  Rs.', sqlCashIn.toLocaleString('en-LK', { minimumFractionDigits: 2 }));
    console.log('MongoDB Receipts:   Rs.', mongoReceipts.toLocaleString('en-LK', { minimumFractionDigits: 2 }));
    console.log('SQL Total Cash OUT: Rs.', sqlCashOut.toLocaleString('en-LK', { minimumFractionDigits: 2 }));
    console.log('MongoDB Expenses:   Rs.', mongoExpenses.toLocaleString('en-LK', { minimumFractionDigits: 2 }));

    const isCashMatch = Math.abs(sqlCashIn - mongoReceipts) < 0.01 && Math.abs(sqlCashOut - mongoExpenses) < 0.01;
    console.log('Petty Cash Match Status:', isCashMatch ? '✅ EXACT 100% MATCH!' : '⚠️ Check differences');

    // 4. Products & Stock Pricing
    console.log('\n--- 4. SAMPLE PRODUCTS, SELLING PRICES & COSTS ---');
    const prods = await Product.find({ basePrice: { $gt: 1000 } }).limit(5);
    for (const p of prods) {
        console.log(`• ${p.name.trim()} (${p.productCode}):`);
        console.log(`  Selling Price (basePrice): Rs. ${p.basePrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);
        console.log(`  Cost Price (standardCost): Rs. ${p.costs.standardCost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);
    }

    await mongoose.disconnect();
}

verify().catch(console.error);
