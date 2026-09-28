import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, History, Eye, X, Package, Calendar, User, FileText, ArrowRight } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import DateRangeFilter from '../components/ui/DateRangeFilter';
import Modal from '../components/ui/Modal';

import { useStockMovements } from '../features/stock/useStock';
import { useWarehouses } from '../features/warehouses/useWarehouses';

const movementTypeLabels = {
    opening_stock: 'Opening Stock',
    purchase_receipt: 'Purchase',
    sale_dispatch: 'Sale',
    sale_return: 'Return',
    transfer_out: 'Transfer Out',
    transfer_in: 'Transfer In',
    adjustment_in: 'Adjustment (+)',
    adjustment_out: 'Adjustment (−)',
    damage: 'Damage',
    cancellation_restock: 'Restock (Cancelled Invoice)',
};

const directionVariant = {
    in: 'success',
    out: 'warning',
};

export default function StockMovementsPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        search: '', movementType: '', warehouseId: '', startDate: '', endDate: '',
        page: 1, limit: 25,
    });

    const [selectedMovement, setSelectedMovement] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const { data, isLoading } = useStockMovements(filters);
    const { data: warehousesData } = useWarehouses();

    const movements = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));

    const fmt = (n) => new Intl.NumberFormat('en-LK').format(n || 0);
    const fmtCurrency = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleString('en-LK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const columns = [
        {
            key: 'movementNumber', label: 'Ref #', width: '120px',
            render: (r) => <span className="font-mono text-xs font-bold text-gray-800">{r.movementNumber}</span>,
        },
        {
            key: 'timestamp', label: 'Date',
            render: (r) => <span className="text-xs text-gray-600">{fmtDate(r.timestamp)}</span>,
        },
        {
            key: 'product', label: 'Product',
            render: (r) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">{r.productName}</p>
                    {(r.productId?.sinhalaName || r.sinhalaName) && (
                        <p className="text-xs font-medium text-emerald-700">{r.productId?.sinhalaName || r.sinhalaName}</p>
                    )}
                    <p className="text-xs text-gray-400 font-mono">{r.productCode}</p>
                </div>
            ),
        },
        {
            key: 'type', label: 'Type',
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <Badge variant={directionVariant[r.direction]}>{r.direction.toUpperCase()}</Badge>
                    <span className="text-xs font-medium text-gray-700">{movementTypeLabels[r.movementType] || r.movementType}</span>
                </div>
            ),
        },
        {
            key: 'qty', label: 'Qty',
            render: (r) => (
                <span className={`font-bold font-mono ${r.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {r.direction === 'in' ? '+' : '−'}{fmt(r.quantity)} {r.unitOfMeasure}
                </span>
            ),
        },
        {
            key: 'warehouse', label: 'Warehouse',
            render: (r) => {
                if (r.movementType === 'transfer_out') return `${r.warehouseId?.name} → …`;
                if (r.movementType === 'transfer_in') return `… → ${r.warehouseId?.name}`;
                return r.warehouseId?.name || '—';
            },
        },
        {
            key: 'balance', label: 'Balance',
            render: (r) => <span className="text-sm font-mono font-semibold">{fmt(r.balanceAfter)}</span>,
        },
        {
            key: 'ref', label: 'Source Ref',
            render: (r) => r.sourceDocument?.number ? (
                <span className="text-xs font-mono text-indigo-600 font-semibold">{r.sourceDocument.number}</span>
            ) : <span className="text-gray-400">—</span>,
        },
        {
            key: 'actions', label: 'Action', width: '90px',
            render: (r) => (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setSelectedMovement(r);
                        setIsViewModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold"
                >
                    <Eye size={13} /> View
                </Button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Stock Movements"
                description="Complete audit trail of every stock change across warehouses"
                actions={<Button variant="outline" onClick={() => navigate('/stock')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back to Stock Overview
                </Button>}
            />

            <Card>
                {/* Search Bar + Filters + Date Range */}
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search product, code, ref #..."
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
                        />
                    </div>

                    {/* Movement Type */}
                    <div className="w-full sm:w-48">
                        <Select
                            placeholder="All Types"
                            options={Object.entries(movementTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                            value={filters.movementType}
                            onChange={(e) => setFilters((f) => ({ ...f, movementType: e.target.value, page: 1 }))}
                        />
                    </div>

                    {/* Warehouse */}
                    <div className="w-full sm:w-48">
                        <Select
                            placeholder="All Warehouses"
                            options={warehouseOptions}
                            value={filters.warehouseId}
                            onChange={(e) => setFilters((f) => ({ ...f, warehouseId: e.target.value, page: 1 }))}
                        />
                    </div>

                    {/* Date Range Filter */}
                    <DateRangeFilter
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onStartDateChange={(val) => setFilters((f) => ({ ...f, startDate: val, page: 1 }))}
                        onEndDateChange={(val) => setFilters((f) => ({ ...f, endDate: val, page: 1 }))}
                        onClear={() => setFilters((f) => ({ ...f, startDate: '', endDate: '', page: 1 }))}
                    />
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading stock movements...</div>
                ) : movements.length === 0 ? (
                    <EmptyState icon={History} title="No movements found" description="Stock movements appear here as inventory changes happen" />
                ) : (
                    <>
                        <Table columns={columns} data={movements} />
                        <Pagination
                            page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>

            {/* View Movement Detail Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title={`Stock Movement Details — ${selectedMovement?.movementNumber || ''}`}
                size="md"
            >
                {selectedMovement && (
                    <div className="p-5 space-y-4 text-xs">
                        {/* Status Header Strip */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Movement Type</span>
                                <span className="text-sm font-black text-gray-900">
                                    {movementTypeLabels[selectedMovement.movementType] || selectedMovement.movementType}
                                </span>
                            </div>
                            <div className="text-right">
                                <Badge variant={directionVariant[selectedMovement.direction]}>
                                    {selectedMovement.direction?.toUpperCase()} BOUND
                                </Badge>
                                <span className="block text-[11px] font-mono text-gray-500 mt-1">
                                    {fmtDate(selectedMovement.timestamp)}
                                </span>
                            </div>
                        </div>

                        {/* Product & Quantity Box */}
                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-bold text-sm text-gray-900">{selectedMovement.productName}</p>
                                    {(selectedMovement.productId?.sinhalaName || selectedMovement.sinhalaName) && (
                                        <p className="text-xs font-medium text-emerald-700">{selectedMovement.productId?.sinhalaName || selectedMovement.sinhalaName}</p>
                                    )}
                                    <p className="font-mono text-xs text-indigo-700">{selectedMovement.productCode}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-gray-500">Quantity Changed</p>
                                    <p className={`text-lg font-black font-mono ${selectedMovement.direction === 'in' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {selectedMovement.direction === 'in' ? '+' : '−'}{fmt(selectedMovement.quantity)} {selectedMovement.unitOfMeasure}
                                    </p>
                                </div>
                            </div>

                            {/* Balances Before & After */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-200/50">
                                <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                    <span className="text-[10px] text-gray-500 block">Balance Before</span>
                                    <span className="text-xs font-mono font-bold text-gray-700">
                                        {fmt(selectedMovement.balanceBefore)} {selectedMovement.unitOfMeasure}
                                    </span>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                    <span className="text-[10px] text-gray-500 block">Balance After</span>
                                    <span className="text-xs font-mono font-black text-emerald-700">
                                        {fmt(selectedMovement.balanceAfter)} {selectedMovement.unitOfMeasure}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Detail Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400 block">Warehouse</span>
                                <p className="font-bold text-gray-800">
                                    {selectedMovement.warehouseId?.name || selectedMovement.fromWarehouseId?.name || 'Primary Warehouse'}
                                </p>
                                {selectedMovement.warehouseId?.warehouseCode && (
                                    <p className="font-mono text-[11px] text-gray-400">Code: {selectedMovement.warehouseId.warehouseCode}</p>
                                )}
                            </div>

                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400 block">Source Reference</span>
                                <p className="font-bold text-indigo-700 font-mono">
                                    {selectedMovement.sourceDocument?.number || 'Manual / None'}
                                </p>
                                {selectedMovement.sourceDocument?.type && (
                                    <p className="text-[11px] text-gray-500 capitalize">{selectedMovement.sourceDocument.type.replace('_', ' ')}</p>
                                )}
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                            {selectedMovement.batchNumber && (
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Batch Number</span>
                                    <p className="font-mono font-semibold text-gray-800">{selectedMovement.batchNumber}</p>
                                </div>
                            )}

                            <div>
                                <span className="text-[10px] uppercase font-bold text-gray-400 block">Notes / Reason</span>
                                <p className="text-gray-700 italic">{selectedMovement.notes || selectedMovement.reason || 'No additional remarks provided'}</p>
                            </div>

                            {selectedMovement.performedBy && (
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500">
                                    <span>Performed By:</span>
                                    <span className="font-semibold text-gray-800">
                                        {selectedMovement.performedBy.firstName} {selectedMovement.performedBy.lastName || ''}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button variant="primary" onClick={() => setIsViewModalOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}