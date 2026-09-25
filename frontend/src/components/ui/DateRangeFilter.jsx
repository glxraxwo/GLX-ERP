import React from 'react';
import { Calendar, X } from 'lucide-react';
import Button from './Button';

/**
 * Uniform Date Range Filter component with From Date, To Date, and Clear button
 */
export default function DateRangeFilter({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onClear,
    fromLabel = 'From Date',
    toLabel = 'To Date',
    className = ''
}) {
    const hasActiveFilter = Boolean(startDate || endDate);

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 min-h-[44px]">
                <Calendar size={15} className="text-gray-400 shrink-0" />
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase leading-none">{fromLabel}</span>
                    <input
                        type="date"
                        className="bg-transparent text-xs text-gray-800 focus:outline-none cursor-pointer"
                        value={startDate || ''}
                        onChange={(e) => onStartDateChange(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 min-h-[44px]">
                <Calendar size={15} className="text-gray-400 shrink-0" />
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase leading-none">{toLabel}</span>
                    <input
                        type="date"
                        className="bg-transparent text-xs text-gray-800 focus:outline-none cursor-pointer"
                        value={endDate || ''}
                        onChange={(e) => onEndDateChange(e.target.value)}
                    />
                </div>
            </div>

            {hasActiveFilter && onClear && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClear}
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1 self-center"
                    title="Clear date range"
                >
                    <X size={13} /> Clear Dates
                </Button>
            )}
        </div>
    );
}
