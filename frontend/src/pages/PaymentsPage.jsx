import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft, ArrowRight, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { usePayments } from '../features/payments/usePayments';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';

const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

const directionVariant = {
    received: 'success',
    paid: 'info',
};

const methodLabels = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    card: 'Card',
    mobile_payment: 'Mobile Payment',
};

function PaymentsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { hasPermission, isAdmin } = usePermission();
    const canCreate = isAdmin || hasPermission('payments.manage') || ['admin', 'manager', 'accountant'].includes(user?.role);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [search, setSearch] = useState('');
    const [direction, setDirection] = useState('');
    const [method, setMethod] = useState('');

    const { data, isLoading, error } = usePayments({
        page,
        limit,
        search,
        direction,
		method,
    });

    const payments = data?.data || [];
    const totalPages = data?.pagination?.totalPages || 1;
    const total = data?.pagination?.total || 0;

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const columns = [
        {
            key: 'paymentNumber',
            label: 'Payment #',
            render: (row) => (
                <span className="font-medium text-gray-900">{row.paymentNumber || 'N/A'}</span>
            ),
        },
        {
            key: 'paymentDate',
            label: 'Date',
            render: (row) => fmtDate(row.paymentDate),
        },
        {
            key: 'partyName',
            label: 'Party',
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.partyName || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{row.customerId?.customerCode || row.supplierId?.supplierCode || ''}</p>
                </div>
            ),
        },
        {
            key: 'direction',
            label: 'Direction',
            render: (row) => (
                <Badge variant={directionVariant[row.direction] || 'default'}>
                    {row.direction === 'received' ? 'Money In' : 'Money Out'}
                </Badge>
            ),
        },
        {
            key: 'method',
            label: 'Method',
            render: (row) => methodLabels[row.method] || row.method || 'N/A',
        },
        {
            key: 'amount',
            label: 'Amount',
            render: (row) => (
                <span className="font-semibold text-gray-900">{fmt(row.amount)}</span>
            ),
        },
        {
            key: 'reference',
            label: 'Reference',
            render: (row) => row.transactionReference || row.chequeNumber || '-',
        },
    ];

    return (
        <div>
            <PageHeader
                title="Payments"
                description={`Total ${total} payments`}
                actions={
                    canCreate && (
                        <Button onClick={() => navigate('/payments/new')}>
                            <Plus size={16} className="mr-1.5" /> New Payment
                        </Button>
                    )
                }
            />

            <Card>
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by payment number, party name..."
                                value={search}
                                onChange={handleSearch}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <Select
                            value={direction}
                            onChange={(e) => { setDirection(e.target.value); setPage(1); }}
                            className="w-full sm:w-40"
                        >
                            <option value="">All Directions</option>
                            <option value="received">Money In</option>
                            <option value="paid">Money Out</option>
                        </Select>
                        <Select
                            value={method}
                            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
                            className="w-full sm:w-40"
                        >
                            <option value="">All Methods</option>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="card">Card</option>
                            <option value="mobile_payment">Mobile Payment</option>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading payments...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">Error loading payments: {error.message}</div>
                ) : payments.length === 0 ? (
                    <EmptyState
                        icon={<ArrowLeft size={40} />}
                        title="No payments found"
                        description={search ? 'Try adjusting your search or filters' : 'Get started by creating your first payment'}
                        action={
                            canCreate && (
                                <Button onClick={() => navigate('/payments/new')}>
                                    <Plus size={16} className="mr-1.5" /> New Payment
                                </Button>
                            )
                        }
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table
                                columns={columns}
                                data={payments}
                                onRowClick={(row) => navigate(`/payments/${row._id}`)}
                            />
                        </div>
                        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} payments
                            </p>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}

export default PaymentsPage;
