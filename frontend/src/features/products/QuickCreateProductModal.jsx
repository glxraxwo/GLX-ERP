import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateProduct } from './useProducts';
import { useCategories, useUoms } from './useProducts';
import { generateSinhalaProductName } from '../../utils/translationService';

/**
 * Quick modal for creating a product on the fly during PO/SO creation.
 * Captures only essentials. Full edit later.
 */
export default function QuickCreateProductModal({
    isOpen, onClose, onCreated,
    defaultProductType = 'finished_good', // 'raw_material' for PO, 'finished_good' for SO
}) {
    const [form, setForm] = useState({
        name: '',
        sinhalaName: '',
        productType: defaultProductType,
        categoryId: '',
        unitOfMeasure: 'pcs',
        basePrice: 0,
        purchasePrice: 0,
        canBeSold: defaultProductType !== 'raw_material',
        canBePurchased: true,
    });
    const [isGeneratingSinhala, setIsGeneratingSinhala] = useState(false);

    const createMutation = useCreateProduct();
    const { data: categoriesData } = useCategories({ isActive: 'true' });
    const { data: uomsData } = useUoms();

    const categoryOptions = (categoriesData?.data || []).map((c) => ({ value: c._id, label: c.name }));
    const uomOptions = (uomsData?.data || []).map((u) => ({ value: u.code, label: `${u.name} (${u.code})` }));

    const handleAutoGenerateSinhala = async () => {
        if (!form.name?.trim()) {
            toast.error('Please enter English Product Name first');
            return;
        }
        setIsGeneratingSinhala(true);
        try {
            const sinhala = await generateSinhalaProductName(form.name);
            if (sinhala) {
                setForm(f => ({ ...f, sinhalaName: sinhala }));
                toast.success(`Sinhala name generated: ${sinhala}`);
            } else {
                toast.error('Could not generate Sinhala translation');
            }
        } catch (err) {
            toast.error('Failed to generate Sinhala name');
        } finally {
            setIsGeneratingSinhala(false);
        }
    };

    const submit = async () => {
        if (!form.name) { toast.error('Product name required'); return; }

        try {
            const result = await createMutation.mutateAsync({
                name: form.name,
                sinhalaName: form.sinhalaName?.trim() || undefined,
                productType: form.productType,
                categoryId: form.categoryId || undefined,
                unitOfMeasure: form.unitOfMeasure,
                basePrice: +form.basePrice || 0,
                costs: {
                    lastPurchaseCost: +form.purchasePrice || 0,
                    averageCost: +form.purchasePrice || 0,
                },
                canBeSold: form.canBeSold,
                canBePurchased: form.canBePurchased,
                canBeManufactured: false,
                tax: { taxable: true, taxRate: 18 },
                status: 'active',
            });

            setForm({
                name: '', sinhalaName: '', productType: defaultProductType, categoryId: '',
                unitOfMeasure: 'pcs', basePrice: 0, purchasePrice: 0,
                canBeSold: defaultProductType !== 'raw_material', canBePurchased: true,
            });

            toast.success('Product created — complete pricing/stock from Products page');
            onCreated?.(result.data);
            onClose();
        } catch { }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Create Product" size="md">
            <div className="p-6 space-y-4">
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    Capture essentials now. You can add full pricing tiers, stock levels, BOM, and images from the Products page.
                </p>

                <div className="space-y-3">
                    <Input label="Product Name (English)" required placeholder="e.g., Plywood / Marine Sheet"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Sinhala Name (සිංහල නම)
                            </label>
                            <button
                                type="button"
                                onClick={handleAutoGenerateSinhala}
                                disabled={isGeneratingSinhala || !form.name?.trim()}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                                title="Generate Sinhala translation automatically"
                            >
                                <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isGeneratingSinhala ? 'animate-spin' : ''}`} />
                                {isGeneratingSinhala ? 'Generating...' : 'Auto-Generate (සිංහලෙන් ජනනය)'}
                            </button>
                        </div>
                        <Input
                            placeholder="e.g., ලෑලි / මැරීන් ලෑලි"
                            value={form.sinhalaName}
                            onChange={(e) => setForm((f) => ({ ...f, sinhalaName: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Select label="Type"
                        options={[
                            { value: 'finished_good', label: 'Finished Good (sellable)' },
                            { value: 'raw_material', label: 'Raw Material' },
                            { value: 'packaging', label: 'Packaging' },
                            { value: 'consumable', label: 'Consumable' },
                            { value: 'service', label: 'Service' },
                        ]}
                        value={form.productType}
                        onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => ({
                                ...f, productType: v,
                                canBeSold: v !== 'raw_material',
                            }));
                        }} />
                    <Select label="Unit of Measure" required options={uomOptions}
                        value={form.unitOfMeasure}
                        onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))} />
                </div>

                <Select label="Category" placeholder="Uncategorized" options={categoryOptions}
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />

                <div className="grid grid-cols-2 gap-3">
                    <Input label="Selling Price (LKR)" type="number" step="0.01" min="0"
                        value={form.basePrice}
                        onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
                    <Input label="Purchase Cost (LKR)" type="number" step="0.01" min="0"
                        value={form.purchasePrice}
                        onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))} />
                </div>

                <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.canBeSold}
                            onChange={(e) => setForm((f) => ({ ...f, canBeSold: e.target.checked }))} />
                        Can be sold
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.canBePurchased}
                            onChange={(e) => setForm((f) => ({ ...f, canBePurchased: e.target.checked }))} />
                        Can be purchased
                    </label>
                </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={submit} loading={createMutation.isPending}>
                    Create Product
                </Button>
            </div>
        </Modal>
    );
}