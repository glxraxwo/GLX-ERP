import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, X, Edit2, CheckCircle2, Search } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import { translateText, detectLanguage } from '../utils/translationService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import SearchableSelect from '../components/ui/SearchableSelect';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { useCreateInvoice } from '../features/invoices/useInvoices';
import api from '../api/axios';

const defaultItemState = {
    productId: '',
    productName: '',
    productTranslation: '',
    productCode: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxRate: 18,
    taxable: true,
    unitOfMeasure: 'pcs',
};

export default function InvoiceFormPage() {
    const navigate = useNavigate();
    const createMutation = useCreateInvoice();

    const [customerId, setCustomerId] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [invoiceType, setInvoiceType] = useState('standard');
    const [notes, setNotes] = useState('');
    const [paymentInstructions, setPaymentInstructions] = useState('');
    const [shippingCost, setShippingCost] = useState(0);

    // Added items list + current item entry state
    const [items, setItems] = useState([]);
    const [currentItem, setCurrentItem] = useState(defaultItemState);
    const [editingIndex, setEditingIndex] = useState(null);

    const [introducer, setIntroducer] = useState('');
    const [introducerName, setIntroducerName] = useState('');
    const [biller, setBiller] = useState('');
    const [billerName, setBillerName] = useState('');
    const [numberPlateImage, setNumberPlateImage] = useState('');
    const [lorryBodyImage, setLorryBodyImage] = useState('');
    const [showAdvance, setShowAdvance] = useState(false);
    const [advancePercentage, setAdvancePercentage] = useState(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);

    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 1000 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active'],
        queryFn: () => productsApi.list({ status: 'active', limit: 500 }),
    });
    const { data: employeesData } = useQuery({
        queryKey: ['employees', 'active'],
        queryFn: async () => {
            const { data } = await api.get('/hr/employees?limit=500&status=active');
            return data.data || [];
        }
    });
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data } = await api.get('/users?limit=500');
            return data.data || [];
        }
    });

    const customerSuggestions = useMemo(() => {
        const all = customersData?.data || [];
        if (!customerSearch.trim()) return all.slice(0, 8);
        const q = customerSearch.toLowerCase().trim();
        return all.filter((c) => {
            const name = (c.displayName || c.companyName || '').toLowerCase();
            const phone = (c.primaryContact?.phone || c.billingAddress?.phone || '').toLowerCase();
            const code = (c.customerCode || '').toLowerCase();
            return name.includes(q) || phone.includes(q) || code.includes(q);
        }).slice(0, 10);
    }, [customerSearch, customersData]);

    const handleSelectCustomer = (cust) => {
        setSelectedCustomer(cust);
        setCustomerId(cust._id);
        setCustomerSearch(cust.displayName || cust.companyName || '');
        setCustomerPhone(cust.primaryContact?.phone || cust.billingAddress?.phone || '');
        if (cust.introducer) {
            setIntroducer(cust.introducer);
            setIntroducerName(cust.introducerName || '');
        } else {
            setIntroducer('');
            setIntroducerName('');
        }
        setIsCustomerDropdownOpen(false);
    };

    const customerOptions = (customersData?.data || []).map((c) => ({
        value: c._id, label: `${c.displayName} (${c.customerCode})`,
    }));
    const productOptions = (productsData?.data || [])
        .filter((p) => p.canBeSold !== false)
        .map((p) => ({
            value: p._id,
            label: p.sinhalaName 
                ? `${p.name} (${p.sinhalaName})`
                : p.name,
            productCode: p.productCode,
            sinhalaName: p.sinhalaName,
            subtext: `Code: ${p.productCode} • Price: LKR ${p.basePrice || 0}`,
        }));

    const updateCurrentItem = (field, value) => {
        setCurrentItem((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'productId') {
                if (value) {
                    const p = productsData?.data?.find((x) => x._id === value);
                    if (p) {
                        next.productName = p.name || '';
                        next.productTranslation = p.sinhalaName || '';
                        next.productCode = p.productCode || '';
                        next.description = p.description || '';
                        next.unitPrice = p.basePrice || p.costs?.lastPurchaseCost || p.costs?.averageCost || 0;
                        next.taxRate = p.tax?.taxRate ?? 18;
                        next.taxable = p.tax?.taxable ?? true;
                        next.unitOfMeasure = p.unitOfMeasure || 'pcs';
                    }
                } else {
                    next.productId = '';
                }
            }
            return next;
        });
    };

    const handleTranslateCurrentItem = async () => {
        const text = currentItem.productName || '';
        if (!text.trim()) {
            toast.error('Please enter an item name to translate');
            return;
        }
        try {
            const detected = detectLanguage(text);
            if (detected === 'si' || detected === 'ta') {
                const translated = await translateText(text, 'en');
                setCurrentItem((prev) => ({
                    ...prev,
                    productName: translated,
                    productTranslation: text,
                }));
                toast.success('Translated to English!');
            } else {
                const translated = await translateText(text, 'si');
                setCurrentItem((prev) => ({
                    ...prev,
                    productTranslation: translated,
                }));
                toast.success('Translated to Sinhala!');
            }
        } catch (err) {
            toast.error('Translation failed: ' + err.message);
        }
    };

    const handleAddOrUpdateItem = () => {
        if (!currentItem.productName || !currentItem.productName.trim()) {
            toast.error('Item Name is required');
            return;
        }
        const q = +currentItem.quantity;
        if (!q || q <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        if (editingIndex !== null) {
            setItems((prev) => {
                const updated = [...prev];
                updated[editingIndex] = { ...currentItem };
                return updated;
            });
            toast.success(`Item #${editingIndex + 1} updated!`);
            setEditingIndex(null);
        } else {
            setItems((prev) => [...prev, { ...currentItem }]);
            toast.success(`Item #${items.length + 1} added!`);
        }

        setCurrentItem(defaultItemState);
    };

    const handleEditItem = (idx) => {
        setEditingIndex(idx);
        setCurrentItem({ ...items[idx] });
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setCurrentItem(defaultItemState);
    };

    const handleRemoveItem = (idx) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
        if (editingIndex === idx) {
            setEditingIndex(null);
            setCurrentItem(defaultItemState);
        } else if (editingIndex !== null && editingIndex > idx) {
            setEditingIndex(editingIndex - 1);
        }
        toast.success(`Item #${idx + 1} removed`);
    };

    const totals = useMemo(() => {
        let sub = 0, totalDisc = 0, tax = 0;
        items.forEach((i) => {
            const q = +i.quantity || 0;
            const p = +i.unitPrice || 0;
            const disc = +i.discount || 0;
            const lSub = q * p;
            const lDisc = Math.min(lSub, disc * q);
            const lTaxable = Math.max(0, lSub - lDisc);
            const lTax = i.taxable ? lTaxable * (+i.taxRate || 0) / 100 : 0;
            sub += lSub;
            totalDisc += lDisc;
            tax += lTax;
        });
        const grand = Math.max(0, sub - totalDisc + tax + (+shippingCost || 0));
        return { 
            sub: +sub.toFixed(2), 
            discount: +totalDisc.toFixed(2), 
            tax: +tax.toFixed(2), 
            grand: +grand.toFixed(2) 
        };
    }, [items, shippingCost]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submit = async () => {
        const finalCustomerName = (customerSearch || selectedCustomer?.displayName || '').trim();
        if (!customerId && !finalCustomerName) {
            toast.error('Please enter customer name or select a customer');
            return;
        }

        let finalItems = [...items];
        if (finalItems.length === 0 && currentItem.productName && +currentItem.quantity > 0) {
            finalItems = [{ ...currentItem }];
        }

        if (finalItems.length === 0) {
            toast.error('Please add at least one item using "+ Add Item"');
            return;
        }

        if (finalItems.some((i) => !i.productName || !i.quantity)) {
            toast.error('All items need a name and quantity');
            return;
        }

        try {
            const result = await createMutation.mutateAsync({
                customerId: customerId || undefined,
                customerName: finalCustomerName,
                customerPhone: customerPhone || undefined,
                invoiceType,
                invoiceDate,
                dueDate: dueDate || undefined,
                introducer: introducer || undefined,
                introducerName: introducerName || undefined,
                biller: biller || undefined,
                billerName: billerName || undefined,
                numberPlateImage: numberPlateImage || undefined,
                lorryBodyImage: lorryBodyImage || undefined,
                items: finalItems.map((i) => {
                    const q = +i.quantity || 1;
                    const d = +i.discount || 0;
                    return {
                        productId: i.productId || undefined,
                        productCode: i.productCode || undefined,
                        productName: i.productName,
                        productTranslation: i.productTranslation || undefined,
                        description: i.description || undefined,
                        quantity: q,
                        unitOfMeasure: i.unitOfMeasure || undefined,
                        unitPrice: +i.unitPrice || 0,
                        discount: d,
                        discountAmount: +(d * q).toFixed(2),
                        taxRate: +i.taxRate || 0,
                        taxable: i.taxable,
                    };
                }),
                shippingCost: +shippingCost || 0,
                advancePercentage: showAdvance ? (+advancePercentage || 0) : 0,
                advanceAmount: showAdvance ? (+advanceAmount || 0) : 0,
                showAdvanceOnInvoice: showAdvance,
                notes: notes || undefined,
                paymentInstructions: paymentInstructions || undefined,
                status: 'approved',
            });
            navigate(`/invoices/${result.data._id}`);
        } catch { }
    };

    const curQ = +currentItem.quantity || 0;
    const curP = +currentItem.unitPrice || 0;
    const curD = +currentItem.discount || 0;
    const curGross = curQ * curP;
    const curDisc = Math.min(curGross, curD * curQ);
    const curTaxable = Math.max(0, curGross - curDisc);
    const curTax = currentItem.taxable ? curTaxable * (+currentItem.taxRate || 0) / 100 : 0;
    const curLineTot = curTaxable + curTax;

    return (
        <div>
            <PageHeader title="Add Invoice"
                description="Create an invoice directly (services, custom sales, or walk-in customers)"
                actions={<Button variant="outline" onClick={() => navigate('/invoices')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <h3 className="text-sm font-bold text-gray-800">Customer & Dates</h3>
                            {selectedCustomer ? (
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 size={12} /> System Customer: {selectedCustomer.customerCode}
                                </span>
                            ) : customerSearch.trim() ? (
                                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                    Manual Customer
                                </span>
                            ) : null}
                        </div>

                        <div className="space-y-4">
                            {/* Smart Customer Search / Suggestion / Manual Entry */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Customer Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={customerSearch}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCustomerSearch(val);
                                                if (customerId) setCustomerId('');
                                                if (selectedCustomer) setSelectedCustomer(null);
                                                setIsCustomerDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsCustomerDropdownOpen(true)}
                                            placeholder="Type name or phone number..."
                                            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-medium"
                                        />
                                        {customerSearch && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCustomerSearch('');
                                                    setCustomerPhone('');
                                                    setCustomerId('');
                                                    setSelectedCustomer(null);
                                                    setIntroducer('');
                                                    setIntroducerName('');
                                                }}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Auto-suggest dropdown */}
                                    {isCustomerDropdownOpen && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-gray-100">
                                            {customerSuggestions.length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                                                        <span>System Customers</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsCustomerDropdownOpen(false)}
                                                            className="text-gray-400 hover:text-gray-600 text-xs"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                    {customerSuggestions.map((c) => (
                                                        <div
                                                            key={c._id}
                                                            onClick={() => handleSelectCustomer(c)}
                                                            className="px-3 py-2 hover:bg-primary-50 cursor-pointer transition flex items-center justify-between"
                                                        >
                                                            <div className="min-w-0 pr-2">
                                                                <p className="text-xs font-bold text-gray-900 truncate">
                                                                    {c.displayName || c.companyName}
                                                                </p>
                                                                <p className="text-[11px] text-gray-500 font-mono">
                                                                    {c.customerCode} {c.primaryContact?.phone ? `• ${c.primaryContact.phone}` : (c.billingAddress?.phone ? `• ${c.billingAddress.phone}` : '')}
                                                                </p>
                                                            </div>
                                                            <span className="text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100 font-semibold shrink-0">
                                                                Select
                                                            </span>
                                                        </div>
                                                    ))}
                                                </>
                                            )}

                                            {customerSearch.trim() && (
                                                <div
                                                    onClick={() => setIsCustomerDropdownOpen(false)}
                                                    className="p-2.5 bg-amber-50/70 hover:bg-amber-100/70 cursor-pointer text-xs font-semibold text-amber-900 flex items-center justify-between"
                                                >
                                                    <div>
                                                        <span>Use <strong>&quot;{customerSearch}&quot;</strong> as manual customer</span>
                                                        <p className="text-[10px] text-amber-700 font-normal">Saves as walk-in customer without creating in master list</p>
                                                    </div>
                                                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold">Manual</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Customer Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 0771234567"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                                <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                <Select label="Type"
                                    options={[
                                        { value: 'standard', label: 'Standard' },
                                        { value: 'proforma', label: 'Proforma' },
                                        { value: 'service', label: 'Service' },
                                    ]}
                                    value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} />
                            </div>
                        </div>
                    </Card>

                    {/* Item Entry Form */}
                    <Card className="p-6 border-primary-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary-600 text-white font-bold text-xs flex items-center justify-center">
                                        {editingIndex !== null ? editingIndex + 1 : items.length + 1}
                                    </span>
                                    {editingIndex !== null ? `Edit Item #${editingIndex + 1}` : `Add Item #${items.length + 1}`}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Fill in the item details below and click &quot;{editingIndex !== null ? 'Update Item' : '+ Add Item'}&quot; to add it to the invoice.
                                </p>
                            </div>
                            {editingIndex !== null && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md transition"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Catalog Product Selection */}
                            <div>
                                <SearchableSelect
                                    label="Catalog Product (Optional - Auto Fill)"
                                    placeholder="Search product by name, Sinhala name, or code..."
                                    options={productOptions}
                                    value={currentItem.productId || ''}
                                    onChange={(e) => updateCurrentItem('productId', e.target.value)}
                                />
                            </div>

                            {/* Item Name and Translation */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Input
                                        label="Item Name / Title *"
                                        required
                                        placeholder="e.g. Repair Works / Cargo Lorry Body DOOR Reconstruction"
                                        value={currentItem.productName}
                                        onChange={(e) => updateCurrentItem('productName', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-gray-700">
                                            Translation (Sinhala / Tamil)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleTranslateCurrentItem}
                                            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition"
                                        >
                                            Translate (SI/EN)
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="සිංහල / தமிழ் නම"
                                        value={currentItem.productTranslation || ''}
                                        onChange={(e) => updateCurrentItem('productTranslation', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Detailed Specifications */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Detailed Specifications / Work Description (Multiline)
                                </label>
                                <textarea
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs leading-relaxed bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 font-sans"
                                    placeholder="Detailed specifications (e.g. *** Roof 3 x 3 Aluminium Patch *** or bullet points: 01. Waterproof Shutter Board...)"
                                    value={currentItem.description || ''}
                                    onChange={(e) => updateCurrentItem('description', e.target.value)}
                                />
                            </div>

                            {/* Qty, Unit Price, Discount, Tax, Line Total */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 items-end">
                                <Input
                                    label="Qty *"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={currentItem.quantity}
                                    onChange={(e) => updateCurrentItem('quantity', e.target.value)}
                                />
                                <Input
                                    label="Unit Price (LKR)"
                                    type="number"
                                    step="0.01"
                                    value={currentItem.unitPrice}
                                    onChange={(e) => updateCurrentItem('unitPrice', e.target.value)}
                                />
                                <div>
                                    <label className="block text-xs font-bold text-red-600 mb-1 uppercase tracking-wide">
                                        Discount / Unit (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white font-mono text-red-600 focus:outline-none focus:ring-1 focus:ring-red-400 placeholder-red-300"
                                        value={currentItem.discount || ''}
                                        onChange={(e) => updateCurrentItem('discount', e.target.value)}
                                    />
                                </div>
                                <Input
                                    label="Tax %"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={currentItem.taxRate}
                                    onChange={(e) => updateCurrentItem('taxRate', e.target.value)}
                                />
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Line Total</label>
                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                                        <p className="text-sm font-bold text-gray-900">{fmt(curLineTot)}</p>
                                        {curDisc > 0 && (
                                            <p className="text-[10px] text-red-500 font-mono">-Disc: {fmt(curDisc)}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Add / Update Item Button */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                {editingIndex !== null ? (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleAddOrUpdateItem}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                                        >
                                            <CheckCircle2 size={16} className="mr-1.5" />
                                            Update Item #{editingIndex + 1}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={handleAddOrUpdateItem}
                                        className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm px-6"
                                    >
                                        <Plus size={16} className="mr-1.5" />
                                        + Add Item #{items.length + 1}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Added Items List */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <span>Added Items</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
                                        {items.length}
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Review added items. Click Edit to modify or Trash to remove.
                                </p>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                <p className="text-sm font-medium text-gray-500">No items added yet</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Fill in the form above and click &quot;+ Add Item #1&quot; to add your first item.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, idx) => {
                                    const q = +item.quantity || 0;
                                    const p = +item.unitPrice || 0;
                                    const d = +item.discount || 0;
                                    const lGross = q * p;
                                    const lDisc = Math.min(lGross, d * q);
                                    const lTaxable = Math.max(0, lGross - lDisc);
                                    const lTax = item.taxable ? lTaxable * (+item.taxRate || 0) / 100 : 0;
                                    const lTot = lTaxable + lTax;
                                    const isBeingEdited = editingIndex === idx;

                                    return (
                                        <div
                                            key={idx}
                                            className={`border rounded-xl p-4 transition ${
                                                isBeingEdited
                                                    ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <span className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                        isBeingEdited
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-primary-100 text-primary-800'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                                Item #{idx + 1}
                                                            </span>
                                                            <h4 className="text-sm font-bold text-gray-900 truncate">
                                                                {item.productName}
                                                            </h4>
                                                            {item.productTranslation && (
                                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-sans">
                                                                    {item.productTranslation}
                                                                </span>
                                                            )}
                                                            {item.productCode && (
                                                                <span className="text-[11px] font-mono text-gray-400">
                                                                    ({item.productCode})
                                                                </span>
                                                            )}
                                                        </div>

                                                        {item.description && (
                                                            <p className="text-xs text-gray-600 mt-1 whitespace-pre-line bg-gray-50 p-2 rounded border border-gray-100">
                                                                {item.description}
                                                            </p>
                                                        )}

                                                        <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                                                            <span>
                                                                Qty: <strong className="text-gray-800 font-mono">{item.quantity}</strong> {item.unitOfMeasure || 'pcs'}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                Unit Price: <strong className="text-gray-800 font-mono">{fmt(item.unitPrice)}</strong>
                                                            </span>
                                                            {d > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-red-600 font-mono">
                                                                        Disc: -{fmt(lDisc)}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {+item.taxRate > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>Tax: {item.taxRate}%</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                    <div className="text-right">
                                                        <span className="text-xs text-gray-400 block">Total</span>
                                                        <span className="text-base font-bold text-gray-900 font-mono">
                                                            {fmt(lTot)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditItem(idx)}
                                                            className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition ${
                                                                isBeingEdited
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                                            }`}
                                                            title="Edit item"
                                                        >
                                                            <Edit2 size={14} />
                                                            <span className="hidden sm:inline">Edit</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(idx)}
                                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-xs flex items-center gap-1 font-medium transition"
                                                            title="Remove item"
                                                        >
                                                            <Trash2 size={14} />
                                                            <span className="hidden sm:inline">Remove</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Notes</h3>
                        <div className="space-y-4">
                            <Textarea label="Invoice Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                            <Textarea label="Payment Instructions" rows={2} value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} />
                        </div>
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(totals.sub)}</span></div>
                            {totals.discount > 0 && (
                                <div className="flex justify-between text-red-600 font-medium">
                                    <span>Discount</span>
                                    <span>-{fmt(totals.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{fmt(totals.tax)}</span></div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-600">Shipping</span>
                                <input type="number" step="0.01" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)}
                                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                            </div>
                            <div className="flex justify-between pt-3 border-t font-bold">
                                <span>Total</span><span className="text-primary-600">{fmt(totals.grand)}</span>
                            </div>

                            {/* Optional Advance Payment */}
                            <div className="pt-3 border-t space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                    <input 
                                        type="checkbox" 
                                        checked={showAdvance} 
                                        onChange={(e) => {
                                            setShowAdvance(e.target.checked);
                                            if (!e.target.checked) {
                                                setAdvancePercentage(0);
                                                setAdvanceAmount(0);
                                            }
                                        }} 
                                        className="rounded text-primary-600"
                                    />
                                    <span>Add Advance Payment (Optional)</span>
                                </label>

                                {showAdvance && (
                                    <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span>Advance %:</span>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="100" 
                                                step="any"
                                                value={advancePercentage || ''} 
                                                onChange={(e) => {
                                                    const pct = Number(e.target.value);
                                                    setAdvancePercentage(pct);
                                                    setAdvanceAmount(+((totals.grand * pct) / 100).toFixed(2));
                                                }}
                                                className="w-16 px-2 py-0.5 border rounded text-right font-mono font-bold bg-white" 
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Advance LKR:</span>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                step="0.01"
                                                value={advanceAmount || ''} 
                                                onChange={(e) => {
                                                    const amt = Number(e.target.value);
                                                    setAdvanceAmount(amt);
                                                    setAdvancePercentage(totals.grand > 0 ? +((amt / totals.grand) * 100).toFixed(1) : 0);
                                                }}
                                                className="w-24 px-2 py-0.5 border rounded text-right font-mono font-bold bg-white" 
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center font-bold text-emerald-800 pt-1 border-t border-emerald-200">
                                            <span>Balance Due:</span>
                                            <span className="font-mono">{fmt(Math.max(0, totals.grand - (advanceAmount || 0)))}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button variant="primary" fullWidth className="mt-6" onClick={submit} loading={createMutation.isPending}
                            disabled={!customerId || (items.length === 0 && !currentItem.productName)}>
                            <Save size={16} className="mr-1.5" /> Create Invoice
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}