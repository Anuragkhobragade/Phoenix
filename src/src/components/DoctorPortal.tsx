import React from 'react';
import { Page, Appointment, UserProfile, VillageReferral } from '../types';
import { DOCTORS } from '../data';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    orderBy
} from 'firebase/firestore';
import {
    ShieldCheck,
    Calendar,
    Clock,
    Check,
    X,
    Search,
    Filter,
    RefreshCw,
    AlertCircle,
    Inbox,
    FileText,
    LogOut,
    CheckCircle2,
    XCircle,
    Plus,
    Trash,
    Video,
    PhoneOff,
    Edit3,
    Bed,
    ShieldAlert,
    Building2,
    Send,
    UserCheck,
    Phone,
    Paperclip,
    Download,
    Eye,
    Share2
} from 'lucide-react';


interface DoctorPortalProps {
    setCurrentPage: (page: Page) => void;
    userProfile: UserProfile;
    onSignOut: () => void;
    onJoinVideoCall: (appointment: Appointment) => void;
}

export default function DoctorPortal({ setCurrentPage, userProfile, onSignOut, onJoinVideoCall }: DoctorPortalProps) {
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Village Referrals State (Step 3)
    const [villageReferrals, setVillageReferrals] = React.useState<VillageReferral[]>([]);
    const [activeDoctorTab, setActiveDoctorTab] = React.useState<'my-appointments' | 'village-referrals'>('my-appointments');
    const [selectedReferral, setSelectedReferral] = React.useState<VillageReferral | null>(null);
    const [assignedBed, setAssignedBed] = React.useState('Bed #104 - Emergency ICU');
    const [doctorInstructions, setDoctorInstructions] = React.useState('Platelets critically low. Bed #104 reserved in ICU. Proceed immediately to Main Hospital.');
    const [respondingReferral, setRespondingReferral] = React.useState(false);
    const [viewingReport, setViewingReport] = React.useState<{ url: string; patientName?: string } | null>(null);
    const [decliningReferral, setDecliningReferral] = React.useState<VillageReferral | null>(null);
    const [declineReasonCategory, setDeclineReasonCategory] = React.useState('ICU / Ventilator Beds Full');
    const [declineBadgeText, setDeclineBadgeText] = React.useState('ICU Beds Full - No Bed Available');
    const [declineAdvice, setDeclineAdvice] = React.useState('All ICU beds currently occupied. Please transfer patient immediately to District Civil Hospital.');

    // Share Patient Details & History State
    const [sharingReferral, setSharingReferral] = React.useState<VillageReferral | null>(null);
    const [sharingApt, setSharingApt] = React.useState<Appointment | null>(null);
    const [shareTargetDoctorId, setShareTargetDoctorId] = React.useState<string>(DOCTORS[0]?.id || 'doc-1');
    const [shareConsultNotes, setShareConsultNotes] = React.useState<string>('Sharing critical emergency PHC referral case for specialist consultation & second opinion.');
    const [submittingShare, setSubmittingShare] = React.useState(false);
    const [shareAttachments, setShareAttachments] = React.useState<{ name: string; url: string }[]>([]);
    const [uploadingShareAttachment, setUploadingShareAttachment] = React.useState(false);

    const handleShareFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (shareAttachments.length + files.length > 4) {
            alert('You can attach up to 4 photos/PDF documents per patient case share.');
            return;
        }

        setUploadingShareAttachment(true);
        const fileList = Array.from(files);
        let loadedCount = 0;
        const newItems: { name: string; url: string }[] = [];

        fileList.forEach((file) => {
            if (file.size > 3 * 1024 * 1024) {
                alert(`File "${file.name}" is over 3MB limit.`);
                loadedCount++;
                if (loadedCount === fileList.length) setUploadingShareAttachment(false);
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                newItems.push({ name: file.name, url: reader.result as string });
                loadedCount++;
                if (loadedCount === fileList.length) {
                    setShareAttachments((prev) => [...prev, ...newItems]);
                    setUploadingShareAttachment(false);
                }
            };
            reader.onerror = () => {
                loadedCount++;
                if (loadedCount === fileList.length) setUploadingShareAttachment(false);
            };
        });
    };

    const handleRemoveShareAttachment = (index: number) => {
        setShareAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    // Filter states
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [dateFilter, setDateFilter] = React.useState('');

    // File preview state
    const [previewFile, setPreviewFile] = React.useState<{ name: string; url: string } | null>(null);

    // Prescription editing state
    const [selectedAptForPrescribe, setSelectedAptForPrescribe] = React.useState<Appointment | null>(null);

    // Sync status messages
    const [syncMessage, setSyncMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Live Sync Village Referrals for Main Doctor Alert
    React.useEffect(() => {
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
                list.push({ id: docSnap.id, ...docSnap.data() } as VillageReferral);
            });
            setVillageReferrals(list);
        }, (err) => {
            console.error("Village Referrals Sync Error:", err);
        });

        return () => unsubscribe();
    }, []);

    // Handle Doctor Bed Reservation & Instructions Response
    const handleReserveBedAndRespond = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReferral) return;

        setRespondingReferral(true);
        try {
            await updateDoc(doc(db, 'village_referrals', selectedReferral.id), {
                status: 'Bed_Reserved',
                mainDoctorResponse: {
                    doctorId: userProfile.doctorId || userProfile.uid,
                    doctorName: userProfile.name || 'Main Hospital Specialist',
                    assignedBed: assignedBed.trim() || 'Bed Reserved',
                    instructions: doctorInstructions.trim() || 'Platelets bohot kam hain, turant shahar aao, bed book kar diya hai.',
                    respondedAt: new Date().toISOString()
                },
                updatedAt: new Date().toISOString()
            });

            setSyncMessage({
                type: 'success',
                text: `🟢 Emergency Action Saved! Assigned ${assignedBed} for ${selectedReferral.patientName}. Patient phone lookup updated.`
            });

            setSelectedReferral(null);
        } catch (err: any) {
            console.error("Error committing bed reservation:", err);
            setSyncMessage({ type: 'error', text: err?.message || 'Failed to update bed reservation.' });
        } finally {
            setRespondingReferral(false);
        }
    };

    // Handle Doctor Declining / Cancelling a Referral via Modal
    const handleConfirmDeclineReferral = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decliningReferral) return;

        setRespondingReferral(true);
        try {
            await updateDoc(doc(db, 'village_referrals', decliningReferral.id), {
                status: 'Cancelled',
                mainDoctorResponse: {
                    doctorId: userProfile.doctorId || userProfile.uid,
                    doctorName: userProfile.name || 'Main Hospital Specialist',
                    assignedBed: declineBadgeText.trim() || `Declined: ${declineReasonCategory}`,
                    instructions: declineAdvice.trim() || 'Referral Declined by Main Hospital Doctor.',
                    respondedAt: new Date().toISOString()
                },
                updatedAt: new Date().toISOString()
            });

            setSyncMessage({
                type: 'success',
                text: `🔴 Referral for ${decliningReferral.patientName} declined (${declineReasonCategory}). Instructions sent to Village PHC.`
            });

            setDecliningReferral(null);
        } catch (err: any) {
            console.error("Error declining referral:", err);
            setSyncMessage({ type: 'error', text: err?.message || 'Failed to decline referral.' });
        } finally {
            setRespondingReferral(false);
        }
    };

    // Handle Doctor Sharing Patient Case with another Specialist Doctor
    const handleConfirmSharePatientCase = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeItem = sharingReferral || sharingApt;
        if (!activeItem) return;

        const targetDoctorObj = DOCTORS.find(d => d.id === shareTargetDoctorId) || { name: 'Specialist Doctor', specialty: 'General Medicine' };
        setSubmittingShare(true);

        try {
            const finalAttachments = [...shareAttachments];
            if (sharingReferral?.reportUrl && !finalAttachments.some(a => a.url === sharingReferral.reportUrl)) {
                finalAttachments.unshift({ name: 'PHC Referral Lab Report', url: sharingReferral.reportUrl });
            }

            const shareLogEntry = {
                patientName: activeItem.patientName,
                patientPhone: 'patientPhone' in activeItem ? activeItem.patientPhone : (activeItem as any).patientPhone || '',
                sharedByDoctor: userProfile.name || 'Main Hospital Specialist',
                sharedWithDoctorId: shareTargetDoctorId,
                sharedWithDoctorName: targetDoctorObj.name,
                sharedWithDoctorSpecialty: targetDoctorObj.specialty,
                notes: shareConsultNotes.trim() || 'Forwarded patient case & history for consultation.',
                sharedAt: new Date().toISOString(),
                attachmentUrl: finalAttachments[0]?.url || '',
                attachmentName: finalAttachments[0]?.name || '',
                attachments: finalAttachments
            };

            if (sharingReferral) {
                const existingLogs = sharingReferral.sharedHistory || [];
                await updateDoc(doc(db, 'village_referrals', sharingReferral.id), {
                    sharedHistory: [...existingLogs, shareLogEntry],
                    lastSharedWith: targetDoctorObj.name,
                    updatedAt: new Date().toISOString()
                });
            } else if (sharingApt) {
                await updateDoc(doc(db, 'appointments', sharingApt.id), {
                    lastSharedWith: targetDoctorObj.name,
                    updatedAt: new Date().toISOString()
                });
            }

            setSyncMessage({
                type: 'success',
                text: `✅ Patient case & medical history for "${activeItem.patientName}" (${finalAttachments.length} attachments) successfully shared with Dr. ${targetDoctorObj.name} (${targetDoctorObj.specialty})!`
            });

            setSharingReferral(null);
            setSharingApt(null);
            setShareAttachments([]);
            setShareConsultNotes('Sharing critical emergency PHC referral case for specialist consultation & second opinion.');
        } catch (err: any) {
            console.error("Error sharing patient details:", err);
            setSyncMessage({ type: 'error', text: err?.message || 'Failed to share patient details.' });
        } finally {
            setSubmittingShare(false);
        }
    };

    // Live Sync Appointments for this doctor
    React.useEffect(() => {
        if (!userProfile.doctorId) {
            setError("No associated doctor profile linked. Please ask the administrator to link your doctor ID.");
            setLoading(false);
            return;
        }

        try {
            const q = query(
                collection(db, 'appointments'),
                where('doctorId', '==', userProfile.doctorId)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list: Appointment[] = [];
                snapshot.forEach((docSnap) => {
                    list.push(docSnap.data() as Appointment);
                });
                // Sort by date/time or created time descending
                list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setAppointments(list);
                setLoading(false);
                setError(null);
            }, (err) => {
                console.error("Doctor Live-Sync Error:", err);
                setError(err instanceof Error ? err.message : String(err));
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firestore setup error:", e);
            setError("Failed to initialize database sync.");
            setLoading(false);
        }
    }, [userProfile.doctorId]);

    // Handle approving an appointment
    const handleApprove = async (appointmentId: string) => {
        try {
            const appointmentRef = doc(db, 'appointments', appointmentId);
            await updateDoc(appointmentRef, { status: 'Confirmed' });
            showSyncMessage('success', `Appointment ${appointmentId} has been successfully approved.`);
        } catch (err: any) {
            console.error("Failed to approve appointment:", err);
            showSyncMessage('error', err instanceof Error ? err.message : String(err));
        }
    };

    // Handle rejecting/cancelling an appointment
    const handleReject = async (appointmentId: string) => {
        try {
            const appointmentRef = doc(db, 'appointments', appointmentId);
            await updateDoc(appointmentRef, { status: 'Cancelled' });
            showSyncMessage('success', `Appointment ${appointmentId} has been rejected.`);
        } catch (err: any) {
            console.error("Failed to reject appointment:", err);
            showSyncMessage('error', err instanceof Error ? err.message : String(err));
        }
    };

    const handleSavePrescription = async (diagnosis: string, doctorNotes: string, medicines: any[]) => {
        if (!selectedAptForPrescribe) return;
        try {
            const appointmentRef = doc(db, 'appointments', selectedAptForPrescribe.id);
            const prescriptionPayload = {
                diagnosis,
                doctorNotes,
                medicines,
                updatedAt: new Date().toISOString()
            };
            await updateDoc(appointmentRef, {
                prescription: prescriptionPayload
            });
            showSyncMessage('success', `Prescription saved for ${selectedAptForPrescribe.patientName}.`);
            setSelectedAptForPrescribe(null);
        } catch (err: any) {
            console.error("Failed to save prescription:", err);
            showSyncMessage('error', err instanceof Error ? err.message : String(err));
        }
    };

    const showSyncMessage = (type: 'success' | 'error', text: string) => {
        setSyncMessage({ type, text });
        setTimeout(() => {
            setSyncMessage(null);
        }, 5000);
    };

    const handleCancelCall = async (appointmentId: string) => {
        if (!window.confirm("Are you sure you want to decline/cancel this video call?")) return;
        try {
            await deleteDoc(doc(db, 'videoRooms', appointmentId));
            const apptRef = doc(db, 'appointments', appointmentId);
            await updateDoc(apptRef, {
                videoCallStatus: 'ended'
            });
            showSyncMessage('success', 'Video call declined successfully.');
        } catch (err: any) {
            console.error("Error declining video call:", err);
            showSyncMessage('error', 'Error: ' + err.message);
        }
    };

    // Filter appointments locally
    const filteredAppointments = appointments.filter((apt) => {
        const matchesSearch =
            apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.patientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
        const matchesDate = !dateFilter || apt.date === dateFilter;

        return matchesSearch && matchesStatus && matchesDate;
    });

    // Roster summary stats
    const totalCount = appointments.length;
    const pendingCount = appointments.filter(a => a.status === 'Pending').length;
    const confirmedCount = appointments.filter(a => a.status === 'Confirmed').length;
    const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;

    // Today's summary stats
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const todayAppointments = appointments.filter(a => a.date === todayStr && a.status !== 'Cancelled');
    const todayCount = todayAppointments.length;
    const attendedTodayCount = todayAppointments.filter(a => !!a.prescription).length;

    return (
        <div className="bg-slate-50/50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans" id="doctor-portal-root">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Welcome banner */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center shadow-xs gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                            <span className="bg-teal-50 border border-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full flex items-center">
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                Verified Doctor Account
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Welcome, {userProfile.name}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            Manage schedules, view patient histories, and approve clinic appointment slots below.
                        </p>
                    </div>

                    <button
                        onClick={onSignOut}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>

                {/* Sync status messages toast */}
                {syncMessage && (
                    <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-sm animate-pulse ${
                        syncMessage.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                            : 'bg-rose-50 border-rose-100 text-rose-900'
                    }`}>
                        {syncMessage.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        )}
                        <span className="font-bold">{syncMessage.text}</span>
                    </div>
                )}

                {/* Doctor Navigation Tabs */}
                <div className="flex border-b border-slate-200 space-x-6 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveDoctorTab('my-appointments')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeDoctorTab === 'my-appointments'
                                ? 'border-teal-600 text-teal-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        My Appointments Roster
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveDoctorTab('village-referrals')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                            activeDoctorTab === 'village-referrals'
                                ? 'border-rose-600 text-rose-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                        <span>Emergency PHC Referrals</span>
                        {villageReferrals.filter(r => r.status === 'Pending_Main_Doctor').length > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-rose-600 text-white font-extrabold shadow-sm animate-bounce">
                                {villageReferrals.filter(r => r.status === 'Pending_Main_Doctor').length} URGENT
                            </span>
                        )}
                    </button>
                </div>

                {/* TAB 2: PHC EMERGENCY REFERRALS VIEW */}
                {activeDoctorTab === 'village-referrals' && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-5">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                    <ShieldAlert className="w-6 h-6 text-rose-600" />
                                    <span>PHC Emergency Referral Review & Bed Reservation</span>
                                </h2>
                                <p className="text-slate-500 text-xs mt-1">
                                    Review critical blood test reports & symptoms from PHC centers. Reserve emergency beds & issue instructions.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-bold">
                                <Clock className="w-4 h-4 animate-spin" />
                                <span>Real-time Emergency Feed</span>
                            </div>
                        </div>

                        {villageReferrals.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                                <Inbox className="w-12 h-12 mx-auto text-slate-300" />
                                <p className="text-xs font-bold text-slate-500">No emergency referrals currently received from village PHCs.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {villageReferrals.map((item) => {
                                    const isPending = item.status === 'Pending_Main_Doctor';
                                    const isBedReserved = item.status === 'Bed_Reserved';

                                    return (
                                        <div 
                                            key={item.id}
                                            className={`p-6 rounded-2xl border transition-all ${
                                                isPending
                                                    ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20 shadow-md'
                                                    : 'bg-slate-50/70 border-slate-200'
                                            }`}
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="space-y-3 max-w-3xl">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                                                            <ShieldAlert className="w-3.5 h-3.5" />
                                                            {item.urgencyReason || 'Urgent Referral'}
                                                        </span>
                                                        {item.targetDoctorName && (
                                                            <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-teal-600 text-white flex items-center gap-1 shadow-sm animate-pulse">
                                                                🎯 Assigned To: {item.targetDoctorName}
                                                            </span>
                                                        )}
                                                        <h3 className="text-lg font-extrabold text-slate-900">{item.patientName}</h3>
                                                        <span className="text-xs text-slate-500 font-semibold">({item.patientAge} yrs, {item.patientGender})</span>
                                                        <span className="text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 font-mono">
                                                            <Phone className="w-3 h-3 text-teal-600" />
                                                            {item.patientPhone}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                                        <Building2 className="w-4 h-4 text-emerald-600" />
                                                        <span>From: <strong className="text-slate-800">{item.phcName}</strong> (Officer: {item.phcStaffName})</span>
                                                    </div>

                                                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                                                        <strong className="text-slate-900">Symptoms:</strong> {item.symptoms}
                                                    </p>

                                                    {item.bloodTestResults && (
                                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-bold flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <span>🩸 Lab Test Findings: </span>
                                                                <span className="text-rose-700 font-extrabold">{item.bloodTestResults}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.reportUrl && (
                                                        <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                                            {item.reportUrl.startsWith('data:image') || /\.(jpg|jpeg|png|webp)/i.test(item.reportUrl) ? (
                                                                <img 
                                                                    src={item.reportUrl} 
                                                                    alt="Report preview" 
                                                                    className="w-12 h-12 object-cover rounded-lg border border-emerald-300 shrink-0" 
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                                                                    📄
                                                                </div>
                                                            )}
                                                            <div className="flex-1 truncate">
                                                                <p className="text-xs font-extrabold text-emerald-950 truncate">Attached Lab Report Document / Photo</p>
                                                                <p className="text-[11px] text-emerald-700 font-medium">Uploaded by {item.phcStaffName}</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewingReport({ url: item.reportUrl!, patientName: item.patientName })}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all shrink-0 cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    <span>View Report / PDF</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.urgencyDetails && (
                                                        <p className="text-xs text-slate-600 italic">
                                                            "PHC Doctor Notes: {item.urgencyDetails}"
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Doctor Action Button / Result */}
                                                <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSharingReferral(item);
                                                                setShareConsultNotes(`Emergency PHC Referral Case for ${item.patientName} (${item.patientAge} yrs, ${item.patientGender}). Symptoms: ${item.symptoms}. Lab Findings: ${item.bloodTestResults || 'None'}`);
                                                            }}
                                                            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                            title="Share patient details & history with another specialist doctor"
                                                        >
                                                            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                                                            <span>Share Case</span>
                                                        </button>
                                                        {item.lastSharedWith && (
                                                            <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-indigo-100/80 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                                                                👥 Shared with: Dr. {item.lastSharedWith}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {isPending ? (
                                                         <div className="flex flex-col sm:flex-row items-center gap-2">
                                                             <button
                                                                 type="button"
                                                                 onClick={() => setSelectedReferral(item)}
                                                                 className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                                                             >
                                                                 <Bed className="w-4 h-4" />
                                                                 <span>Reserve Bed & Accept</span>
                                                             </button>
                                                             <button
                                                                 type="button"
                                                                 onClick={() => setDecliningReferral(item)}
                                                                 className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                                             >
                                                                 <XCircle className="w-4 h-4 text-rose-600" />
                                                                 <span>Decline / Cancel</span>
                                                             </button>
                                                         </div>
                                                     ) : item.status === 'Cancelled' || item.status === 'Declined' ? (
                                                         <div className="text-right space-y-1">
                                                             <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-rose-600 text-white inline-flex items-center gap-1">
                                                                 <XCircle className="w-3.5 h-3.5" />
                                                                 Declined / Cancelled
                                                             </span>
                                                             <p className="text-[11px] text-slate-500 font-mono">
                                                                 By {item.mainDoctorResponse?.doctorName || 'Doctor'}
                                                             </p>
                                                         </div>
                                                     ) : (
                                                         <div className="text-right space-y-1">
                                                             <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-600 text-white inline-flex items-center gap-1">
                                                                 <CheckCircle2 className="w-3.5 h-3.5" />
                                                                 {item.mainDoctorResponse?.assignedBed || 'Bed Reserved'}
                                                             </span>
                                                             <p className="text-[11px] text-slate-500 font-mono">
                                                                 Approved by {item.mainDoctorResponse?.doctorName}
                                                             </p>
                                                             <button
                                                                 type="button"
                                                                 onClick={() => setDecliningReferral(item)}
                                                                 className="text-[11px] text-rose-600 hover:underline font-bold block ml-auto mt-1 cursor-pointer"
                                                             >
                                                                 Revoke / Cancel Referral
                                                             </button>
                                                         </div>
                                                     )}

                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Received: {new Date(item.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Existing Doctor Response Display */}
                                            {item.mainDoctorResponse && (
                                                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 text-xs space-y-1.5">
                                                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                                                        <span>Doctor Message Sent to Patient:</span>
                                                        <span className="text-amber-300 font-mono">{item.mainDoctorResponse.assignedBed}</span>
                                                    </div>
                                                    <p className="italic bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                                                        "{item.mainDoctorResponse.instructions}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL: DOCTOR BED RESERVATION & RESPONSE */}
                {selectedReferral && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                        <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-lg shadow-2xl p-6 lg:p-8 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                        <Bed className="w-5 h-5 text-rose-600" />
                                        <span>Reserve Emergency Bed & Doctor Advice</span>
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-0.5">
                                        Patient: <strong className="text-slate-900">{selectedReferral.patientName}</strong> ({selectedReferral.phcName})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedReferral(null)}
                                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleReserveBedAndRespond} className="space-y-4">
                                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                                    <strong>Urgency:</strong> {selectedReferral.urgencyReason} | <strong>Lab Findings:</strong> {selectedReferral.bloodTestResults || 'N/A'}
                                </div>

                                {selectedReferral.reportUrl && (
                                    <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                        {selectedReferral.reportUrl.startsWith('data:image') || /\.(jpg|jpeg|png|webp)/i.test(selectedReferral.reportUrl) ? (
                                            <img 
                                                src={selectedReferral.reportUrl} 
                                                alt="Report preview" 
                                                className="w-12 h-12 object-cover rounded-lg border border-emerald-300 shrink-0" 
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                                                📄
                                            </div>
                                        )}
                                        <div className="flex-1 truncate">
                                            <p className="text-xs font-extrabold text-emerald-950 truncate">Patient Report / Document Attached</p>
                                            <p className="text-[11px] text-emerald-700 font-medium">Uploaded by {selectedReferral.phcStaffName}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setViewingReport({ url: selectedReferral.reportUrl!, patientName: selectedReferral.patientName })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all shrink-0 cursor-pointer"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Open Report</span>
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Reserved Bed Number & Ward *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Bed #104 - Emergency ICU"
                                        value={assignedBed}
                                        onChange={(e) => setAssignedBed(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-rose-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Doctor Instruction / Message For Patient *
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        placeholder="e.g. Platelets critically low. Bed #104 reserved in ICU. Proceed immediately to Main Hospital."
                                        value={doctorInstructions}
                                        onChange={(e) => setDoctorInstructions(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-600"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedReferral(null)}
                                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={respondingReferral}
                                        className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                                    >
                                        {respondingReferral ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        <span>Confirm Bed Reservation & Send Message</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Quick Stats Grid */}
                {activeDoctorTab === 'my-appointments' && (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
                    {/* Stat CARD - Total */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Booked</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-slate-900">{totalCount}</span>
                            <span className="text-[11px] text-slate-400 font-bold">schedules</span>
                        </div>
                    </div>
                    {/* Stat CARD - Pending */}
                    <div className="bg-amber-50/40 border border-amber-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-amber-600/80 uppercase tracking-widest">Awaiting Approval</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-amber-700">{pendingCount}</span>
                            <span className="text-[11px] text-amber-500 font-bold">pending</span>
                        </div>
                    </div>
                    {/* Stat CARD - Confirmed */}
                    <div className="bg-emerald-50/30 border border-emerald-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Confirmed & Active</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-emerald-700">{confirmedCount}</span>
                            <span className="text-[11px] text-emerald-500 font-bold">approved</span>
                        </div>
                    </div>
                    {/* Stat CARD - Cancelled */}
                    <div className="bg-rose-50/30 border border-rose-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest">Cancelled / Rejected</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-rose-700">{cancelledCount}</span>
                            <span className="text-[11px] text-rose-500 font-bold">slots</span>
                        </div>
                    </div>
                    {/* Stat CARD - Today's Appointments */}
                    <div className="bg-teal-50/30 border border-teal-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-teal-650 uppercase tracking-widest">Today's Appointments</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-teal-700">{todayCount}</span>
                            <span className="text-[11px] text-teal-500 font-bold">scheduled</span>
                        </div>
                    </div>
                    {/* Stat CARD - Attended Patients Today */}
                    <div className="bg-sky-50/30 border border-sky-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-sky-650 uppercase tracking-widest">Attended Today</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-sky-700">
                                {attendedTodayCount}
                                <span className="text-lg text-slate-400 font-normal">/{todayCount}</span>
                            </span>
                            <span className="text-[11px] text-sky-500 font-bold ml-1">completed</span>
                        </div>
                    </div>
                </div>

                {/* Filter Controls Panel */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Filter Rosters</h3>
                        </div>

                        {/* Search and Filters Input Wrapper */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:max-w-4xl">
                            {/* Search Name */}
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search patients name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                                />
                            </div>

                            {/* Status filter selection */}
                            <div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
                                >
                                    <option value="all">Any Status</option>
                                    <option value="Pending">Pending Approval</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>

                            {/* Date search selection */}
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
                                />
                                {dateFilter && (
                                    <button
                                        onClick={() => setDateFilter('')}
                                        className="absolute right-3 top-3.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold transition-all"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard List Display */}
                {loading ? (
                    <div className="bg-white border border-slate-100 rounded-3xl py-24 text-center space-y-4 shadow-xs">
                        <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
                        <p className="text-slate-500 font-mono text-xs font-bold">Querying clinical database documents...</p>
                    </div>
                ) : error ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-955 p-6 rounded-2xl space-y-3 shadow-xs">
                        <div className="flex items-center space-x-2 font-bold text-rose-900">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <span>Database Sync issue</span>
                        </div>
                        <p className="text-xs text-rose-800 leading-relaxed max-w-2xl">
                            Unable to sync document snapshots. Error: <strong>{error}</strong>.
                        </p>
                    </div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl py-20 text-center space-y-4 shadow-xs">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-2">
                            <Inbox className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-base">No Appointments Found</h3>
                        <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                            No appointment slots match the filter options. Keep patients updated by refreshing the filters.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                        <th className="py-4 px-6">ID & Patient Details</th>
                                        <th className="py-4 px-6">Schedule Slot</th>
                                        <th className="py-4 px-6">Reason / Symptoms</th>
                                        <th className="py-4 px-6">Status Badge</th>
                                        <th className="py-4 px-6 text-right">Approve / Reject Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150 text-xs sm:text-sm">
                                    {filteredAppointments.map((apt) => {
                                        const isPending = apt.status === 'Pending';
                                        const isConfirmed = apt.status === 'Confirmed';
                                        const isCancelled = apt.status === 'Cancelled';

                                        return (
                                            <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                                                
                                                {/* ID & Patient Info */}
                                                <td className="py-4.5 px-6 space-y-1">
                                                    <div className="font-mono text-[10px] font-extrabold text-slate-500 flex items-center space-x-1">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-160">
                                                            {apt.id}
                                                        </span>
                                                    </div>
                                                    <div className="font-extrabold text-slate-900 flex items-center gap-2">
                                                        <span>{apt.patientName}</span>
                                                        {(apt.patientAge || apt.patientGender) && (
                                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                                                                {[apt.patientAge ? `${apt.patientAge}y` : '', apt.patientGender || ''].filter(Boolean).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium">
                                                        {apt.patientEmail} • <span className="font-mono">{apt.patientPhone}</span>
                                                    </div>
                                                </td>

                                                {/* Schedule Date & Time */}
                                                <td className="py-4.5 px-6 space-y-1">
                                                    <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                                                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                                        <span>{apt.date}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                                                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span>{apt.timeSlot}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 pt-0.5">
                                                        {apt.consultationType && (
                                                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                                                                apt.consultationType === 'Online'
                                                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                            }`}>
                                                                {apt.consultationType === 'Online' ? (
                                                                    <>
                                                                        <Video className="h-3 w-3 mr-1 shrink-0 text-emerald-600 animate-pulse" />
                                                                        <span>Video Call</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>In-Person</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Symptom / Note Description */}
                                                <td className="py-4.5 px-6 max-w-xs">
                                                    {apt.notes ? (
                                                        <div className="flex items-start space-x-1.5 text-slate-655 font-medium leading-relaxed bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[11px] sm:text-xs">
                                                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                            <span className="line-clamp-2" title={apt.notes}>{apt.notes}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No notes logged</span>
                                                    )}

                                                    {apt.medicalHistory && (
                                                        <div className="mt-1.5 flex items-start space-x-1.5 text-rose-800 font-semibold leading-relaxed bg-rose-50/50 border border-rose-100/60 p-2 rounded-xl text-[10px] sm:text-[11px]">
                                                            <span className="font-bold uppercase tracking-wider font-mono text-[9px] text-rose-500 shrink-0 mt-0.5">Hx:</span>
                                                            <span className="line-clamp-2" title={apt.medicalHistory}>{apt.medicalHistory}</span>
                                                        </div>
                                                    )}

                                                    {apt.reports && apt.reports.length > 0 && (
                                                        <div className="mt-2.5 space-y-1">
                                                            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                                                                Attached Reports:
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {apt.reports.map((report, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => setPreviewFile(report)}
                                                                        className="inline-flex items-center space-x-1 bg-teal-50 border border-teal-100 hover:bg-teal-100 hover:border-teal-200 text-[10px] font-bold text-teal-800 px-2 py-1 rounded-lg transition-colors cursor-pointer truncate max-w-[150px] text-left"
                                                                        title={report.name}
                                                                    >
                                                                        <FileText className="h-3 w-3 shrink-0" />
                                                                        <span className="truncate">{report.name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status Display Badge */}
                                                <td className="py-4.5 px-6">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                                                        isConfirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                                        isCancelled ? 'bg-rose-50 border-rose-200 text-rose-800' :
                                                        'bg-amber-50 border-amber-200 text-amber-800'
                                                    }`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                                            isConfirmed ? 'bg-emerald-500' :
                                                            isCancelled ? 'bg-rose-500' :
                                                            'bg-amber-500'
                                                        }`} />
                                                        {apt.status}
                                                    </span>
                                                </td>

                                                {/* Roster Controls */}
                                                <td className="py-4.5 px-6 text-right font-medium">
                                                    <div className="flex flex-col items-end space-y-1.5">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSharingApt(apt);
                                                                    setShareConsultNotes(`Consultation Appointment Case for ${apt.patientName} (${apt.patientAge || 'N/A'} yrs). Date: ${apt.date} at ${apt.timeSlot}. Department: ${apt.departmentName}. Notes/Medical History: ${apt.medicalHistory || apt.notes || 'No prior notes.'}`);
                                                                }}
                                                                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 p-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                                                title="Share Patient Case with Specialist Doctor"
                                                            >
                                                                <Share2 className="h-3.5 w-3.5 text-indigo-600" />
                                                                <span>Share Case</span>
                                                            </button>

                                                            {isPending ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleReject(apt.id)}
                                                                        className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                                        title="Reject Schedule Slot"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                        <span>Reject</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleApprove(apt.id)}
                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs hover:shadow-sm"
                                                                        title="Approve Schedule Slot"
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                        <span>Approve</span>
                                                                    </button>
                                                                </>
                                                            ) : isConfirmed ? (
                                                                <>
                                                                    {apt.consultationType === 'Online' && (
                                                                        apt.videoCallStatus === 'ended' ? (
                                                                            <button
                                                                                disabled
                                                                                className="bg-slate-100 border border-slate-200 text-slate-400 p-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-not-allowed"
                                                                                title="Online Consultation Completed"
                                                                            >
                                                                                <Video className="h-4 w-4 text-slate-400" />
                                                                                <span>Completed</span>
                                                                            </button>
                                                                        ) : (
                                                                           <div className="flex items-center space-x-1.5">
                                                                               <button
                                                                                   onClick={() => onJoinVideoCall(apt)}
                                                                                   className={`text-white p-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm ${
                                                                                       apt.videoCallStatus === 'ready'
                                                                                           ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse'
                                                                                           : 'bg-teal-650 hover:bg-teal-700'
                                                                                   }`}
                                                                                   title="Start/Join Consultation Video Call"
                                                                               >
                                                                                   <Video className="h-4 w-4" />
                                                                                   <span>{apt.videoCallStatus === 'ready' ? 'Join Call' : 'Start Call'}</span>
                                                                               </button>
                                                                               {apt.videoCallStatus === 'ready' && (
                                                                                   <button
                                                                                       onClick={() => handleCancelCall(apt.id)}
                                                                                       className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs hover:shadow-sm"
                                                                                       title="Decline/Cancel Incoming Call"
                                                                                   >
                                                                                       <PhoneOff className="h-4 w-4" />
                                                                                   </button>
                                                                               )}
                                                                           </div>
                                                                        )
                                                                    )}
                                                                    <button
                                                                        onClick={() => setSelectedAptForPrescribe(apt)}
                                                                        className="bg-teal-600 hover:bg-teal-700 text-white p-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm"
                                                                        title="Treat Patient and Prescribe"
                                                                    >
                                                                        <FileText className="h-4 w-4" />
                                                                        <span>{apt.prescription ? 'Edit Prescription' : 'Treat Patient'}</span>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-400 font-semibold text-xs italic">
                                                                    Cancelled
                                                                </span>
                                                            )}
                                                        </div>

                                                        {apt.lastSharedWith && (
                                                            <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md inline-block">
                                                                👥 Shared: Dr. {apt.lastSharedWith}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                </>
                )}

            </div>

            {/* Premium File Preview Overlay Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs" id="file-preview-overlay">
                    <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="bg-slate-50 border-b border-slate-150 py-4 px-6 flex justify-between items-center shrink-0">
                            <div className="truncate pr-4 text-left">
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                                    Previewing: {previewFile.name}
                                </h3>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                                <a
                                    href={previewFile.url}
                                    download={previewFile.name}
                                    className="inline-flex items-center space-x-1.5 bg-teal-650 hover:bg-teal-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                    Download File
                                </a>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-105 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                                >
                                    <X className="h-4.5 w-4.5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-grow overflow-auto p-6 flex items-center justify-center bg-slate-50/50">
                            {previewFile.url.startsWith('data:image/') ? (
                                <img src={previewFile.url} className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xs" alt={previewFile.name} />
                            ) : previewFile.url.startsWith('data:application/pdf') ? (
                                <object data={previewFile.url} type="application/pdf" className="w-full h-[60vh] rounded-xl border border-slate-200">
                                    <div className="text-center p-6 space-y-3">
                                        <p className="text-sm font-semibold text-slate-600">PDF preview is not supported in this browser viewport.</p>
                                        <a href={previewFile.url} download={previewFile.name} className="inline-block bg-teal-650 hover:bg-teal-750 text-white font-bold py-2 px-4 rounded-xl text-xs">
                                            Download to View PDF
                                        </a>
                                    </div>
                                </object>
                            ) : (
                                <div className="text-center p-8 space-y-3">
                                    <FileText className="h-12 w-12 text-slate-400 mx-auto" />
                                    <p className="text-sm font-semibold text-slate-700">Preview not available directly in browser.</p>
                                    <a href={previewFile.url} download={previewFile.name} className="inline-block bg-teal-650 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-xl text-xs">
                                        Download to Open
                                    </a>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* Prescription Form Modal */}
            {selectedAptForPrescribe && (
                <PrescriptionModal
                    appointment={selectedAptForPrescribe}
                    onClose={() => setSelectedAptForPrescribe(null)}
                    onSave={handleSavePrescription}
                />
            )}

            {/* MODAL: DOCTOR DECLINE REFERRAL REASON */}
            {decliningReferral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-lg shadow-2xl p-6 lg:p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-rose-600" />
                                    <span>Decline Emergency Referral Request</span>
                                </h3>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    Patient: <strong className="text-slate-900">{decliningReferral.patientName}</strong> ({decliningReferral.phcName})
                                </p>
                            </div>
                            <button
                                onClick={() => setDecliningReferral(null)}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmDeclineReferral} className="space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Reason Category *
                                </label>
                                <select
                                    value={declineReasonCategory}
                                    onChange={(e) => {
                                        setDeclineReasonCategory(e.target.value);
                                        if (e.target.value === 'ICU / Ventilator Beds Full') {
                                            setDeclineBadgeText('ICU Beds Full - No Bed Available');
                                        } else if (e.target.value === 'Specialist Doctor Unavailable') {
                                            setDeclineBadgeText('Specialist Doctor Unavailable');
                                        } else if (e.target.value === 'Requires Higher Trauma Center') {
                                            setDeclineBadgeText('Transfer to Tertiary Trauma Center');
                                        } else if (e.target.value === 'Blood Bank Unit Unavailable') {
                                            setDeclineBadgeText('Blood Bank Unit Unavailable');
                                        }
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-extrabold focus:outline-none focus:border-rose-600"
                                >
                                    <option value="ICU / Ventilator Beds Full">🛏️ ICU / Ventilator Beds Full</option>
                                    <option value="Specialist Doctor Unavailable">👨‍⚕️ Specialist Doctor / On-call Surgeon Unavailable</option>
                                    <option value="Requires Higher Trauma Center">🚑 Requires Advanced Trauma Center / Tertiary Hospital</option>
                                    <option value="Blood Bank Unit Unavailable">🩸 Blood Bank / Platelet Storage Unavailable</option>
                                    <option value="Incomplete Patient Lab Findings">⚠️ Incomplete Lab Test / Patient Details</option>
                                    <option value="Other Emergency Reason">✏️ Other Emergency Reason</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Custom Cancellation Headline / Badge Text (Editable) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. ICU Beds Full - Refer to District Civil Hospital"
                                    value={declineBadgeText}
                                    onChange={(e) => setDeclineBadgeText(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-rose-50/50 border border-rose-300 text-slate-900 text-xs font-extrabold focus:outline-none focus:border-rose-600"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    This custom title will be displayed to the Village PHC health worker on their portal.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Doctor Advice / Action Instructions for PHC Worker *
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Explain why this request is declined and what action the village health worker should take next..."
                                    value={declineAdvice}
                                    onChange={(e) => setDeclineAdvice(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-600"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                                <button
                                    type="button"
                                    onClick={() => setDecliningReferral(null)}
                                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={respondingReferral}
                                    className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                                >
                                    {respondingReferral ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    <span>Confirm Decline & Send Instructions</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

            {/* SHARE PATIENT CASE MODAL */}
            {(sharingReferral || sharingApt) && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-5 text-white flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                                    <Share2 className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-base">Share Patient Case & Medical Details</h3>
                                    <p className="text-indigo-100 text-xs font-medium truncate max-w-[240px]">
                                        Forwarding: {(sharingReferral || sharingApt)?.patientName}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSharingReferral(null);
                                    setSharingApt(null);
                                }}
                                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleConfirmSharePatientCase} className="p-6 space-y-4">
                            {/* Summary Card */}
                            <div className="bg-indigo-50/70 border border-indigo-150 p-4 rounded-2xl space-y-2 text-xs">
                                <div className="flex items-center justify-between font-bold text-indigo-950">
                                    <span>👤 Patient: {(sharingReferral || sharingApt)?.patientName}</span>
                                    <span className="text-slate-500">
                                        {sharingReferral?.patientAge ? `(${sharingReferral.patientAge} yrs, ${sharingReferral.patientGender})` : ''}
                                    </span>
                                </div>
                                {sharingReferral?.patientPhone && (
                                    <div className="text-indigo-800 font-mono text-[11px]">
                                        📞 Registered Phone: {sharingReferral.patientPhone}
                                    </div>
                                )}
                                {sharingReferral?.symptoms && (
                                    <div className="text-slate-700">
                                        <strong className="text-slate-900">Symptoms:</strong> {sharingReferral.symptoms}
                                    </div>
                                )}
                                {sharingReferral?.bloodTestResults && (
                                    <div className="text-rose-700 font-extrabold font-mono text-[11px]">
                                        🩸 Lab Findings: {sharingReferral.bloodTestResults}
                                    </div>
                                )}
                                {sharingReferral?.phcName && (
                                    <div className="text-emerald-700 font-semibold text-[11px]">
                                        🏢 Referred From PHC: {sharingReferral.phcName}
                                    </div>
                                )}
                            </div>

                            {/* Recipient Doctor Selector */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                    Select Recipient Specialist Doctor *
                                </label>
                                <select
                                    value={shareTargetDoctorId}
                                    onChange={(e) => setShareTargetDoctorId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                                    required
                                >
                                    {DOCTORS.map((docItem) => (
                                        <option key={docItem.id} value={docItem.id}>
                                            👨‍⚕️ {docItem.name} — {docItem.specialty} ({docItem.title})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Notes / Reason for transfer */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                    Clinical Transfer Notes & History Reason *
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    value={shareConsultNotes}
                                    onChange={(e) => setShareConsultNotes(e.target.value)}
                                    placeholder="Enter clinical observations, urgency, or second-opinion instructions..."
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                                />
                            </div>

                            {/* Multi-Attachment Option: Photos / PDFs / Reports (up to 4) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                        Attach Photos, Lab Reports & PDFs (Up to 4)
                                    </label>
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                        {shareAttachments.length}/4 Attached
                                    </span>
                                </div>
                                
                                {shareAttachments.length < 4 && (
                                    <label className="block cursor-pointer">
                                        <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-indigo-300 rounded-2xl text-xs font-bold text-indigo-800 transition-all">
                                            <Paperclip className="w-4 h-4 text-indigo-600" />
                                            <span>+ Choose Photos or PDF Documents (Select up to 4, &lt;3MB each)</span>
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={handleShareFilesSelect}
                                            className="hidden"
                                        />
                                    </label>
                                )}

                                {uploadingShareAttachment && (
                                    <p className="text-[11px] text-indigo-600 font-medium animate-pulse">Processing file attachments...</p>
                                )}

                                {shareAttachments.length > 0 && (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {shareAttachments.map((item, idx) => (
                                            <div key={idx} className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 font-medium flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-sm shrink-0">
                                                        {item.url.startsWith('data:image') || /\.(jpg|jpeg|png|webp)/i.test(item.name) ? '🖼️' : '📄'}
                                                    </span>
                                                    <span className="truncate font-semibold text-[11px]">{item.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveShareAttachment(idx)}
                                                    className="p-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 cursor-pointer shrink-0 transition-colors"
                                                    title="Remove attachment"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-150">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSharingReferral(null);
                                        setSharingApt(null);
                                    }}
                                    className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingShare}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {submittingShare ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            <span>Sending Case...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            <span>Forward Patient Case</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

interface PrescriptionModalProps {
    appointment: Appointment;
    onClose: () => void;
    onSave: (diagnosis: string, doctorNotes: string, medicines: any[]) => Promise<void>;
}

const DOSAGE_PRESETS = [
    '1 Tablet',
    '1/2 Tablet',
    '2 Tablets',
    '1 Capsule',
    '1 Spoon (5ml)',
    '2 Spoons (10ml)',
    '1 Injection',
    '1 Puff (Inhaler)'
];

const DURATION_PRESETS = [
    '1 Day',
    '2 Days',
    '3 Days',
    '5 Days',
    '7 Days (1 Week)',
    '10 Days',
    '14 Days (2 Weeks)',
    '30 Days (1 Month)'
];

const TIMING_PRESETS = [
    '08:00 AM',
    '09:00 AM',
    '01:00 PM',
    '02:00 PM',
    '04:00 PM',
    '08:00 PM',
    '09:00 PM',
    '10:00 PM'
];

function PrescriptionModal({ appointment, onClose, onSave }: PrescriptionModalProps) {
    const [diagnosis, setDiagnosis] = React.useState(appointment.prescription?.diagnosis || '');
    const [doctorNotes, setDoctorNotes] = React.useState(appointment.prescription?.doctorNotes || '');
    const [medicines, setMedicines] = React.useState<any[]>(() => {
        if (appointment.prescription?.medicines) {
            return appointment.prescription.medicines.map((m: any) => {
                const timingsList = m.timing ? m.timing.split(', ') : ['08:00 AM'];
                return {
                    ...m,
                    timingsList
                };
            });
        }
        return [
            { name: '', dosage: '1 Tablet', frequency: 'Twice a day (Morning/Night)', timingsList: ['08:00 AM'], duration: '5 Days', notes: '' }
        ];
    });
    const [saving, setSaving] = React.useState(false);

    const handleAddMedicine = () => {
        setMedicines([
            ...medicines,
            { name: '', dosage: '1 Tablet', frequency: 'Twice a day (Morning/Night)', timingsList: ['08:00 AM'], duration: '5 Days', notes: '' }
        ]);
    };

    const handleRemoveMedicine = (index: number) => {
        const list = [...medicines];
        list.splice(index, 1);
        setMedicines(list);
    };

    const handleMedicineChange = (index: number, key: string, val: any) => {
        const list = [...medicines];
        list[index] = { ...list[index], [key]: val };
        setMedicines(list);
    };

    const handleAddTiming = (medIndex: number) => {
        const list = [...medicines];
        const timings = [...(list[medIndex].timingsList || [])];
        timings.push('08:00 PM');
        list[medIndex].timingsList = timings;
        setMedicines(list);
    };

    const handleRemoveTiming = (medIndex: number, timeIndex: number) => {
        const list = [...medicines];
        const timings = [...(list[medIndex].timingsList || [])];
        timings.splice(timeIndex, 1);
        list[medIndex].timingsList = timings;
        setMedicines(list);
    };

    const handleTimingChange = (medIndex: number, timeIndex: number, val: string) => {
        const list = [...medicines];
        const timings = [...(list[medIndex].timingsList || [])];
        timings[timeIndex] = val;
        list[medIndex].timingsList = timings;
        setMedicines(list);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!diagnosis.trim()) {
            alert('Please enter a diagnosis.');
            return;
        }

        const filtered = medicines.filter(m => m.name.trim() !== '').map(m => {
            const timingStr = m.timingsList ? m.timingsList.filter((t: string) => t.trim() !== '').join(', ') : '';
            return {
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                timing: timingStr,
                duration: m.duration,
                notes: m.notes || ''
            };
        });

        if (filtered.length === 0) {
            alert('Please add at least one medicine with a name.');
            return;
        }

        setSaving(true);
        try {
            await onSave(diagnosis, doctorNotes, filtered);
        } catch (err) {
            console.error("Prescription save error:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs" id="prescription-modal-overlay">
            <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col font-sans">
                
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-150 py-4 px-6 flex justify-between items-center shrink-0">
                    <div className="text-left">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                            Prescribe Treatment: {appointment.patientName}
                        </h3>
                        <p className="text-slate-400 text-xs mt-0.5">
                            {[appointment.patientAge ? `${appointment.patientAge} Yrs` : '', appointment.patientGender || '', appointment.medicalHistory ? `Hx: ${appointment.medicalHistory}` : ''].filter(Boolean).join(' • ')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-105 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                    >
                        <X className="h-4.5 w-4.5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-grow overflow-auto p-6 space-y-6 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Diagnosis */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Diagnosis / Findings *</label>
                            <textarea
                                value={diagnosis}
                                onChange={(e) => setDiagnosis(e.target.value)}
                                placeholder="Enter patient diagnosis (e.g. Acute Migraine, Vitamin Deficiency)"
                                className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl p-3 text-xs sm:text-sm bg-slate-50/50 min-h-[90px]"
                                required
                            />
                        </div>

                        {/* General Doctor Notes */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Doctor Notes / Advice</label>
                            <textarea
                                value={doctorNotes}
                                onChange={(e) => setDoctorNotes(e.target.value)}
                                placeholder="Diet advice, precautions, follow-up directions..."
                                className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl p-3 text-xs sm:text-sm bg-slate-50/50 min-h-[90px]"
                            />
                        </div>
                    </div>

                    {/* Medicines List */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Prescribed Medicines</label>
                            <button
                                type="button"
                                onClick={handleAddMedicine}
                                className="bg-teal-50 border border-teal-100 hover:bg-teal-100 text-teal-800 font-bold py-1 px-3 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Medicine
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                            {medicines.map((med, idx) => {
                                const isCustomDosage = med.dosage && !DOSAGE_PRESETS.includes(med.dosage) && med.dosage !== 'Custom';
                                const isCustomDuration = med.duration && !DURATION_PRESETS.includes(med.duration) && med.duration !== 'Custom';

                                return (
                                    <div key={idx} className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 space-y-3 relative">
                                        {medicines.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMedicine(idx)}
                                                className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer"
                                                title="Remove medicine"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-6">
                                            {/* Medicine Name */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicine Name *</label>
                                                <input
                                                    type="text"
                                                    value={med.name}
                                                    onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                                                    placeholder="e.g. Paracetamol"
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white"
                                                    required
                                                />
                                            </div>

                                            {/* Dosage Dropdown */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dosage *</label>
                                                <select
                                                    value={isCustomDosage ? 'Custom' : med.dosage}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        handleMedicineChange(idx, 'dosage', val === 'Custom' ? '' : val);
                                                    }}
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white cursor-pointer"
                                                >
                                                    {DOSAGE_PRESETS.map((preset) => (
                                                        <option key={preset} value={preset}>{preset}</option>
                                                    ))}
                                                    <option value="Custom">Custom / Other</option>
                                                </select>
                                                {(isCustomDosage || med.dosage === 'Custom' || med.dosage === '') && (
                                                    <input
                                                        type="text"
                                                        value={med.dosage === 'Custom' ? '' : med.dosage}
                                                        onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                                                        placeholder="Type Custom Dosage"
                                                        className="w-full mt-1.5 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white"
                                                        required
                                                    />
                                                )}
                                            </div>

                                            {/* Duration Dropdown */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration *</label>
                                                <select
                                                    value={isCustomDuration ? 'Custom' : med.duration}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        handleMedicineChange(idx, 'duration', val === 'Custom' ? '' : val);
                                                    }}
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white cursor-pointer"
                                                >
                                                    {DURATION_PRESETS.map((preset) => (
                                                        <option key={preset} value={preset}>{preset}</option>
                                                    ))}
                                                    <option value="Custom">Custom / Other</option>
                                                </select>
                                                {(isCustomDuration || med.duration === 'Custom' || med.duration === '') && (
                                                    <input
                                                        type="text"
                                                        value={med.duration === 'Custom' ? '' : med.duration}
                                                        onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                                                        placeholder="Type Custom Duration"
                                                        className="w-full mt-1.5 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white"
                                                        required
                                                    />
                                                )}
                                            </div>

                                            {/* Frequency Dropdown */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frequency *</label>
                                                <select
                                                    value={med.frequency}
                                                    onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white cursor-pointer"
                                                >
                                                    <option value="Twice a day (Morning/Night)">Twice a day (Morning/Night)</option>
                                                    <option value="Morning (After Food)">Morning (After Food)</option>
                                                    <option value="Night (Before Sleep)">Night (Before Sleep)</option>
                                                    <option value="Three times a day">Three times a day</option>
                                                    <option value="Once Daily (Empty Stomach)">Once Daily (Empty Stomach)</option>
                                                    <option value="Custom">Custom / Other</option>
                                                </select>
                                            </div>

                                            {/* Timing List Builder with "Add Another Time" */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specific Timings</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddTiming(idx)}
                                                        className="text-[10px] text-teal-800 font-extrabold hover:text-teal-905 flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Add Time
                                                    </button>
                                                </div>

                                                <div className="space-y-1.5">
                                                    {(med.timingsList || []).map((tVal: string, tIdx: number) => {
                                                        const isCustomTime = tVal && !TIMING_PRESETS.includes(tVal) && tVal !== 'Custom';

                                                        return (
                                                            <div key={tIdx} className="flex items-center space-x-1.5">
                                                                <select
                                                                    value={isCustomTime ? 'Custom' : tVal}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        handleTimingChange(idx, tIdx, val === 'Custom' ? '' : val);
                                                                    }}
                                                                    className="flex-grow border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-1.5 text-xs bg-white cursor-pointer"
                                                                >
                                                                    {TIMING_PRESETS.map((preset) => (
                                                                        <option key={preset} value={preset}>{preset}</option>
                                                                    ))}
                                                                    <option value="Custom">Custom Time</option>
                                                                </select>

                                                                {(isCustomTime || tVal === 'Custom' || tVal === '') && (
                                                                    <input
                                                                        type="text"
                                                                        value={tVal === 'Custom' ? '' : tVal}
                                                                        onChange={(e) => handleTimingChange(idx, tIdx, e.target.value)}
                                                                        placeholder="e.g. 08:30 AM"
                                                                        className="border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-1.5 text-xs bg-white w-24"
                                                                        required
                                                                    />
                                                                )}

                                                                {med.timingsList.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveTiming(idx, tIdx)}
                                                                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer"
                                                                        title="Remove time slot"
                                                                    >
                                                                        <Trash className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Directions / Notes */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Directions / Notes</label>
                                                <input
                                                    type="text"
                                                    value={med.notes || ''}
                                                    onChange={(e) => handleMedicineChange(idx, 'notes', e.target.value)}
                                                    placeholder="e.g. Take with milk"
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 border-t border-slate-150 pt-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Prescription'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
