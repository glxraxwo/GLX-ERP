import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, ArrowLeft, RefreshCw, ShoppingCart, Sliders,
    Search, Filter, Download, Package, ShieldAlert, AlertCircle,
    CheckCircle2, Edit3, ArrowRight, ExternalLink, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useLowStockReport } from '../../features/reports/useReports';
import ProductFormModal from '../../features/products/ProductFormModal';
import { useProduct } from '../../features/products/useProducts';

export default function LowStockReportPage() {
    const navigate = useNavigate();
    const { data, isLoading, refetch, isFetching } = useLowStockReport();
    const items = data?.data || [];

    // State for filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, out_of_stock, critical, low_stock
    const [typeFilter, setTypeFilter] = useState('all');
    
    // State for quick edit modal
    const [editingProduct, setEditingProduct] = useState(null);

    // Filter items
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = 
                !searchTerm ||
                (item.productName && item.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.sinhalaName && item.sinhalaName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.productCode && item.productCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.categoryName && item.categoryName.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesType = typeFilter === 'all' || item.productType === typeFilter;

            let matchesStatus = true;
            if (statusFilter === 'out_of_stock') {
                matchesStatus = (item.available || 0) <= 0;
            } else if (statusFilter === 'critical') {
                matchesStatus = item.isCritical && (item.available || 0) > 0;
            } else if (statusFilter === 'low_stock') {
                matchesStatus = !item.isCritical && (item.available || 0) > 0;
            }

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [items, searchTerm, statusFilter, typeFilter]);

    // Summary Statistics
    const metrics = useMemo(() => {
        const totalAlerts = items.length;
        const outOfStock = items.filter(i => (i.available || 0) <= 0).length;
        const critical = items.filter(i => i.isCritical && (i.available || 0) > 0).length;
        const totalDeficit = items.reduce((sum, i) => sum + (Number(i.shortage) || 0), 0);
        const estimatedRestockValue = items.reduce((sum, i) => {
            const cost = Number(i.cost) || Number(i.basePrice) || 0;
            const shortage = Number(i.shortage) || 0;
            return sum + (shortage * cost);
        }, 0);

        return {
            totalAlerts,
            outOfStock,
            critical,
            totalDeficit,
            estimatedRestockValue,
        };
    }, [items]);

    // CSV Export
    const handleExportCSV = () => {
        if (filteredItems.length === 0) {
            toast.error('No records to export');
            return;
        }

        const headers = ['Product Code', 'Product Name', 'Sinhala Name', 'SKU', 'Category', 'Type', 'Available', 'On Hand', 'Reserved', 'Min Threshold', 'Shortage', 'UOM', 'Estimated Cost (LKR)'];
        const rows = filteredItems.map(item => [
            `"${item.productCode || ''}"`,
            `"${(item.productName || '').replace(/"/g, '""')}"`,
            `"${(item.sinhalaName || '').replace(/"/g, '""')}"`,
            `"${item.sku || ''}"`,
            `"${item.categoryName || ''}"`,
            `"${item.productType || ''}"`,
            item.available ?? 0,
            item.onHand ?? 0,
            item.reserved ?? 0,
            item.effectiveThreshold ?? item.reorderLevel ?? item.minimumLevel ?? 0,
            item.shortage ?? 0,
            `"${item.unitOfMeasure || 'units'}"`,
            ((item.shortage || 0) * (item.cost || item.basePrice || 0)).toFixed(2)
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `low_stock_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Low stock report exported to CSV');
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Top Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/60 text-red-600 flex items-center justify-center font-bold shadow-xs">
                            <AlertTriangle size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-gray-800">
                                Low Stock Inventory Alerts (අඩු තොග පාලනය)
                            </h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                Real-time monitoring of products reaching or falling below configured minimum quantities
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetch()} 
                        disabled={isLoading || isFetching}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-white"
                    >
                        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-white text-gray-700"
                    >
                        <Download size={14} />
                        Export CSV
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => navigate('/stock/adjustment')}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                    >
                        <Sliders size={14} />
                        Stock Adjustment
                    </Button>
                    <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => navigate('/purchase-orders/new')}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        <ShoppingCart size={14} />
                        Create Purchase Order
                    </Button>
                </div>
            </div>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Alerts */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Low Stock Items</p>
                        <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl font-black text-gray-900">{metrics.totalAlerts}</span>
                            <span className="text-xs font-medium text-gray-500">products</span>
                        </div>
                        <p className="text-[11px] text-amber-700 font-medium mt-1">Below minimum threshold</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                </div>

                {/* Out of Stock */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Out of Stock (ශුන්‍ය තොග)</p>
                        <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl font-black text-red-600">{metrics.outOfStock}</span>
                            <span className="text-xs font-semibold text-red-500">items (0 qty)</span>
                        </div>
                        <p className="text-[11px] text-red-600 font-medium mt-1">Immediate reorder required</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
                        <ShieldAlert size={24} />
                    </div>
                </div>

                {/* Units Needed */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Units Shortage</p>
                        <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl font-black text-indigo-600">{metrics.totalDeficit.toLocaleString()}</span>
                            <span className="text-xs font-medium text-gray-500">units needed</span>
                        </div>
                        <p className="text-[11px] text-indigo-600 font-medium mt-1">To reach target levels</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                        <Package size={24} />
                    </div>
                </div>

                {/* Estimated Restock Value */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Est. Restock Value</p>
                        <div className="flex items-baseline gap-1 mt-1.5">
                            <span className="text-xs font-semibold text-gray-500">Rs.</span>
                            <span className="text-2xl font-black text-emerald-600">
                                {metrics.estimatedRestockValue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-medium mt-1">Calculated at standard cost</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                        <ShoppingCart size={24} />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search product, sinhala name, SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            All ({items.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('out_of_stock')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'out_of_stock' ? 'bg-red-600 text-white shadow-xs' : 'text-red-600 hover:bg-red-50'}`}
                        >
                            Out of Stock ({metrics.outOfStock})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('critical')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'critical' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'}`}
                        >
                            Critical ({metrics.critical})
                        </button>
                    </div>

                    {/* Product Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        <option value="all">All Product Types</option>
                        <option value="raw_material">Raw Materials</option>
                        <option value="finished_good">Finished Goods</option>
                        <option value="consumable">Consumables</option>
                        <option value="service">Services</option>
                    </select>
                </div>
            </div>

            {/* Main Table Content */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                {isLoading ? (
                    <div className="p-16 text-center text-gray-500 space-y-3">
                        <RefreshCw size={28} className="animate-spin text-blue-600 mx-auto" />
                        <p className="text-sm font-medium">Scanning inventory levels & calculating minimum thresholds...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">All Stock Levels Are Healthy!</h3>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                                ? 'No products match your current search/filter criteria.'
                                : 'No products are currently at or below their configured minimum quantity / reorder level.'}
                        </p>
                        {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); }}
                            >
                                Clear All Filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Product / Item Name</th>
                                    <th className="py-3.5 px-4">Code / SKU</th>
                                    <th className="py-3.5 px-4">Category</th>
                                    <th className="py-3.5 px-4 text-center">Available Stock</th>
                                    <th className="py-3.5 px-4 text-center">Min Threshold (අවමය)</th>
                                    <th className="py-3.5 px-4 text-center">Deficit (හිඟය)</th>
                                    <th className="py-3.5 px-4 text-center">Stock Status</th>
                                    <th className="py-3.5 px-4 text-right">Quick Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-blue-100/50 text-sm">
                                {filteredItems.map((item, idx) => {
                                    const available = item.available ?? 0;
                                    const minThreshold = item.effectiveThreshold ?? item.reorderLevel ?? item.minimumLevel ?? 10;
                                    const shortage = item.shortage ?? Math.max(0, minThreshold - available);
                                    const isOut = available <= 0;
                                    const uom = item.unitOfMeasure || 'units';

                                    // Stock level percentage compared to threshold
                                    const stockPercentage = minThreshold > 0 
                                        ? Math.min(100, Math.max(0, (available / minThreshold) * 100))
                                        : 0;

                                    const isEven = idx % 2 === 1;
                                    return (
                                        <tr key={item.productId || item._id} className={`${isEven ? 'bg-blue-50/40' : 'bg-white'} hover:bg-blue-100/60 transition group`}>
                                            {/* Product Details */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-gray-900 leading-snug">
                                                    {item.productName || item.name}
                                                </div>
                                                {item.sinhalaName && (
                                                    <div className="text-xs text-gray-500 font-sans mt-0.5">
                                                        {item.sinhalaName}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Code & SKU */}
                                            <td className="py-3.5 px-4">
                                                <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                                                    {item.productCode}
                                                </span>
                                                {item.sku && (
                                                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                        SKU: {item.sku}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Category & Type */}
                                            <td className="py-3.5 px-4">
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {item.categoryName || 'General'}
                                                </span>
                                                <div className="text-[11px] text-gray-400 capitalize">
                                                    {(item.productType || 'Product').replace(/_/g, ' ')}
                                                </div>
                                            </td>

                                            {/* Available Stock */}
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <span className={`text-base font-black ${isOut ? 'text-red-600' : 'text-amber-700'}`}>
                                                        {available.toLocaleString()} <span className="text-xs font-medium text-gray-500">{uom}</span>
                                                    </span>
                                                    {/* Health Bar */}
                                                    <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all ${isOut ? 'bg-red-600 w-0' : 'bg-amber-500'}`}
                                                            style={{ width: `${stockPercentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Min Threshold */}
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 text-xs">
                                                    {minThreshold} {uom}
                                                </span>
                                            </td>

                                            {/* Shortage / Units Needed */}
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 font-extrabold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg text-xs">
                                                    +{shortage.toLocaleString()} {uom}
                                                </span>
                                            </td>

                                            {/* Stock Status Badge */}
                                            <td className="py-3.5 px-4 text-center">
                                                {isOut ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
                                                        <ShieldAlert size={12} /> Out of Stock (ශුන්‍යයි)
                                                    </span>
                                                ) : item.isCritical ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                                                        <AlertCircle size={12} /> Critical Low
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                                                        <AlertTriangle size={12} /> Low Stock (අඩුයි)
                                                    </span>
                                                )}
                                            </td>

                                            {/* Quick Actions */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingProduct({
                                                                _id: item.productId,
                                                                productCode: item.productCode,
                                                                name: item.productName,
                                                                sinhalaName: item.sinhalaName,
                                                                sku: item.sku,
                                                                barcode: item.barcode,
                                                                productType: item.productType,
                                                                unitOfMeasure: item.unitOfMeasure,
                                                                basePrice: item.basePrice,
                                                                costs: { standardCost: item.cost },
                                                                stockLevels: {
                                                                    minimumLevel: item.minimumLevel,
                                                                    reorderLevel: item.reorderLevel || item.effectiveThreshold,
                                                                },
                                                                categoryId: item.categoryId,
                                                                brandId: item.brandId,
                                                                quantities: { onHand: item.onHand }
                                                            });
                                                        }}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                                        title="Edit Minimum Quantity Threshold"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>

                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => navigate(`/purchase-orders/new?productId=${item.productId}`)}
                                                        className="text-xs font-bold py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                                                    >
                                                        <span>Order</span>
                                                        <ArrowRight size={12} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Product Threshold Edit Modal */}
            {editingProduct && (
                <ProductFormModal
                    isOpen={!!editingProduct}
                    onClose={() => {
                        setEditingProduct(null);
                        refetch();
                    }}
                    product={editingProduct}
                />
            )}
        </div>
    );
}