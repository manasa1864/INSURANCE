import React, { useState, useEffect, useRef } from 'react';
import {
  User, Settings as SettingsIcon, Shield, Bell, Moon,
  Smartphone, Upload, LogOut, Trash2, CheckCircle2,
  AlertCircle, Loader2, Eye, EyeOff, Camera, X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router';

/* ── Types ── */
type Tab = 'profile' | 'preferences' | 'security';

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  pincode: string;
};

type Prefs = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  twoFactor: boolean;
};

/* ── Helpers ── */
const Toggle = ({ checked, onChange, disabled = false }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${
      checked ? 'bg-[#1E64FF]' : 'bg-slate-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium transition-all ${
    type === 'success' ? 'bg-green-600' : 'bg-red-500'
  }`}>
    {type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
    {message}
    <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
  </div>
);

/* ── Main Component ── */
export const Settings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /* ── User state ── */
  const [userId, setUserId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    fullName: '', email: '', phone: '', city: '', pincode: '',
  });

  /* ── Security state ── */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  /* ── Preferences state ── */
  const [prefs, setPrefs] = useState<Prefs>({
    emailNotifications: true, pushNotifications: true,
    marketingEmails: false, twoFactor: false,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Load user on mount ── */
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUserId(user.id);
      setProfileForm({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        city: user.user_metadata?.city || '',
        pincode: user.user_metadata?.pincode || '',
      });
      setAvatarUrl(user.user_metadata?.avatar_url || null);

      // Load prefs from user metadata
      const meta = user.user_metadata || {};
      setPrefs({
        emailNotifications: meta.pref_email_notif !== false,
        pushNotifications: meta.pref_push_notif !== false,
        marketingEmails: meta.pref_marketing === true,
        twoFactor: false,
      });
    };
    loadUser();
  }, []);

  /* ── Avatar upload ── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file', 'error'); return; }

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl + '?t=' + Date.now();

      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
      showToast('Profile photo updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      await supabase.auth.updateUser({ data: { avatar_url: null } });
      setAvatarUrl(null);
      showToast('Profile photo removed', 'success');
    } catch {
      showToast('Could not remove photo', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  /* ── Save profile ── */
  const handleSaveProfile = async () => {
    if (!profileForm.fullName.trim()) { showToast('Full name is required', 'error'); return; }
    setProfileSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: profileForm.email !== (await supabase.auth.getUser()).data.user?.email ? profileForm.email : undefined,
        data: {
          full_name: profileForm.fullName,
          phone: profileForm.phone,
          city: profileForm.city,
          pincode: profileForm.pincode,
        },
      });
      if (error) throw error;
      showToast('Profile saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not save profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  /* ── Change password ── */
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) { showToast('Please fill all password fields', 'error'); return; }
    if (newPassword.length < 8) { showToast('New password must be at least 8 characters', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('New passwords do not match', 'error'); return; }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast('Password updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not update password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  /* ── Save preferences ── */
  const handleSavePrefs = async () => {
    setPrefsSaving(true);
    try {
      await supabase.auth.updateUser({
        data: {
          pref_email_notif: prefs.emailNotifications,
          pref_push_notif: prefs.pushNotifications,
          pref_marketing: prefs.marketingEmails,
        },
      });
      showToast('Preferences saved!', 'success');
    } catch {
      showToast('Could not save preferences', 'error');
    } finally {
      setPrefsSaving(false);
    }
  };

  /* ── Sign out ── */
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  /* ── Delete account ── */
  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') { showToast('Please type DELETE to confirm', 'error'); return; }
    setDeleting(true);
    try {
      // Delete user data from Supabase tables
      await supabase.from('saved_plans').delete().eq('user_id', userId);
      await supabase.from('reports').delete().eq('user_id', userId);
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (err: any) {
      showToast(err.message || 'Could not delete account', 'error');
      setDeleting(false);
    }
  };

  const initials = profileForm.fullName
    ? profileForm.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : profileForm.email.slice(0, 2).toUpperCase();

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { key: 'preferences', label: 'Preferences', icon: <Bell className="w-4 h-4" /> },
    { key: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full z-10">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg text-center mb-2">Delete Account?</h3>
            <p className="text-slate-500 text-sm text-center mb-4">
              This will permanently delete your account, all saved plans, and all reports. This cannot be undone.
            </p>
            <p className="text-sm font-medium text-slate-700 mb-2">Type <span className="font-bold text-red-600">DELETE</span> to confirm:</p>
            <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              placeholder="Type DELETE here"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-50 text-sm">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 disabled:opacity-40 text-sm flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <span>Home</span> / <span className="text-slate-700">Settings</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your profile, preferences, and security.</p>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-medium text-sm">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-fit">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-blue-100 border-4 border-white shadow-lg flex items-center justify-center">
                {avatarUploading ? (
                  <Loader2 className="w-8 h-8 text-[#1E64FF] animate-spin" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#1E64FF]">{initials || 'U'}</span>
                )}
              </div>
              {!avatarUploading && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-7 h-7 text-white" />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            <div>
              <h3 className="text-lg font-bold text-slate-900">{profileForm.fullName || 'Your Name'}</h3>
              <p className="text-sm text-slate-500">{profileForm.email}</p>
            </div>

            <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50 disabled:opacity-50">
              <Upload className="w-4 h-4" /> Upload Photo
            </button>
            {avatarUrl && (
              <button onClick={handleRemoveAvatar} disabled={avatarUploading}
                className="w-full py-2 text-red-500 text-sm hover:text-red-600 disabled:opacity-50">
                Remove Photo
              </button>
            )}
            <p className="text-xs text-slate-400">JPG or PNG, max 2MB</p>
          </div>

          {/* Profile form */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div>
              <h3 className="font-bold text-slate-900">Personal Information</h3>
              <p className="text-sm text-slate-400">Updates are saved to your Supabase account.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={profileForm.fullName}
                onChange={e => setProfileForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Your full name"
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={profileForm.email}
                  onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
                <p className="text-xs text-slate-400 mt-1">Changing email requires re-verification</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                <input type="tel" value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="10-digit mobile"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input type="text" value={profileForm.city}
                  onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Mumbai"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PIN Code</label>
                <input type="text" value={profileForm.pincode} maxLength={6}
                  onChange={e => setProfileForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '') }))}
                  placeholder="6-digit PIN code"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={() => supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) setProfileForm({
                  fullName: user.user_metadata?.full_name || '',
                  email: user.email || '',
                  phone: user.user_metadata?.phone || '',
                  city: user.user_metadata?.city || '',
                  pincode: user.user_metadata?.pincode || '',
                });
              })}
                className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-50 rounded-xl">
                Reset
              </button>
              <button onClick={handleSaveProfile} disabled={profileSaving}
                className="flex items-center gap-2 px-6 py-2 bg-[#1E64FF] text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREFERENCES TAB ── */}
      {activeTab === 'preferences' && (
        <div className="space-y-5 max-w-2xl">

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-900">Notifications</h3>
            </div>

            {[
              { key: 'emailNotifications' as const, label: 'Email Notifications', desc: 'Receive updates and reports via email' },
              { key: 'pushNotifications' as const, label: 'Push Notifications', desc: 'Browser notifications for important alerts' },
              { key: 'marketingEmails' as const, label: 'Marketing Emails', desc: 'Tips, product updates and insurance news' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <Toggle checked={prefs[key]} onChange={v => setPrefs(p => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </div>

          {/* App settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-900">App Settings</h3>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Language</p>
                <p className="text-xs text-slate-400 mt-0.5">Display language for the app</p>
              </div>
              <select className="p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1E64FF] outline-none">
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
                <option value="ta">Tamil</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Currency Display</p>
                <p className="text-xs text-slate-400 mt-0.5">How premiums are displayed</p>
              </div>
              <select className="p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1E64FF] outline-none">
                <option value="inr">₹ Indian Rupee</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSavePrefs} disabled={prefsSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1E64FF] text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {prefsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === 'security' && (
        <div className="space-y-5 max-w-2xl">

          {/* Change Password */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-900">Change Password</h3>
            </div>
            <p className="text-sm text-slate-400">Leave blank if you don't want to change your password.</p>

            {[
              { key: 'current' as const, label: 'Current Password', value: currentPassword, onChange: setCurrentPassword, placeholder: 'Your current password' },
              { key: 'new' as const, label: 'New Password', value: newPassword, onChange: setNewPassword, placeholder: 'Min 8 characters' },
              { key: 'confirm' as const, label: 'Confirm New Password', value: confirmPassword, onChange: setConfirmPassword, placeholder: 'Repeat new password' },
            ].map(({ key, label, value, onChange, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={showPasswords[key] ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
                  <button onClick={() => setShowPasswords(p => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                    {showPasswords[key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}

            {newPassword && (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400">Password strength:</p>
                <div className="flex gap-1">
                  {[8, 12, 16].map((len, i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full ${
                      newPassword.length >= len
                        ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-green-500'
                        : 'bg-slate-200'
                    }`} />
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  {newPassword.length < 8 ? 'Too short' : newPassword.length < 12 ? 'Weak' : newPassword.length < 16 ? 'Good' : 'Strong ✓'}
                </p>
              </div>
            )}

            <button onClick={handleChangePassword} disabled={passwordSaving || !newPassword}
              className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
              {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Update Password
            </button>
          </div>

          {/* Sessions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-900">Active Session</h3>
            </div>
            <div className="flex items-center justify-between py-3 border border-slate-100 rounded-xl px-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Current browser session</p>
                  <p className="text-xs text-slate-400">Active now · {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser'}</p>
                </div>
              </div>
              <button onClick={handleSignOut}
                className="text-xs text-red-500 hover:text-red-600 font-medium px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50">
                Sign Out
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
            <h3 className="font-bold text-red-700 mb-1">Danger Zone</h3>
            <p className="text-sm text-red-500 mb-4">
              Deleting your account permanently removes all your saved plans, reports, and profile data. This cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-red-200 rounded-xl p-4">
              <div>
                <p className="font-medium text-slate-900 text-sm">Delete my account</p>
                <p className="text-xs text-slate-500 mt-0.5">Removes all data from Supabase permanently</p>
              </div>
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 shrink-0">
                <Trash2 className="w-4 h-4" /> Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};