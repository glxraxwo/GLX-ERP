import { useState } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { useSalaryAdvances, useAdvanceActions } from '../features/hr/useHr';

const statusVariant = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    paid: 'info',
};

export default function AdminAdvanceApprovalsPage() {
    const [filters, setFilters] = useState({ status: 'pending', search: '', page: 1, limit: 20 });
    const [selectedAdvance, setSelectedAdvance] = useState(null);
    const [actionModal, setActionModal] = useState(null); // 'approve' or 'decline'
    const [notes, setNotes] = useState('');

    const { data, isLoading, refetch } = useSalaryAdvances(filters);
    const advanceActions = useAdvanceActions();

    const advances = data?.data || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / filters.limit);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const handleApprove = async () => {
        try {
            await advanceActions.approve.mutateAsync({
                id: selectedAdvance._id,
                approvalNotes: notes,
            });
            toast.success('Advance approved successfully');
            setActionModal(null);
            setSelectedAdvance(null);
            setNotes('');
            refetch();
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleDecline = async () => {
        try {
            await advanceActions.decline.mutateAsync({
                id: selectedAdvance._id,
                rejectedReason: notes,
            });
            toast.success('Advance declined successfully');
            setActionModal(null);
            setSelectedAdvance(null);
            setNotes('');
            refetch();
        } catch (error) {
            // Error handled by mutation
        }
    };

    const openActionModal = (advance, action) => {
        setSelectedAdvance(advance);
        setActionModal(action);
        setNotes('');
    };

    const closeActionModal = () => {
        setActionModal(null);
        setSelectedAdvance(null);
        setNotes('');
    };

    return (
        <div>
            <PageHeader
                title="Salary Advance Approvals"
                description="Manage employee advance requests"
            />

            <Card>
                <div className="p-4 border-b flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by employee name..."
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-full sm:w-40">
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
                        icon={<Filter size={40} />}
                        title="No advance requests found"
                        description={filters.status || filters.search ? 'Try adjusting your filters' : 'No pending advance requests'}
                    />
                ) : (
                    <div className="divide-y">
                        {advances.map((advance) => (
                            <div key={advance._id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-semibold text-gray-900">
                                                {advance.employeeId?.firstName} {advance.employeeId?.lastName}
                                            </h4>
                                            <Badge variant={statusVariant[advance.status] || 'default'}>
                                                {advance.status}
                                            </Badge>
                                            <span className="text-xs text-gray-500">
                                                {advance.employeeId?.employeeCode}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs">Amount</p>
                                                <p className="font-semibold text-gray-900">{formatCurrency(advance.amount)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Type</p>
                                                <p className="text-gray-900 capitalize">
                                                    {advance.advanceType === 'percentage' 
                                                        ? `${advance.requestedPercentage}% of salary` 
                                                        : 'Fixed Amount'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Request Date</p>
                                                <p className="text-gray-900">{new Date(advance.date).toLocaleDateString('en-LK')}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Monthly Salary</p>
                                                <p className="text-gray-900">{formatCurrency(advance.employeeId?.basicSalary || 0)}</p>
                                            </div>
                                        </div>

                                        {advance.reason && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                                <p className="text-gray-500 text-xs">Reason:</p>
                                                <p className="text-gray-700">{advance.reason}</p>
                                            </div>
                                        )}

                                        {advance.status === 'approved' && advance.approvalNotes && (
                                            <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                                                <p className="text-green-600 text-xs">Approval Notes:</p>
                                                <p className="text-green-800">{advance.approvalNotes}</p>
                                            </div>
                                        )}

                                        {advance.status === 'rejected' && advance.rejectedReason && (
                                            <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                                                <p className="text-red-600 text-xs">Rejection Reason:</p>
                                                <p className="text-red-800">{advance.rejectedReason}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {advance.status === 'pending' && (
                                            <>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => openActionModal(advance, 'approve')}
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <CheckCircle size={14} className="mr-1" /> Approve
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => openActionModal(advance, 'decline')}
                                                >
                                                    <XCircle size={14} className="mr-1" /> Decline
                                                </Button>
                                            </>
                                        )}
                                        {advance.status === 'approved' && !advance.isDeducted && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => {/* Navigate to payment processing */}}
                                            >
                                                Process Payment
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
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
                )}
            </Card>

            {/* Approve Modal */}
            <Modal
                isOpen={actionModal === 'approve'}
                onClose={closeActionModal}
                title="Approve Salary Advance"
                size="md"
            >
                {selectedAdvance && (
                    <div className="p-6 space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={18} className="text-blue-600" />
                                <span className="font-semibold text-blue-900">Advance Details</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <p><strong>Employee:</strong> {selectedAdvance.employeeId?.firstName} {selectedAdvance.employeeId?.lastName}</p>
                                <p><strong>Amount:</strong> {formatCurrency(selectedAdvance.amount)}</p>
                                <p><strong>Type:</strong> {selectedAdvance.advanceType === 'percentage' ? `${selectedAdvance.requestedPercentage}%` : 'Fixed Amount'}</p>
                                <p><strong>Reason:</strong> {selectedAdvance.reason}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Approval Notes (Optional)
                            </label>
                            <textarea
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes for this approval..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={closeActionModal}>
                                Cancel
                            </Button>
                            <Button
                                variant="success"
                                onClick={handleApprove}
                                loading={advanceActions.approve.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <CheckCircle size={16} className="mr-1.5" /> Approve Advance
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Decline Modal */}
            <Modal
                isOpen={actionModal === 'decline'}
                onClose={closeActionModal}
                title="Decline Salary Advance"
                size="md"
            >
                {selectedAdvance && (
                    <div className="p-6 space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={18} className="text-red-600" />
                                <span className="font-semibold text-red-900">Advance Details</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <p><strong>Employee:</strong> {selectedAdvance.employeeId?.firstName} {selectedAdvance.employeeId?.lastName}</p>
                                <p><strong>Amount:</strong> {formatCurrency(selectedAdvance.amount)}</p>
                                <p><strong>Reason:</strong> {selectedAdvance.reason}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rejection Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Please provide a reason for declining this advance request..."
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={closeActionModal}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDecline}
                                loading={advanceActions.decline.isPending}
                            >
                                <XCircle size={16} className="mr-1.5" /> Decline Advance
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}