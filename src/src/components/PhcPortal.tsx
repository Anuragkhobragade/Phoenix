import React, { useState, useEffect } from 'react';
import { UserProfile, VillageReferral } from '../types';
import { DOCTORS } from '../data';
import { db } from '../firebase';
import { 
    collection, 
    addDoc, 
    deleteDoc,
    doc,
    query, 
    onSnapshot, 
    orderBy
} from 'firebase/firestore';
import { 
    Building2, 
    Stethoscope, 
    AlertTriangle, 
    CheckCircle2, 
    Send, 
    FileText, 
    Search, 
    PlusCircle, 
    Clock, 
    Bed, 
    Phone, 
    UserCheck, 
    ShieldAlert, 
    LogOut,
    RefreshCw,
    Paperclip,
    Download,
    X,
    Eye,
    Trash2
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface PhcPortalProps {
    userProfile: UserProfile;
    onLogout: () => void;
}

export default function PhcPortal({ userProfile, onLogout }: PhcPortalProps) {
    const phcName = userProfile.phcName || 'Rampur Primary Health Center (PHC)';
    const staffName = userProfile.name || 'Village Healthcare Officer';

    const [referrals, setReferrals] = useState<VillageReferral[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<'new-checkup' | 'referrals-list'>('new-checkup');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Form state for New Patient Triage
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [patientAge, setPatientAge] = useState<number | ''>('');
    const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
    const [symptoms, setSymptoms] = useState('');
    const [bloodTestResults, setBloodTestResults] = useState('');
    const [decision, setDecision] = useState<'Treated_Locally' | 'Referred_Urgently'>('Treated_Locally');
    
    // Referral specific fields
    const [urgencyReason, setUrgencyReason] = useState<VillageReferral['urgencyReason']>('Low Platelets');
    const [urgencyDetails, setUrgencyDetails] = useState('');
    const [targetDoctorId, setTargetDoctorId] = useState<string>('');
    const [localPrescription, setLocalPrescription] = useState('');
    const [reportUrl, setReportUrl] = useState('');
    const [reportFileName, setReportFileName] = useState('');
    const [uploadingReport, setUploadingReport] = useState(false);
    const [viewingReport, setViewingReport] = useState<{ url: string; patientName?: string } | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('File is too large. Please select an image or PDF document under 2MB.');
            return;
        }

        setUploadingReport(true);
        setReportFileName(file.name);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setReportUrl(reader.result as string);
            setUploadingReport(false);
        };
        reader.onerror = () => {
            alert('Failed to read selected file.');
            setUploadingReport(false);
        };
    };

    const [submitting, setSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Live Sync Village Referrals for this PHC
    useEffect(() => {
        setLoading(true);
        let q;
        try {
            q = query(
                collection(db, 'village_referrals'),
                orderBy('createdAt', 'desc')
            );
        } catch (e) {
            q = collection(db, 'village_referrals');
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: VillageReferral[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                list.push({
                    id: docSnap.id,
                    ...data
                } as VillageReferral);
            });
            setReferrals(list);
            setLoading(false);
        }, (error) => {
            console.error("Firestore sync error in PhcPortal:", error);
            handleFirestoreError(error, OperationType.GET, 'village_referrals');
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Handle Form Submit
    const handleSubmitCheckup = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedbackMessage(null);

        if (!patientName.trim()) {
            setFeedbackMessage({ type: 'error', text: '⚠️ Please enter Patient Full Name before submitting.' });
            return;
        }

        if (!patientPhone.trim()) {
            setFeedbackMessage({ type: 'error', text: '⚠️ Please enter Mobile Number before submitting.' });
            return;
        }

        setSubmitting(true);
        try {
            const isReferred = decision === 'Referred_Urgently';
            const selectedDoc = DOCTORS.find(d => d.id === targetDoctorId);
            const newRecord: any = {
                phcId: userProfile.uid || '',
                phcName: phcName || '',
                phcStaffName: staffName || '',
                patientName: patientName.trim(),
                patientPhone: patientPhone.trim(),
                patientAge: Number(patientAge) || 30,
                patientGender: patientGender || 'Male',
                symptoms: symptoms.trim() || 'General Checkup',
                bloodTestResults: bloodTestResults.trim() || 'N/A',
                reportUrl: reportUrl.trim() || (isReferred ? 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=60' : ''),
                decision,
                status: isReferred ? 'Pending_Main_Doctor' : 'Treated_Locally',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (isReferred) {
                if (urgencyReason) newRecord.urgencyReason = urgencyReason;
                if (urgencyDetails.trim()) newRecord.urgencyDetails = urgencyDetails.trim();
                if (targetDoctorId) newRecord.targetDoctorId = targetDoctorId;
                if (selectedDoc) newRecord.targetDoctorName = selectedDoc.name;
            } else {
                if (localPrescription.trim()) newRecord.localPrescription = localPrescription.trim();
            }

            await addDoc(collection(db, 'village_referrals'), newRecord);

            setFeedbackMessage({
                type: 'success',
                text: isReferred 
                    ? selectedDoc 
                        ? `🚨 Urgent Referral assigned directly to ${selectedDoc.name} for ${patientName}!`
                        : `🚨 Urgent Referral broadcasted to Main Hospital for ${patientName}!`
                    : `✅ Patient ${patientName} checkup saved. Treated locally at ${phcName}.`
            });

            // Reset Form
            setPatientName('');
            setPatientPhone('');
            setPatientAge('');
            setSymptoms('');
            setBloodTestResults('');
            setLocalPrescription('');
            setUrgencyDetails('');
            setTargetDoctorId('');
            setReportUrl('');

            // Switch to list after 1.5s
            setTimeout(() => {
                setActiveTab('referrals-list');
                setFeedbackMessage(null);
            }, 1500);
        } catch (err: any) {
            console.error("Submit error:", err);
            setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to submit patient checkup.' });
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Deleting Patient Checkup / Referral Record
    const handleDeleteRecord = async (referralId: string, patientName: string) => {
        if (!window.confirm(`Are you sure you want to delete patient record for "${patientName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'village_referrals', referralId));
            setFeedbackMessage({
                type: 'success',
                text: `🗑️ Patient record for "${patientName}" has been deleted successfully.`
            });
        } catch (err: any) {
            console.error("Error deleting patient record:", err);
            setFeedbackMessage({
                type: 'error',
                text: err?.message || 'Failed to delete patient record.'
            });
        }
    };

    // Derived Statistics
    const totalToday = referrals.length;
    const treatedLocally = referrals.filter(r => r.decision === 'Treated_Locally').length;
    const referredUrgently = referrals.filter(r => r.decision === 'Referred_Urgently').length;
    const bedsReserved = referrals.filter(r => r.status === 'Bed_Reserved').length;

    // Filtered referrals list
    const filteredReferrals = referrals.filter((item) => {
        const matchesSearch = 
            item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.patientPhone.includes(searchTerm);

        if (!matchesSearch) return false;

        if (statusFilter === 'referred') return item.decision === 'Referred_Urgently' && item.status !== 'Bed_Reserved';
        if (statusFilter === 'bed-reserved') return item.status === 'Bed_Reserved';
        if (statusFilter === 'local') return item.decision === 'Treated_Locally';

        return true;
    });

    return (
        <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans pb-16">
            {/* Top Bar Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4 lg:px-8 shadow-xs">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold shadow-xs">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{phcName}</h1>
                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    PHC Center
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>Staff: <strong className="text-slate-800">{staffName}</strong></span>
                                <span>•</span>
                                <span>Email: {userProfile.email}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 lg:px-8 space-y-8">

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Checkups</span>
                            <Stethoscope className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900">{totalToday}</div>
                        <p className="text-[11px] text-slate-500 mt-1">Village patient records</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Treated Locally</span>
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="text-3xl font-extrabold text-emerald-600">{treatedLocally}</div>
                        <p className="text-[11px] text-slate-500 mt-1">Closed at Village PHC</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Hospital Referrals</span>
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="text-3xl font-extrabold text-rose-600">{referredUrgently}</div>
                        <p className="text-[11px] text-slate-500 mt-1">Sent to City Hospital</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Beds Reserved</span>
                            <Bed className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="text-3xl font-extrabold text-amber-600">{bedsReserved}</div>
                        <p className="text-[11px] text-slate-500 mt-1">Main doctor approved</p>
                    </div>
                </div>

                {/* Tab Controls */}
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                    <button
                        onClick={() => setActiveTab('new-checkup')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                            activeTab === 'new-checkup'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Step 2: New Patient Checkup & Triage</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('referrals-list')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                            activeTab === 'referrals-list'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>PHC Patient Records & Live Referrals</span>
                        {referredUrgently > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500 text-white font-bold ml-1">
                                {referredUrgently}
                            </span>
                        )}
                    </button>
                </div>

                {/* TAB 1: NEW PATIENT CHECKUP & TRIAGE FORM */}
                {activeTab === 'new-checkup' && (
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xs space-y-6">
                        <div className="border-b border-slate-150 pb-4">
                            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                <Stethoscope className="w-6 h-6 text-emerald-600" />
                                <span>PHC Patient Checkup & Triage Form</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Complete blood test & patient diagnosis. Choose local prescription OR refer urgently to Main Hospital.
                            </p>
                        </div>

                        {feedbackMessage && (
                            <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium ${
                                feedbackMessage.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}>
                                {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
                                <span>{feedbackMessage.text}</span>
                            </div>
                        )}

                        <form noValidate onSubmit={handleSubmitCheckup} className="space-y-6">
                            {/* Patient Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Patient Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Ramesh Kumar"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 text-sm font-semibold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Mobile Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 9876543210"
                                        value={patientPhone}
                                        onChange={(e) => setPatientPhone(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 text-sm font-mono font-semibold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                            Age *
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="35"
                                            value={patientAge}
                                            onChange={(e) => setPatientAge(e.target.value ? Number(e.target.value) : '')}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                            Gender
                                        </label>
                                        <select
                                            value={patientGender}
                                            onChange={(e) => setPatientGender(e.target.value as any)}
                                            className="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 text-sm font-bold"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Symptoms & Blood Test */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Symptoms & Vital Signs
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="e.g. High fever for 3 days, body pain, weakness..."
                                        value={symptoms}
                                        onChange={(e) => setSymptoms(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Blood Test Findings & Platelet Count
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="e.g. Platelets: 15,000 / mm³, Dengue NS1 Positive"
                                        value={bloodTestResults}
                                        onChange={(e) => setBloodTestResults(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 text-sm"
                                    />
                                </div>
                            </div>

                            {/* CRITICAL TRIAGE DECISION TOGGLE */}
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                                <label className="block text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                                    🏥 Clinical Triage Decision: Can Patient Be Treated Locally?
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setDecision('Treated_Locally')}
                                        className={`p-5 rounded-2xl border flex items-start gap-4 transition-all text-left cursor-pointer ${
                                            decision === 'Treated_Locally'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/30'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className={`p-3 rounded-xl ${decision === 'Treated_Locally' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-base text-slate-900">Treat Locally at PHC</h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Prescribe medicine locally at PHC and resolve case without hospital referral.
                                            </p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDecision('Referred_Urgently')}
                                        className={`p-5 rounded-2xl border flex items-start gap-4 transition-all text-left cursor-pointer ${
                                            decision === 'Referred_Urgently'
                                                ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/30'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className={`p-3 rounded-xl ${decision === 'Referred_Urgently' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <ShieldAlert className="w-6 h-6 animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-base text-rose-600">Cannot Treat Locally / Refer Urgently</h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Critical Condition! Upload patient report & broadcast emergency referral to Main Hospital specialist.
                                            </p>
                                        </div>
                                    </button>
                                </div>

                                {/* Dynamic inputs based on decision */}
                                {decision === 'Treated_Locally' ? (
                                    <div className="pt-4 border-t border-slate-200 space-y-3">
                                        <label className="block text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
                                            Local PHC Prescription & Medicine Given
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. Paracetamol 500mg (1-1-1), ORS Hydration packets, Rest for 3 days."
                                            value={localPrescription}
                                            onChange={(e) => setLocalPrescription(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-250 text-slate-900 text-sm focus:outline-none focus:border-emerald-600"
                                        />
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t border-slate-200 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-extrabold text-rose-700 uppercase tracking-wider mb-2">
                                                    Referral Reason / Emergency Category *
                                                </label>
                                                <select
                                                    value={urgencyReason}
                                                    onChange={(e) => setUrgencyReason(e.target.value as any)}
                                                    className="w-full px-4 py-3 rounded-xl bg-white border border-rose-300 text-slate-900 text-sm font-bold focus:outline-none focus:border-rose-600"
                                                >
                                                    <option value="Low Platelets">🩸 Low Platelets (Severe Dengue)</option>
                                                    <option value="Severe Dengue">🦟 Severe Dengue / Hemorrhagic Fever</option>
                                                    <option value="ICU Needed">🛏️ Critical ICU / Ventilator Needed</option>
                                                    <option value="Cardiac Emergency">🫀 Cardiac Emergency / Chest Pain</option>
                                                    <option value="Trauma">💥 Severe Trauma / Accident Fracture</option>
                                                    <option value="Other">⚠️ Other Emergency</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                                    Attach Lab Report (Photo / PDF Document)
                                                </label>
                                                <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                                                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-xl cursor-pointer transition-all shrink-0">
                                                        {uploadingReport ? (
                                                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                                                        ) : (
                                                            <Paperclip className="w-4 h-4 text-emerald-600" />
                                                        )}
                                                        <span>{reportFileName ? `Change File (${reportFileName.substring(0, 15)}...)` : '📷 Upload Photo / PDF File'}</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            onChange={handleFileUpload}
                                                            className="hidden"
                                                        />
                                                    </label>

                                                    <input
                                                        type="text"
                                                        placeholder="Or paste Report Image URL..."
                                                        value={reportUrl.startsWith('data:') ? '' : reportUrl}
                                                        onChange={(e) => {
                                                            setReportUrl(e.target.value);
                                                            setReportFileName('');
                                                        }}
                                                        className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-250 text-slate-900 text-xs focus:outline-none focus:border-emerald-600"
                                                    />
                                                </div>

                                                {reportFileName && (
                                                    <div className="mt-2 text-xs font-bold text-emerald-800 flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                                                        <span className="flex items-center gap-1.5 truncate">
                                                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                                            <span className="truncate">Attached: {reportFileName}</span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReportUrl('');
                                                                setReportFileName('');
                                                            }}
                                                            className="text-rose-600 hover:underline cursor-pointer text-[11px] shrink-0 font-bold"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2">
                                                👨‍⚕️ Select Specialist Doctor at Main Hospital (Direct Assignment)
                                            </label>
                                            <select
                                                value={targetDoctorId}
                                                onChange={(e) => setTargetDoctorId(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-teal-300 text-slate-900 text-sm font-bold focus:outline-none focus:border-teal-600 cursor-pointer shadow-xs"
                                            >
                                                <option value="">📢 Broadcast to All Main Hospital Doctors (Emergency Pool)</option>
                                                {DOCTORS.map((doc) => (
                                                    <option key={doc.id} value={doc.id}>
                                                        👨‍⚕️ {doc.name} — {doc.specialty}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                                Additional Doctor Notes for Main Hospital
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="e.g. Patient has severe abdominal pain. Platelets dropping rapidly. Immediate bed & blood transfusion required."
                                                value={urgencyDetails}
                                                onChange={(e) => setUrgencyDetails(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-250 text-slate-900 text-sm focus:outline-none focus:border-rose-600"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`px-8 py-4 rounded-2xl font-extrabold text-sm flex items-center gap-3 shadow-lg transition-all cursor-pointer ${
                                        decision === 'Referred_Urgently'
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                                    }`}
                                >
                                    {submitting ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : decision === 'Referred_Urgently' ? (
                                        <>
                                            <Send className="w-5 h-5" />
                                            <span>Send Urgently to Main Hospital</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span>Save Local Treatment</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TAB 2: REFERRALS LIST & LIVE STATUS */}
                {activeTab === 'referrals-list' && (
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-emerald-600" />
                                    <span>PHC Patient Triage Records & Live Doctor Responses</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Real-time tracking of referred patients and main doctor's bed reservations.
                                </p>
                            </div>

                            {/* Search & Filter */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search patient name / phone..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                                    />
                                </div>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                                >
                                    <option value="all">All Records</option>
                                    <option value="referred">🔴 Referred Urgently</option>
                                    <option value="bed-reserved">🟢 Bed Reserved</option>
                                    <option value="local">🟢 Treated Locally</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                                <p className="text-xs font-mono">Loading patient records from Cloud...</p>
                            </div>
                        ) : filteredReferrals.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 space-y-2">
                                <FileText className="w-12 h-12 mx-auto text-slate-400 stroke-[1.5]" />
                                <p className="text-sm font-bold text-slate-700">No patient checkups found matching filter.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredReferrals.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className={`p-5 rounded-2xl border transition-all ${
                                            item.decision === 'Referred_Urgently'
                                                ? item.status === 'Bed_Reserved'
                                                    ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
                                                    : 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-base font-extrabold text-slate-900">{item.patientName}</h3>
                                                    <span className="text-xs text-slate-500">({item.patientAge} yrs, {item.patientGender})</span>
                                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                                        <Phone className="w-3 h-3 text-slate-500" />
                                                        <span>{item.patientPhone}</span>
                                                    </span>
                                                </div>

                                                <p className="text-xs text-slate-700">
                                                    <strong className="text-slate-900">Symptoms:</strong> {item.symptoms}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    {item.bloodTestResults && (
                                                        <p className="text-xs text-amber-900 font-mono bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/80 inline-block font-semibold">
                                                            🩸 Lab Findings: {item.bloodTestResults}
                                                        </p>
                                                    )}
                                                    {item.reportUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingReport({ url: item.reportUrl!, patientName: item.patientName })}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>View Attached Report / PDF</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Decision & Status Badges */}
                                            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                                                {item.decision === 'Treated_Locally' ? (
                                                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Treated at Village PHC
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-rose-600 text-white shadow-xs flex items-center gap-1">
                                                            <ShieldAlert className="w-3.5 h-3.5" />
                                                            Urgent Referral: {item.urgencyReason}
                                                        </span>

                                                        {item.targetDoctorName && (
                                                            <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                                                                🎯 Directed To: {item.targetDoctorName}
                                                            </span>
                                                        )}

                                                        {item.status === 'Cancelled' || item.status === 'Declined' ? (
                                                            <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                Referral Declined / Cancelled
                                                            </span>
                                                        ) : item.status === 'Bed_Reserved' ? (
                                                            <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-600 text-white animate-pulse flex items-center gap-1">
                                                                <Bed className="w-3.5 h-3.5" />
                                                                {item.mainDoctorResponse?.assignedBed || 'Bed Reserved'}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-full flex items-center gap-1">
                                                                <Clock className="w-3 h-3 animate-spin" />
                                                                Waiting Main Hospital Doctor
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                 <div className="flex items-center gap-2">
                                                     <span className="text-[10px] text-slate-400 font-mono">
                                                         {new Date(item.createdAt).toLocaleString()}
                                                     </span>
                                                     <button
                                                         type="button"
                                                         onClick={() => handleDeleteRecord(item.id, item.patientName)}
                                                         className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                                         title="Delete Patient Record"
                                                     >
                                                         <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                                         <span>Delete</span>
                                                     </button>
                                                 </div>
                                            </div>
                                        </div>

                                        {/* Main Doctor Response Block */}
                                        {item.mainDoctorResponse && (
                                            <div className={`mt-4 p-4 rounded-xl space-y-2 ${
                                                item.status === 'Cancelled' || item.status === 'Declined'
                                                    ? 'bg-rose-50/90 border border-rose-200'
                                                    : 'bg-emerald-50/80 border border-emerald-200'
                                            }`}>
                                                <div className={`flex items-center justify-between text-xs font-extrabold ${
                                                    item.status === 'Cancelled' || item.status === 'Declined'
                                                        ? 'text-rose-950'
                                                        : 'text-emerald-900'
                                                }`}>
                                                    <span className="flex items-center gap-1.5">
                                                        <UserCheck className={`w-4 h-4 ${item.status === 'Cancelled' || item.status === 'Declined' ? 'text-rose-600' : 'text-emerald-600'}`} />
                                                        Doctor Action: {item.mainDoctorResponse.doctorName}
                                                    </span>
                                                    <span className={`px-2.5 py-0.5 rounded-md border font-mono font-bold ${
                                                        item.status === 'Cancelled' || item.status === 'Declined'
                                                            ? 'text-rose-900 bg-rose-100 border-rose-200'
                                                            : 'text-amber-900 bg-amber-100 border-amber-200'
                                                    }`}>
                                                        {item.mainDoctorResponse.assignedBed}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-800 italic bg-white p-3 rounded-lg border border-slate-200 shadow-2xs font-medium">
                                                    "{item.mainDoctorResponse.instructions}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* FULL-SCREEN REPORT / PDF LIGHTBOX MODAL */}
            {viewingReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-base text-white">Lab Report & Document Preview</h3>
                                    {viewingReport.patientName && <p className="text-xs text-slate-400">Patient: {viewingReport.patientName}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const isImg = viewingReport.url.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)/i.test(viewingReport.url);
                                        const link = document.createElement('a');
                                        link.href = viewingReport.url;
                                        link.download = `Lab_Report_${viewingReport.patientName || 'Patient'}.${isImg ? 'png' : 'pdf'}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Report</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingReport(null)}
                                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body Content */}
                        <div className="flex-1 p-6 bg-slate-100 overflow-auto flex items-center justify-center min-h-[400px]">
                            {viewingReport.url.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)/i.test(viewingReport.url) ? (
                                <img
                                    src={viewingReport.url}
                                    alt="Lab Report Attachment"
                                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-md border border-slate-200"
                                />
                            ) : (
                                <iframe
                                    src={viewingReport.url}
                                    title="PDF Document Viewer"
                                    className="w-full h-[70vh] rounded-2xl border border-slate-200 shadow-md bg-white"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
