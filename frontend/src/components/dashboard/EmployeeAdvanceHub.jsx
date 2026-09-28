import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Percent, History, Plus, AlertCircle, CheckCircle, Clock, User, ChevronDown, Check, CreditCard } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import api from '../../api/axios';
import { useEmployees } from '../../features/hr/useHr';
import toast from 'react-hot-toast';

const fmtCurrency = (val) => `Rs. ${Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EmployeeAdvanceHub({ initialSearch = '' }) {
    const { data: empData, isLoading: empLoading } = useEmployees({ status: 'active', limit: 500 });
    const employees = empData?.data || [];

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [searchTerm, setSearchTerm] = useState(initialSearch || '');
    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    useEffect(() => {
        if (initialSearch) {
            setSearchTerm(initialSearch);
        }
    }, [initialSearch]);

    // Modal state for entering new advance
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [advanceType, setAdvanceType] = useState('amount'); // 'amount' | 'percentage'
    const [amount, setAmount] = useState('');
    const [percentage, setPercentage] = useState('');
    const [numberOfInstallments, setNumberOfInstallments] = useState(1);
    const [reason, setReason] = useState('');
    const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);

    // Modal state for recording repayment
    const [isRepayOpen, setIsRepayOpen] = useState(false);
    const [activeAdvanceToRepay, setActiveAdvanceToRepay] = useState(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayNotes, setRepayNotes] = useState('');
    const [repayDate, setRepayDate] = useState(new Date().toISOString().slice(0, 10));
    const [repaying, setRepaying] = useState(false);

    // Filter employees based on search term
    const filteredEmployees = employees.filter((emp) => {
        const q = searchTerm.toLowerCase();
        const name = (emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
        const code = (emp.employeeCode || '').toLowerCase();
        return name.includes(q) || code.includes(q);
    });

    // Auto-select first employee if none selected
    useEffect(() => {
        if (!selectedEmployeeId && employees.length > 0) {
            setSelectedEmployeeId(employees[0]._id);
        }
    }, [employees, selectedEmployeeId]);

    // Fetch advance summary whenever selectedEmployeeId changes
    const fetchSummary = async (empId) => {
        if (!empId) return;
        setLoadingSummary(true);
        try {
            const res = await api.get(`/hr/employees/${empId}/advance-summary`);
            if (res.data?.success) {
                setSummary(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load advance summary', err);
            // Fallback: fetch list from advances endpoint directly
            try {
                const advRes = await api.get(`/hr/advances?employeeId=${empId}`);
                const history = (advRes.data?.data || []).map(adv => {
                    const numInstallments = Math.max(1, adv.numberOfInstallments || 1);
                    const amountPaid = adv.amountPaid !== undefined ? adv.amountPaid : (adv.isDeducted ? adv.amount : 0);
                    const installmentsPaid = adv.installmentsPaid !== undefined ? adv.installmentsPaid : (adv.isDeducted ? numInstallments : 0);
                    const remainingBalance = adv.remainingBalance !== undefined ? adv.remainingBalance : Math.max(0, adv.amount - amountPaid);
                    return {
                        ...adv,
                        numberOfInstallments: numInstallments,
                        installmentAmount: adv.installmentAmount || Number((adv.amount / numInstallments).toFixed(2)),
                        installmentsPaid,
                        amountPaid,
                        remainingBalance,
                    };
                });
                const active = history.filter(a => a.status === 'approved' && (!a.isDeducted || a.remainingBalance > 0));
                const totalTaken = history.filter(a => a.status === 'approved').reduce((s, a) => s + (Number(a.amount) || 0), 0);
                const totalRepaid = history.filter(a => a.status === 'approved').reduce((s, a) => s + (Number(a.amountPaid) || 0), 0);
                const totalRemaining = active.reduce((s, a) => s + (Number(a.remainingBalance) || 0), 0);

                const currentEmp = employees.find(e => e._id === empId);
                const baseSalary = currentEmp?.basicSalary || (currentEmp?.hourlyRate ? currentEmp.hourlyRate * 200 : 50000);
                const limit = baseSalary * 0.60;
                setSummary({
                    employee: {
                        _id: empId,
                        fullName: currentEmp?.fullName || `${currentEmp?.firstName} ${currentEmp?.lastName}`,
                        employeeCode: currentEmp?.employeeCode,
                        department: currentEmp?.departmentId?.name || '',
                        baseMonthlySalary: baseSalary
                    },
                    baseMonthlySalary: baseSalary,
                    maxAdvanceLimit: limit,
                    maxAdvancePercentage: 60,
                    totalAllAdvancesTaken: totalTaken,
                    totalApprovedAdvance: totalTaken,
                    totalRepaidAmount: totalRepaid,
                    totalRemainingBalance: totalRemaining,
                    advancePercentage: +((totalRemaining / baseSalary) * 100).toFixed(1),
                    availableAdvance: Math.max(0, limit - totalRemaining),
                    history
                });
            } catch {
                toast.error('Could not fetch advance details for this employee');
            }
        } finally {
            setLoadingSummary(false);
        }
    };

    useEffect(() => {
        if (selectedEmployeeId) {
            fetchSummary(selectedEmployeeId);
        }
    }, [selectedEmployeeId]);

    const selectedEmp = employees.find(e => e._id === selectedEmployeeId);
    const effectiveBaseSalary = summary?.baseMonthlySalary 
        || summary?.employee?.baseMonthlySalary 
        || (selectedEmp?.basicSalary > 0 
            ? selectedEmp.basicSalary 
            : (selectedEmp?.hourlyRate > 0 
                ? selectedEmp.hourlyRate * 200 
                : (selectedEmp?.labourRate > 0 
                    ? (selectedEmp?.paymentType === 'per_day' ? selectedEmp.labourRate * 26 : selectedEmp.labourRate * 200) 
                    : 50000)));
    const effectiveLimit = summary?.availableAdvance !== undefined 
        ? summary.availableAdvance 
        : +(effectiveBaseSalary * 0.60).toFixed(2);

    // Handle submitting a new advance
    const handleSaveAdvance = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId) {
            toast.error('Please select an employee');
            return;
        }

        const calculatedFromPct = +((effectiveBaseSalary * Number(percentage)) / 100).toFixed(2);
        const numericAmount = advanceType === 'amount' 
            ? Number(amount) 
            : calculatedFromPct;

        if (!numericAmount || numericAmount <= 0) {
            toast.error('Please enter a valid advance amount or percentage');
            return;
        }

        const numInst = Math.max(1, parseInt(numberOfInstallments) || 1);

        setSaving(true);
        try {
            await api.post('/hr/advances', {
                employeeId: selectedEmployeeId,
                date: advanceDate,
                advanceType,
                amount: numericAmount,
                requestedPercentage: advanceType === 'percentage' ? Number(percentage) : 0,
                numberOfInstallments: numInst,
                reason,
            });

            toast.success(`Advance of ${fmtCurrency(numericAmount)} (${numInst} installment${numInst > 1 ? 's' : ''}) recorded successfully!`);
            setIsAddOpen(false);
            setAmount('');
            setPercentage('');
            setNumberOfInstallments(1);
            setReason('');
            fetchSummary(selectedEmployeeId);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record advance');
        } finally {
            setSaving(false);
        }
    };

    // Open Repayment Modal
    const openRepayModal = (adv) => {
        setActiveAdvanceToRepay(adv);
        const suggestedAmount = adv.installmentAmount && adv.installmentAmount < adv.remainingBalance
            ? adv.installmentAmount
            : adv.remainingBalance;
        setRepayAmount(suggestedAmount ? suggestedAmount.toString() : '');
        setRepayNotes(`Installment ${(adv.installmentsPaid || 0) + 1} payment`);
        setRepayDate(new Date().toISOString().slice(0, 10));
        setIsRepayOpen(true);
    };

    // Handle Submitting Repayment
    const handleRecordRepayment = async (e) => {
        e.preventDefault();
        if (!activeAdvanceToRepay) return;

        const numRepay = Number(repayAmount);
        if (!numRepay || numRepay <= 0) {
            toast.error('Please enter a valid repayment amount');
            return;
        }

        if (numRepay > activeAdvanceToRepay.remainingBalance) {
            toast.error(`Amount cannot exceed remaining balance of ${fmtCurrency(activeAdvanceToRepay.remainingBalance)}`);
            return;
        }

        setRepaying(true);
        try {
            await api.post(`/hr/advances/${activeAdvanceToRepay._id}/repay`, {
                amount: numRepay,
                notes: repayNotes,
                date: repayDate,
            });

            toast.success(`Repayment of ${fmtCurrency(numRepay)} recorded successfully!`);
            setIsRepayOpen(false);
            setActiveAdvanceToRepay(null);
            fetchSummary(selectedEmployeeId);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record repayment');
        } finally {
            setRepaying(false);
        }
    };

    // Percentage color
    const pct = summary?.advancePercentage || 0;
    const pctBadgeColor = pct >= 60 ? 'bg-rose-100 text-rose-800 border-rose-300' 
        : pct >= 35 ? 'bg-amber-100 text-amber-800 border-amber-300' 
        : 'bg-emerald-100 text-emerald-800 border-emerald-300';

    return (
        <div id="employee-master-section" className="space-y-5">
            {/* Header & Employee Search Selector */}
            <Card className="p-4 sm:p-5 bg-white border border-gray-150 rounded-2xl shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <DollarSign size={20} />
                            </span>
                            <div>
                                <h3 className="font-bold text-base text-gray-900">
                                    Employee Master &amp; Salary Advance Hub (සේවක Master සහ අත්තිකාරම් කළමනාකරණය)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Search employees, issue new advances, view installment progress, and track remaining balances accurately.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button 
                            variant="primary" 
                            onClick={() => setIsAddOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                        >
                            <Plus size={15} /> Add Advance (අත්තිකාරම් එකතු කරන්න)
                        </Button>
                    </div>
                </div>

                {/* Employee Selector Bar with Real-time Search */}
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                            Search Employee (සේවකයා සොයන්න):
                        </label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs bg-slate-50 focus:bg-white transition"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                            Select Employee Profile ({filteredEmployees.length} available):
                        </label>
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white text-gray-800"
                        >
                            {filteredEmployees.map((emp) => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.employeeCode ? `[${emp.employeeCode}] ` : ''}
                                    {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                                    {emp.departmentId?.name ? ` — ${emp.departmentId.name}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* KPI Metrics Cards for the Selected Employee */}
            {loadingSummary ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading employee advance master details...</div>
            ) : summary ? (
                <div className="space-y-5">
                    {/* 4 Primary KPI Cards Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* 1. Total Advance Taken */}
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 border border-indigo-200 rounded-2xl p-4 shadow-xs">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Total Advance Taken</p>
                                    <p className="text-xl sm:text-2xl font-black text-indigo-950 mt-1">
                                        {fmtCurrency(summary.totalAllAdvancesTaken || summary.totalApprovedAdvance)}
                                    </p>
                                    <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
                                        Approved advance history
                                    </p>
                                </div>
                                <span className="p-2 bg-indigo-500 text-white rounded-xl shadow-xs">
                                    <DollarSign size={18} />
                                </span>
                            </div>
                        </div>

                        {/* 2. Total Repaid / Deducted */}
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-2xl p-4 shadow-xs">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Repaid (ගෙවූ මුදල)</p>
                                    <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                                        {fmtCurrency(summary.totalRepaidAmount || 0)}
                                    </p>
                                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                        Recovered via installments
                                    </p>
                                </div>
                                <span className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                                    <CheckCircle size={18} />
                                </span>
                            </div>
                        </div>

                        {/* 3. Outstanding Remaining Balance */}
                        <div className="bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-300 rounded-2xl p-4 shadow-xs">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Remaining Balance (ඉතිරි ශේෂය)</p>
                                    <p className="text-xl sm:text-2xl font-black text-rose-950 mt-1">
                                        {fmtCurrency(summary.totalRemainingBalance || 0)}
                                    </p>
                                    <p className="text-[11px] text-rose-700 font-medium mt-0.5">
                                        Pending repayment / deduction
                                    </p>
                                </div>
                                <span className="p-2 bg-rose-500 text-white rounded-xl shadow-xs">
                                    <CreditCard size={18} />
                                </span>
                            </div>
                        </div>

                        {/* 4. Available Advance Remaining */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 rounded-2xl p-4 shadow-xs">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Available Advance</p>
                                    <p className="text-xl sm:text-2xl font-black text-blue-950 mt-1">
                                        {fmtCurrency(summary.availableAdvance)}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pctBadgeColor}`}>
                                            {pct >= 60 ? 'Max 60% Limit Reached' : `${pct}% active (Max 60%)`}
                                        </span>
                                    </div>
                                </div>
                                <span className="p-2 bg-blue-500 text-white rounded-xl shadow-xs">
                                    <Percent size={18} />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Advance History Table with Installments Breakdown & Remaining Balance */}
                    <Card className="p-4 sm:p-5 bg-white border border-gray-150 rounded-2xl shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-indigo-600" />
                                <h4 className="font-bold text-sm text-gray-900">
                                    Advance History &amp; Installments for {summary.employee?.fullName || 'Employee'} (ගත් අත්තිකාරම් හා වාරික විස්තර)
                                </h4>
                            </div>
                            <span className="text-xs font-semibold text-gray-500">
                                {summary.history?.length || 0} records
                            </span>
                        </div>

                        {(!summary.history || summary.history.length === 0) ? (
                            <div className="py-8 text-center text-xs text-gray-400 italic">
                                No advance records found for this employee.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                                            <th className="py-2.5 px-3">Date</th>
                                            <th className="py-2.5 px-3">Total Amount</th>
                                            <th className="py-2.5 px-3">Installments Breakdown</th>
                                            <th className="py-2.5 px-3">Remaining Balance</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Reason / Notes</th>
                                            <th className="py-2.5 px-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {summary.history.map((adv) => {
                                            const statusBadge = adv.status === 'approved' 
                                                ? 'bg-emerald-100 text-emerald-800' 
                                                : adv.status === 'rejected' 
                                                ? 'bg-rose-100 text-rose-800' 
                                                : 'bg-amber-100 text-amber-800';

                                            const numInst = adv.numberOfInstallments || 1;
                                            const instPaid = adv.installmentsPaid || 0;
                                            const amtPaid = adv.amountPaid || 0;
                                            const remBal = adv.remainingBalance !== undefined ? adv.remainingBalance : Math.max(0, adv.amount - amtPaid);
                                            const isFullyPaid = remBal <= 0 || adv.isDeducted;
                                            const instPct = Math.min(100, Math.round((amtPaid / (adv.amount || 1)) * 100));

                                            return (
                                                <tr key={adv._id} className="hover:bg-slate-50 transition">
                                                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                                                        {new Date(adv.date).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td className="py-2.5 px-3 font-bold font-mono text-gray-900 text-sm whitespace-nowrap">
                                                        {fmtCurrency(adv.amount)}
                                                        {adv.advanceType === 'percentage' && (
                                                            <span className="block text-[10px] text-gray-400 font-normal">
                                                                ({adv.requestedPercentage}% of salary)
                                                            </span>
                                                        )}
                                                    </td>
                                                    {/* Installments breakdown */}
                                                    <td className="py-2.5 px-3 min-w-[190px]">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-[11px]">
                                                                <span className="font-bold text-gray-800">
                                                                    {fmtCurrency(amtPaid)} paid
                                                                </span>
                                                                <span className="text-gray-500 font-medium">
                                                                    ({instPaid} of {numInst} installments)
                                                                </span>
                                                            </div>
                                                            {/* Visual progress bar */}
                                                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${isFullyPaid ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                                                                    style={{ width: `${instPct}%` }}
                                                                />
                                                            </div>
                                                            {numInst > 1 && (
                                                                <span className="text-[10px] text-gray-400 block">
                                                                    ~{fmtCurrency(adv.installmentAmount || adv.amount / numInst)} / installment
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* Remaining Balance */}
                                                    <td className="py-2.5 px-3 font-bold font-mono whitespace-nowrap">
                                                        {isFullyPaid ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs">
                                                                <Check size={12} /> LKR 0.00 (Fully Settled)
                                                            </span>
                                                        ) : (
                                                            <span className="text-rose-600 font-black text-sm">
                                                                {fmtCurrency(remBal)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge}`}>
                                                            {adv.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-gray-700 max-w-xs truncate">
                                                        {adv.reason || '—'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                        {!isFullyPaid && adv.status === 'approved' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openRepayModal(adv)}
                                                                className="text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 py-1 px-2.5"
                                                            >
                                                                Record Repayment
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            ) : null}

            {/* Enter Advance Modal */}
            <Modal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title={`Add Salary Advance — ${selectedEmp?.fullName || 'Employee'}`}
                size="md"
            >
                <form onSubmit={handleSaveAdvance} className="p-5 space-y-4">
                    {/* Employee info banner */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{selectedEmp?.fullName}</p>
                            <div className="text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>{selectedEmp?.employeeCode}</span>
                                {selectedEmp?.departmentId?.name && <span>· {selectedEmp.departmentId.name}</span>}
                                <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px]">
                                    Base Salary: {fmtCurrency(effectiveBaseSalary)}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-500 font-medium">Available Limit</p>
                            <p className="font-bold text-emerald-600 text-sm">{fmtCurrency(effectiveLimit)}</p>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Advance Type (අත්තිකාරම් ආකාරය)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setAdvanceType('amount')}
                                className={`py-2 text-xs font-bold rounded-xl border transition ${
                                    advanceType === 'amount'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                By Exact Amount (රුපියල්)
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdvanceType('percentage')}
                                className={`py-2 text-xs font-bold rounded-xl border transition ${
                                    advanceType === 'percentage'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                By Percentage (%)
                            </button>
                        </div>
                    </div>

                    {/* Amount or Percentage Input */}
                    {advanceType === 'amount' ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Advance Amount (LKR)
                            </label>
                            <input
                                type="number"
                                placeholder="e.g. 10000"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                min="100"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold"
                            />
                            {amount && Number(amount) > 0 && effectiveBaseSalary > 0 && (
                                <div className="mt-2 p-2.5 bg-indigo-50/90 border border-indigo-150 rounded-xl flex flex-wrap items-center justify-between text-xs gap-1.5">
                                    <span className="font-bold text-indigo-700">
                                        = {((Number(amount) / effectiveBaseSalary) * 100).toFixed(1)}% of Monthly Base ({fmtCurrency(effectiveBaseSalary)})
                                    </span>
                                    {effectiveLimit > 0 && (
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${Number(amount) > effectiveLimit ? 'text-rose-700 bg-rose-100' : 'text-emerald-700 bg-emerald-100'}`}>
                                            {((Number(amount) / effectiveLimit) * 100).toFixed(0)}% of Limit
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">
                                    Advance Percentage (%)
                                </label>
                                <span className="text-[11px] font-bold text-indigo-600">Max limit: 60%</span>
                            </div>

                            {/* Quick percentage buttons */}
                            <div className="grid grid-cols-5 gap-1.5 mb-2">
                                {[10, 20, 30, 50, 60].map((pctVal) => (
                                    <button
                                        key={pctVal}
                                        type="button"
                                        onClick={() => setPercentage(pctVal.toString())}
                                        className={`py-1 text-xs font-bold rounded-lg border transition ${
                                            Number(percentage) === pctVal
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'
                                        }`}
                                    >
                                        {pctVal}% {pctVal === 60 ? '(Max)' : ''}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="number"
                                placeholder="e.g. 25"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                                required
                                min="1"
                                max="100"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold"
                            />
                            {percentage && Number(percentage) > 0 && (
                                <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                                    <div className="flex justify-between items-center font-bold">
                                        <span>Calculated Advance ({percentage}%):</span>
                                        <span className="text-sm font-mono text-indigo-700">
                                            {fmtCurrency((effectiveBaseSalary * Number(percentage)) / 100)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-indigo-600">
                                        Calculated on Monthly Base Salary of {fmtCurrency(effectiveBaseSalary)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Number of Installments */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Repayment Installments (වාරික ගණන)
                        </label>
                        <select
                            value={numberOfInstallments}
                            onChange={(e) => setNumberOfInstallments(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-gray-800"
                        >
                            <option value={1}>1 Installment (Single Deduction / එකවර අඩු කිරීම)</option>
                            <option value={2}>2 Installments (2 Months / මාස 2 කින්)</option>
                            <option value={3}>3 Installments (3 Months / මාස 3 කින්)</option>
                            <option value={4}>4 Installments (4 Months / මාස 4 කින්)</option>
                            <option value={6}>6 Installments (6 Months / මාස 6 කින්)</option>
                            <option value={10}>10 Installments (10 Months / මාස 10 කින්)</option>
                            <option value={12}>12 Installments (12 Months / මාස 12 කින්)</option>
                        </select>
                        {(((advanceType === 'amount' ? Number(amount) : (effectiveBaseSalary * Number(percentage)) / 100) || 0) > 0) && numberOfInstallments > 1 && (
                            <p className="text-[11px] text-indigo-600 font-bold mt-1">
                                ~ {fmtCurrency(((advanceType === 'amount' ? Number(amount) : (effectiveBaseSalary * Number(percentage)) / 100) || 0) / numberOfInstallments)} per installment / month
                            </p>
                        )}
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Advance Date</label>
                        <input
                            type="date"
                            value={advanceDate}
                            onChange={(e) => setAdvanceDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                        />
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes (Optional)</label>
                        <textarea
                            placeholder="e.g. Festival advance / Medical requirement"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white resize-none"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            loading={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                            Save &amp; Issue Advance
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Record Repayment Modal */}
            <Modal
                isOpen={isRepayOpen}
                onClose={() => setIsRepayOpen(false)}
                title={`Record Installment Repayment — ${selectedEmp?.fullName || 'Employee'}`}
                size="md"
            >
                <form onSubmit={handleRecordRepayment} className="p-5 space-y-4">
                    {/* Advance Summary banner */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between items-center font-bold text-slate-800">
                            <span>Total Advance: {fmtCurrency(activeAdvanceToRepay?.amount)}</span>
                            <span className="text-rose-600">Remaining: {fmtCurrency(activeAdvanceToRepay?.remainingBalance)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Installments: {activeAdvanceToRepay?.installmentsPaid || 0} of {activeAdvanceToRepay?.numberOfInstallments || 1} completed
                        </div>
                    </div>

                    {/* Repay Amount */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Repayment Amount (LKR)
                        </label>
                        <input
                            type="number"
                            placeholder="e.g. 5000"
                            value={repayAmount}
                            onChange={(e) => setRepayAmount(e.target.value)}
                            required
                            min="1"
                            max={activeAdvanceToRepay?.remainingBalance}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                            Suggested installment amount: {fmtCurrency(activeAdvanceToRepay?.installmentAmount || activeAdvanceToRepay?.remainingBalance)}
                        </p>
                    </div>

                    {/* Repay Date */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Repayment Date</label>
                        <input
                            type="date"
                            value={repayDate}
                            onChange={(e) => setRepayDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Description (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Salary deduction / Cash repayment"
                            value={repayNotes}
                            onChange={(e) => setRepayNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsRepayOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            loading={repaying}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            Confirm Repayment
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
