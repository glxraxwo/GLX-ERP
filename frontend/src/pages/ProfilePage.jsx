import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Lock, Save, DollarSign, ArrowRight, FileSignature, Upload, Trash2, CheckCircle2 } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { useAuthStore } from '../store/authStore';
import { useUpdateUser } from '../features/users/useUsers';
import { getRoleConfig } from '../features/users/roleConfig';
import api from '../api/axios';
import EmployeeEarningsView from '../components/hr/EmployeeEarningsView';

export default function ProfilePage() {
    const { user, setUser } = useAuthStore();
    const navigate = useNavigate();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [signatureUrl, setSignatureUrl] = useState(user?.signature || '');
    const updateMutation = useUpdateUser();

    const profileForm = useForm({
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phone: user?.phone || '',
            jobTitle: user?.jobTitle || '',
        },
    });

    const passwordForm = useForm();

    const handleSignatureUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Signature image file size must be less than 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setSignatureUrl(reader.result);
                toast.success('Signature image loaded! Click Save to apply.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearSignature = () => {
        setSignatureUrl('');
        toast.success('Signature cleared. Remember to save changes.');
    };

    const saveProfile = async (data) => {
        try {
            const result = await updateMutation.mutateAsync({
                id: user._id,
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone || undefined,
                    jobTitle: data.jobTitle || undefined,
                    signature: signatureUrl || '',
                    role: user.role,
                    isActive: true,
                },
            });
            setUser({ ...user, ...result.data });
            toast.success('Profile and signature updated successfully!');
        } catch { }
    };

    const changePassword = async (data) => {
        if (data.newPassword !== data.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (data.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }

        try {
            await api.post('/auth/change-password', {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });
            toast.success('Password changed successfully');
            passwordForm.reset();
            setIsChangingPassword(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        }
    };

    const roleConfig = getRoleConfig(user?.role);

    return (
        <div>
            <PageHeader title="My Profile" description="Update your personal information and security" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-6">
                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <User size={20} className="text-gray-600" />
                            <h3 className="text-sm font-semibold">Personal Information</h3>
                        </div>
                        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <Input label="First Name" required {...profileForm.register('firstName', { required: true })} />
                                <Input label="Last Name" required {...profileForm.register('lastName', { required: true })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <Input label="Email (read-only)" value={user?.email} disabled />
                                <Input label="Phone" type="tel" {...profileForm.register('phone')} />
                            </div>
                            <Input 
                                label="Official Designation / Job Title" 
                                placeholder="e.g. Branch Manager / Operations Manager / Managing Director" 
                                {...profileForm.register('jobTitle')} 
                            />
                            <div className="pt-4 border-t">
                                <Button type="submit" variant="primary" loading={updateMutation.isPending}>
                                    <Save size={14} className="mr-1.5" /> Save Profile & Signature
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Official Manager Digital Signature Card */}
                    <Card className="p-4 sm:p-6 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20">
                        <div className="flex items-center gap-3 mb-4">
                            <FileSignature size={22} className="text-indigo-600" />
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Personal Manager Digital Signature</h3>
                                <p className="text-xs text-gray-500">
                                    When you log in, this signature will be applied to Quotations, Estimates, and Invoices.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-white flex flex-col items-center justify-center min-h-[140px] relative">
                                {signatureUrl ? (
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className="p-2 border rounded-lg bg-gray-50 shadow-inner">
                                            <img
                                                src={signatureUrl}
                                                alt="My Signature"
                                                className="h-20 max-w-[260px] object-contain"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[11px] font-mono text-gray-400">
                                                ............................................................
                                            </span>
                                            <p className="text-xs font-semibold text-gray-800">
                                                {profileForm.watch('firstName')} {profileForm.watch('lastName')}
                                                {profileForm.watch('jobTitle') ? ` (${profileForm.watch('jobTitle')})` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 space-y-1">
                                        <FileSignature size={32} className="mx-auto text-gray-300" />
                                        <p className="text-xs font-medium">No signature uploaded yet</p>
                                        <p className="text-[11px] text-gray-400">Company default seal & signature will be used as fallback</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <label className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition">
                                    <Upload size={14} />
                                    <span>{signatureUrl ? 'Change Signature' : 'Upload Signature'}</span>
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/webp"
                                        className="hidden"
                                        onChange={handleSignatureUpload}
                                    />
                                </label>

                                {signatureUrl && (
                                    <button
                                        type="button"
                                        onClick={handleClearSignature}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer transition"
                                    >
                                        <Trash2 size={13} />
                                        <span>Remove Signature</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400">
                                Recommendation: Transparent background PNG with dark ink signature (Max 2MB).
                            </p>
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Lock size={20} className="text-gray-600" />
                                <h3 className="text-sm font-semibold">Password & Security</h3>
                            </div>
                            {!isChangingPassword && (
                                <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                                    Change Password
                                </Button>
                            )}
                        </div>

                        {isChangingPassword ? (
                            <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
                                <Input label="Current Password" type="password" required
                                    {...passwordForm.register('currentPassword', { required: true })} />
                                <Input label="New Password" type="password" required
                                    placeholder="At least 6 characters"
                                    {...passwordForm.register('newPassword', { required: true, minLength: 6 })} />
                                <Input label="Confirm New Password" type="password" required
                                    {...passwordForm.register('confirmPassword', { required: true })} />
                                <div className="flex flex-wrap gap-2 pt-4 border-t">
                                    <Button type="submit" variant="primary">Update Password</Button>
                                    <Button type="button" variant="outline" onClick={() => {
                                        passwordForm.reset();
                                        setIsChangingPassword(false);
                                    }}>Cancel</Button>
                                </div>
                            </form>
                        ) : (
                            <p className="text-sm text-gray-500">
                                Your password is encrypted. Change it regularly for security.
                            </p>
                        )}
                    </Card>

                    {/* Protected Employee Earnings Statement View */}
                    <EmployeeEarningsView />

                    {/* Salary Advance Section for Employees */}
                    {user?.role === 'employee' && (
                        <Card className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <DollarSign size={20} className="text-green-600" />
                                    <h3 className="text-sm font-semibold">Salary Advances</h3>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => navigate('/my-advances')}
                                    className="text-green-700 border-green-300 hover:bg-green-50"
                                >
                                    View All <ArrowRight size={14} className="ml-1" />
                                </Button>
                            </div>
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700 mb-3">
                                    Request a salary advance when you need funds before payday. You can request up to 60% of your monthly salary.
                                </p>
                                <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={() => navigate('/request-advance')}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <DollarSign size={14} className="mr-1.5" /> Request Advance
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                <div>
                    <Card className="p-4 sm:p-6 sticky top-6">
                        <h3 className="text-sm font-semibold mb-4">Account Details</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="font-medium break-all">{user?.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Role</p>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: roleConfig.color }}>
                                    {roleConfig.label}
                                </span>
                                <p className="text-xs text-gray-600 mt-2">{roleConfig.description}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Account Status</p>
                                <Badge variant="success">Active</Badge>
                            </div>
                            {user?.lastLoginAt && (
                                <div>
                                    <p className="text-xs text-gray-500">Last Login</p>
                                    <p className="text-sm">{new Date(user.lastLoginAt).toLocaleString('en-LK')}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}