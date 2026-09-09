import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, AlertCircle, Info, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { useMyProfile, useCreateSalaryAdvance, useMyAdvanceLedger, useOngoingSalaryPeriod } from '../features/hr/useHr';
import { useAuthStore } from '../store/authStore';

const MAX_ADVANCE_PERCENTAGE = 50; // Maximum 50% of monthly salary as advance

export default function EmployeeAdvanceRequestPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { data: profileData, isLoading: profileLoading } = useMyProfile();
    const { data: ledgerData, isLoading: ledgerLoading } = useMyAdvanceLedger();
    const { data: ongoingPeriodData, isLoading: periodLoading } = useOngoingSalaryPeriod();
    const createAdvance = useCreateSalaryAdvance();

    const [advanceType, setAdvanceType] = useState('percentage'); // 'percentage' or 'amount'
    const [percentage, setPercentage] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    const employee = profileData?.data;
    const ledger = Array.isArray(ledgerData?.data?.ledger) ? ledgerData.data.ledger : (Array.isArray(ledgerData?.data) ? ledgerData.data : []);
    const ongoingPeriod = ongoingPeriodData?.data;
    
    // Calculate pending advances
    const pendingAdvances = ledger.filter(a => a.status === 'pending').reduce((sum, a) => sum + (a.amount || 0), 0);

    // Use ongoing salary period data for calculations
    const ongoingSalary = ongoingPeriod?.advanceLimits?.ongoingSalary || employee?.basicSalary || 0;
    const maxAdvanceAmount = ongoingPeriod?.advanceLimits?.maxAdvanceAmount || 0;
    const alreadyTakenAdvance = ongoingPeriod?.advanceLimits?.alreadyTakenAdvance || 0;
    const remainingAdvanceLimit = ongoingPeriod?.advanceLimits?.remainingAdvanceAmount || 0;
    const salaryPeriod = ongoingPeriod?.salaryPeriod || null;

    // Calculate current request amount
    const calculatedAmount = advanceType === 'percentage' 
        ? (ongoingSalary * (parseFloat(percentage) || 0)) / 100
        : parseFloat(amount) || 0;

    const isValidRequest = calculatedAmount > 0 && calculatedAmount <= remainingAdvanceLimit && reason.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isValidRequest) {
            toast.error('Please check your request details');
            return;
        }

        try {
            await createAdvance.mutateAsync({
                employeeId: employee?._id,
                advanceType: advanceType,
                requestedPercentage: advanceType === 'percentage' ? parseFloat(percentage) : 0,
                calculatedAmount: calculatedAmount,
                amount: calculatedAmount,
                reason: reason,
            });
            navigate('/my-advances');
        } catch (error) {
            console.error('Failed to submit advance request:', error);
            // Error handled by mutation
        }
    };

    if (profileLoading || ledgerLoading || periodLoading) {
        return (
            <div className="py-16 text-center text-gray-500">
                Loading your profile and salary period information...
            </div>
        );
    }

    // Handle case where ongoing period data is not available
    if (!ongoingPeriod) {
        return (
            <div className="py-16 text-center text-gray-500">
                Unable to load salary period information. Please try again later.
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="py-16 text-center text-gray-500">
                Employee profile not found. Please contact HR.
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    return (
        <div>
            <PageHeader
                title="Salary Advance Request"
                description="Request a salary advance (ගෙවීම් ඉදිරියෙන් ගැනීම)"
                actions={
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Advance Information Card */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Info size={18} className="text-blue-600" />
                            Advance Information
                        </h3>
                        
                        {/* Salary Period Information */}
                        {salaryPeriod && (
                            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar size={16} className="text-indigo-600" />
                                    <span className="font-semibold text-indigo-900 text-sm">Ongoing Salary Period</span>
                                </div>
                                <p className="text-sm font-bold text-indigo-800">{salaryPeriod.displayPeriod}</p>
                                <p className="text-xs text-indigo-600 mt-1">
                                    {new Date(salaryPeriod.startDate).toLocaleDateString('en-LK')} - {new Date(salaryPeriod.endDate).toLocaleDateString('en-LK')}
                                </p>
                            </div>
                        )}
                        
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                                <span className="text-gray-600">Ongoing Salary</span>
                                <span className="font-bold text-blue-900">{formatCurrency(ongoingSalary)}</span>
                            </div>
                            
                            <div className="flex justify-between p-3 bg-emerald-50 rounded-lg">
                                <span className="text-gray-600">Max Advance %</span>
                                <span className="font-bold text-emerald-700">{MAX_ADVANCE_PERCENTAGE}%</span>
                            </div>
                            
                            <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                                <span className="text-gray-600">Max Advance Amount</span>
                                <span className="font-bold text-purple-700">{formatCurrency(maxAdvanceAmount)}</span>
                            </div>
                            
                            <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                                <span className="text-gray-600">Already Taken Advance</span>
                                <span className="font-bold text-orange-700">{formatCurrency(alreadyTakenAdvance)}</span>
                            </div>
                            
                            <div className="flex justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200">
                                <span className="text-gray-600 font-semibold">Available Limit</span>
                                <span className="font-bold text-green-700">{formatCurrency(remainingAdvanceLimit)}</span>
                            </div>
                        </div>
                    </Card>

                    {pendingAdvances > 0 && (
                        <Card className="p-4 bg-yellow-50 border-yellow-200">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold text-yellow-900">Pending Requests</p>
                                    <p className="text-yellow-800">
                                        You have {formatCurrency(pendingAdvances)} in pending advance requests waiting for approval.
                                    </p>
                                    {salaryPeriod && (
                                        <p className="text-xs text-yellow-700 mt-1">
                                            For ongoing period: {salaryPeriod.displayPeriod}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    <Card className="p-4 bg-gray-50">
                        <h4 className="font-semibold text-sm mb-2">Recent Advances</h4>
                        {ledger.length === 0 ? (
                            <p className="text-sm text-gray-500">No advance history</p>
                        ) : (
                            <div className="space-y-2">
                                {ledger.slice(0, 3).map((advance) => (
                                    <div key={advance._id} className="flex justify-between items-center text-sm p-2 bg-white rounded">
                                        <div>
                                            <p className="font-medium">{formatCurrency(advance.amount)}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(advance.date).toLocaleDateString('en-LK')}
                                            </p>
                                        </div>
                                        <Badge 
                                            variant={
                                                advance.status === 'approved' ? 'success' : 
                                                advance.status === 'rejected' ? 'danger' : 'warning'
                                            }
                                        >
                                            {advance.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Advance Request Form */}
                <div className="lg:col-span-2">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calculator size={18} className="text-blue-600" />
                            Request Advance
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Advance Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Request Type
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="advanceType"
                                            value="percentage"
                                            checked={advanceType === 'percentage'}
                                            onChange={(e) => setAdvanceType(e.target.value)}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm">By Percentage (%)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="advanceType"
                                            value="amount"
                                            checked={advanceType === 'amount'}
                                            onChange={(e) => setAdvanceType(e.target.value)}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm">By Amount (LKR)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Percentage Input */}
                            {advanceType === 'percentage' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Advance Percentage (max {MAX_ADVANCE_PERCENTAGE}%)
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={MAX_ADVANCE_PERCENTAGE}
                                        step="0.1"
                                        value={percentage}
                                        onChange={(e) => setPercentage(e.target.value)}
                                        placeholder={`Enter percentage (0-${MAX_ADVANCE_PERCENTAGE})`}
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Calculated amount: <span className="font-semibold">{formatCurrency(calculatedAmount)}</span>
                                    </p>
                                </div>
                            )}

                            {/* Amount Input */}
                            {advanceType === 'amount' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Advance Amount (LKR)
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={remainingAdvanceLimit}
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder={`Enter amount (max ${formatCurrency(remainingAdvanceLimit)})`}
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        This is <span className="font-semibold">{((calculatedAmount / ongoingSalary) * 100).toFixed(1)}%</span> of your ongoing salary
                                    </p>
                                </div>
                            )}

                            {/* Validation Warning */}
                            {calculatedAmount > remainingAdvanceLimit && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-red-900">Amount Exceeds Limit</p>
                                        <p className="text-red-800">
                                            Your requested amount exceeds the available limit of {formatCurrency(remainingAdvanceLimit)}.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Reason Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason for Advance
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Please provide a reason for your advance request..."
                                    required
                                />
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold text-sm mb-2">Request Summary</h4>
                                <div className="space-y-1 text-sm">
                                    {salaryPeriod && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Salary Period:</span>
                                            <span className="font-medium text-indigo-900">{salaryPeriod.displayPeriod}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Request Type:</span>
                                        <span className="font-medium capitalize">{advanceType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Request Amount:</span>
                                        <span className="font-bold text-blue-900">{formatCurrency(calculatedAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">After Request:</span>
                                        <span className="font-medium">{formatCurrency(remainingAdvanceLimit - calculatedAmount)} remaining</span>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={!isValidRequest || createAdvance.isPending}
                                    loading={createAdvance.isPending}
                                >
                                    Submit Advance Request
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(-1)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}