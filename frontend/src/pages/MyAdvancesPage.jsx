import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useMyAdvanceLedger } from '../features/hr/useHr';

const statusVariant = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    paid: 'info',
};

export default function MyAdvancesPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ status: '', page: 1, limit: 20 });
    
    const { data, isLoading } = useMyAdvanceLedger(filters);
    const advances = data?.data?.advances || [];
    const total = data?.data?.ledger?.length || 0;
    const totalPages = Math.ceil(total / filters.limit);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const columns = [
        {
            key: 'date',
            label: 'Date',
            render: (row) => new Date(row.date).toLocaleDateString('en-LK'),
        },
        {
            key: 'amount',
            label: 'Amount',
            render: (row) => (
                <span className="font-semibold text-gray-900">{formatCurrency(row.amount)}</span>
            ),
        },
        {
            key: 'type',
            label: 'Type',
            render: (row) => (
                <span className="text-sm capitalize">
                    {row.advanceType === 'percentage' 
                        ? `${row.requestedPercentage}%` 
                        : 'Fixed Amount'}
                </span>
            ),
        },
        {
            key: 'reason',
            label: 'Reason',
            render: (row) => (
                <span className="text-sm text-gray-600 max-w-xs truncate block" title={row.reason}>
                    {row.reason || '-'}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <Badge variant={statusVariant[row.status] || 'default'}>
                    {row.status}
                </Badge>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div className="flex gap-2">
                    {row.status === 'approved' && !row.isDeducted && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* Navigate to payment details */}}
                        >
                            View Details
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="My Salary Advances"
                description="Track your advance requests and status"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button onClick={() => navigate('/request-advance')}>
                            <Plus size={16} className="mr-1.5" /> New Request
                        </Button>
                    </div>
                }
            />

            <Card>
                <div className="p-4 border-b flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <select
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading advances...</div>
                ) : advances.length === 0 ? (
                    <EmptyState
                        icon={<Plus size={40} />}
                        title="No advance requests"
                        description="You haven't made any advance requests yet"
                        action={
                            <Button onClick={() => navigate('/request-advance')}>
                                <Plus size={16} className="mr-1.5" /> Request Advance
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <Table columns={columns} data={advances} />
                        <div className="p-4 border-t flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, total)} of {total} advances
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={filters.page === 1}
                                    onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={filters.page === totalPages}
                                    onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}