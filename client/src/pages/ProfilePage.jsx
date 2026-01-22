import { useState, useEffect } from 'react';
import * as profileAPI from '@/features/dashboard/api/profileService';
import { Camera, User, BadgeCheck, MapPin, Briefcase, Hash } from 'lucide-react';

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', address: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [avatarPreview, setAvatarPreview] = useState(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const result = await profileAPI.getProfile();
            setProfile(result.data);
            setFormData({
                name: result.data.name || '',
                address: result.data.address || ''
            });
            if (result.data.photo_url) {
                // Prepend API URL if it's a relative path
                const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                setAvatarPreview(baseUrl + result.data.photo_url);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await profileAPI.updateProfile(formData);
            setMessage({ type: 'success', text: 'Profile updated successfully' });
            setIsEditing(false);
            loadProfile(); // Refresh
        } catch (err) {
            setMessage({ type: 'error', text: 'Update failed' });
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const objectUrl = URL.createObjectURL(file);
        setAvatarPreview(objectUrl);

        try {
            const result = await profileAPI.updateAvatar(file);
            setProfile({ ...profile, photo_url: result.data.photo_url });
            setMessage({ type: 'success', text: 'Photo updated' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Photo upload failed' });
        }
    };

    if (loading) return <div className="p-4 text-[12px] font-bold text-slate-500 uppercase">Synchronizing Profiler...</div>;

    if (!profile) return <div className="p-4 text-[12px] font-bold text-red-600 uppercase">Record Not Found.</div>;

    // Helper to render fields
    const Field = ({ label, icon: Icon, value }) => (
        <div className="flex items-start gap-2 p-2 bg-slate-50 border border-slate-200 rounded">
            <Icon className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{label}</p>
                <p className="text-[12px] font-bold text-slate-800 leading-tight">{value || '--'}</p>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-2 max-w-5xl">
            {/* COMPACT HEADER */}
            <div className="op-card !p-3 bg-slate-800 flex items-center gap-4">
                <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-sm border border-white/20 bg-slate-700 flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-8 h-8 text-white/20" />
                        )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 bg-blue-600 p-1 rounded-sm text-white cursor-pointer hover:bg-blue-500">
                        <Camera size={10} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    </label>
                </div>
                <div>
                    <h1 className="text-lg font-black text-white leading-tight">{formData.name || profile.username || 'SYS_USER'}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{profile.designation_name || 'OPERATOR'}</span>
                        <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{profile.emp_id}</span>
                    </div>
                </div>
            </div>

            {/* NOTIFICATIONS */}
            {message.text && (
                <div className={`p-2 text-[10px] font-black uppercase text-center border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                    {message.text}
                </div>
            )}

            {/* DATA GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2 space-y-2">
                    <div className="op-card">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Personnel Details</h3>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-[10px] font-bold text-blue-600 hover:underline px-2 py-0.5 border border-blue-100 rounded"
                            >
                                {isEditing ? 'DISCARD' : 'EDIT_RECORD'}
                            </button>
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleUpdate} className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Full Legal Name</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[12px] font-bold outline-none focus:border-blue-500"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Contact Address</label>
                                        <textarea
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[12px] font-bold outline-none focus:border-blue-500 h-[34px]"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-slate-800 text-white py-1.5 rounded text-[11px] font-black uppercase tracking-wider">Commit Updates</button>
                            </form>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Full Name" icon={User} value={formData.name || profile.username} />
                                <Field label="Access Unit" icon={Briefcase} value={profile.department_name} />
                                <div className="col-span-2">
                                    <Field label="Location" icon={MapPin} value={formData.address} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="op-card h-full">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">System Identifiers</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">EMP_ID</span>
                                <span className="text-[12px] font-mono font-black text-blue-600">{profile.emp_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">QR_TOKEN</span>
                                <span className="text-[12px] font-mono font-black text-slate-800">{profile.qr_id || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-4 p-2 bg-blue-50 rounded border border-blue-100">
                                <BadgeCheck size={14} className="text-blue-500 shrink-0" />
                                <p className="text-[10px] font-bold text-blue-800 leading-tight">Identity verified against global production ledger.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
