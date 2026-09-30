import { useState, useRef, useEffect, forwardRef, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Package } from 'lucide-react';

const SearchableSelect = forwardRef(({
    label,
    error,
    required = false,
    options = [],
    value = '',
    onChange,
    placeholder = 'Select product...',
    className = '',
    helperText,
    disabled = false,
    name,
    onBlur,
    ...props
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);

    // Find current selected option object
    const selectedOption = useMemo(() => {
        return options.find((opt) => String(opt.value) === String(value)) || null;
    }, [options, value]);

    // Filter options based on search query (searches in label, sinhala name, code, sku, subtext)
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const q = searchTerm.toLowerCase();
        return options.filter((opt) => {
            const labelStr = String(opt.label || '').toLowerCase();
            const valueStr = String(opt.value || '').toLowerCase();
            const codeStr = String(opt.productCode || opt.code || '').toLowerCase();
            const skuStr = String(opt.sku || '').toLowerCase();
            const sinhalaStr = String(opt.sinhalaName || '').toLowerCase();
            const subtextStr = String(opt.subtext || '').toLowerCase();

            return (
                labelStr.includes(q) ||
                codeStr.includes(q) ||
                skuStr.includes(q) ||
                sinhalaStr.includes(q) ||
                subtextStr.includes(q) ||
                valueStr.includes(q)
            );
        });
    }, [options, searchTerm]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input on open
    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(0);
            setTimeout(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }, 50);
        } else {
            setSearchTerm('');
        }
    }, [isOpen]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const el = listRef.current.children[highlightedIndex];
            if (el) {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleSelect = (opt) => {
        const selectedVal = opt ? opt.value : '';
        if (onChange) {
            // Support both React standard event signature and direct value
            const fakeEvent = {
                target: {
                    name: name || props.id,
                    value: selectedVal,
                },
            };
            onChange(fakeEvent);
        }
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        handleSelect(null);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions[highlightedIndex]) {
                handleSelect(filteredOptions[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    return (
        <div className={`w-full relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}

            {/* Trigger Button */}
            <div
                tabIndex={disabled ? -1 : 0}
                onKeyDown={handleKeyDown}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between text-sm transition-all cursor-pointer select-none bg-white min-h-[40px]
                    ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'hover:border-gray-400'}
                    ${error
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-500 bg-red-50/20'
                        : isOpen
                            ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
                            : 'border-gray-300'
                    }`}
            >
                <div className="flex-1 truncate mr-2">
                    {selectedOption ? (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                                {selectedOption.label}
                            </span>
                        </div>
                    ) : (
                        <span className="text-gray-400 font-normal">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                            title="Clear selection"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
                    />
                </div>
            </div>

            {/* Hidden native input for form compatibility */}
            <input
                type="hidden"
                name={name}
                value={value || ''}
                ref={ref}
                {...props}
            />

            {/* Dropdown Popover */}
            {isOpen && !disabled && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 min-w-[280px]">
                    {/* Live Search Input */}
                    <div className="p-2 border-b border-gray-100 bg-gray-50/80">
                        <div className="relative">
                            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setHighlightedIndex(0);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Type to search product, code or Sinhala..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div
                        ref={listRef}
                        className="max-h-60 overflow-y-auto divide-y divide-gray-50 p-1"
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 px-4 text-center text-xs text-gray-400 space-y-1">
                                <Package size={20} className="mx-auto text-gray-300 mb-1" />
                                <p className="font-semibold text-gray-600">No matching items found</p>
                                <p className="text-[11px] text-gray-400">Try typing a different name, code or keyword</p>
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = String(opt.value) === String(value);
                                const isHighlighted = idx === highlightedIndex;

                                return (
                                    <div
                                        key={opt.value || idx}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        onClick={() => handleSelect(opt)}
                                        className={`px-3 py-2.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors
                                            ${isSelected ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'text-gray-700'}
                                            ${isHighlighted && !isSelected ? 'bg-gray-100/80 text-gray-900' : ''}
                                        `}
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className="truncate">{opt.label}</span>
                                            </div>
                                            {opt.subtext && (
                                                <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                    {opt.subtext}
                                                </div>
                                            )}
                                        </div>

                                        {isSelected && (
                                            <Check size={15} className="text-blue-600 shrink-0 ml-2" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer count indicator */}
                    <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
                        <span>{filteredOptions.length} of {options.length} options</span>
                        <span className="text-[9px] text-gray-400 font-mono">Use ↑↓ & Enter to select</span>
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
            {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
        </div>
    );
});

SearchableSelect.displayName = 'SearchableSelect';
export default SearchableSelect;
