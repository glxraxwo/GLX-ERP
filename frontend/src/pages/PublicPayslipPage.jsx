import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function PublicPayslipPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Get date range from URL params or default to last 30 days
    const searchParams = new URLSearchParams(window.location.search);
    const startDate = searchParams.get('startDate') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const loadPayslip = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/public/payslip/${id}`, {
                params: { startDate, endDate }
            });
            if (res.data && res.data.success) {
                setData(res.data.data);
            } else {
                setError('Failed to load payslip details.');
            }
        } catch (err) {
            setError('Error fetching payslip: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPayslip();
    }, [id]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    return (
        <div className="p-4 max-w-4xl mx-auto font-calibri">
            {/* Header controls (hidden on print) */}
            <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col gap-3">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-gray-700 uppercase">Public Payslip View</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 text-xs">
                            <label className="font-bold text-gray-600">From:</label>
                            <input type="date" className="border rounded px-2 py-1 bg-gray-50 text-xs" defaultValue={startDate} />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                            <label className="font-bold text-gray-600">To:</label>
                            <input type="date" className="border rounded px-2 py-1 bg-gray-50 text-xs" defaultValue={endDate} />
                        </div>
                        <Button variant="primary" size="sm" onClick={loadPayslip} loading={loading}>
                            <RefreshCw size={14} className="mr-1" /> Load
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Printer size={14} className="mr-1" /> Print Report
                        </Button>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="py-16 text-center text-gray-500 flex justify-center items-center gap-2">
                    <RefreshCw size={18} className="animate-spin text-blue-600" />
                    <span>Loading payslip...</span>
                </div>
            )}

            {error && (
                <div className="py-16 text-center text-red-500">
                    <p>{error}</p>
                </div>
            )}

            {/* Printable Payslip */}
            {data && !loading && (
                <Card className="employee-payment-sheet-print bg-white p-10 border border-gray-300 rounded shadow-none text-gray-900 text-sm leading-relaxed max-w-[800px] mx-auto print:border-0 print:p-0">
                    
                    {/* Simple Header - No Company Name */}
                    <div className="text-center mb-6 pt-2">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-800 border-b pb-2 max-w-[320px] mx-auto border-gray-400">
                            EMPLOYEE PAYMENT SHEET
                        </h2>
                    </div>

                    {/* Metadata Section */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-[13px] border-b pb-4 mb-4 border-gray-300 font-calibri">
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28">Name :</span>
                            <span className="font-bold text-gray-950">{data.employee.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28">Salary Per Hour :</span>
                            <span className="font-bold font-mono">{formatCurrency(data.employee.hourlyRate)}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28">Date From :</span>
                            <span>{data.startDate}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-gray-600 w-28">Date To :</span>
                            <span>{data.endDate}</span>
                        </div>
                    </div>

                    {/* Sheet Table */}
                    <table className="w-full text-xs text-left border-collapse font-calibri mb-6">
                        <thead>
                            <tr className="border-b-2 border-t border-gray-400 uppercase text-[10px] text-gray-800 font-bold">
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3 text-center">IN</th>
                                <th className="py-2.5 px-3 text-center">OUT</th>
                                <th className="py-2.5 px-3 text-center">HOURS</th>
                                <th className="py-2.5 px-3 text-right">DAY SALARY</th>
                                <th className="py-2.5 px-3 text-right">ADVANCE</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.rows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 font-medium text-gray-700">{row.date}</td>
                                    <td className="py-2 px-3 text-center font-mono text-gray-600">{row.inTime}</td>
                                    <td className="py-2 px-3 text-center font-mono text-gray-600">{row.outTime}</td>
                                    <td className="py-2 px-3 text-center font-mono font-semibold text-gray-800">{row.hours}</td>
                                    <td className="py-2 px-3 text-right font-mono text-gray-800">
                                        {row.daySalary > 0 ? formatCurrency(row.daySalary) : '0.00'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-red-600">
                                        {row.advance > 0 ? formatCurrency(row.advance) : '0.00'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals Summary */}
                    <div className="flex justify-end pt-2 border-t-2 border-gray-400 font-calibri">
                        <div className="w-64 text-xs space-y-2">
                            <div className="flex justify-between font-semibold text-gray-700">
                                <span>Total Salary :</span>
                                <span className="font-mono">{formatCurrency(data.totalSalary)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-red-600">
                                <span>Total Advances :</span>
                                <span className="font-mono">-{formatCurrency(data.totalAdvances)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-300">
                                <span>Net Salary :</span>
                                <span className="font-mono text-blue-900 border-b-4 border-double border-gray-900 pb-0.5">
                                    {formatCurrency(data.netSalary)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Signatures & Approval Footer Section */}
                    <div className="mt-12 pt-6 border-t border-dashed border-gray-300 flex justify-between items-end text-xs font-calibri">
                        <div>
                            <p className="font-semibold text-gray-600 mb-8">Employee Signature:</p>
                            <div className="border-t border-gray-400 w-44"></div>
                            <p className="text-[11px] font-medium text-gray-700 mt-1">{data.employee.name}</p>
                        </div>

                        <div className="text-right flex flex-col items-end">
                            <p className="font-semibold text-gray-600 mb-1">Approved &amp; Authorized By:</p>
                            <div className="h-10 w-44 border border-dashed border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400 my-1">
                                [ Authorized Signature ]
                            </div>
                            <div className="border-t border-gray-400 w-48 mt-1"></div>
                            <p className="text-[11px] font-bold text-gray-900 mt-0.5">Authorized Signatory</p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}