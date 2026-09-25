import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load models
import Category from './src/models/Category.js';
import UnitOfMeasure from './src/models/UnitOfMeasure.js';
import Warehouse from './src/models/Warehouse.js';
import Customer from './src/models/Customer.js';
import Supplier from './src/models/Supplier.js';
import Product from './src/models/Product.js';
import StockItem from './src/models/StockItem.js';
import Employee from './src/models/Employee.js';
import Invoice from './src/models/Invoice.js';
import Quotation from './src/models/Quotation.js';
import PettyCash from './src/models/PettyCash.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationDir = path.join(__dirname, 'migration_data');

function readJson(filename) {
    const filePath = path.join(migrationDir, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filename}`);
        return [];
    }
    let raw = fs.readFileSync(filePath, 'utf-8');
    if (raw.charCodeAt(0) === 0xFEFF) {
        raw = raw.slice(1);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
}

async function migrate() {
    console.log('=== STARTING GLX-ERP DATA MIGRATION TO MONGODB ===');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB Atlas');

    // ----------------------------------------------------
    // 1. Categories (tblcat.json)
    // ----------------------------------------------------
    console.log('\n--- 1. Migrating Categories ---');
    const tblCat = readJson('tblcat.json');
    const categoryMap = new Map(); // catName -> Category ObjectId

    for (const c of tblCat) {
        const name = c.catname ? c.catname.trim() : `Category ${c.catcode}`;
        const code = `CAT-${c.catcode}`;
        const catDoc = await Category.findOneAndUpdate(
            { $or: [{ code }, { name }] },
            {
                name,
                code,
                description: `Migrated category: ${name}`,
                type: 'product',
                isActive: true
            },
            { upsert: true, returnDocument: 'after' }
        );
        categoryMap.set(name.toLowerCase(), catDoc._id);
        categoryMap.set(String(c.catcode), catDoc._id);
    }
    console.log(`✓ Categories migrated: ${categoryMap.size} mapped`);

    // ----------------------------------------------------
    // 2. Units of Measure (tbluom.json)
    // ----------------------------------------------------
    console.log('\n--- 2. Migrating Units of Measure ---');
    const tblUom = readJson('tbluom.json');
    const defaultUoms = [
        { name: 'Pieces', symbol: 'Pcs', type: 'quantity' },
        { name: 'Square Feet', symbol: 'Sq Feet', type: 'area' },
        { name: 'Meters', symbol: 'Meters', type: 'length' },
        { name: 'Kilograms', symbol: 'Kg', type: 'weight' },
        { name: 'Numbers', symbol: 'Nos', type: 'quantity' }
    ];

    for (const u of tblUom) {
        if (u.uom && !defaultUoms.some(du => du.symbol.toLowerCase() === u.uom.trim().toLowerCase())) {
            defaultUoms.push({ name: u.uom.trim(), symbol: u.uom.trim(), type: 'quantity' });
        }
    }

    for (const uom of defaultUoms) {
        await UnitOfMeasure.findOneAndUpdate(
            { symbol: uom.symbol },
            uom,
            { upsert: true, returnDocument: 'after' }
        );
    }
    console.log(`✓ Units of Measure verified/migrated: ${defaultUoms.length}`);

    // ----------------------------------------------------
    // 3. Default Warehouse
    // ----------------------------------------------------
    console.log('\n--- 3. Setting Up Warehouse ---');
    let warehouse = await Warehouse.findOne({ warehouseCode: 'WH-JA-ELA' });
    if (!warehouse) {
        warehouse = await Warehouse.findOneAndUpdate(
            { warehouseCode: 'WH-MAIN' },
            {
                warehouseCode: 'WH-MAIN',
                name: 'Main Yard & Warehouse - Ja-Ela',
                type: 'main',
                address: {
                    line1: 'Ja-Ela Yard',
                    city: 'Ja-Ela',
                    country: 'Sri Lanka'
                }
            },
            { upsert: true, returnDocument: 'after' }
        );
    }
    console.log(`✓ Using Warehouse: ${warehouse.name} (${warehouse._id})`);

    // ----------------------------------------------------
    // 4. Customers (tblcus.json)
    // ----------------------------------------------------
    console.log('\n--- 4. Migrating Customers ---');
    const tblCus = readJson('tblcus.json');
    const customerMap = new Map(); // code/name -> customerId
    let cusCount = 0;

    for (const c of tblCus) {
        const code = c.code ? c.code.trim().toUpperCase() : `CUST-${c.ref}`;
        const name = c.name ? c.name.trim() : 'Unknown Customer';
        const isCompany = /ltd|pvt|enterprises|motors|hardware|industries|auto/i.test(name);

        const customerDoc = await Customer.findOneAndUpdate(
            { customerCode: code },
            {
                customerCode: code,
                displayName: name,
                companyName: isCompany ? name : undefined,
                firstName: !isCompany ? name.split(' ')[0] : undefined,
                lastName: !isCompany ? name.split(' ').slice(1).join(' ') : undefined,
                customerType: isCompany ? 'company' : 'individual',
                primaryContact: {
                    name,
                    phone: c.con ? c.con.trim() : undefined,
                    mobile: c.contact2 ? c.contact2.trim() : undefined,
                    email: c.email ? c.email.trim().toLowerCase() : undefined
                },
                billingAddress: {
                    line1: c.address && c.address !== '-' ? c.address.trim() : 'Ja-Ela',
                    city: c.branch ? c.branch.trim() : 'Ja-Ela',
                    country: 'Sri Lanka'
                },
                businessRegistrationNumber: c.nic && c.nic !== '-' ? c.nic.trim() : undefined,
                paymentTerms: {
                    type: 'credit',
                    creditDays: 30
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        customerMap.set(code, customerDoc._id);
        customerMap.set(name.toLowerCase(), customerDoc._id);
        if (c.nic) customerMap.set(c.nic.trim(), customerDoc._id);
        cusCount++;
    }
    console.log(`✓ Customers migrated: ${cusCount}`);

    // ----------------------------------------------------
    // 5. Suppliers (tblsp.json)
    // ----------------------------------------------------
    console.log('\n--- 5. Migrating Suppliers ---');
    const tblSp = readJson('tblsp.json');
    let spCount = 0;
    for (const s of tblSp) {
        const spName = s.spname ? s.spname.trim() : 'Main Supplier';
        const spCode = `SUPP-${s.ref || spCount + 1}`;
        await Supplier.findOneAndUpdate(
            { supplierCode: spCode },
            {
                supplierCode: spCode,
                companyName: spName,
                displayName: spName,
                phone: s.con ? s.con.trim() : undefined,
                address: {
                    line1: s.ad ? s.ad.trim() : 'Colombo',
                    country: 'Sri Lanka'
                }
            },
            { upsert: true, returnDocument: 'after' }
        );
        spCount++;
    }
    console.log(`✓ Suppliers migrated: ${spCount}`);

    // ----------------------------------------------------
    // 6. Products & Stock Items (tblitem.json)
    // ----------------------------------------------------
    console.log('\n--- 6. Migrating Products & Inventory ---');
    const tblItem = readJson('tblitem.json');
    const productMap = new Map(); // itcode / itemName -> Product ObjectId
    let prodCount = 0;

    for (const item of tblItem) {
        const itcode = String(item.itcode || item.ref);
        const code = `ITM-${itcode}`;
        const name = item.itname ? item.itname.trim() : `Item ${itcode}`;
        const categoryId = categoryMap.get(item.cat ? item.cat.trim().toLowerCase() : '') || categoryMap.get('1');
        const costPrice = Math.max(0, parseFloat(item.cost) || 0);
        const salePrice = Math.max(0, parseFloat(item.sale) || 0);
        const isLabour = /labour|repair|service|paint|work/i.test(item.cat || name);

        const productDoc = await Product.findOneAndUpdate(
            { productCode: code },
            {
                productCode: code,
                name,
                shortName: name.length > 50 ? name.substring(0, 50) : name,
                productType: isLabour ? 'raw_material' : 'finished_good',
                categoryId: categoryId || undefined,
                unitOfMeasure: item.uom && item.uom.trim() ? item.uom.trim() : 'Pcs',
                basePrice: salePrice,
                minPrice: costPrice,
                costs: {
                    standardCost: costPrice,
                    averageCost: costPrice,
                    lastPurchaseCost: costPrice
                },
                canBeSold: true,
                canBePurchased: !isLabour
            },
            { upsert: true, returnDocument: 'after' }
        );

        productMap.set(itcode, productDoc._id);
        productMap.set(name.toLowerCase(), productDoc._id);

        // Create initial stock balance if not labour
        if (!isLabour) {
            await StockItem.findOneAndUpdate(
                { productId: productDoc._id, warehouseId: warehouse._id },
                {
                    productId: productDoc._id,
                    productCode: code,
                    productName: name,
                    warehouseId: warehouse._id,
                    unitOfMeasure: productDoc.unitOfMeasure,
                    costPerUnit: costPrice,
                    totalValue: costPrice * 10,
                    quantities: {
                        onHand: 10,
                        openStock: 10,
                        available: 10,
                        reserved: 0
                    }
                },
                { upsert: true, returnDocument: 'after' }
            );
        }
        prodCount++;
    }
    console.log(`✓ Products & StockItems migrated: ${prodCount}`);

    // ----------------------------------------------------
    // 7. Employees (tblemp.json)
    // ----------------------------------------------------
    console.log('\n--- 7. Migrating Employees ---');
    const tblEmp = readJson('tblemp.json');
    let empCount = 0;
    for (const e of tblEmp) {
        const empCode = `EMP-${e.ref}`;
        const fullName = e.name ? e.name.trim() : e.short ? e.short.trim() : `Employee ${e.ref}`;
        const nameParts = fullName.split(' ');
        const rate = parseFloat(e.rph) || 200;

        await Employee.findOneAndUpdate(
            { employeeCode: empCode },
            {
                employeeCode: empCode,
                displayName: e.short ? e.short.trim() : fullName,
                fullName,
                firstName: nameParts[0],
                lastName: nameParts.slice(1).join(' ') || nameParts[0],
                nationalIdNumber: e.nic && e.nic !== '0' ? e.nic.trim() : undefined,
                phone: e.mob_no && e.mob_no !== '000' ? e.mob_no.trim() : undefined,
                paymentType: 'per_hour',
                labourRate: rate,
                department: 'Workshop / Body Building',
                designation: 'Fabricator / Technician',
                status: 'active'
            },
            { upsert: true, returnDocument: 'after' }
        );
        empCount++;
    }
    console.log(`✓ Employees migrated: ${empCount}`);

    // ----------------------------------------------------
    // 8. Invoices & Sales & Quotations (tblSale.json + tblSaleItems.json + tblDes.json)
    // ----------------------------------------------------
    console.log('\n--- 8. Migrating Invoices, Quotations & Sales ---');
    const tblSale = readJson('tblSale.json');
    const tblSaleItems = readJson('tblSaleItems.json');
    const tblDes = readJson('tblDes.json');

    // Group items by sale code
    const itemsByCode = new Map();
    for (const item of tblSaleItems) {
        const saleCode = item.code ? item.code.trim().toUpperCase() : '';
        if (!saleCode) continue;
        if (!itemsByCode.has(saleCode)) {
            itemsByCode.set(saleCode, []);
        }
        itemsByCode.get(saleCode).push(item);
    }

    // Map descriptions by ref
    const desMap = new Map();
    for (const d of tblDes) {
        if (d.ref) {
            desMap.set(d.ref.trim().toUpperCase(), d);
        }
    }

    let invCount = 0;
    let quoteCount = 0;
    for (const s of tblSale) {
        const invNum = s.code ? s.code.trim().toUpperCase() : `INV-${s.ref}`;
        const isQuotation = s.type && s.type.toLowerCase().includes('quot');
        const isEstimate = s.type && s.type.toLowerCase().includes('est');
        const total = parseFloat(s.total) || 0;
        const discount = Math.abs(parseFloat(s.discount) || 0);
        const grandTotal = parseFloat(s.gtotal) || total;
        const balance = parseFloat(s.balance) || 0;
        const paid = Math.max(0, grandTotal - balance);
        const desInfo = desMap.get(invNum) || {};

        // Find customer
        let cusId = customerMap.get(s.cus_code?.trim().toUpperCase()) ||
                    customerMap.get(s.cname?.trim().toLowerCase()) ||
                    (s.nic ? customerMap.get(s.nic.trim()) : null);

        // Prepare line items
        const rawItems = itemsByCode.get(invNum) || [];
        const invoiceItems = rawItems.map((it, idx) => {
            const itCode = it.itcode ? String(it.itcode) : '';
            const prodId = productMap.get(itCode) || productMap.get(it.item?.trim().toLowerCase());
            const qty = parseFloat(it.qty) || 1;
            const up = parseFloat(it.up) || 0;
            const lineTot = parseFloat(it.tot) || (qty * up);

            return {
                lineNumber: idx + 1,
                productId: prodId || undefined,
                productCode: itCode ? `ITM-${itCode}` : undefined,
                productName: it.item ? it.item.trim() : 'Custom Work',
                quantity: qty,
                unitOfMeasure: it.uom ? it.uom.trim() : 'Pcs',
                unitPrice: up,
                lineSubtotal: lineTot,
                lineTotal: lineTot
            };
        });

        const invDate = s.date ? new Date(s.date) : new Date();

        // 1) Upsert to Invoice
        await Invoice.findOneAndUpdate(
            { invoiceNumber: invNum },
            {
                invoiceNumber: invNum,
                invoiceType: isQuotation ? 'proforma' : (isEstimate ? 'estimate' : 'standard'),
                branch: s.branch ? s.branch.trim() : 'JA-ELA',
                invoiceDate: isNaN(invDate.getTime()) ? new Date() : invDate,
                customerId: cusId || undefined,
                customerSnapshot: {
                    name: s.cname ? s.cname.trim() : 'Walk-in Customer',
                    contactName: s.con ? s.con.trim() : ''
                },
                remarks: s.remarks ? s.remarks.trim() : (desInfo.des ? desInfo.des.trim() : ''),
                items: invoiceItems,
                subtotal: total,
                totalDiscount: discount,
                discountAmount: discount,
                grandTotal: grandTotal,
                totalAmount: grandTotal,
                amountPaid: paid,
                paidAmount: paid,
                balanceDue: balance,
                balance: balance,
                status: isQuotation ? 'sent' : 'approved',
                paymentStatus: balance <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'),
                billerName: s.username ? s.username.trim() : 'admin'
            },
            { upsert: true, new: true }
        );
        invCount++;

        // 2) If Quotation or Estimate, also upsert to Quotation model so Quotations screen shows it
        if (isQuotation || isEstimate) {
            const quoteItems = rawItems.map(it => {
                const itCode = it.itcode ? String(it.itcode) : '';
                const prodId = productMap.get(itCode) || productMap.get(it.item?.trim().toLowerCase());
                const qty = parseFloat(it.qty) || 1;
                const up = parseFloat(it.up) || 0;
                const lineTot = parseFloat(it.tot) || (qty * up);

                return {
                    product: prodId || undefined,
                    productName: it.item ? it.item.trim() : 'Custom Work',
                    description: '',
                    quantity: qty,
                    unitPrice: up,
                    discount: 0,
                    subtotal: lineTot
                };
            });

            await Quotation.findOneAndUpdate(
                { quotationCode: invNum },
                {
                    documentType: isEstimate ? 'estimate' : 'quotation',
                    quotationCode: invNum,
                    quoteNumber: invNum,
                    customerId: cusId || undefined,
                    customerName: s.cname ? s.cname.trim() : 'Walk-in Customer',
                    customerPhone: s.con ? s.con.trim() : '',
                    customerAddress: s.ad ? s.ad.trim() : '',
                    salesRep: s.salep ? s.salep.trim() : 'Asanka',
                    branch: s.branch ? s.branch.trim() : 'JA-ELA',
                    conditionOfPayments: desInfo.per ? `${desInfo.per} Advance Payment with the firm Order.\nBalance Payment on Completion of Work` : 'a). 50% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work',
                    completionOfWork: desInfo.day ? `${desInfo.day} working Days after the Order Confirmation.` : '4 to 6 working Days after the Order Confirmation.',
                    remarks: desInfo.des || s.remarks || '',
                    items: quoteItems,
                    totalAmount: total,
                    discount: discount,
                    grandTotal: grandTotal,
                    advanceAmount: paid,
                    balanceAmount: balance,
                    status: 'sent',
                    createdAt: isNaN(invDate.getTime()) ? new Date() : invDate
                },
                { upsert: true, new: true }
            );
            quoteCount++;
        }
    }
    console.log(`✓ Invoices migrated: ${invCount}`);
    console.log(`✓ Quotations & Estimates migrated to CRM: ${quoteCount}`);

    // ----------------------------------------------------
    // 9. Petty Cash & Cash In/Out (tblcash.json)
    // ----------------------------------------------------
    console.log('\n--- 9. Migrating Petty Cash Transactions ---');
    const tblCash = readJson('tblcash.json');
    let cashCount = 0;

    for (const c of tblCash) {
        const refNo = `CASH-${c.ref}`;
        const cashIn = parseFloat(c.cash_in) || 0;
        const cashOut = parseFloat(c.cash_out) || 0;
        const isReceipt = cashIn > 0;
        const amount = isReceipt ? cashIn : cashOut;
        const cashDate = c.date ? new Date(c.date) : new Date();

        await PettyCash.findOneAndUpdate(
            { refNo },
            {
                refNo,
                date: isNaN(cashDate.getTime()) ? new Date() : cashDate,
                item: `${c.pay_cat || ''} ${c.pay_for ? '- ' + c.pay_for : ''} ${c.remarks || ''}`.trim() || 'Cash Transaction',
                category: c.pay_cat ? c.pay_cat.trim() : 'General',
                supplier: c.pay_for ? c.pay_for.trim() : undefined,
                transactionType: isReceipt ? 'receipt' : 'expense',
                amount: amount,
                poolId: 'MAIN',
                status: 'approved'
            },
            { upsert: true, new: true }
        );
        cashCount++;
    }
    console.log(`✓ Petty Cash transactions migrated: ${cashCount}`);

    console.log('\n====================================================');
    console.log('🎉 ALL DATA SUCCESSFULLY MIGRATED TO MONGODB ATLAS!');
    console.log('====================================================');
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('❌ Migration Error:', err);
    process.exit(1);
});
