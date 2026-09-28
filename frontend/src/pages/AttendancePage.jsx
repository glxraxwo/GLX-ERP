import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calendar as CalendarIcon, Upload, Clock, FileSpreadsheet, LogIn, LogOut, CheckCircle2, DollarSign, Edit, Sparkles, Search, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import api from '../api/axios';
import { useAttendance, useBulkMarkAttendance, useEmployees, useDepartments } from '../features/hr/useHr';

const statusVariant = {
    present: 'success', absent: 'danger', half_day: 'warning',
    leave: 'info', holiday: 'default', weekend: 'default', late: 'warning',
};

export default function AttendancePage() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [departmentId, setDepartmentId] = useState('');
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    // Search filters
    const [mainSearchQuery, setMainSearchQuery] = useState('');
    const [bulkSearchQuery, setBulkSearchQuery] = useState('');

    // Bulk Modal Controls
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
    const [bulkDefaultIn, setBulkDefaultIn] = useState('08:00');
    const [bulkDefaultOut, setBulkDefaultOut] = useState('17:00');

    const { data: attData, refetch: refetchAttendance } = useAttendance({ date: selectedDate, departmentId: departmentId || undefined, limit: 300 });
    const { data: empData } = useEmployees({ departmentId: departmentId || undefined, status: 'active', limit: 500 });
    const { data: deptsData } = useDepartments();
    const bulkMark = useBulkMarkAttendance();

    const attendance = attData?.data || [];
    const employees = empData?.data || [];
    const depts = deptsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

    const [bulkRecords, setBulkRecords] = useState([]);

    // Manual Clock State
    const [manualModalRecord, setManualModalRecord] = useState(null);
    const [manualCheckIn, setManualCheckIn] = useState('08:00');
    const [manualCheckOut, setManualCheckOut] = useState('17:00');
    const [manualStatus, setManualStatus] = useState('present');
    const [manualSaving, setManualSaving] = useState(false);

    const openManualClock = (record) => {
        setManualModalRecord(record);
        setManualStatus(record.status === 'not_marked' ? 'present' : record.status);
        if (record.checkInTime) {
            const dateObj = new Date(record.checkInTime);
            setManualCheckIn(`${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`);
        } else {
            setManualCheckIn('08:00');
        }

        if (record.checkOutTime) {
            const dateObj = new Date(record.checkOutTime);
            setManualCheckOut(`${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`);
        } else {
            setManualCheckOut('17:00');
        }
    };

    const handleSaveManualClock = async (e) => {
        e.preventDefault();
        if (!manualModalRecord) return;
        setManualSaving(true);
        try {
            const checkInStr = manualCheckIn ? `${selectedDate}T${manualCheckIn}` : undefined;
            const checkOutStr = manualCheckOut ? `${selectedDate}T${manualCheckOut}` : undefined;

            const res = await api.post('/hr/attendance', {
                employeeId: manualModalRecord.employeeId,
                date: selectedDate,
                checkInTime: checkInStr,
                checkOutTime: checkOutStr,
                status: manualStatus
            });

            const saved = res.data?.data;
            const workedMinutes = saved?.totalWorkedMinutes || 0;
            const workedHours = (workedMinutes / 60).toFixed(2);
            const calculatedSalary = saved?.earnedSalary || (workedMinutes / 60 * manualModalRecord.hourlyRate).toFixed(2);

            toast.success(`Saved attendance for ${manualModalRecord.employeeName}! (${workedHours} hrs - Rs. ${Number(calculatedSalary).toLocaleString()})`);
            setManualModalRecord(null);
            refetchAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setManualSaving(false);
        }
    };

    const formatDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Helper: Map employees with attendance records
    const attendanceMap = new Map();
    attendance.forEach((a) => {
        if (a.employeeId) {
            const id = typeof a.employeeId === 'object' ? a.employeeId._id : a.employeeId;
            if (id) attendanceMap.set(id.toString(), a);
        }
    });

    // Create merged list of employees with attendance for table display
    const mergedAttendanceList = employees.map((emp) => {
        const existingAtt = attendanceMap.get(emp._id.toString());
        return {
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            employeeName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
            hourlyRate: emp.hourlyRate || emp.basicWageRate || 260,
            department: emp.departmentId?.name || '',
            existingAtt,
            status: existingAtt?.status || 'not_marked',
            checkInTime: existingAtt?.checkInTime || null,
            checkOutTime: existingAtt?.checkOutTime || null,
            totalWorkedMinutes: existingAtt?.totalWorkedMinutes || 0,
            earnedSalary: existingAtt?.earnedSalary || (existingAtt?.totalWorkedMinutes ? Number(((existingAtt.totalWorkedMinutes / 60) * (emp.hourlyRate || emp.labourRate || 260)).toFixed(2)) : (existingAtt?.checkInTime && !existingAtt?.checkOutTime ? Number(((Math.max(0, Math.floor((new Date() - new Date(existingAtt.checkInTime)) / (1000 * 60))) / 60) * (emp.hourlyRate || emp.labourRate || 260)).toFixed(2)) : 0)),
            lateMinutes: existingAtt?.lateMinutes || 0,
            overtimeMinutes: existingAtt?.overtimeMinutes || 0,
            overtimeAmount: existingAtt?.overtimeAmount || 0,
            importedViaFingerprint: existingAtt?.importedViaFingerprint || false,
        };
    });

    // ── Single Click Clock In Handler ──
    const handleClockIn = async (record) => {
        setActionLoadingId(record.employeeId);
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const checkInStr = `${selectedDate}T${hours}:${minutes}`;

            await api.post('/hr/attendance', {
                employeeId: record.employeeId,
                date: selectedDate,
                checkInTime: checkInStr,
                status: 'present',
            });
            toast.success(`Clocked IN ${record.employeeName} at ${hours}:${minutes}!`);
            refetchAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to Clock In employee');
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── Single Click Clock Out & Salary Calculation Handler ──
    const handleClockOut = async (record) => {
        setActionLoadingId(record.employeeId);
        try {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const checkOutStr = `${selectedDate}T${hours}:${minutes}`;

            const res = await api.post('/hr/attendance', {
                employeeId: record.employeeId,
                date: selectedDate,
                checkInTime: record.checkInTime ? formatDateTimeLocal(record.checkInTime) : `${selectedDate}T08:00`,
                checkOutTime: checkOutStr,
                status: record.status === 'not_marked' ? 'present' : record.status,
            });

            const saved = res.data?.data;
            const workedMinutes = saved?.totalWorkedMinutes || 0;
            const workedHours = (workedMinutes / 60).toFixed(2);
            const calculatedSalary = saved?.earnedSalary || (workedMinutes / 60 * record.hourlyRate).toFixed(2);

            toast.success(
                <div>
                    <p className="font-bold text-sm">Clocked OUT {record.employeeName}!</p>
                    <p className="text-xs">Worked: <strong>{workedHours} hrs</strong> | Salary: <strong>Rs. {Number(calculatedSalary).toLocaleString()}</strong></p>
                </div>,
                { duration: 5000 }
            );
            refetchAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to Clock Out employee');
        } finally {
            setActionLoadingId(null);
        }
    };

    const getTimeOnly = (dtStr, fallback = '08:00') => {
        if (!dtStr) return fallback;
        try {
            const d = new Date(dtStr);
            if (isNaN(d.getTime())) {
                if (typeof dtStr === 'string' && dtStr.includes('T')) {
                    return dtStr.split('T')[1].slice(0, 5);
                }
                return fallback;
            }
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } catch {
            return fallback;
        }
    };

    const openBulk = () => {
        setBulkDate(selectedDate);
        setBulkSearchQuery('');
        const records = employees.map((e) => {
            const existing = attendanceMap.get(e._id.toString());
            const isAbsent = existing?.status === 'absent';
            return {
                employeeId: e._id,
                employeeCode: e.employeeCode || '',
                employeeName: e.fullName || `${e.firstName} ${e.lastName}`,
                hourlyRate: e.hourlyRate || e.basicWageRate || e.labourRate || 260,
                department: e.departmentId?.name || '',
                status: existing?.status || 'present',
                checkInTime: isAbsent ? '' : (existing?.checkInTime ? getTimeOnly(existing.checkInTime, '08:00') : '08:00'),
                checkOutTime: isAbsent ? '' : (existing?.checkOutTime ? getTimeOnly(existing.checkOutTime, '17:00') : '17:00'),
            };
        });
        setBulkRecords(records);
        setIsBulkOpen(true);
    };

    const applyDefaultTimesToAll = () => {
        setBulkRecords(prev => prev.map(r => (
            ['present', 'late', 'half_day'].includes(r.status)
                ? { ...r, checkInTime: bulkDefaultIn, checkOutTime: bulkDefaultOut }
                : r
        )));
        toast.success(`Applied ${bulkDefaultIn} - ${bulkDefaultOut} to all present employees!`);
    };

    const markAllPresent = () => {
        setBulkRecords(prev => prev.map(r => ({
            ...r,
            status: 'present',
            checkInTime: r.checkInTime || bulkDefaultIn,
            checkOutTime: r.checkOutTime || bulkDefaultOut,
        })));
        toast.success('Marked all employees as Present');
    };

    const markAllAbsent = () => {
        setBulkRecords(prev => prev.map(r => ({
            ...r,
            status: 'absent',
            checkInTime: '',
            checkOutTime: '',
        })));
        toast.success('Marked all employees as Absent');
    };

    const calcBulkRowWage = (r) => {
        if (['absent', 'leave'].includes(r.status)) {
            return { hours: 0, salary: 0, isAbsent: true };
        }
        if (!r.checkInTime || !r.checkOutTime) {
            if (r.status === 'half_day') {
                const sal = 4 * r.hourlyRate;
                return { hours: 4, salary: sal, isAbsent: false };
            }
            return { hours: 0, salary: 0, isAbsent: false };
        }
        const [inH, inM] = r.checkInTime.split(':').map(Number);
        const [outH, outM] = r.checkOutTime.split(':').map(Number);
        const diffM = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
        const hours = +(diffM / 60).toFixed(1);
        const salary = +(hours * r.hourlyRate).toFixed(2);
        return { hours, salary, isAbsent: false };
    };

    const submitBulk = async () => {
        try {
            await bulkMark.mutateAsync({
                date: bulkDate,
                records: bulkRecords.map((r) => {
                    const isPresentType = ['present', 'late', 'half_day'].includes(r.status);
                    return {
                        employeeId: r.employeeId,
                        status: r.status,
                        checkInTime: isPresentType && r.checkInTime ? `${bulkDate}T${r.checkInTime}:00` : undefined,
                        checkOutTime: isPresentType && r.checkOutTime ? `${bulkDate}T${r.checkOutTime}:00` : undefined,
                    };
                }),
            });
            setIsBulkOpen(false);
            if (selectedDate !== bulkDate) {
                setSelectedDate(bulkDate);
            } else {
                refetchAttendance();
            }
            toast.success(`Bulk attendance saved for ${bulkDate}! (${bulkRecords.length} staff)`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save bulk attendance');
        }
    };

    // Fingerprint sheet file import parser
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportLoading(true);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (json.length === 0) {
                    toast.error('The uploaded sheet is empty.');
                    setImportLoading(false);
                    return;
                }

                // Send to backend endpoint
                const res = await api.post('/hr/attendance/import-fingerprint', { records: json });

                if (res.data.success) {
                    setImportResult(res.data);
                    toast.success(res.data.message);
                    refetchAttendance();
                } else {
                    toast.error(res.data.message || 'Import failed');
                }
            } catch (err) {
                console.error('Fingerprint import error:', err);
                toast.error('Failed to parse fingerprint file. Ensure file format is valid.');
            } finally {
                setImportLoading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const fmtCurrency = (val) => `Rs. ${Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const columns = [
        {
            key: 'employee', label: 'Employee', render: (r) => (
                <div>
                    <p className="font-bold text-sm text-gray-900">{r.employeeName}</p>
                    <p className="text-xs font-mono text-gray-500">{r.employeeCode} {r.department && `· ${r.department}`}</p>
                </div>
            )
        },
        {
            key: 'status', label: 'Status', render: (r) => (
                r.status === 'not_marked' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200">Not Marked</span>
                ) : (
                    <Badge variant={statusVariant[r.status]}>{r.status?.replace(/_/g, ' ')}</Badge>
                )
            )
        },
        {
            key: 'lateStatus', label: 'Late / Penalty', render: (r) => (
                r.waivedLatePenalty ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200" title={r.latePenaltyReason}>
                        Late ({r.lateMinutes || 0}m) — Waived (Shift Covered)
                    </span>
                ) : r.latePenaltyHours > 0 ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={r.latePenaltyReason}>
                        Late ({r.lateMinutes || 0}m) — {r.latePenaltyHours}h Cut (-{fmtCurrency(r.latePenaltyAmount)})
                    </span>
                ) : r.lateMinutes > 0 ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Late {r.lateMinutes}m (Grace)
                    </span>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                )
            )
        },
        {
            key: 'checkIn', label: 'Clock In', render: (r) => (
                r.checkInTime ? (
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-max">
                        <LogIn size={13} />
                        {new Date(r.checkInTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                ) : <span className="text-gray-400">—</span>
            )
        },
        {
            key: 'checkOut', label: 'Clock Out', render: (r) => (
                r.checkOutTime ? (
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-1 w-max">
                        <LogOut size={13} />
                        {new Date(r.checkOutTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                ) : <span className="text-gray-400">—</span>
            )
        },
        {
            key: 'worked', label: 'Worked Time', render: (r) => (
                r.totalWorkedMinutes > 0 ? (
                    <span className="font-mono text-xs font-bold text-indigo-700">
                        {(r.totalWorkedMinutes / 60).toFixed(1)} hrs
                    </span>
                ) : (
                    r.checkInTime && !r.checkOutTime ? (
                        <span className="text-xs text-emerald-600 font-semibold animate-pulse">On Shift (Working...)</span>
                    ) : '—'
                )
            )
        },
        {
            key: 'earnedSalary', label: 'Earned Salary', render: (r) => (
                <div className="font-mono text-xs">
                    {r.earnedSalary > 0 ? (
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 inline-block">
                            {fmtCurrency(r.earnedSalary)}
                        </span>
                    ) : (
                        <span className="text-gray-400">Rs. 0.00</span>
                    )}
                    <p className="text-[10px] text-gray-400">@{r.hourlyRate}/hr</p>
                </div>
            )
        },
        {
            key: 'actions', label: 'Clock Action', render: (r) => {
                const isClockedIn = Boolean(r.checkInTime);
                const isClockedOut = Boolean(r.checkOutTime);
                const isLoading = actionLoadingId === r.employeeId;

                return (
                    <div className="flex flex-wrap items-center gap-1">
                        {!isClockedIn ? (
                            <Button
                                variant="primary"
                                size="sm"
                                loading={isLoading}
                                onClick={() => handleClockIn(r)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                            >
                                <LogIn size={14} /> Quick In
                            </Button>
                        ) : !isClockedOut ? (
                            <Button
                                variant="primary"
                                size="sm"
                                loading={isLoading}
                                onClick={() => handleClockOut(r)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm animate-pulse"
                            >
                                <LogOut size={14} /> Quick Out
                            </Button>
                        ) : (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-500" /> Completed
                            </span>
                        )}

                        <button
                            onClick={() => openManualClock(r)}
                            className="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            title="Set Manual Clock-In / Clock-Out Time"
                        >
                            <Clock size={13} /> Manual
                        </button>
                    </div>
                );
            }
        }
    ];

    // Summary calculation for KPI cards
    const clockedInCount = mergedAttendanceList.filter(r => r.checkInTime && !r.checkOutTime).length;
    const clockedOutCount = mergedAttendanceList.filter(r => r.checkInTime && r.checkOutTime).length;
    const totalEarnedSalaryToday = mergedAttendanceList.reduce((sum, r) => sum + (r.earnedSalary || 0), 0);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Employee Attendance & Clock In / Out"
                description="Record daily employee clock-in & clock-out timestamps and compute earned daily wages automatically."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => navigate('/attendance-policies')}>
                            <Clock size={16} className="mr-1.5" /> Manage Policies
                        </Button>
                        <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                            <Upload size={16} className="mr-1.5" /> Import Fingerprint Sheet
                        </Button>
                        <Button variant="primary" onClick={openBulk}>
                            <Plus size={16} className="mr-1.5" /> Bulk Mark Attendance
                        </Button>
                    </div>
                }
            />

            {/* Daily KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="p-4 bg-white border border-gray-100 shadow-xs rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Staff</p>
                            <p className="text-2xl font-black text-slate-800 mt-1">{employees.length}</p>
                        </div>
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <Clock size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 font-medium">Active registered employees</p>
                </Card>

                <Card className="p-4 bg-white border border-gray-100 shadow-xs rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Currently Clocked In</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">{clockedInCount}</p>
                        </div>
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <LogIn size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-emerald-600 mt-2 font-bold">Currently on duty</p>
                </Card>

                <Card className="p-4 bg-white border border-gray-100 shadow-xs rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Clocked Out (Done)</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">{clockedOutCount}</p>
                        </div>
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                            <LogOut size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 font-medium">Shifts completed today</p>
                </Card>

                <Card className="p-4 bg-white border border-gray-100 shadow-xs rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Salary Earned Today</p>
                            <p className="text-2xl font-black text-indigo-600 mt-1">{fmtCurrency(totalEarnedSalaryToday)}</p>
                        </div>
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-indigo-600 mt-2 font-medium">Calculated from worked hours</p>
                </Card>
            </div>

            <Card>
                <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-wrap">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
                        <div className="w-full sm:w-44">
                            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                        </div>
                        <div className="w-full sm:w-52">
                            <Select placeholder="All Departments" options={deptOptions}
                                value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
                        </div>
                        {/* Employee Search input on main page */}
                        <div className="w-full sm:w-56 relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search employee..."
                                value={mainSearchQuery}
                                onChange={(e) => setMainSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-7 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-xs"
                            />
                            {mainSearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setMainSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-500" />
                        Click <strong>Clock In</strong> to record start time, click <strong>Clock Out</strong> to calculate salary!
                    </div>
                </div>

                {employees.length === 0 ? (
                    <EmptyState
                        icon={CalendarIcon}
                        title="No active employees found"
                        description="Add employees under HR -> Employees to record attendance"
                    />
                ) : (
                    <Table 
                        columns={columns} 
                        data={mergedAttendanceList.filter((r) => {
                            if (!mainSearchQuery.trim()) return true;
                            const q = mainSearchQuery.toLowerCase();
                            return r.employeeName.toLowerCase().includes(q) || (r.employeeCode && r.employeeCode.toLowerCase().includes(q));
                        })} 
                    />
                )}
            </Card>

            {/* Bulk Mark Modal */}
            <Modal 
                isOpen={isBulkOpen} 
                onClose={() => setIsBulkOpen(false)} 
                title="Bulk Mark Attendance (සමූහ පැමිණීම සටහන් කිරීම)" 
                size="xl"
            >
                <div className="p-4 sm:p-6 space-y-4">
                    {/* Top Control Bar: Date Selector + One-Time Time Entry + Quick Status */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            {/* 1. Date Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Attendance Date (දිනය තෝරන්න):
                                </label>
                                <input
                                    type="date"
                                    value={bulkDate}
                                    onChange={(e) => setBulkDate(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800"
                                />
                            </div>

                            {/* 2. One-Time In & Out Time Entry */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Default In Time (පැමිණි වේලාව):
                                </label>
                                <input
                                    type="time"
                                    value={bulkDefaultIn}
                                    onChange={(e) => setBulkDefaultIn(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-emerald-300 bg-emerald-50/50 rounded-xl text-xs font-mono font-bold text-emerald-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Default Out Time (පිටවූ වේලාව):
                                </label>
                                <input
                                    type="time"
                                    value={bulkDefaultOut}
                                    onChange={(e) => setBulkDefaultOut(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-amber-300 bg-amber-50/50 rounded-xl text-xs font-mono font-bold text-amber-900"
                                />
                            </div>
                        </div>

                        {/* Batch Action Buttons & Employee Search */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={applyDefaultTimesToAll}
                                    className="text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                                >
                                    <Clock size={13} className="mr-1" /> Apply Times to Present ({bulkDefaultIn} - {bulkDefaultOut})
                                </Button>
                                <button
                                    type="button"
                                    onClick={markAllPresent}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                                >
                                    ✓ Mark All Present
                                </button>
                                <button
                                    type="button"
                                    onClick={markAllAbsent}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition"
                                >
                                    ✕ Mark All Absent
                                </button>
                            </div>

                            {/* Search employee within bulk modal */}
                            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search employee in bulk..."
                                    value={bulkSearchQuery}
                                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-7 py-1.5 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                                {bulkSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setBulkSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Employee Records Table (Clean time only, no date column) */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="py-2.5 px-3">Employee (සේවකයා)</th>
                                    <th className="py-2.5 px-3 w-32">Status (තත්වය)</th>
                                    <th className="py-2.5 px-3 w-28">Clock In (පැමිණීම)</th>
                                    <th className="py-2.5 px-3 w-28">Clock Out (පිටවීම)</th>
                                    <th className="py-2.5 px-3 w-40 text-right">Hours &amp; Salary (වැටුප)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {bulkRecords
                                    .filter((r) => {
                                        if (!bulkSearchQuery.trim()) return true;
                                        const q = bulkSearchQuery.toLowerCase();
                                        return r.employeeName.toLowerCase().includes(q) || (r.employeeCode && r.employeeCode.toLowerCase().includes(q));
                                    })
                                    .map((r) => {
                                        const realIdx = bulkRecords.findIndex(item => item.employeeId === r.employeeId);
                                        const wageStats = calcBulkRowWage(r);
                                        const isAbsentOrLeave = ['absent', 'leave'].includes(r.status);

                                        return (
                                            <tr key={r.employeeId} className={`hover:bg-slate-50 transition ${isAbsentOrLeave ? 'bg-rose-50/30' : ''}`}>
                                                <td className="py-2.5 px-3">
                                                    <p className="font-bold text-slate-900 text-xs">{r.employeeName}</p>
                                                    <p className="text-[10px] font-mono text-slate-500">
                                                        {r.employeeCode} {r.department && `· ${r.department}`} · <span className="text-emerald-700 font-semibold">@{r.hourlyRate}/hr</span>
                                                    </p>
                                                </td>

                                                <td className="py-2.5 px-3">
                                                    <select
                                                        value={r.status}
                                                        onChange={(e) => {
                                                            const newStatus = e.target.value;
                                                            const newR = [...bulkRecords];
                                                            newR[realIdx].status = newStatus;
                                                            if (['absent', 'leave'].includes(newStatus)) {
                                                                newR[realIdx].checkInTime = '';
                                                                newR[realIdx].checkOutTime = '';
                                                            } else {
                                                                if (!newR[realIdx].checkInTime) newR[realIdx].checkInTime = bulkDefaultIn;
                                                                if (!newR[realIdx].checkOutTime) newR[realIdx].checkOutTime = bulkDefaultOut;
                                                            }
                                                            setBulkRecords(newR);
                                                        }}
                                                        className={`w-full px-2 py-1 border rounded-lg text-xs font-bold ${
                                                            r.status === 'present' ? 'border-emerald-300 text-emerald-800 bg-emerald-50' :
                                                            r.status === 'absent' ? 'border-rose-300 text-rose-800 bg-rose-50' :
                                                            r.status === 'half_day' ? 'border-amber-300 text-amber-800 bg-amber-50' :
                                                            'border-slate-200 text-slate-700 bg-white'
                                                        }`}
                                                    >
                                                        <option value="present">Present (පැමිණි)</option>
                                                        <option value="absent">Absent (නොපැමිණි)</option>
                                                        <option value="half_day">Half Day (අර්ධ දින)</option>
                                                        <option value="late">Late (ප්‍රමාද)</option>
                                                        <option value="leave">Leave (නිවාඩු)</option>
                                                    </select>
                                                </td>

                                                {/* In Time input: ONLY TIME, NO DATE */}
                                                <td className="py-2.5 px-3">
                                                    <input
                                                        type="time"
                                                        value={r.checkInTime || ''}
                                                        onChange={(e) => {
                                                            const newR = [...bulkRecords];
                                                            newR[realIdx].checkInTime = e.target.value;
                                                            setBulkRecords(newR);
                                                        }}
                                                        disabled={isAbsentOrLeave}
                                                        className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </td>

                                                {/* Out Time input: ONLY TIME, NO DATE */}
                                                <td className="py-2.5 px-3">
                                                    <input
                                                        type="time"
                                                        value={r.checkOutTime || ''}
                                                        onChange={(e) => {
                                                            const newR = [...bulkRecords];
                                                            newR[realIdx].checkOutTime = e.target.value;
                                                            setBulkRecords(newR);
                                                        }}
                                                        disabled={isAbsentOrLeave}
                                                        className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </td>

                                                {/* Live Salary & Working Hours Preview */}
                                                <td className="py-2.5 px-3 text-right">
                                                    {isAbsentOrLeave ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-block">
                                                            Absent · Rs. 0.00
                                                        </span>
                                                    ) : wageStats.hours > 0 ? (
                                                        <div>
                                                            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                                                {fmtCurrency(wageStats.salary)}
                                                            </span>
                                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                                {wageStats.hours} hrs
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t bg-slate-50">
                    <p className="text-xs text-slate-500 font-medium">
                        Total Staff to Save: <strong>{bulkRecords.length}</strong> | Date: <strong>{bulkDate}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={submitBulk} loading={bulkMark.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                            Save All Attendance ({bulkRecords.length} records)
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Fingerprint Importer Modal */}
            <Modal isOpen={isImportOpen} onClose={() => { setIsImportOpen(false); setImportResult(null); }} title="Import Biometric Fingerprint Sheet" size="md">
                <div className="p-6 space-y-4">
                    <p className="text-xs text-gray-500">
                        Upload exported attendance Excel (.xlsx, .xls) or CSV logs from biometric fingerprint scanners. Records will be matched by Employee Code or Name and evaluated against active Attendance Policies.
                    </p>

                    <div className="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-indigo-50/50">
                        <FileSpreadsheet className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                        <label className="cursor-pointer text-sm font-semibold text-indigo-600 hover:underline">
                            Choose Fingerprint Log File
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                        <p className="text-xs text-gray-400 mt-1">Supports Excel & CSV biometric logs</p>
                    </div>

                    {importLoading && (
                        <div className="text-center text-sm text-indigo-600 py-2">
                            Processing biometric sheet & evaluating policies...
                        </div>
                    )}

                    {importResult && (
                        <div className="p-4 bg-gray-50 rounded-lg text-xs space-y-2">
                            <p className="font-bold text-emerald-600">✓ {importResult.message}</p>
                            {importResult.errors?.length > 0 && (
                                <div className="text-rose-600 space-y-1 mt-2">
                                    <p className="font-semibold">Warnings / Errors ({importResult.errors.length}):</p>
                                    <ul className="list-disc pl-4 max-h-32 overflow-y-auto">
                                        {importResult.errors.map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => { setIsImportOpen(false); setImportResult(null); }}>
                        Close
                    </Button>
                </div>
            </Modal>

            {/* Manual Time Clock Modal */}
            {manualModalRecord && (
                <Modal isOpen={!!manualModalRecord} onClose={() => setManualModalRecord(null)} title={`Manual Clock-In / Clock-Out — ${manualModalRecord.employeeName}`} size="md">
                    <form onSubmit={handleSaveManualClock} className="p-6 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">{manualModalRecord.employeeName}</p>
                                <p className="text-slate-500 font-mono">{manualModalRecord.employeeCode} · {manualModalRecord.department}</p>
                            </div>
                            <div className="text-right font-mono">
                                <p className="text-slate-500">Hourly Rate</p>
                                <p className="font-bold text-emerald-600 text-sm">Rs. {manualModalRecord.hourlyRate}/hr</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Attendance Status</label>
                                <select
                                    value={manualStatus}
                                    onChange={(e) => setManualStatus(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-sm font-semibold bg-white"
                                >
                                    <option value="present">Present</option>
                                    <option value="late">Late</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="absent">Absent</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Selected Date</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    disabled
                                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono bg-slate-100 font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-emerald-800 mb-1">Manual Clock-In Time</label>
                                <input
                                    type="time"
                                    value={manualCheckIn}
                                    onChange={(e) => setManualCheckIn(e.target.value)}
                                    className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 rounded-xl text-sm font-mono font-bold text-emerald-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-amber-800 mb-1">Manual Clock-Out Time</label>
                                <input
                                    type="time"
                                    value={manualCheckOut}
                                    onChange={(e) => setManualCheckOut(e.target.value)}
                                    className="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-xl text-sm font-mono font-bold text-amber-900"
                                />
                            </div>
                        </div>

                        {/* Real-time working hours calculation preview */}
                        {manualCheckIn && manualCheckOut && (
                            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs flex justify-between items-center font-mono">
                                <span className="text-indigo-700 font-semibold">
                                    Worked Time:
                                    {(() => {
                                        const [inH, inM] = manualCheckIn.split(':').map(Number);
                                        const [outH, outM] = manualCheckOut.split(':').map(Number);
                                        const diffM = (outH * 60 + outM) - (inH * 60 + inM);
                                        return diffM > 0 ? ` ${(diffM / 60).toFixed(1)} hrs` : ' 0 hrs';
                                    })()}
                                </span>
                                <span className="font-bold text-indigo-900">
                                    Earned Salary:
                                    {(() => {
                                        const [inH, inM] = manualCheckIn.split(':').map(Number);
                                        const [outH, outM] = manualCheckOut.split(':').map(Number);
                                        const diffM = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
                                        const sal = (diffM / 60) * manualModalRecord.hourlyRate;
                                        return ` Rs. ${sal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                    })()}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" type="button" onClick={() => setManualModalRecord(null)}>Cancel</Button>
                            <Button variant="primary" type="submit" loading={manualSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                Save Attendance
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}