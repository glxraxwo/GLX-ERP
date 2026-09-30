import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import { 
    Sparkles, Package, DollarSign, Barcode as BarcodeIcon, 
    AlertTriangle, ShieldAlert, Tag, CheckCircle2, Layers, Info
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { productFormSchema } from './productSchemas';
import { useCategories, useBrands, useUoms, useCreateProduct, useUpdateProduct } from './useProducts';
import { productsApi } from './productsApi';
import { generateSinhalaProductName } from '../../utils/translationService';

export default function ProductFormModal({ isOpen, onClose, product = null, forceProductType = null }) {
    const isEdit = !!product;

    const { data: categoriesData } = useCategories();
    const { data: brandsData } = useBrands();
    const { data: uomsData } = useUoms();
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            name: '',
            sinhalaName: '',
            productCode: '',
            productShortCode: '',
            type: 'trading',
            status: 'active',
            taxable: true,
            taxRate: 18,
            sellable: true,
            allowBackorder: false,
            minimumOrderQuantity: 1,
            basePrice: 0,
            cost: 0,
            minPrice: 0,
            initialQuantity: 0,
            reorderLevel: 10,
            minimumLevel: 5,
            brandId: '',
            canBeSold: true,
            canBePurchased: true,
            canBeManufactured: false,
        },
    });

    // When opening in edit mode, populate form
    useEffect(() => {
        if (isOpen && product) {
            reset({
                productCode: product.productCode || '',
                productShortCode: product.productShortCode || '',
                name: product.name || '',
                sinhalaName: product.sinhalaName || '',
                shortName: product.shortName || '',
                sku: product.sku || '',
                barcode: product.barcode || '',
                productType: product.productType || 'finished_good',
                canBeSold: product.canBeSold ?? true,
                canBePurchased: product.canBePurchased ?? true,
                canBeManufactured: product.canBeManufactured ?? false,
                description: product.description || '',
                categoryId: product.categoryId?._id || product.categoryId || '',
                brandId: product.brandId?._id || product.brandId || '',
                type: product.type || 'trading',
                unitOfMeasure: product.unitOfMeasure || '',
                basePrice: product.basePrice || 0,
                cost: product.costs?.standardCost || 0,
                minPrice: product.minPrice || 0,
                initialQuantity: product.quantities?.onHand || 0,
                mrp: product.mrp || 0,
                taxable: product.tax?.taxable ?? true,
                taxRate: product.tax?.taxRate ?? 18,
                hsCode: product.tax?.hsCode || '',
                minimumLevel: product.stockLevels?.minimumLevel ?? 5,
                reorderLevel: product.stockLevels?.reorderLevel ?? 10,
                maximumLevel: product.stockLevels?.maximumLevel || 0,
                unitsPerCarton: product.packaging?.unitsPerCarton || 1,
                cartonsPerPallet: product.packaging?.cartonsPerPallet || 1,
                minimumOrderQuantity: product.salesConfig?.minimumOrderQuantity || 1,
                sellable: product.salesConfig?.sellable ?? true,
                allowBackorder: product.salesConfig?.allowBackorder ?? false,
                status: product.status || 'active',
                notes: product.notes || '',
            });
        } else if (isOpen && !product) {
            const rawCat = forceProductType === 'raw_material' && categoriesData?.data
                ? categoriesData.data.find(c => c.code === 'RAW' || c.name === 'Raw Material')
                : null;

            reset({
                productCode: '',
                productShortCode: '',
                type: 'trading',
                status: 'active',
                taxable: true,
                taxRate: 18,
                sellable: forceProductType === 'raw_material' ? false : true,
                allowBackorder: false,
                minimumOrderQuantity: 1,
                productType: forceProductType || 'raw_material',
                categoryId: rawCat ? rawCat._id : '',
                basePrice: 0,
                cost: 0,
                minPrice: 0,
                initialQuantity: 0,
                reorderLevel: 10,
                minimumLevel: 5,
                brandId: '',
                canBeSold: forceProductType === 'raw_material' ? false : true,
                canBePurchased: true,
                canBeManufactured: forceProductType === 'raw_material' ? false : true,
                description: '',
                name: '',
                sinhalaName: '',
                sku: '',
                barcode: '',
                unitOfMeasure: '',
            });
        }
    }, [isOpen, product, reset, forceProductType, categoriesData]);

    const selectedCategoryId = watch('categoryId');
    const selectedProductShortCode = watch('productShortCode');
    const [isLoadingCode, setIsLoadingCode] = useState(false);

    useEffect(() => {
        if (!isEdit && isOpen && selectedCategoryId && selectedProductShortCode && selectedProductShortCode.length === 3) {
            const fetchNextCode = async () => {
                setIsLoadingCode(true);
                try {
                    const response = await productsApi.getNextCode(selectedCategoryId, selectedProductShortCode);
                    if (response?.success && response?.productCode) {
                        setValue('productCode', response.productCode);
                    }
                } catch (err) {
                    console.error('Failed to fetch next product code:', err);
                } finally {
                    setIsLoadingCode(false);
                }
            };
            fetchNextCode();
        } else if (!isEdit && isOpen && (!selectedCategoryId || !selectedProductShortCode || selectedProductShortCode.length !== 3)) {
            setValue('productCode', '');
        }
    }, [selectedCategoryId, selectedProductShortCode, isEdit, isOpen, setValue]);

    const onInvalid = (errors) => {
        console.error('Product validation failed:', errors);
        const errorList = Object.values(errors).map((err) => err.message);
        if (errorList.length > 0) {
            toast.error(`Validation error: ${errorList.join(', ')}`);
        }
    };

    const [isGeneratingSinhala, setIsGeneratingSinhala] = useState(false);
    const watchName = watch('name');

    const handleAutoGenerateSinhala = async () => {
        if (!watchName || !watchName.trim()) {
            toast.error('Please enter product name first');
            return;
        }
        setIsGeneratingSinhala(true);
        try {
            const gen = await generateSinhalaProductName(watchName);
            if (gen) {
                setValue('sinhalaName', gen, { shouldValidate: true, shouldDirty: true });
                toast.success(`Generated Sinhala name: ${gen}`);
            }
        } catch (err) {
            toast.error('Failed to generate Sinhala name');
        } finally {
            setIsGeneratingSinhala(false);
        }
    };

    const onSubmit = async (data) => {
        const rawCat = forceProductType === 'raw_material' && categoriesData?.data
            ? categoriesData.data.find(c => c.code === 'RAW' || c.name === 'Raw Material')
            : null;

        // Auto determine business line type
        let determinedType = 'trading';
        if (data.productType === 'finished_good') {
            determinedType = 'manufactured';
        } else if (data.productType === 'service') {
            determinedType = 'service';
        }

        // Transform flat form data back into nested structure for API
        const payload = {
            productCode: data.productCode || undefined,
            productShortCode: data.productShortCode || undefined,
            name: data.name,
            sinhalaName: data.sinhalaName || '',
            shortName: data.name.substring(0, 100),
            sku: data.sku || undefined,
            barcode: data.barcode || undefined,
            productType: forceProductType || data.productType,
            canBeSold: data.canBeSold !== undefined ? Boolean(data.canBeSold) : (forceProductType === 'raw_material' ? false : true),
            canBePurchased: data.canBePurchased,
            canBeManufactured: data.canBeManufactured,
            description: data.description || undefined,
            categoryId: rawCat ? rawCat._id : data.categoryId,
            brandId: data.brandId || undefined,
            type: determinedType,
            unitOfMeasure: data.unitOfMeasure,
            basePrice: Number(data.basePrice) || 0,
            minPrice: Number(data.minPrice) || 0,
            initialQuantity: Number(data.initialQuantity) || 0,
            mrp: Number(data.basePrice) || 0,
            costs: {
                standardCost: Number(data.cost) || 0,
                averageCost: Number(data.cost) || 0,
                lastPurchaseCost: Number(data.cost) || 0,
            },
            tax: {
                taxable: true,
                taxRate: 18,
                hsCode: data.hsCode || undefined,
            },
            stockLevels: {
                minimumLevel: Number(data.minimumLevel) || 0,
                reorderLevel: Number(data.reorderLevel) || 0,
                maximumLevel: Number(data.maximumLevel) || 0,
            },
            packaging: {
                unitsPerCarton: 1,
                cartonsPerPallet: 1,
            },
            salesConfig: {
                minimumOrderQuantity: 1,
                sellable: forceProductType === 'raw_material' ? false : true,
                allowBackorder: false,
            },
            status: data.status || 'active',
            notes: data.notes || undefined,
        };

        try {
            if (isEdit) {
                await updateProduct.mutateAsync({ id: product._id, data: payload });
            } else {
                await createProduct.mutateAsync(payload);
            }
            onClose();
        } catch (err) {
            // Handled in hook
        }
    };

    const categoryOptions = (categoriesData?.data || []).map((c) => ({
        value: c._id,
        label: `${c.name} (${c.code})`,
    }));
    const brandOptions = (brandsData?.data || []).map((b) => ({
        value: b._id,
        label: b.name,
    }));
    const uomOptions = (uomsData?.data || []).map((u) => ({
        value: u.symbol,
        label: `${u.name} (${u.symbol})`,
    }));

    const isLoading = createProduct.isPending || updateProduct.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Package size={18} />
                    </div>
                    <div>
                        <div className="text-base font-bold text-gray-900">
                            {isEdit ? `Edit Product — ${product?.productCode || product?.name}` : 'Create New Product / Material'}
                        </div>
                        <div className="text-xs text-gray-500 font-normal">
                            Configure item details, barcode, pricing, and minimum stock alert thresholds
                        </div>
                    </div>
                </div>
            }
            size="2xl"
        >
            <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
                <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto bg-gray-50/50">
                    
                    {/* SECTION 1: BASIC INFORMATION */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <Tag size={16} className="text-blue-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                1. Basic Information (මූලික විස්තර)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Product / Material Name (English) *"
                                required
                                placeholder="e.g. Plywood 12mm, Lorry Corner Bracket"
                                error={errors.name?.message}
                                {...register('name')}
                            />
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Sinhala Name (සිංහල නම)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAutoGenerateSinhala}
                                        disabled={isGeneratingSinhala}
                                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                                        title="Auto-generate Sinhala name (උදා: Plywood -> ලෑලි)"
                                    >
                                        <Sparkles size={13} className={isGeneratingSinhala ? 'animate-spin' : 'text-emerald-600'} />
                                        <span>{isGeneratingSinhala ? 'Generating...' : 'Auto-Generate (සිංහලෙන්)'}</span>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g. ලෑලි 12mm, ලොරි කෝනර් බ්‍රැකට්"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans shadow-xs transition"
                                    {...register('sinhalaName')}
                                />
                                {errors.sinhalaName && (
                                    <p className="text-xs text-red-500">{errors.sinhalaName.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                label="Material Category *"
                                required
                                disabled={forceProductType === 'raw_material'}
                                error={errors.categoryId?.message}
                                options={categoryOptions}
                                {...register('categoryId')}
                            />
                            <Select
                                label="Inventory Product Type *"
                                required
                                disabled={forceProductType === 'raw_material'}
                                options={[
                                    { value: 'raw_material', label: 'Raw Material (Extrusion, Steel, etc.)' },
                                    { value: 'finished_good', label: 'Finished Lorry Body' },
                                    { value: 'consumable', label: 'Consumable & Seals (Bolt, Paint, Beading)' },
                                    { value: 'service', label: 'Labor Service' },
                                ]}
                                error={errors.productType?.message}
                                {...register('productType')}
                            />
                            <Select
                                label="Status *"
                                required
                                error={errors.status?.message}
                                options={[
                                    { value: 'active', label: 'Active (ක්‍රියාකාරී)' },
                                    { value: 'inactive', label: 'Inactive (අක්‍රිය)' },
                                ]}
                                {...register('status')}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Unit of Measure (UOM) *"
                                required
                                error={errors.unitOfMeasure?.message}
                                options={uomOptions}
                                {...register('unitOfMeasure')}
                            />
                            <Select
                                label="Product Brand"
                                options={brandOptions}
                                placeholder="Select Brand"
                                error={errors.brandId?.message}
                                {...register('brandId')}
                            />
                        </div>
                    </div>

                    {/* SECTION 2: CODES & BARCODE IDENTIFICATION */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <BarcodeIcon size={16} className="text-indigo-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                2. Codes & Identification (කේත සහ තීරු කේතය)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Short Code (e.g. MOR, CLR)"
                                maxLength={3}
                                placeholder="3 letter code"
                                disabled={isEdit}
                                error={errors.productShortCode?.message}
                                {...register('productShortCode')}
                            />
                            <Input
                                label="Product System Code"
                                disabled
                                placeholder={isLoadingCode ? "Generating..." : "Auto-generated system code"}
                                error={errors.productCode?.message}
                                {...register('productCode')}
                            />
                            <Input
                                label="SKU / Internal Code"
                                placeholder="e.g. SKU-1002"
                                error={errors.sku?.message}
                                {...register('sku')}
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-gray-700">Barcode Number (තීරු කේතය)</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const generatedBarcode = 'BC' + Math.floor(100000000000 + Math.random() * 900000000000);
                                        setValue('barcode', generatedBarcode, { shouldValidate: true, shouldDirty: true });
                                    }}
                                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                    ⚡ Auto-Generate Barcode
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Scan or enter barcode number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-xs transition"
                                {...register('barcode')}
                            />
                            {errors.barcode?.message && <p className="text-xs text-red-500">{errors.barcode.message}</p>}
                        </div>
                    </div>

                    {/* SECTION 3: PRICING & STOCK CONTROL (WITH MINIMUM QUANTITY ALERT) */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-600" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                    3. Pricing & Stock Thresholds (මිල සහ තොග සීමා)
                                </h3>
                            </div>
                            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <AlertTriangle size={12} /> Low Stock Alert Active
                            </span>
                        </div>

                        {/* Prices */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Cost (LKR) *"
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                error={errors.cost?.message}
                                {...register('cost')}
                            />
                            <Input
                                label="Selling Price (LKR) *"
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                error={errors.basePrice?.message}
                                {...register('basePrice')}
                            />
                            <Input
                                label="Minimum Selling Price (LKR)"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                error={errors.minPrice?.message}
                                {...register('minPrice')}
                            />
                        </div>

                        {/* Stock Quantities & Minimum Thresholds */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <Input
                                label="Opening Stock (OS / ආරම්භක තොගය) *"
                                type="number"
                                required
                                disabled={isEdit}
                                placeholder={isEdit ? "Managed via stock ledger" : "e.g. 50"}
                                error={errors.initialQuantity?.message}
                                {...register('initialQuantity')}
                            />

                            {/* Minimum Quantity / Reorder Level */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-amber-900 flex items-center gap-1">
                                        <AlertTriangle size={13} className="text-amber-600" />
                                        <span>Min Qty / Alert Level (අවම තොගය) *</span>
                                    </label>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="e.g. 10"
                                    className="w-full px-3 py-2 border-2 border-amber-300/80 rounded-lg text-sm bg-amber-50/40 font-semibold text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition shadow-xs"
                                    {...register('reorderLevel')}
                                />
                                <p className="text-[11px] text-amber-700 flex items-center gap-1">
                                    <Info size={11} /> මෙම ප්‍රමාණයට වඩා තොගය අඩු වුවහොත් Low Stock පිටුවේ පෙන්වයි.
                                </p>
                                {errors.reorderLevel?.message && (
                                    <p className="text-xs text-red-500">{errors.reorderLevel.message}</p>
                                )}
                            </div>

                            {/* Critical Safety Stock Level */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-red-900 flex items-center gap-1">
                                    <ShieldAlert size={13} className="text-red-500" />
                                    <span>Critical Min Stock (ආරක්ෂිත අවමය)</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="e.g. 5"
                                    className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-red-50/30 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200 transition shadow-xs"
                                    {...register('minimumLevel')}
                                />
                                <p className="text-[11px] text-gray-500">Critical Red alert threshold</p>
                                {errors.minimumLevel?.message && (
                                    <p className="text-xs text-red-500">{errors.minimumLevel.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: OPERATIONAL CONFIGURATION & DESCRIPTION */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <Layers size={16} className="text-purple-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                4. Configuration & Description (සැකසුම් සහ විස්තර)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer" 
                                    {...register('canBeSold')} 
                                />
                                <span>Can be sold (විකිණිය හැක)</span>
                            </label>
                            <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer" 
                                    {...register('canBePurchased')} 
                                />
                                <span>Can be purchased (මිලදී ගත හැක)</span>
                            </label>
                            <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer" 
                                    {...register('canBeManufactured')} 
                                />
                                <span>Can be manufactured (නිෂ්පාදනය කළ හැක)</span>
                            </label>
                        </div>

                        <div>
                            <Textarea
                                label="Description & Technical Specs"
                                rows={2}
                                placeholder="Optional specifications, dimensions, material grade or description..."
                                error={errors.description?.message}
                                {...register('description')}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Changes will update real-time stock levels and alert trackers</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Button variant="outline" onClick={onClose} type="button" disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" loading={isLoading} className="px-5 font-semibold">
                            {isEdit ? 'Update Product' : 'Save & Create Product'}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}