import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Send, Phone } from 'lucide-react';

export default function SendPayslipSmsModal({ isOpen, onClose, payslipId, phoneNumbers = {} }) {
    const [phone, setPhone] = useState('');
    const [customPhone, setCustomPhone] = useState('');
    const [useCustom, setUseCustom] = useState(false);
    const [sending, setSending] = useState(false);

    // Available phone numbers from employee registration
    const availablePhones = [
        { key: 'phone', label: 'Contact 1 (Primary)', number: phoneNumbers.phone },
        { key: 'secondaryPhone', label: 'Contact 2 (Secondary)', number: phoneNumbers.secondaryPhone },
        { key: 'tertiaryPhone', label: 'Contact 3', number: phoneNumbers.tertiaryPhone }
    ].filter(p => p.number && p.number !== 'N/A');

    // Auto-select first available phone when modal opens
    React.useEffect(() => {
        if (isOpen && availablePhones.length > 0 && !useCustom) {
            setPhone(availablePhones[0].number);
        }
    }, [isOpen, availablePhones, useCustom]);

    const handleShare = async (e) => {
        e.preventDefault();
        const finalPhone = useCustom ? customPhone : phone;
        
        if (!finalPhone || !finalPhone.trim()) {
            toast.error('Please select or enter a valid phone number');
            return;
        }
        setSending(true);
        try {
            const res = await api.post(`/payroll/payslips/${payslipId}/send-sms`, {
                phone: finalPhone
            });
            if (res.data && res.data.success) {
                toast.success('Payslip link successfully sent via SMS!');
                onClose();
                // Reset form state
                setUseCustom(false);
                setCustomPhone('');
            } else {
                toast.error('Failed to send payslip link.');
            }
        } catch (err) {
            toast.error('Sending failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Send Payslip Link via SMS" size="sm">
            <form onSubmit={handleShare} className="space-y-4 font-calibri">
                <p className="text-xs text-gray-500">
                    This will send an instant SMS containing a passwordless public link to view the payslip (without company name). A copy will also be dispatched to the Manager.
                </p>
                
                {availablePhones.length > 0 && !useCustom && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Select Contact Number</label>
                        <div className="space-y-2">
                            {availablePhones.map((phoneOption) => (
                                <label 
                                    key={phoneOption.key}
                                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                                        phone === phoneOption.number 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="phoneSelect"
                                        value={phoneOption.number}
                                        checked={phone === phoneOption.number}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={sending}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{phoneOption.label}</p>
                                        <p className="text-xs text-gray-600 font-mono">{phoneOption.number}</p>
                                    </div>
                                    <Phone size={16} className="text-gray-400" />
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useCustom}
                            onChange={(e) => setUseCustom(e.target.checked)}
                            disabled={sending}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-xs font-semibold text-gray-700">Enter custom phone number</span>
                    </label>
                    
                    {useCustom && (
                        <div className="mt-2">
                            <input 
                                type="tel" 
                                required
                                placeholder="e.g. +94771234567"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                value={customPhone}
                                onChange={e => setCustomPhone(e.target.value)}
                                disabled={sending}
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={sending}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" loading={sending}>
                        <Send size={14} className="mr-1" /> Send Link
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
