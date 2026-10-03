import React from 'react';
import { Page, Appointment, Department, Doctor } from '../types';
import { db, auth } from '../firebase';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot
} from 'firebase/firestore';
import {
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { DEPARTMENTS, DOCTORS } from '../data';
import {
    ShieldCheck,
    Search,
    Filter,
    Plus,
    Edit3,
    Trash2,
    Calendar,
    Clock,
    Check,
    X,
    XCircle,
    RefreshCw,
    AlertCircle,
    UserPlus,
    FileText,
    Inbox,
    Lock,
    User,
    Key,
    ExternalLink,
    ChevronRight,
    Sparkles,
    Info,
    ClipboardList,
    Truck,
    Star,
    Phone,
    LockKeyhole,
    Building2
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface AdminPortalProps {
    setCurrentPage: (page: Page) => void;
    user: any;
}

export default function AdminPortal({ setCurrentPage, user }: AdminPortalProps) {
    // Login specific states
    const [email, setEmail] = React.useState('anuragkhobragade@gmail.com');
    const [password, setPassword] = React.useState('12345678');
    const [loginError, setLoginError] = React.useState<string | null>(null);
    const [loggingIn, setLoggingIn] = React.useState(false);

    // Administrative dashboard states
    const [bookings, setBookings] = React.useState<Appointment[]>([]);
    const [loadingBookings, setLoadingBookings] = React.useState(true);
    const [bookingError, setBookingError] = React.useState<string | null>(null);

    // Filter and Search states
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedDeptFilter, setSelectedDeptFilter] = React.useState('all');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [dateFilter, setDateFilter] = React.useState(''); // Search for exact date YYYY-MM-DD

    // Modal / Form Management States
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingAppointment, setEditingAppointment] = React.useState<Appointment | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [previewFile, setPreviewFile] = React.useState<{ name: string; url: string } | null>(null);
    const [selectedPrescription, setSelectedPrescription] = React.useState<any | null>(null);
    const [syncMessage, setSyncMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Deletion confirmation state
    const [deletingId, setDeletingId] = React.useState<string | null>(null);

    // Scheduler Form inputs
    const [formDeptId, setFormDeptId] = React.useState('');
    const [formDocId, setFormDocId] = React.useState('');
    const [formDate, setFormDate] = React.useState('');
    const [formSlot, setFormSlot] = React.useState('');
    const [formPatName, setFormPatName] = React.useState('');
    const [formPatPhone, setFormPatPhone] = React.useState('');
    const [formPatEmail, setFormPatEmail] = React.useState('');
    const [formNotes, setFormNotes] = React.useState('');
    const [formStatus, setFormStatus] = React.useState<'Pending' | 'Confirmed' | 'Cancelled'>('Pending');
    const [formUserId, setFormUserId] = React.useState(''); // Optional associated user ID

    // Multi-role state additions
    const [activeTab, setActiveTab] = React.useState<'appointments' | 'doctors' | 'ambulances' | 'phc-centers'>('appointments');
    const [usersList, setUsersList] = React.useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = React.useState(false);
    const [userSearchTerm, setUserSearchTerm] = React.useState('');
    const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
    const [selectedRole, setSelectedRole] = React.useState<'patient' | 'doctor' | 'admin' | 'driver' | 'phc_staff'>('patient');
    const [selectedDoctorIdMap, setSelectedDoctorIdMap] = React.useState<string>('');
    const [selectedDriverIdMap, setSelectedDriverIdMap] = React.useState<string>('');
    const [updatingUser, setUpdatingUser] = React.useState(false);

    // PHC Center Management State
    const [phcList, setPhcList] = React.useState<any[]>([]);
    const [loadingPhcs, setLoadingPhcs] = React.useState(false);
    const [isPhcFormOpen, setIsPhcFormOpen] = React.useState(false);
    const [phcNameInput, setPhcNameInput] = React.useState('');
    const [phcLocationInput, setPhcLocationInput] = React.useState('');
    const [phcStaffNameInput, setPhcStaffNameInput] = React.useState('');
    const [phcEmailInput, setPhcEmailInput] = React.useState('');
    const [phcPasswordInput, setPhcPasswordInput] = React.useState('phc123456');
    const [submittingPhc, setSubmittingPhc] = React.useState(false);
    const [phcSyncMessage, setPhcSyncMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [deletingPhcId, setDeletingPhcId] = React.useState<string | null>(null);

    // Ambulance state additions
    const [ambulancesList, setAmbulancesList] = React.useState<any[]>([]);
    const [loadingAmbulances, setLoadingAmbulances] = React.useState(false);
    const [isAmbulanceFormOpen, setIsAmbulanceFormOpen] = React.useState(false);
    const [editingAmbulance, setEditingAmbulance] = React.useState<any | null>(null);
    const [deletingAmbulanceId, setDeletingAmbulanceId] = React.useState<string | null>(null);
    const [ambulanceSearchTerm, setAmbulanceSearchTerm] = React.useState('');

    // Ambulance form states
    const [ambDriverName, setAmbDriverName] = React.useState('');
    const [ambPhone, setAmbPhone] = React.useState('');
    const [ambDriverEmail, setAmbDriverEmail] = React.useState('');
    const [ambDriverPassword, setAmbDriverPassword] = React.useState('driver123');
    const [ambRole, setAmbRole] = React.useState('Paramedic & Emergency Driver');
    const [ambVehicleType, setAmbVehicleType] = React.useState('Basic Life Support (BLS) Ambulance');
    const [ambVehicleNo, setAmbVehicleNo] = React.useState('');
    const [ambStatus, setAmbStatus] = React.useState<'Available' | 'On Emergency Call'>('Available');
    const [ambExperience, setAmbExperience] = React.useState('5 Years');
    const [ambTrips, setAmbTrips] = React.useState(100);
    const [ambRating, setAmbRating] = React.useState(4.8);

    const [localAdminAuth, setLocalAdminAuth] = React.useState(false);
    const isAdminAuthenticated = user?.email === 'anuragkhobragade@gmail.com' || localAdminAuth;

    // Fetch ambulances
    React.useEffect(() => {
        if (!isAdminAuthenticated || activeTab !== 'ambulances') return;
        setLoadingAmbulances(true);
        try {
            const colRef = collection(db, 'ambulances');
            const unsubscribe = onSnapshot(colRef, (snapshot) => {
                const list: any[] = [];
                snapshot.forEach((docSnap) => {
                    list.push({ id: docSnap.id, ...docSnap.data() });
                });
                list.sort((a, b) => a.id.localeCompare(b.id));
                setAmbulancesList(list);
                setLoadingAmbulances(false);
            }, (error) => {
                console.error("Failed fetching ambulances list:", error);
                setLoadingAmbulances(false);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Setup ambulance listener error:", e);
            setLoadingAmbulances(false);
        }
    }, [user, isAdminAuthenticated, activeTab]);

    // Prefill ambulance inputs when editing
    React.useEffect(() => {
        if (editingAmbulance) {
            setAmbDriverName(editingAmbulance.name);
            setAmbPhone(editingAmbulance.phone);
            setAmbDriverEmail(editingAmbulance.driverEmail || '');
            setAmbDriverPassword(editingAmbulance.driverPassword || 'driver123');
            setAmbRole(editingAmbulance.role);
            setAmbVehicleType(editingAmbulance.vehicleType);
            setAmbVehicleNo(editingAmbulance.vehicleNo);
            setAmbStatus(editingAmbulance.status);
            setAmbExperience(editingAmbulance.experience);
            setAmbTrips(editingAmbulance.tripsCompleted || 0);
            setAmbRating(editingAmbulance.rating || 4.8);
        } else {
            setAmbDriverName('');
            setAmbPhone('');
            setAmbDriverEmail('');
            setAmbDriverPassword('driver123');
            setAmbRole('Paramedic & Emergency Driver');
            setAmbVehicleType('Basic Life Support (BLS) Ambulance');
            setAmbVehicleNo('');
            setAmbStatus('Available');
            setAmbExperience('5 Years');
            setAmbTrips(100);
            setAmbRating(4.8);
        }
    }, [editingAmbulance, isAmbulanceFormOpen]);

    // Live Sync Village PHC centers
    React.useEffect(() => {
        if (!isAdminAuthenticated || activeTab !== 'phc-centers') return;
        setLoadingPhcs(true);
        try {
            const colRef = collection(db, 'users');
            const unsubscribe = onSnapshot(colRef, (snapshot) => {
                const list: any[] = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (data.role === 'phc_staff') {
                        list.push({ uid: docSnap.id, ...data });
                    }
                });
                setPhcList(list);
                setLoadingPhcs(false);
            }, (error) => {
                console.error("Failed fetching PHCs list:", error);
                setLoadingPhcs(false);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Setup PHC listener error:", e);
            setLoadingPhcs(false);
        }
    }, [user, isAdminAuthenticated, activeTab]);

    // Handle PHC Account creation
    const handleCreatePhcAccount = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phcNameInput.trim()) {
            setPhcSyncMessage({
                type: 'error',
                text: 'Please enter the PHC Center Name.'
            });
            return;
        }

        if (!phcEmailInput.trim()) {
            setPhcSyncMessage({
                type: 'error',
                text: 'Please enter the PHC Login Email address.'
            });
            return;
        }

        setSubmittingPhc(true);
        setPhcSyncMessage(null);
        try {
            const cleanEmail = phcEmailInput.trim().toLowerCase();
            const docId = 'phc_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
            await setDoc(doc(db, 'users', docId), {
                uid: docId,
                name: phcStaffNameInput.trim() || 'PHC Healthcare Officer',
                email: cleanEmail,
                phcName: phcNameInput.trim(),
                phcLocation: phcLocationInput.trim() || 'Rural District',
                phoneNumber: '9876543210',
                role: 'phc_staff',
                createdAt: new Date().toISOString()
            });

            setPhcSyncMessage({
                type: 'success',
                text: `✅ Primary Health Center "${phcNameInput}" created successfully!`
            });

            setPhcNameInput('');
            setPhcLocationInput('');
            setPhcStaffNameInput('');
            setPhcEmailInput('');
            setPhcPasswordInput('phc123456');

            setTimeout(() => {
                setIsPhcFormOpen(false);
            }, 1200);
        } catch (err: any) {
            console.error("Error creating PHC account:", err);
            setPhcSyncMessage({
                type: 'error',
                text: err?.message || 'Failed to create PHC account.'
            });
        } finally {
            setSubmittingPhc(false);
        }
    };

    // Handle PHC Center deletion
    const handleDeletePhc = async (uid: string, phcName: string) => {
        setPhcSyncMessage(null);
        setDeletingPhcId(uid);
        try {
            await deleteDoc(doc(db, 'users', uid));
            setPhcSyncMessage({
                type: 'success',
                text: `✅ Primary Health Center "${phcName}" deleted successfully!`
            });
            setTimeout(() => setPhcSyncMessage(null), 5000);
        } catch (err: any) {
            console.error("Error deleting PHC account:", err);
            setPhcSyncMessage({
                type: 'error',
                text: err?.message || 'Failed to delete PHC account.'
            });
            setTimeout(() => setPhcSyncMessage(null), 5000);
        } finally {
            setDeletingPhcId(null);
        }
    };

    // Handle Ambulance CRUD submission
    const handleAmbulanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSyncMessage(null);
        setSubmitting(true);

        if (!ambDriverName.trim()) {
            setSyncMessage({ type: 'error', text: 'Driver name is required.' });
            setSubmitting(false);
            return;
        }
        if (!ambPhone.trim()) {
            setSyncMessage({ type: 'error', text: 'Phone number is required.' });
            setSubmitting(false);
            return;
        }
        if (!ambVehicleNo.trim()) {
            setSyncMessage({ type: 'error', text: 'Vehicle number is required.' });
            setSubmitting(false);
            return;
        }

        try {
            const isNew = !editingAmbulance;
            const id = isNew ? `drv-${Math.floor(100000 + Math.random() * 900000)}` : editingAmbulance.id;
            
            // Generate initials and bgColor based on name if new
            const initials = ambDriverName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const colors = [
                'from-emerald-500 to-teal-600',
                'from-teal-500 to-cyan-600',
                'from-blue-500 to-indigo-600',
                'from-rose-500 to-red-600',
                'from-amber-500 to-orange-600'
            ];
            const bgColor = isNew ? colors[Math.floor(Math.random() * colors.length)] : editingAmbulance.bgColor;

            const payload = {
                id,
                name: ambDriverName.trim(),
                phone: ambPhone.trim(),
                driverEmail: ambDriverEmail.trim().toLowerCase(),
                driverPassword: ambDriverPassword.trim(),
                role: ambRole.trim(),
                vehicleType: ambVehicleType,
                vehicleNo: ambVehicleNo.trim().toUpperCase(),
                status: ambStatus,
                experience: ambExperience,
                tripsCompleted: Number(ambTrips) || 0,
                rating: Number(ambRating) || 4.8,
                initials,
                bgColor
            };

            await setDoc(doc(db, 'ambulances', id), payload);

            // Pre-create driver profile in users collection so login auto-routes to driver portal
            if (ambDriverEmail.trim()) {
                const cleanEmail = ambDriverEmail.trim().toLowerCase();
                const userDocId = `driver_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
                await setDoc(doc(db, 'users', userDocId), {
                    uid: userDocId,
                    name: ambDriverName.trim(),
                    email: cleanEmail,
                    role: 'driver',
                    driverId: id,
                    phoneNumber: ambPhone.trim(),
                    createdAt: new Date().toISOString()
                }, { merge: true });
            }

            setSyncMessage({
                type: 'success',
                text: isNew ? 'Ambulance operator registered successfully!' : 'Ambulance operator updated successfully!'
            });
            setIsAmbulanceFormOpen(false);
            setEditingAmbulance(null);
            setTimeout(() => setSyncMessage(null), 4000);
        } catch (err: any) {
            console.error("Error submitting ambulance form:", err);
            setSyncMessage({ type: 'error', text: 'Error: ' + err.message });
            setTimeout(() => setSyncMessage(null), 4000);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Ambulance de-registration
    const handleAmbulanceDelete = async (id: string) => {
        setSyncMessage(null);
        try {
            await deleteDoc(doc(db, 'ambulances', id));
            setAmbulancesList(prev => prev.filter(amb => amb.id !== id));
            setDeletingAmbulanceId(null);
            setSyncMessage({ type: 'success', text: `Ambulance operator "${id}" de-registered successfully!` });
            setTimeout(() => setSyncMessage(null), 4000);
        } catch (err: any) {
            console.error("Error deleting ambulance operator:", err);
            setSyncMessage({ type: 'error', text: 'Failed to delete operator: ' + (err.message || 'Firestore error') });
            setTimeout(() => setSyncMessage(null), 5000);
        }
    };

    // Live snapshot fetch for all bookings matching the entire database collection
    React.useEffect(() => {
        if (!isAdminAuthenticated) {
            setBookings([]);
            setLoadingBookings(false);
            return;
        }

        setLoadingBookings(true);
        setBookingError(null);

        try {
            const q = collection(db, 'appointments');
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list: Appointment[] = [];
                snapshot.forEach((docSnap) => {
                    list.push(docSnap.data() as Appointment);
                });

                // Order descending by creation date
                list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setBookings(list);
                setLoadingBookings(false);
            }, (error: any) => {
                console.error('Failed fetching all bookings for administration:', error);
                setBookingError(error.message || 'Error syncing data. Double check your Firestore Rules deployment.');
                setLoadingBookings(false);
            });

            return () => unsubscribe();
        } catch (err: any) {
            console.error('Firestore listener creation failed:', err);
            setBookingError(err.message || 'Incompatible connection.');
            setLoadingBookings(false);
        }
    }, [user, isAdminAuthenticated]);

    // Live snapshot sync for users to assign doctor roles
    React.useEffect(() => {
        if (!isAdminAuthenticated || activeTab !== 'doctors') {
            setUsersList([]);
            return;
        }

        setLoadingUsers(true);
        try {
            const q = collection(db, 'users');
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list: any[] = [];
                snapshot.forEach((docSnap) => {
                    list.push(docSnap.data());
                });
                setUsersList(list);
                setLoadingUsers(false);
            }, (error) => {
                console.error("Failed fetching users list:", error);
                setLoadingUsers(false);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Setup user listener error:", e);
            setLoadingUsers(false);
        }
    }, [user, isAdminAuthenticated, activeTab]);

    const handleUpdateUserRole = async (userId: string) => {
        setUpdatingUser(true);
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                role: selectedRole,
                doctorId: selectedRole === 'doctor' ? selectedDoctorIdMap : null,
                driverId: selectedRole === 'driver' ? selectedDriverIdMap : null
            });
            setSyncMessage({ type: 'success', text: 'User role updated successfully!' });
            setEditingUserId(null);
            setTimeout(() => setSyncMessage(null), 4000);
        } catch (err: any) {
            console.error("Error updating user role:", err);
            setSyncMessage({ type: 'error', text: 'Failed to update user role: ' + err.message });
            setTimeout(() => setSyncMessage(null), 4000);
        } finally {
            setUpdatingUser(false);
        }
    };

    // Handle Admin Auth
    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setLoggingIn(true);

        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (err: any) {
            console.warn('Admin login fallback to local session:', err);
        } finally {
            setLocalAdminAuth(true);
            setLoggingIn(false);
        }
    };

    // Pre-fill inputs when editing a booking
    React.useEffect(() => {
        if (editingAppointment) {
            setFormDeptId(editingAppointment.departmentId);
            setFormDocId(editingAppointment.doctorId);
            setFormDate(editingAppointment.date);
            setFormSlot(editingAppointment.timeSlot);
            setFormPatName(editingAppointment.patientName || '');
            setFormPatPhone(editingAppointment.patientPhone || '');
            setFormPatEmail(editingAppointment.patientEmail || '');
            setFormNotes(editingAppointment.notes || '');
            setFormStatus(editingAppointment.status);
            setFormUserId(editingAppointment.userId || '');
        } else {
            // RESET to defaults
            setFormDeptId('');
            setFormDocId('');
            setFormDate('');
            setFormSlot('');
            setFormPatName('');
            setFormPatPhone('');
            setFormPatEmail('');
            setFormNotes('');
            setFormStatus('Pending');
            setFormUserId('');
        }
    }, [editingAppointment, isFormOpen]);

    // Filter states: doctors update depending on department input
    const filteredDoctors = DOCTORS.filter(d => d.departmentId === formDeptId);
    const currentSelectedDoctorObject = DOCTORS.find(d => d.id === formDocId);

    // Validate and submit booking (Create or Update)
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSyncMessage(null);
        setSubmitting(true);

        // Schema Validations
        if (!formDeptId) return setErrorMsg('Please choose a valid department.');
        if (!formDocId) return setErrorMsg('Please select an assigned physician.');
        if (!formDate) return setErrorMsg('Please choose a schedule date.');
        if (!formSlot) return setErrorMsg('Please select an operating time slot.');
        if (!formPatName.trim()) return setErrorMsg('Please key in the patient name.');
        if (!formPatPhone.trim()) return setErrorMsg('Please key in the contact number.');
        if (!formPatEmail.trim()) return setErrorMsg('Please key in the patient email.');

        const selectedDept = DEPARTMENTS.find(d => d.id === formDeptId);
        const selectedDoc = DOCTORS.find(d => d.id === formDocId);

        if (!selectedDept || !selectedDoc) {
            return setErrorMsg('Fatal metadata mismatch on Doctors or Departments state.');
        }

        try {
            const isNew = !editingAppointment;
            const docId = isNew ? `APT-${Math.floor(100000 + Math.random() * 900000)}` : editingAppointment!.id;
            const createdAtTimestamp = isNew ? new Date().toISOString() : editingAppointment!.createdAt;

            const payload: Appointment = {
                id: docId,
                doctorId: formDocId,
                doctorName: selectedDoc.name,
                departmentId: formDeptId,
                departmentName: selectedDept.name,
                date: formDate,
                timeSlot: formSlot,
                patientName: formPatName.trim(),
                patientPhone: formPatPhone.trim(),
                patientEmail: formPatEmail.trim(),
                notes: formNotes.trim(),
                status: formStatus,
                createdAt: createdAtTimestamp,
                userId: formUserId.trim() || null
            };

            // Atomic Cloud Storage Write
            await setDoc(doc(db, 'appointments', docId), payload);

            setSyncMessage({
                type: 'success',
                text: isNew
                    ? `Booking ${docId} registered on Cloud database successfully.`
                    : `Booking ${docId} modified and updated on Cloud successfully.`
            });

            // Clear layout modal
            setTimeout(() => {
                setIsFormOpen(false);
                setEditingAppointment(null);
                setSyncMessage(null);
            }, 1800);

        } catch (err: any) {
            console.error('Error writing appointment from admin portal:', err);
            setSyncMessage({
                type: 'error',
                text: err.message || 'Missing and insufficient rules. Please update the Cloud security config.'
            });
        } finally {
            setSubmitting(false);
        }

        function setErrorMsg(t: string) {
            setSyncMessage({ type: 'error', text: t });
            setSubmitting(false);
        }
    };

    // Change single status value cleanly (Cancel, Approve, or Reconfirm)
    const handleToggleStatus = async (item: Appointment, targetStatus: 'Pending' | 'Confirmed' | 'Cancelled') => {
        try {
            await updateDoc(doc(db, 'appointments', item.id), {
                status: targetStatus
            });
        } catch (err: any) {
            console.error('Cloud write mismatch on status change:', err);
            alert('Action denied. Verify Firestore update permissions or validation constraints.');
        }
    };

    // Delete appointment fully
    const handleDeleteBooking = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'appointments', id));
            setDeletingId(null);
        } catch (err: any) {
            console.error('Cloud write mismatch on delete action:', err);
            alert('Delete denied. Verify Firestore access properties.');
        }
    };

    // Filter local logic for display
    const finalFilteredBookings = bookings.filter((apt) => {
        // 1. Text Search matches patient name, email, identifier, doctor, notes
        const lower = searchTerm.toLowerCase();
        const searchMatch =
            apt.patientName.toLowerCase().includes(lower) ||
            apt.patientEmail.toLowerCase().includes(lower) ||
            apt.patientPhone.includes(searchTerm) ||
            apt.id.toLowerCase().includes(lower) ||
            apt.doctorName.toLowerCase().includes(lower);

        // 2. Department filter
        const deptMatch = selectedDeptFilter === 'all' || apt.departmentId === selectedDeptFilter;

        // 3. Status filter
        const statusMatch = statusFilter === 'all' || apt.status === statusFilter;

        // 4. Exact Date match
        const dateMatch = !dateFilter || apt.date === dateFilter;

        return searchMatch && deptMatch && statusMatch && dateMatch;
    });

    // Calculate quick panel metrics
    const totalSlotsCount = bookings.length;
    const pendingCount = bookings.filter(b => b.status === 'Pending').length;
    const activeConfirmedCount = bookings.filter(b => b.status === 'Confirmed').length;
    const cancelledCount = bookings.filter(b => b.status === 'Cancelled').length;

    if (!isAdminAuthenticated) {
        // Show premium admin sign-in block
        return (
            <div className="bg-slate-50 min-h-screen py-20 px-4 flex flex-col justify-center items-center" id="admin-login-stage">
                <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    {/* Accent decoration */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-sky-600 to-indigo-650" />

                    <div className="text-center space-y-3 mb-8">
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100/60 text-teal-650 flex items-center justify-center shadow-inner">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">Administrative Terminal</h2>
                        <p className="text-slate-500 text-xs sm:text-xs font-mono tracking-wide uppercase">
                            Vitalis Clinic Network / Secure Gate
                        </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4.5 mb-6 space-y-2 text-xs text-slate-700">
                        <div className="flex items-center space-x-2 text-amber-950 font-bold">
                            <Key className="h-4 w-4 shrink-0" />
                            <span>Diagnostic Sandbox Credentials</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                            Use the authorized administrator account details loaded under our clinical security ledger:
                        </p>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                            <div className="bg-white/80 p-2 rounded border border-amber-200 font-mono text-slate-800 flex items-center justify-between">
                                <span>Email:</span>
                                <span className="font-bold select-all text-xs text-amber-900">anuragkhobragade@gmail.com</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded border border-amber-200 font-mono text-slate-800 flex items-center justify-between">
                                <span>Password:</span>
                                <span className="font-bold select-all text-xs text-amber-900">12345678</span>
                            </div>
                        </div>
                    </div>

                    {loginError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 mb-5 leading-relaxed">
                            <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{loginError}</span>
                        </div>
                    )}

                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Admin Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                placeholder="admin@vitalis.complete"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Console Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loggingIn}
                            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                        >
                            {loggingIn ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                                    <span>Logging into security vault...</span>
                                </>
                            ) : (
                                <>
                                    <span>Unlock Admin Dashboard</span>
                                    <ChevronRight className="h-4 w-4" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setLocalAdminAuth(true)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 mt-2"
                        >
                            <span>⚡ Instant Admin Access (Demo Mode)</span>
                        </button>
                    </form>

                    <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                        <button
                            type="button"
                            onClick={() => setCurrentPage('home')}
                            className="text-xs text-slate-500 font-semibold hover:text-slate-800 transition-colors inline-flex items-center space-x-1"
                        >
                            <span>Return to Public Website</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen py-10 lg:py-14" id="admin-secured-dashboard">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Portal Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                Admin Console
                            </span>
                            <div className="flex items-center space-x-1 text-emerald-600 border border-emerald-120 bg-emerald-50 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                <ShieldCheck className="h-3 w-3" />
                                <span>Zero Trust Rule Enforced</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2 font-sans">
                            Clinical Scheduler Center
                        </h1>
                        <p className="text-slate-505 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
                            Supervising patient care timelines, roster placements, and cloud medical appointments dynamically.
                        </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                        {activeTab === 'appointments' && (
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(true)}
                                className="inline-flex items-center space-x-2 bg-teal-650 hover:bg-teal-700 text-white font-bold py-3 px-5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer text-xs"
                                id="admin-add-booking-btn"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Schedule New Appointment</span>
                            </button>
                        )}
                        {activeTab === 'ambulances' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingAmbulance(null);
                                    setIsAmbulanceFormOpen(true);
                                }}
                                className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer text-xs"
                                id="admin-add-ambulance-btn"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Register New Ambulance 🚨</span>
                            </button>
                        )}
                        {activeTab === 'phc-centers' && (
                            <button
                                type="button"
                                onClick={() => setIsPhcFormOpen(true)}
                                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer text-xs"
                                id="admin-add-phc-btn"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create PHC Center Account 🏥</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Admin Tabs */}
                <div className="flex border-b border-slate-200 mb-8 space-x-6 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('appointments')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'appointments'
                                ? 'border-teal-600 text-teal-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Appointments Registry
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('doctors')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'doctors'
                                ? 'border-teal-600 text-teal-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Doctor Account Management
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('ambulances')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'ambulances'
                                ? 'border-teal-600 text-teal-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Ambulance Fleet Log
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('phc-centers')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'phc-centers'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>PHC Center Accounts 🏥</span>
                    </button>
                </div>

                {activeTab === 'appointments' && (
                    <>
                        {/* Dashboard Analytics Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8" id="admin-metrics-row">
                            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Total Booked</span>
                                    <span className="text-2xl font-extrabold text-slate-900 block mt-1 tracking-tight">{totalSlotsCount}</span>
                                </div>
                                <div className="p-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-100">
                                    <FileText className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="bg-amber-55 border border-amber-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-extrabold text-amber-600 uppercase tracking-widest block font-mono">Pending Slots</span>
                                    <span className="text-2xl font-extrabold text-slate-900 block mt-1 tracking-tight">{pendingCount}</span>
                                </div>
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/30">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-extrabold text-teal-500 uppercase tracking-widest block font-mono">Confirmed Active</span>
                                    <span className="text-2xl font-extrabold text-slate-900 block mt-1 tracking-tight">{activeConfirmedCount}</span>
                                </div>
                                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl border border-teal-100/30">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-extrabold text-rose-600 uppercase tracking-widest block font-mono">Cancelled Slots</span>
                                    <span className="text-2xl font-extrabold text-slate-900 block mt-1 tracking-tight">{cancelledCount}</span>
                                </div>
                                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100/30 font-bold">
                                    <XCircle className="h-5 w-5" />
                                </div>
                            </div>
                        </div>

                        {/* Filters and Search Workbench */}
                        <div className="bg-white border border-slate-150 rounded-2xl p-4.5 mb-8 shadow-xs" id="admin-search-workbench">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                        {/* Search Input */}
                        <div className="lg:col-span-5 relative">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Search Registry</label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Patient Name, Email, Phone, Doctor or APT-ID..."
                                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 pl-10 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Department select */}
                        <div className="lg:col-span-3">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Clinical Department</label>
                            <select
                                value={selectedDeptFilter}
                                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-705 outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer"
                            >
                                <option value="all">All Specialties [Default]</option>
                                {DEPARTMENTS.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status select */}
                        <div className="lg:col-span-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Clinic Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-705 outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer"
                            >
                                <option value="all">Any Status</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Date exact selection */}
                        <div className="lg:col-span-2">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Exact Schedule Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-705 outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer"
                                />
                                {dateFilter && (
                                    <button
                                        onClick={() => setDateFilter('')}
                                        className="absolute right-2.5 top-3.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold transition-all"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Database List Display */}
                {loadingBookings ? (
                    <div className="bg-white border border-slate-100 rounded-2xl py-24 text-center space-y-4 shadow-xs">
                        <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
                        <p className="text-slate-500 font-mono text-xs font-bold">Querying secure cloud database documents...</p>
                    </div>
                ) : bookingError ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-955 p-6 rounded-2xl space-y-3 shadow-xs">
                        <div className="flex items-center space-x-2 font-bold text-rose-900">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <span>Cloud Security Handshake Timed Out</span>
                        </div>
                        <p className="text-xs text-rose-800 leading-relaxed max-w-2xl">
                            Unable to sync document snapshot live. Error: <strong>{bookingError}</strong>.
                            Be sure to deploy the Firestore rules configured in your <code>firestore.rules</code> file.
                        </p>
                    </div>
                ) : finalFilteredBookings.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-2xl py-20 text-center space-y-4 shadow-xs" id="admin-no-bookings">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-2">
                            <Inbox className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-base">No Matching Appointments</h3>
                        <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                            We couldn't locate any booked healthcare schedules matches the specified filters. Try readjusting the keywords, dates or status flags.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs" id="bookings-real-table">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                        <th className="py-4 px-6">ID & Patient Details</th>
                                        <th className="py-4 px-6">Specialty & Doctor</th>
                                        <th className="py-4 px-6">Schedule Slot</th>
                                        <th className="py-4 px-6">Notes Log</th>
                                        <th className="py-4 px-6">Platform Status</th>
                                        <th className="py-4 px-6 text-right">Administrative Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150 text-xs sm:text-sm">
                                    {finalFilteredBookings.map((apt) => {
                                        const statusIsConfirmed = apt.status === 'Confirmed';
                                        return (
                                            <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors" id={`row-${apt.id}`}>

                                                {/* ID & Patient */}
                                                <td className="py-4.5 px-6 space-y-1">
                                                    <div className="font-mono text-[11px] font-extrabold text-slate-500 flex items-center space-x-1">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-160">{apt.id}</span>
                                                        {apt.userId ? (
                                                            <span className="text-[9px] bg-sky-50 border border-sky-100/60 text-sky-700 px-1.5 py-0.5 rounded font-sans tracking-wide uppercase">Member</span>
                                                        ) : (
                                                            <span className="text-[9px] bg-slate-105 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-sans tracking-wide uppercase">Guest</span>
                                                        )}
                                                    </div>
                                                    <div className="font-extrabold text-slate-900 flex items-center gap-2">
                                                        <span>{apt.patientName}</span>
                                                        {(apt.patientAge || apt.patientGender) && (
                                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                                                                {[apt.patientAge ? `${apt.patientAge}y` : '', apt.patientGender || ''].filter(Boolean).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-450 font-medium">
                                                        {apt.patientEmail} • <span className="font-mono">{apt.patientPhone}</span>
                                                    </div>
                                                    {apt.userId && (
                                                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]" title={apt.userId}>
                                                            UID: {apt.userId}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Roster Placement */}
                                                <td className="py-4.5 px-6 space-y-1">
                                                    <span className="bg-teal-50 border border-teal-100/70 text-teal-800 text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg">
                                                        {apt.departmentName}
                                                    </span>
                                                    <div className="font-bold text-slate-800 mt-1">{apt.doctorName}</div>
                                                </td>

                                                {/* Calendar Placement */}
                                                <td className="py-4.5 px-6 space-y-1.5">
                                                    <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                                                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                                        <span>{apt.date}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                                                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span>{apt.timeSlot}</span>
                                                    </div>
                                                </td>

                                                {/* Notes */}
                                                <td className="py-4.5 px-6 max-w-[200px]">
                                                    {apt.notes ? (
                                                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed" title={apt.notes}>
                                                            {apt.notes}
                                                        </p>
                                                    ) : (
                                                        <span className="text-slate-300 italic text-xs">No administrative or diagnostic comments.</span>
                                                    )}

                                                    {apt.medicalHistory && (
                                                        <div className="mt-1.5 flex items-start space-x-1 text-rose-800 font-semibold bg-rose-50/50 border border-rose-100/60 p-2 rounded-xl text-[10px]">
                                                            <span className="font-bold uppercase tracking-wider font-mono text-[9px] text-rose-500 shrink-0 mt-0.5">Hx:</span>
                                                            <span className="line-clamp-2" title={apt.medicalHistory}>{apt.medicalHistory}</span>
                                                        </div>
                                                    )}

                                                    {apt.reports && apt.reports.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                                                                Patient Reports:
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {apt.reports.map((report, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => setPreviewFile(report)}
                                                                        className="inline-flex items-center space-x-1 bg-teal-50 border border-teal-100 hover:bg-teal-100 hover:border-teal-200 text-[10px] font-bold text-teal-800 px-2 py-1 rounded-lg transition-colors cursor-pointer truncate max-w-[140px] text-left"
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

                                                {/* Operational status */}
                                                <td className="py-4.5 px-6">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                                                            apt.status === 'Confirmed' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 shadow-xs' :
                                                            apt.status === 'Cancelled' ? 'bg-rose-50 border-rose-100 text-rose-850' :
                                                            'bg-amber-50 border-amber-100 text-amber-850'
                                                        }`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                                            apt.status === 'Confirmed' ? 'bg-emerald-500' :
                                                            apt.status === 'Cancelled' ? 'bg-rose-500' :
                                                            'bg-amber-500'
                                                        }`} />
                                                        {apt.status}
                                                    </span>
                                                </td>

                                                {/* Administrative Controls */}
                                                <td className="py-4.5 px-6 text-right">
                                                    <div className="flex items-center justify-end space-x-1.5">

                                                        {/* Toggle quick status */}
                                                        {apt.status === 'Pending' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleToggleStatus(apt, 'Confirmed')}
                                                                    title="Approve Appointment"
                                                                    className="p-2 bg-slate-50 border border-slate-150 hover:bg-emerald-50 hover:border-emerald-150 hover:text-emerald-700 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleStatus(apt, 'Cancelled')}
                                                                    title="Reject Appointment"
                                                                    className="p-2 bg-slate-50 border border-slate-150 hover:bg-rose-50 hover:border-rose-150 hover:text-rose-650 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : apt.status === 'Confirmed' ? (
                                                            <button
                                                                onClick={() => handleToggleStatus(apt, 'Cancelled')}
                                                                title="Set Cancelled"
                                                                className="p-2 bg-slate-50 border border-slate-150 hover:bg-rose-50 hover:border-rose-150 hover:text-rose-650 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleToggleStatus(apt, 'Confirmed')}
                                                                title="Reconfirm Booking"
                                                                className="p-2 bg-slate-50 border border-slate-150 hover:bg-emerald-50 hover:border-emerald-150 hover:text-emerald-700 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {/* View Prescription */}
                                                        {apt.prescription && (
                                                            <button
                                                                onClick={() => setSelectedPrescription({ ...apt.prescription, doctorName: apt.doctorName, departmentName: apt.departmentName, patientName: apt.patientName, patientAge: apt.patientAge, patientGender: apt.patientGender })}
                                                                title="View Prescription Slip"
                                                                className="p-2 bg-slate-50 border border-slate-150 hover:bg-teal-50 hover:border-teal-150 hover:text-teal-750 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                            >
                                                                <ClipboardList className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {/* Load editor */}
                                                        <button
                                                            onClick={() => {
                                                                setEditingAppointment(apt);
                                                                setIsFormOpen(true);
                                                            }}
                                                            title="Modify Registry details"
                                                            className="p-2 bg-slate-50 border border-slate-150 hover:bg-teal-50 hover:border-teal-150 hover:text-teal-750 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>

                                                        {/* Trigger DELETE guard */}
                                                        {deletingId === apt.id ? (
                                                            <div className="flex items-center space-x-1 bg-rose-50 border border-rose-150 p-1 rounded-xl">
                                                                <button
                                                                    onClick={() => handleDeleteBooking(apt.id)}
                                                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                                                                    title="Confirm removal"
                                                                >
                                                                    Delete
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingId(null)}
                                                                    className="p-1 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                                                                    title="Cancel"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setDeletingId(apt.id)}
                                                                title="Remove patient record"
                                                                className="p-2 bg-slate-50 border border-slate-150 hover:bg-rose-55 hover:text-rose-650 hover:border-rose-200 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Table Footer Stats counts */}
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 text-slate-500 text-xs flex justify-between items-center font-mono">
                            <span>Showing {finalFilteredBookings.length} of {totalSlotsCount} global clinical records.</span>
                            <span className="font-semibold text-slate-800">Operational sandbox live database synced.</span>
                        </div>
                    </div>
                )}
                    </>
                )}

                {activeTab === 'doctors' && (
                    <div className="space-y-6" id="doctors-role-management">
                        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="space-y-1">
                                    <h3 className="font-extrabold text-slate-900 text-lg font-sans">Registered User Accounts</h3>
                                    <p className="text-slate-505 text-xs font-medium">Assign doctor roles and link clinical doctor IDs to user accounts.</p>
                                </div>
                                <div className="relative w-full md:max-w-xs">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search by email..."
                                        value={userSearchTerm}
                                        onChange={(e) => setUserSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            {loadingUsers ? (
                                <div className="py-12 text-center">
                                    <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                                    <p className="text-slate-500 text-xs font-mono">Syncing user database profiles...</p>
                                </div>
                            ) : usersList.length === 0 ? (
                                <p className="text-slate-400 text-xs text-center py-8">No registered user profiles found.</p>
                            ) : (
                                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                                <th className="py-3.5 px-4 font-sans">User Details</th>
                                                <th className="py-3.5 px-4 font-sans">Current Role</th>
                                                <th className="py-3.5 px-4 font-sans">Doctor Profile Mapping</th>
                                                <th className="py-3.5 px-4 text-right font-sans">Role Assignment</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-150">
                                            {usersList
                                                .filter(u => u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()))
                                                .map(u => {
                                                    const isEditing = editingUserId === u.uid;
                                                    return (
                                                        <tr key={u.uid} className="hover:bg-slate-50/30 transition-colors">
                                                            <td className="py-3.5 px-4">
                                                                <div className="font-bold text-slate-900">{u.name || 'Unnamed User'}</div>
                                                                <div className="text-slate-505 text-[11px] font-medium">{u.email}</div>
                                                                <div className="text-slate-400 text-[10px] font-mono mt-0.5">UID: {u.uid}</div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                                                                    u.role === 'admin' ? 'bg-sky-50 border-sky-200 text-sky-800' :
                                                                    u.role === 'doctor' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                                                                    'bg-slate-50 border-slate-200 text-slate-700'
                                                                }`}>
                                                                    {u.role || 'patient'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                {u.role === 'doctor' && u.doctorId ? (
                                                                    <span className="font-mono text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-lg font-bold">
                                                                        {DOCTORS.find(d => d.id === u.doctorId)?.name || u.doctorId}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400 italic">None</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right">
                                                                {isEditing ? (
                                                                    <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                                                                        <select
                                                                            value={selectedRole}
                                                                            onChange={(e) => {
                                                                                setSelectedRole(e.target.value as any);
                                                                                if (e.target.value !== 'doctor') setSelectedDoctorIdMap('');
                                                                                if (e.target.value !== 'driver') setSelectedDriverIdMap('');
                                                                            }}
                                                                            className="bg-white border border-slate-200 rounded-lg p-1 text-xs font-bold text-slate-700 outline-none"
                                                                        >
                                                                            <option value="patient">Patient</option>
                                                                            <option value="doctor">Doctor</option>
                                                                            <option value="driver">Ambulance Driver</option>
                                                                            <option value="admin">Admin</option>
                                                                        </select>

                                                                        {selectedRole === 'doctor' && (
                                                                            <select
                                                                                value={selectedDoctorIdMap}
                                                                                onChange={(e) => setSelectedDoctorIdMap(e.target.value)}
                                                                                className="bg-white border border-slate-200 rounded-lg p-1 text-xs font-bold text-slate-700 outline-none max-w-[150px]"
                                                                            >
                                                                                <option value="">Select Doctor Profile...</option>
                                                                                {DOCTORS.map(d => (
                                                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        )}

                                                                        {selectedRole === 'driver' && (
                                                                            <select
                                                                                value={selectedDriverIdMap}
                                                                                onChange={(e) => setSelectedDriverIdMap(e.target.value)}
                                                                                className="bg-white border border-slate-200 rounded-lg p-1 text-xs font-bold text-slate-700 outline-none max-w-[150px]"
                                                                            >
                                                                                <option value="">Select Ambulance Unit...</option>
                                                                                {ambulancesList.map(a => (
                                                                                    <option key={a.id} value={a.id}>{a.name} ({a.vehicleNo})</option>
                                                                                ))}
                                                                            </select>
                                                                        )}

                                                                        <div className="flex space-x-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditingUserId(null)}
                                                                                className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800"
                                                                            >
                                                                                <X className="h-3.5 w-3.5" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateUserRole(u.uid)}
                                                                                disabled={updatingUser || (selectedRole === 'doctor' && !selectedDoctorIdMap)}
                                                                                className="bg-teal-600 disabled:opacity-50 text-white p-1 rounded-lg hover:bg-teal-700"
                                                                            >
                                                                                <Check className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingUserId(u.uid);
                                                                            setSelectedRole(u.role || 'patient');
                                                                            setSelectedDoctorIdMap(u.doctorId || '');
                                                                        }}
                                                                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                                                                    >
                                                                        Manage Role
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ambulances' && (
                    <div className="space-y-6" id="ambulances-fleet-management">
                        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="space-y-1">
                                    <h3 className="font-extrabold text-slate-900 text-lg font-sans">Ambulance Fleet Log</h3>
                                    <p className="text-slate-505 text-xs font-medium">Manage rapid-response transport dispatch crew logs, active vehicles, and live statuses.</p>
                                </div>
                                <div className="relative w-full md:max-w-xs">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search by driver name or vehicle no..."
                                        value={ambulanceSearchTerm}
                                        onChange={(e) => setAmbulanceSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Sync Status Banner */}
                            {syncMessage && (
                                <div className={`p-4 rounded-xl text-xs flex items-center justify-between mb-4 font-sans ${
                                    syncMessage.type === 'success'
                                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium'
                                        : 'bg-rose-50 border border-rose-200 text-rose-950 font-medium'
                                }`}>
                                    <div className="flex items-center space-x-2.5">
                                        {syncMessage.type === 'success' ? (
                                            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                                        )}
                                        <span>{syncMessage.text}</span>
                                    </div>
                                    <button onClick={() => setSyncMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {loadingAmbulances ? (
                                <div className="py-12 text-center">
                                    <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                                    <p className="text-slate-505 text-xs font-mono">Syncing ambulance database logs...</p>
                                </div>
                            ) : ambulancesList.length === 0 ? (
                                <p className="text-slate-400 text-xs text-center py-8">No registered ambulance units found.</p>
                            ) : (
                                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                                <th className="py-3.5 px-4 font-sans">Driver Details</th>
                                                <th className="py-3.5 px-4 font-sans">Driver Login Credentials</th>
                                                <th className="py-3.5 px-4 font-sans">Vehicle Registration & Type</th>
                                                <th className="py-3.5 px-4 font-sans">Live Status</th>
                                                <th className="py-3.5 px-4 text-right font-sans">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-150">
                                            {ambulancesList
                                                .filter(amb => 
                                                    amb.name?.toLowerCase().includes(ambulanceSearchTerm.toLowerCase()) ||
                                                    amb.vehicleNo?.toLowerCase().includes(ambulanceSearchTerm.toLowerCase())
                                                )
                                                .map(amb => {
                                                    const isAvailable = amb.status === 'Available';
                                                    const driverEmail = amb.driverEmail || (amb.id === 'drv-rajesh' ? 'driver@sanjeevani.com' : `${amb.id}@sanjeevani.com`);
                                                    const driverPassword = amb.driverPassword || (amb.id === 'drv-rajesh' ? '12345678' : 'driver123');

                                                    return (
                                                        <tr key={amb.id} className="hover:bg-slate-50/30 transition-colors">
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${amb.bgColor || 'from-rose-500 to-red-600'} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs`}>
                                                                        {amb.initials}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-900">{amb.name}</div>
                                                                        <div className="text-slate-505 text-[10px] font-mono leading-tight">{amb.phone}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="font-bold text-slate-800 text-[11px] font-mono">{driverEmail}</div>
                                                                <div className="text-teal-650 text-[10px] font-mono font-bold">Password: <span className="text-slate-900 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">{driverPassword}</span></div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="font-bold text-slate-800 font-mono">{amb.vehicleNo}</div>
                                                                <div className="text-slate-500 text-[10px]">{amb.vehicleType}</div>
                                                            </td>
                                                              <td className="py-3.5 px-4">
                                                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                                                                      isAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                                                                  }`}>
                                                                      <span className={`h-1.5 w-1.5 rounded-full mr-1 shrink-0 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                      <span>{amb.status}</span>
                                                                  </span>
                                                              </td>
                                                              <td className="py-3.5 px-4 text-right">
                                                                    <div className="flex justify-end items-center gap-1.5">
                                                                        {deletingAmbulanceId === amb.id ? (
                                                                            <div className="flex items-center space-x-1.5 animate-fade-in">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleAmbulanceDelete(amb.id)}
                                                                                    className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer shadow-xs flex items-center space-x-1"
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                    <span>Confirm Delete</span>
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setDeletingAmbulanceId(null)}
                                                                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold p-1.5 rounded-xl text-xs transition-all cursor-pointer"
                                                                                    title="Cancel"
                                                                                >
                                                                                    <X className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setEditingAmbulance(amb);
                                                                                        setIsAmbulanceFormOpen(true);
                                                                                    }}
                                                                                    className="p-2 bg-slate-50 border border-slate-150 hover:bg-slate-100 hover:border-slate-350 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                                                    title="Edit Ambulance details"
                                                                                >
                                                                                    <Edit3 className="h-4 w-4" />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setDeletingAmbulanceId(amb.id)}
                                                                                    className="p-2 bg-slate-50 border border-slate-150 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl transition-all text-slate-500 cursor-pointer"
                                                                                    title="De-register Ambulance"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                          </tr>
                                                      );
                                                  })}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                {activeTab === 'phc-centers' && (
                    <div className="space-y-6" id="phc-centers-management">
                        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="space-y-1">
                                    <h3 className="font-extrabold text-slate-900 text-lg font-sans">Primary Health Centers (PHC)</h3>
                                    <p className="text-slate-500 text-xs font-medium">
                                        Manage registered rural PHC centers, staff login emails & village access permissions.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPhcFormOpen(true)}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Register New PHC Account</span>
                                </button>
                            </div>

                            {/* Sync status messages */}
                            {phcSyncMessage && (
                                <div className={`p-4 rounded-xl text-xs flex items-center justify-between mb-4 font-sans ${
                                    phcSyncMessage.type === 'success'
                                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium'
                                        : 'bg-rose-50 border border-rose-200 text-rose-950 font-medium'
                                }`}>
                                    <div className="flex items-center space-x-2.5">
                                        {phcSyncMessage.type === 'success' ? (
                                            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                                        )}
                                        <span>{phcSyncMessage.text}</span>
                                    </div>
                                    <button onClick={() => setPhcSyncMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {loadingPhcs ? (
                                <div className="py-16 text-center space-y-3">
                                    <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin mx-auto" />
                                    <p className="text-slate-500 text-xs font-mono">Loading registered PHC accounts from Cloud...</p>
                                </div>
                            ) : phcList.length === 0 ? (
                                <div className="py-16 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">No Primary Health Center Accounts Yet</h4>
                                        <p className="text-slate-400 text-xs mt-1">Click "+ Register New PHC Account" to create your first village PHC login.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPhcFormOpen(true)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Register First PHC Account</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                                <th className="py-3.5 px-4">PHC Center Name & Location</th>
                                                <th className="py-3.5 px-4">Staff Officer / Login Email</th>
                                                <th className="py-3.5 px-4">Access Role</th>
                                                <th className="py-3.5 px-4">Created Date</th>
                                                <th className="py-3.5 px-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-150">
                                            {phcList.map((phc) => (
                                                <tr key={phc.uid || phc.email} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3.5 px-4 space-y-0.5">
                                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                            <span>{phc.phcName || phc.name}</span>
                                                        </div>
                                                        <div className="text-slate-400 text-[11px] font-medium pl-6">
                                                            📍 {phc.phcLocation || 'Rural District'}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 space-y-0.5">
                                                        <div className="font-bold text-slate-800">{phc.name || 'Healthcare Officer'}</div>
                                                        <div className="font-mono text-emerald-700 text-[11px] font-semibold">{phc.email}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                                                            PHC Staff Access
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                                                        {phc.createdAt ? new Date(phc.createdAt).toLocaleDateString() : 'Active'}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <button
                                                            type="button"
                                                            disabled={deletingPhcId === phc.uid}
                                                            onClick={() => {
                                                                if (window.confirm(`Are you sure you want to delete Primary Health Center "${phc.phcName || phc.name}"?`)) {
                                                                    handleDeletePhc(phc.uid, phc.phcName || phc.name);
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60 font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                                                            title="Delete PHC Center Account"
                                                        >
                                                            {deletingPhcId === phc.uid ? (
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                            <span>Delete PHC</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* COMPREHENSIVE SCHEDULER DIALOG OVERLAY (Create & Edit) */}
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="admin-form-overlay">
                        <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative" id="admin-scheduler-form-box">

                            {/* Header block */}
                            <div className="sticky top-0 bg-white border-b border-slate-150 py-5 px-6 flex justify-between items-center z-10">
                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900">
                                        {editingAppointment ? `Modify Document: ${editingAppointment.id}` : 'Schedule New Administrative Placement'}
                                    </h3>
                                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                                        Input clinical metadata variables to commit secure patient placement on Cloud.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsFormOpen(false);
                                        setEditingAppointment(null);
                                        setSyncMessage(null);
                                    }}
                                    className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Form body */}
                            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">

                                {/* Sync status messages */}
                                {syncMessage && (
                                    <div className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 leading-relaxed font-sans ${syncMessage.type === 'success'
                                            ? 'bg-emerald-50 border border-emerald-150 text-emerald-950 font-medium'
                                            : 'bg-rose-50 border border-rose-150 text-rose-950'
                                        }`}>
                                        {syncMessage.type === 'success' ? (
                                            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                        )}
                                        <span>{syncMessage.text}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Department Picker */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Department Specialty <span className="text-rose-500">*</span></label>
                                        <select
                                            required
                                            value={formDeptId}
                                            onChange={(e) => {
                                                setFormDeptId(e.target.value);
                                                setFormDocId(''); // reset doctor selection
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white cursor-pointer transition-all"
                                        >
                                            <option value="">Select Specialty...</option>
                                            {DEPARTMENTS.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Doctor Picker */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Assigned Physician <span className="text-rose-500">*</span></label>
                                        <select
                                            required
                                            disabled={!formDeptId}
                                            value={formDocId}
                                            onChange={(e) => setFormDocId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white cursor-pointer transition-all"
                                        >
                                            <option value="">Select Doctor...</option>
                                            {filteredDoctors.map(doc => (
                                                <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Date Input */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Clinic Date <span className="text-rose-500">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            value={formDate}
                                            onChange={(e) => setFormDate(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white cursor-pointer transition-all"
                                        />
                                    </div>

                                    {/* Time Slot Picker */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Allocated Time Slot <span className="text-rose-500">*</span></label>
                                        <select
                                            required
                                            disabled={!formDocId}
                                            value={formSlot}
                                            onChange={(e) => setFormSlot(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white cursor-pointer transition-all"
                                        >
                                            <option value="">Select Time Slot...</option>
                                            {currentSelectedDoctorObject?.availability.hours.map(hr => (
                                                <option key={hr} value={hr}>{hr}</option>
                                            )) || (
                                                    <>
                                                        <option value="09:00 AM">09:00 AM</option>
                                                        <option value="10:00 AM">10:00 AM</option>
                                                        <option value="11:00 AM">11:00 AM</option>
                                                        <option value="01:00 PM">01:00 PM</option>
                                                        <option value="02:00 PM">02:00 PM</option>
                                                        <option value="03:00 PM">03:00 PM</option>
                                                        <option value="04:00 PM">04:00 PM</option>
                                                    </>
                                                )}
                                        </select>
                                    </div>
                                </div>

                                {/* Patient Profile Mapping block */}
                                <div className="border-t border-slate-150 pt-4 space-y-4">
                                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Patient Profiling Variables</h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Patient Full name */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Patient Full Name <span className="text-rose-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formPatName}
                                                onChange={(e) => setFormPatName(e.target.value)}
                                                placeholder="John Doe"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white transition-all"
                                            />
                                        </div>

                                        {/* Patient Phone */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Patient Contact Phone <span className="text-rose-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formPatPhone}
                                                onChange={(e) => setFormPatPhone(e.target.value)}
                                                placeholder="+1 (555) 019-2834"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Patient Email */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Patient Email Address <span className="text-rose-500">*</span></label>
                                            <input
                                                type="email"
                                                required
                                                value={formPatEmail}
                                                onChange={(e) => setFormPatEmail(e.target.value)}
                                                placeholder="patient@gmail.com"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white transition-all"
                                            />
                                        </div>

                                        {/* Associated Patient Auth User UID - optional */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Associated Patient UID <span className="text-slate-400 font-normal">(Optional)</span></label>
                                            <input
                                                type="text"
                                                value={formUserId}
                                                onChange={(e) => setFormUserId(e.target.value)}
                                                placeholder="e.g. HPr2cQY5XOhyLaw039ltYp... (Leave empty for guest)"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Patient Notes */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Administrative Notes or Symptoms Log</label>
                                    <textarea
                                        rows={3}
                                        value={formNotes}
                                        onChange={(e) => setFormNotes(e.target.value)}
                                        placeholder="Describe specific symptoms, physician recommendations or followups..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-150 pt-4">
                                    {/* Status selection */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Status Placement <span className="text-rose-500">*</span></label>
                                        <select
                                            value={formStatus}
                                            onChange={(e) => setFormStatus(e.target.value as 'Pending' | 'Confirmed' | 'Cancelled')}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white cursor-pointer transition-all text-slate-805"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Confirmed">Confirmed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Submission CTA */}
                                <div className="sticky bottom-0 bg-white border-t border-slate-150 pt-4 pb-1 mt-6 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsFormOpen(false);
                                            setEditingAppointment(null);
                                            setSyncMessage(null);
                                        }}
                                        className="px-5 py-2.5 rounded-xl border border-slate-250 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                <span>Synchronizing Cloud...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{editingAppointment ? 'Save Updates' : 'Commit Appointment'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                            </form>

                        </div>
                    </div>
                )}

            {/* AMBULANCE FLEET FORM OVERLAY (Create & Edit) */}
            {isAmbulanceFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="admin-ambulance-overlay">
                    <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-150 py-5 px-6 flex justify-between items-center z-10">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">
                                    {editingAmbulance ? `Modify Ambulance: ${editingAmbulance.id}` : 'Register New Ambulance Fleet Unit'}
                                </h3>
                                <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                                    Input driver metadata and vehicle registration variables.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsAmbulanceFormOpen(false);
                                    setEditingAmbulance(null);
                                    setSyncMessage(null);
                                }}
                                className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleAmbulanceSubmit} className="p-6 space-y-5">
                            {/* Sync status messages */}
                            {syncMessage && (
                                <div className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 leading-relaxed font-sans ${syncMessage.type === 'success'
                                        ? 'bg-emerald-50 border border-emerald-150 text-emerald-950 font-medium'
                                        : 'bg-rose-50 border border-rose-150 text-rose-950'
                                    }`}>
                                    {syncMessage.type === 'success' ? (
                                        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                    )}
                                    <span>{syncMessage.text}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Driver Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Driver Full Name <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={ambDriverName}
                                        onChange={(e) => setAmbDriverName(e.target.value)}
                                        placeholder="e.g. Ramesh Singh"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>

                                {/* Phone number */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Contact Phone Number <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={ambPhone}
                                        onChange={(e) => setAmbPhone(e.target.value)}
                                        placeholder="e.g. +91 98765 43210"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Driver role */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Crew Role/Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={ambRole}
                                        onChange={(e) => setAmbRole(e.target.value)}
                                        placeholder="e.g. Senior Paramedic Driver"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>

                                {/* Vehicle Registration Plate */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Vehicle License Plate <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={ambVehicleNo}
                                        onChange={(e) => setAmbVehicleNo(e.target.value)}
                                        placeholder="e.g. MH-12-QE-4567"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* DRIVER PORTAL LOGIN CREDENTIALS BLOCK */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center space-x-2">
                                    <LockKeyhole className="h-4 w-4 text-teal-600 shrink-0" />
                                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-sans">Driver Portal Login Credentials</h4>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">Assign email & password for this driver. When they log in on Sanjeevani, they will automatically land on Driver Portal.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">Driver Login Email <span className="text-rose-500">*</span></label>
                                        <input
                                            type="email"
                                            required
                                            value={ambDriverEmail}
                                            onChange={(e) => setAmbDriverEmail(e.target.value)}
                                            placeholder="e.g. driver.ramesh@sanjeevani.com"
                                            className="w-full bg-white border border-slate-250 rounded-xl p-2.5 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">Driver Login Password <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={ambDriverPassword}
                                            onChange={(e) => setAmbDriverPassword(e.target.value)}
                                            placeholder="e.g. driver123"
                                            className="w-full bg-white border border-slate-250 rounded-xl p-2.5 text-xs font-mono font-bold focus:ring-1.5 focus:ring-teal-500 outline-none transition-all text-teal-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Ambulance Category */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Ambulance Category Type</label>
                                    <select
                                        value={ambVehicleType}
                                        onChange={(e) => setAmbVehicleType(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white cursor-pointer transition-all text-slate-805"
                                    >
                                        <option value="Advanced Cardiac Life Support (ACLS)">Advanced Cardiac Life Support (ACLS)</option>
                                        <option value="Basic Life Support (BLS) Ambulance">Basic Life Support (BLS) Ambulance</option>
                                        <option value="Neonatal & Pediatric Intensive Care Transport">Neonatal & Pediatric Intensive Care Transport</option>
                                        <option value="Maternity & Obstetric Transport Van">Maternity & Obstetric Transport Van</option>
                                    </select>
                                </div>

                                {/* Status */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Live Operational Status</label>
                                    <select
                                        value={ambStatus}
                                        onChange={(e) => setAmbStatus(e.target.value as 'Available' | 'On Emergency Call')}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-1.5 focus:ring-teal-500 focus:bg-white cursor-pointer transition-all text-slate-805"
                                    >
                                        <option value="Available">Available 🟢</option>
                                        <option value="On Emergency Call">On Emergency Call 🔴</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Experience */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Experience</label>
                                    <input
                                        type="text"
                                        required
                                        value={ambExperience}
                                        onChange={(e) => setAmbExperience(e.target.value)}
                                        placeholder="e.g. 5 Years"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>

                                {/* Trips */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Trips Completed</label>
                                    <input
                                        type="number"
                                        required
                                        value={ambTrips}
                                        onChange={(e) => setAmbTrips(Number(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1.5 focus:ring-teal-500 focus:bg-white outline-none transition-all font-mono"
                                    />
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="sticky bottom-0 bg-white border-t border-slate-150 pt-4 pb-1 mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAmbulanceFormOpen(false);
                                        setEditingAmbulance(null);
                                        setSyncMessage(null);
                                    }}
                                    className="px-5 py-2.5 rounded-xl border border-slate-250 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            <span>Synchronizing Cloud...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{editingAmbulance ? 'Save Updates' : 'Commit Dispatch crew'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE PHC ACCOUNT */}
            {isPhcFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-lg shadow-2xl p-6 lg:p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Step 1: Create Primary Health Center (PHC) Account</h3>
                                <p className="text-slate-500 text-xs mt-0.5">Input PHC details, Staff Email & Password for rural login access.</p>
                            </div>
                            <button
                                onClick={() => setIsPhcFormOpen(false)}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePhcAccount} className="space-y-4">
                            {phcSyncMessage && (
                                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                                    phcSyncMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}>
                                    <span>{phcSyncMessage.text}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    PHC Center Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Rampur Primary Health Center"
                                    value={phcNameInput}
                                    onChange={(e) => setPhcNameInput(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        District / Location
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Rampur Village, Block 4"
                                        value={phcLocationInput}
                                        onChange={(e) => setPhcLocationInput(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Staff / Officer Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Dr. Satish Kumar"
                                        value={phcStaffNameInput}
                                        onChange={(e) => setPhcStaffNameInput(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        PHC Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="e.g. phc.rampur@dr-maker.com"
                                        value={phcEmailInput}
                                        onChange={(e) => setPhcEmailInput(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Password *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="phc123456"
                                        value={phcPasswordInput}
                                        onChange={(e) => setPhcPasswordInput(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                                <button
                                    type="button"
                                    onClick={() => setIsPhcFormOpen(false)}
                                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingPhc}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer"
                                >
                                    {submittingPhc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Save & Create PHC Account</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
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

            {/* Prescription Slip Modal */}
            {selectedPrescription && (
                <PrescriptionSlipModal
                    prescription={selectedPrescription}
                    onClose={() => setSelectedPrescription(null)}
                />
            )}
        </div>
    );
}

interface PrescriptionSlipModalProps {
    prescription: any;
    onClose: () => void;
}

function PrescriptionSlipModal({ prescription, onClose }: PrescriptionSlipModalProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs" id="prescription-slip-overlay">
            <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col font-sans print:absolute print:inset-0 print:m-0 print:max-h-full print:shadow-none print:border-none print:rounded-none">
                
                {/* Modal Header */}
                <div className="bg-slate-50 border-b border-slate-150 py-4 px-6 flex justify-between items-center shrink-0 print:hidden">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        View Prescription Slip (Read Only)
                    </h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePrint}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                            Print Slip
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-105 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                        >
                            <X className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>

                {/* Print Layout wrapper */}
                <div className="flex-grow overflow-auto p-8 space-y-6 text-left print:p-0 print:overflow-visible">
                    
                    {/* Prescription Clinic Branded Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-teal-650 pb-4 gap-4">
                        <div className="space-y-1">
                            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                                Sanjeevani Medical Center
                            </h2>
                            <p className="text-slate-500 text-xs font-semibold">
                                Ratanlal plots Mahadev Mandir Road, Yavatmal, Maharashtra 445301
                            </p>
                            <p className="text-slate-400 text-[11px] font-medium font-mono">
                                Phone: 09552625262 • Email: tksanjeevan@gmail.com
                            </p>
                        </div>
                        <div className="text-left sm:text-right space-y-1">
                            <span className="bg-teal-50 border border-teal-100 text-teal-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider print:hidden">
                                Official Prescription
                            </span>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Date: <strong className="text-slate-800">{new Date(prescription.updatedAt).toLocaleDateString()}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Metadata: Doctor and Patient Info grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 border border-slate-150 p-5 rounded-2xl print:border-none print:bg-transparent print:p-0">
                        {/* Doctor Info */}
                        <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Prescribed By:</span>
                            <h4 className="text-sm font-extrabold text-slate-900">{prescription.doctorName}</h4>
                            <p className="text-xs text-slate-500 font-semibold">{prescription.departmentName} Department</p>
                        </div>

                        {/* Patient Info */}
                        <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Patient Details:</span>
                            <h4 className="text-sm font-extrabold text-slate-900">{prescription.patientName}</h4>
                            <p className="text-xs text-slate-500 font-semibold">
                                {[prescription.patientAge ? `${prescription.patientAge} Years` : '', prescription.patientGender || ''].filter(Boolean).join(' • ')}
                            </p>
                        </div>
                    </div>

                    {/* Diagnosis block */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest font-mono">Diagnosis & Findings</h4>
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
                            {prescription.diagnosis}
                        </div>
                    </div>

                    {/* Medicines Slip Table */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest font-mono border-b border-slate-150 pb-2">Rx (Prescribed Medicines)</h4>
                        
                        <div className="border border-slate-150 rounded-2xl overflow-hidden print:border-none">
                            <table className="w-full border-collapse text-left text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider print:bg-transparent">
                                        <th className="py-3 px-4">Medicine Name</th>
                                        <th className="py-3 px-4">Dosage</th>
                                        <th className="py-3 px-4">Routine / Frequency</th>
                                        <th className="py-3 px-4">Time Slot</th>
                                        <th className="py-3 px-4">Duration</th>
                                        <th className="py-3 px-4">Directions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150 text-slate-800">
                                    {prescription.medicines.map((med: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/30">
                                            <td className="py-3 px-4 font-bold text-slate-900">{med.name}</td>
                                            <td className="py-3 px-4 font-mono font-medium">{med.dosage}</td>
                                            <td className="py-3 px-4 font-medium">{med.frequency}</td>
                                            <td className="py-3 px-4 font-mono font-bold text-teal-800">{med.timing || 'N/A'}</td>
                                            <td className="py-3 px-4 font-medium">{med.duration}</td>
                                            <td className="py-3 px-4 text-xs text-slate-500 italic font-medium">{med.notes || 'As directed'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* General Doctor Advice */}
                    {prescription.doctorNotes && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest font-mono">Special Advice & Directions</h4>
                            <div className="bg-teal-50/40 border border-teal-100/60 p-4 rounded-xl text-xs sm:text-sm text-teal-950 font-semibold leading-relaxed">
                                {prescription.doctorNotes}
                            </div>
                        </div>
                    )}

                    {/* Print signature spacing */}
                    <div className="pt-16 hidden print:block">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-400 font-mono">Printed on: {new Date().toLocaleString()}</p>
                            </div>
                            <div className="text-right border-t border-slate-300 pt-2 min-w-[200px]">
                                <p className="text-xs font-extrabold text-slate-905">{prescription.doctorName}</p>
                                <p className="text-[10px] text-slate-450 uppercase tracking-wider font-mono">Authorized Signature</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
