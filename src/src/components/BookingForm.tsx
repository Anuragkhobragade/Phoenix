import React from 'react';
import { Department, Doctor, Appointment, Page } from '../types';
import { DEPARTMENTS, DOCTORS } from '../data';
import { useLanguage } from '../context/LanguageContext';
import { doc, setDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import {
    motion,
    AnimatePresence
} from 'motion/react';
import {
    Stethoscope,
    UserRound,
    CalendarClock,
    Contact,
    CheckCircle,
    FileCheck2,
    Calendar,
    Clock,
    User,
    HeartPulse,
    Mail,
    Phone,
    AlertCircle,
    UploadCloud,
    FileText,
    FileImage,
    Trash2,
    Loader2,
    Video
} from 'lucide-react';

interface BookingFormProps {
    setCurrentPage: (page: Page) => void;
    selectedDepartmentId: string | null;
    setSelectedDepartmentId: (id: string | null) => void;
    selectedDoctorId: string | null;
    setSelectedDoctorId: (id: string | null) => void;
    onAppointmentBooked: () => void;
    user: any;
    editingAppointment?: Appointment | null;
    setEditingAppointment?: (apt: Appointment | null) => void;
}

export default function BookingForm({
    setCurrentPage,
    selectedDepartmentId,
    setSelectedDepartmentId,
    selectedDoctorId,
    setSelectedDoctorId,
    onAppointmentBooked,
    user,
    editingAppointment,
    setEditingAppointment
}: BookingFormProps) {
    const { t } = useLanguage();

    // Multi-step phase state: 1, 2, 3, 4, 5 (Success)
    const [step, setStep] = React.useState<number>(1);

    // Schedule choosing states
    const [bookingDate, setBookingDate] = React.useState('');
    const [selectedSlot, setSelectedSlot] = React.useState('');
    const [consultationType, setConsultationType] = React.useState<'In-Person' | 'Online'>('In-Person');

    // Patient details state
    const [patientName, setPatientName] = React.useState('');
    const [patientPhone, setPatientPhone] = React.useState('');
    const [patientEmail, setPatientEmail] = React.useState('');
    const [patientAge, setPatientAge] = React.useState<string>('');
    const [patientGender, setPatientGender] = React.useState<string>('');
    const [medicalHistory, setMedicalHistory] = React.useState<string>('');
    const [visitReason, setVisitReason] = React.useState('');

    // File attachments states
    const [reports, setReports] = React.useState<Array<{ name: string; url: string }>>([]);
    const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});
    const [uploadErrors, setUploadErrors] = React.useState<Record<string, string>>({});
    const [activeUploadsCount, setActiveUploadsCount] = React.useState<number>(0);

    // Local state for error logging
    const [dateError, setDateError] = React.useState('');
    const [formErrors, setFormErrors] = React.useState<string[]>([]);
    const [isSuccessfullyBooked, setIsSuccessfullyBooked] = React.useState<Appointment | null>(null);

    // Helper to compress image client-side to ensure it is small (usually ~50KB - 150KB) and stays under 1MB Firestore limit
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(event.target?.result as string);
                        return;
                    }

                    // Max width/height 800px to ensure the file size is very small
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(compressedBase64);
                };
                img.onerror = () => reject(new Error('Image loading failed.'));
            };
            reader.onerror = () => reject(new Error('File reading failed.'));
        });
    };

    // Helper to read other document types (like PDF) directly as Base64 data URL
    const readAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
        });
    };

    // File selection/upload handler (Local Base64 Conversion)
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newErrors = { ...uploadErrors };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Limit check: 1.5MB maximum before compression
            if (file.size > 1.5 * 1024 * 1024) {
                newErrors[file.name] = 'File is too large (Max 1.5MB for documents)';
                setUploadErrors({ ...newErrors });
                continue;
            }

            // Remove previous error if retrying
            delete newErrors[file.name];
            setUploadErrors({ ...newErrors });

            setActiveUploadsCount(prev => prev + 1);
            setUploadProgress(prev => ({ ...prev, [file.name]: 20 }));

            try {
                let fileDataUrl = '';
                const isImage = /\.(jpg|jpeg|png)$/i.test(file.name);

                if (isImage) {
                    setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));
                    fileDataUrl = await compressImage(file);
                } else {
                    setUploadProgress(prev => ({ ...prev, [file.name]: 60 }));
                    fileDataUrl = await readAsBase64(file);
                }

                setUploadProgress(prev => ({ ...prev, [file.name]: 85 }));

                // Keep final string under 800KB to stay within 1MB Firestore document limit
                if (fileDataUrl.length > 800 * 1024) {
                    setUploadErrors(prev => ({
                        ...prev,
                        [file.name]: 'File size is too large to store in database (Max 800KB encoded)'
                    }));
                } else {
                    setReports(prev => [...prev, { name: file.name, url: fileDataUrl }]);
                }
            } catch (err: any) {
                console.error("Local file processing error:", err);
                setUploadErrors(prev => ({
                    ...prev,
                    [file.name]: 'Processing failed: ' + (err.message || 'Unknown error')
                }));
            } finally {
                setUploadProgress(prev => {
                    const copy = { ...prev };
                    delete copy[file.name];
                    return copy;
                });
                setActiveUploadsCount(prev => Math.max(0, prev - 1));
            }
        }
    };

    const handleRemoveReport = (indexToRemove: number) => {
        setReports(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    // Jump steps automatically if credentials are pre-selected in parent states
    React.useEffect(() => {
        if (selectedDepartmentId && selectedDoctorId) {
            setStep(3); // Skip directly to date and time selector
        } else if (selectedDepartmentId) {
            setStep(2); // Skip to doctor selector
        }
    }, [selectedDepartmentId, selectedDoctorId]);

    // Prefill details from authenticated user or editing appointment
    React.useEffect(() => {
        if (editingAppointment) {
            setBookingDate(editingAppointment.date);
            setSelectedSlot(editingAppointment.timeSlot);
            setPatientName(editingAppointment.patientName);
            setPatientPhone(editingAppointment.patientPhone);
            setPatientEmail(editingAppointment.patientEmail);
            setPatientAge(editingAppointment.patientAge ? String(editingAppointment.patientAge) : '');
            setPatientGender(editingAppointment.patientGender || '');
            setMedicalHistory(editingAppointment.medicalHistory || '');
            setVisitReason(editingAppointment.notes || '');
            setReports(editingAppointment.reports || []);
            setConsultationType(editingAppointment.consultationType || 'In-Person');
            setStep(3); // Skip directly to date and time selector
        } else if (user) {
            if (user.displayName && !patientName) {
                setPatientName(user.displayName);
            }
            if (user.email && !patientEmail) {
                setPatientEmail(user.email);
            }
            if (user.phoneNumber && !patientPhone) {
                setPatientPhone(user.phoneNumber);
            }
        }
    }, [editingAppointment, user]);

    // Reset all booking parameters
    const handleFullReset = () => {
        const wasEditing = !!editingAppointment;
        setSelectedDepartmentId(null);
        setSelectedDoctorId(null);
        setBookingDate('');
        setSelectedSlot('');
        setConsultationType('In-Person');
        setPatientName('');
        setPatientPhone('');
        setPatientEmail('');
        setPatientAge('');
        setPatientGender('');
        setMedicalHistory('');
        setVisitReason('');
        setDateError('');
        setFormErrors([]);
        setReports([]);
        setUploadProgress({});
        setUploadErrors({});
        setActiveUploadsCount(0);
        setIsSuccessfullyBooked(null);
        if (setEditingAppointment) {
            setEditingAppointment(null);
        }
        setStep(1);
        if (wasEditing) {
            setCurrentPage('my-appointments');
        }
    };

    // Safe parameters extraction
    const activeDept = DEPARTMENTS.find(d => d.id === selectedDepartmentId);
    const activeDoc = DOCTORS.find(doc => doc.id === selectedDoctorId);

    // Fetch doctors available in selected department
    const filteredDoctors = selectedDepartmentId
        ? DOCTORS.filter(doc => doc.departmentId === selectedDepartmentId)
        : [];

    // Minimum booking date selector limit: Today to prevent retro-bookings
    const getMinDateString = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // Dynamic weekday check depending on selected doctoravailability
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const chosenDateStr = e.target.value;
        setBookingDate(chosenDateStr);
        setSelectedSlot('');
        setDateError('');

        if (!chosenDateStr) return;
        if (!activeDoc) return;

        const chosenDate = new Date(chosenDateStr);

        // Day conversion mapping
        const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const selectedDayOfWeek = DAYS_MAP[chosenDate.getDay() + 1] || DAYS_MAP[chosenDate.getDay()];
        // Correction since Date parses UTC depending on browser
        const localDayOfWeek = DAYS_MAP[chosenDate.getUTCDay()];

        const worksThisDay = activeDoc.availability.days.includes(localDayOfWeek);

        if (!worksThisDay) {
            setDateError(`${activeDoc.name} is not on-duty on ${localDayOfWeek}. Available days: ${activeDoc.availability.days.join(', ')}.`);
        }
    };

    // Step Navigations
    const handleNextStep = () => {
        if (step === 1 && !selectedDepartmentId) return;
        if (step === 2 && !selectedDoctorId) return;
        if (step === 3) {
            if (!bookingDate || !selectedSlot) return;
            if (dateError) return;
        }
        setStep(prev => prev + 1);
    };

    const handlePrevStep = () => {
        if (step === 3 && selectedDepartmentId && selectedDoctorId) {
            // If user came pre-selected, clear and go back
            setSelectedDepartmentId(null);
            setSelectedDoctorId(null);
            setStep(1);
        } else {
            setStep(prev => Math.max(1, prev - 1));
        }
    };

    // Submit and Store Appointment in Firebase Client Firestore Cloud
    const handleSubmitBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: string[] = [];
        if (!patientName.trim()) errors.push('Patient Name is required');
        if (!patientPhone.trim()) errors.push('Primary Contact Phone number is required');
        if (!patientEmail.trim()) errors.push('A valid Email address is required to email confirmation code');

        if (errors.length > 0) {
            setFormErrors(errors);
            return;
        }

        if (!activeDoc || !activeDept) return;

        // Preserve original appointment details if editing
        const appointmentId = editingAppointment ? editingAppointment.id : `APT-${Math.floor(100000 + Math.random() * 900000)}`;
        const appointmentCreatedAt = editingAppointment ? editingAppointment.createdAt : new Date().toISOString();

        // Create unique appointment object
        const newAppointment: Appointment = {
            id: appointmentId,
            doctorId: activeDoc.id,
            doctorName: activeDoc.name,
            departmentId: activeDept.id,
            departmentName: activeDept.name,
            date: bookingDate,
            timeSlot: selectedSlot,
            patientName: patientName.trim(),
            patientPhone: patientPhone.trim(),
            patientEmail: patientEmail.trim().toLowerCase(),
            patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
            patientGender: patientGender || undefined,
            medicalHistory: medicalHistory.trim() || undefined,
            notes: visitReason.trim() || undefined,
            status: 'Pending',
            createdAt: appointmentCreatedAt,
            reports: reports.length > 0 ? reports : undefined,
            consultationType: consultationType,
            videoCallStatus: consultationType === 'Online' ? 'inactive' : undefined,
            videoRoomId: consultationType === 'Online' ? appointmentId : undefined
        };

        try {
            // Securely store to client's Firebase Firestore collection
            const docData = {
                ...newAppointment,
                userId: user?.uid || null // Link this booking securely to user account record
            };
            
            // Clean undefined fields for Firestore compatibility
            const cleanedDocData = Object.fromEntries(
                Object.entries(docData).filter(([_, v]) => v !== undefined)
            );

            try {
                await setDoc(doc(db, 'appointments', newAppointment.id), cleanedDocData);
            } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `appointments/${newAppointment.id}`);
            }

            // Support fallback sync to localStorage
            try {
                const stored = localStorage.getItem('vitalis_appointments');
                let localApts: Appointment[] = stored ? JSON.parse(stored) : [];
                if (editingAppointment) {
                    localApts = localApts.map(apt => apt.id === editingAppointment.id ? docData : apt);
                } else {
                    localApts.push(docData);
                }
                localStorage.setItem('vitalis_appointments', JSON.stringify(localApts));
            } catch (errLocal) {
                console.warn('LocalStorage backup sync skipped:', errLocal);
            }

            // Update states, notify parent
            setIsSuccessfullyBooked(docData);
            onAppointmentBooked();
            setStep(5);
        } catch (err: any) {
            console.error('Failed storing remote database records:', err);
            setFormErrors([
                'Error during cloud synchronization: ' + (err.message || 'Please check your internet or Firebase Firestore security rules.')
            ]);
        }
    };

    return (
        <div className="bg-slate-50/50 min-h-screen py-12 lg:py-16" id="booking-flow">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* Editing Appointment Warning Banner */}
                {step < 5 && editingAppointment && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="font-extrabold text-amber-800 uppercase tracking-widest font-mono block">
                                Mode: Editing Appointment
                            </span>
                            <h3 className="font-bold text-slate-800 text-sm">
                                Modifying booking for Reference ID: <strong className="text-slate-900 font-mono">{editingAppointment.id}</strong>
                            </h3>
                            <p className="text-slate-500 max-w-xl">
                                Any updates to date, slot, patient details, or documents will set the booking status back to <strong>Pending</strong>, requesting approval from {editingAppointment.doctorName} again.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleFullReset}
                            className="w-full sm:w-auto text-center bg-white border border-amber-250 text-amber-900 hover:bg-amber-100/50 font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors shadow-xs shrink-0"
                        >
                            Cancel Editing
                        </button>
                    </div>
                )}

                {/* PROGRESS PATH BAR HEADER (Hide on success step 5) */}
                {step < 5 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm mb-8">
                        <div className="flex justify-between items-center max-w-lg mx-auto relative select-none">

                            {/* Steppers */}
                            {[
                                { icon: Stethoscope, label: t('book.step1') },
                                { icon: UserRound, label: t('book.step2') },
                                { icon: CalendarClock, label: t('book.step3') },
                                { icon: Contact, label: t('book.step4') }
                            ].map((st, idx) => {
                                const sNumber = idx + 1;
                                const isActive = step === sNumber;
                                const isCompleted = step > sNumber;

                                return (
                                    <div key={idx} className="flex flex-col items-center relative z-10">
                                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center transition-colors ${isActive
                                                ? 'bg-teal-650 text-white shadow-md shadow-teal-650/15'
                                                : isCompleted
                                                    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-500'
                                                    : 'bg-slate-100 text-slate-400 border border-slate-205'
                                            }`}>
                                            <st.icon className="h-5 w-5" />
                                        </div>
                                        <span className={`text-[10px] sm:text-xs font-bold mt-2 ${isActive ? 'text-teal-700' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                                            }`}>
                                            {st.label}
                                        </span>
                                    </div>
                                );
                            })}

                        </div>
                    </div>
                )}

                {/* CONTAINER CARD FOR STEPS */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="booking-wizard-card">

                    <AnimatePresence mode="wait">

                        {/* STEP 1: CHOOSE CLINICAL BRANCH */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-10 space-y-6 text-left"
                            >
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold font-sans text-slate-900">
                                        Step 1: Select Specialty Department
                                    </h2>
                                    <p className="text-slate-400 text-xs sm:text-sm">
                                        Select the field of medicine matching your primary concerns to load certified personnel schedules.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {DEPARTMENTS.map((dept) => (
                                        <button
                                            key={dept.id}
                                            onClick={() => setSelectedDepartmentId(dept.id)}
                                            className={`p-5 rounded-2xl border-2 text-left transition-all flex items-start space-x-4 cursor-pointer ${selectedDepartmentId === dept.id
                                                    ? 'border-teal-600 bg-teal-50/20 shadow-md ring-2 ring-teal-100'
                                                    : 'border-slate-150 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className={`p-2.5 rounded-xl block shrink-0 ${selectedDepartmentId === dept.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-650'
                                                }`}>
                                                <Stethoscope className="h-5 w-5" />
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-sm sm:text-base font-sans">
                                                    {dept.name}
                                                </h3>
                                                <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">
                                                    {dept.description}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex justify-end">
                                    <button
                                        disabled={!selectedDepartmentId}
                                        onClick={handleNextStep}
                                        className={`inline-flex items-center space-x-2 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow ${selectedDepartmentId
                                                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        <span>Proceed to Doctor Match</span>
                                        <Clock className="h-4 w-4 shrink-0" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: CHOOSE MEDICAL SPECIALIST */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-10 space-y-6 text-left"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-extrabold font-sans text-slate-900">
                                            Step 2: Assign Doctor Specialty Match
                                        </h2>
                                        <p className="text-slate-400 text-xs sm:text-sm">
                                            Choose your preferred board specialist within the Department of {activeDept?.name}.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {filteredDoctors.map((doc) => (
                                        <button
                                            key={doc.id}
                                            onClick={() => setSelectedDoctorId(doc.id)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer ${selectedDoctorId === doc.id
                                                    ? 'border-teal-600 bg-teal-50/20 shadow-md ring-2 ring-teal-100'
                                                    : 'border-slate-150 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-205">
                                                    <img
                                                        src={doc.image}
                                                        alt={doc.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-slate-905 text-sm sm:text-base font-sans">
                                                        {doc.name}
                                                    </h3>
                                                    <p className="text-teal-700 text-xs font-semibold">
                                                        {doc.specialty}
                                                    </p>
                                                    <div className="flex items-center space-x-1.5 mt-0.5">
                                                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md font-bold">
                                                            Experience: {doc.experienceYears} Years
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Doctor avail check */}
                                            <div className="text-xs text-slate-500 max-w-xs self-stretch sm:self-center bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:text-right font-medium">
                                                <span className="block font-mono text-[10px] font-bold uppercase text-slate-400">Availability</span>
                                                <span>{doc.availability.days.join(', ')}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Back / Forwards buttons */}
                                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                                    <button
                                        onClick={handlePrevStep}
                                        className="text-sm font-semibold text-slate-550 hover:text-slate-800 transition-colors cursor-pointer"
                                    >
                                        Back to Departments
                                    </button>
                                    <button
                                        disabled={!selectedDoctorId}
                                        onClick={handleNextStep}
                                        className={`inline-flex items-center space-x-2 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow ${selectedDoctorId
                                                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        <span>Proceed to Schedule Calendar</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: SELECT CONSULTATION DATE AND HOUR */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-10 space-y-6 text-left"
                            >
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold font-sans text-slate-900">
                                        Step 3: Pick Date & Booking Time Slot
                                    </h2>
                                    <p className="text-slate-400 text-xs sm:text-sm">
                                        Consultations are reserved in 45-minute slots on available days for {activeDoc?.name}.
                                    </p>
                                </div>

                                {/* Summary badge */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between text-xs sm:text-sm">
                                    <div>
                                        <span className="font-bold text-slate-800">{activeDoc?.name}</span>
                                        <span className="text-slate-500 font-mono text-xs block">Dept: {activeDept?.name}</span>
                                    </div>
                                    <div className="text-right text-[11px] font-mono font-bold text-teal-700 bg-teal-100/60 px-2.5 py-1 rounded-lg uppercase">
                                        Duty Days: {activeDoc?.availability.days.join(', ')}
                                    </div>
                                </div>

                                {/* Consultation Type Selection */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">
                                        Select Consultation Type
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setConsultationType('In-Person')}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start space-x-3 cursor-pointer ${
                                                consultationType === 'In-Person'
                                                    ? 'border-teal-650 bg-teal-50/20 shadow-xs'
                                                    : 'border-slate-150 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-xl shrink-0 ${
                                                consultationType === 'In-Person' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                <UserRound className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <span className="font-extrabold text-slate-900 text-sm block font-sans">In-Person Visit</span>
                                                <span className="text-slate-450 text-[11px] leading-relaxed block mt-1 font-sans">
                                                    Meet the doctor face-to-face at WeCare reception desks.
                                                </span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setConsultationType('Online')}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start space-x-3 cursor-pointer ${
                                                consultationType === 'Online'
                                                    ? 'border-teal-650 bg-teal-50/20 shadow-xs'
                                                    : 'border-slate-150 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-xl shrink-0 ${
                                                consultationType === 'Online' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                <Video className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <span className="font-extrabold text-slate-900 text-sm block font-sans">Online Video Call</span>
                                                <span className="text-slate-450 text-[11px] leading-relaxed block mt-1 font-sans">
                                                    Conduct a secure virtual consult directly inside your web browser.
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Inputs split */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">

                                    {/* Left: Interactive Date selection */}
                                    <div className="space-y-4">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">
                                            Select Consultation Date
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                min={getMinDateString()}
                                                value={bookingDate}
                                                onChange={handleDateChange}
                                                className="w-full border-2 border-slate-200 hover:border-slate-300 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50 bg-white rounded-xl px-4 py-3 text-sm font-sans"
                                                id="booking-date-picker"
                                            />
                                        </div>

                                        {/* Error block */}
                                        {dateError && (
                                            <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100 text-xs sm:text-sm flex items-start space-x-2">

                                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <span>{dateError}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Hour Slots list */}
                                    <div className="space-y-4">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">
                                            Select Available hour Slot
                                        </label>

                                        {!bookingDate ? (
                                            <div className="border border-dashed border-slate-200 rounded-xl py-8 px-4 text-center text-slate-400 text-xs">
                                                Please pick a consultation date map first to calculate available hourly slots.
                                            </div>
                                        ) : dateError ? (
                                            <div className="border border-dashed border-rose-250 bg-rose-50/20 text-rose-650 rounded-xl py-8 px-4 text-center text-xs">
                                                Select an on-duty scheduled day to display hourly timings.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" id="slots-grid">
                                                {activeDoc?.availability.hours.map((hr) => (
                                                    <button
                                                        key={hr}
                                                        type="button"
                                                        onClick={() => setSelectedSlot(hr)}
                                                        className={`py-2 px-3 rounded-lg text-xs font-bold font-mono text-center border-2 transition-all cursor-pointer ${selectedSlot === hr
                                                                ? 'bg-teal-650 text-white border-teal-650 shadow'
                                                                : 'bg-white text-slate-700 border-slate-150 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {hr}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* Back / Forwards buttons */}
                                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                                    <button
                                        onClick={handlePrevStep}
                                        className="text-sm font-semibold text-slate-550 hover:text-slate-800 transition-colors cursor-pointer"
                                    >
                                        Back to Specialists Match
                                    </button>
                                    <button
                                        disabled={!bookingDate || !selectedSlot || !!dateError}
                                        onClick={handleNextStep}
                                        className={`inline-flex items-center space-x-2 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow ${bookingDate && selectedSlot && !dateError
                                                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        <span>Proceed to Patient Info</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: PATIENT PRIVATE CREDENTIAL INFO */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-10 space-y-6 text-left"
                            >
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold font-sans text-slate-900">
                                        Step 4: Contact & Patient Information
                                    </h2>
                                    <p className="text-slate-400 text-xs sm:text-sm">
                                        Provide medical record contact details to register this appointment securely.
                                    </p>
                                </div>

                                {/* Errors strip stack */}
                                {formErrors.length > 0 && (
                                    <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 text-xs space-y-1">
                                        <p className="font-bold">Please correct the following fields:</p>
                                        <ul className="list-disc pl-4 space-y-0.5">
                                            {formErrors.map((err, idx) => (
                                                <li key={idx}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <form onSubmit={handleSubmitBooking} className="space-y-4">
                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                            Patient Full Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Eleanor Vance"
                                            value={patientName}
                                            onChange={(e) => setPatientName(e.target.value)}
                                            className="w-full border border-slate-205 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl px-4 py-2.5 text-sm"
                                        />
                                    </div>

                                    {/* Dual columns Phone & Email */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                                Contact Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="e.g. +1 (555) 019-9238"
                                                value={patientPhone}
                                                onChange={(e) => setPatientPhone(e.target.value)}
                                                className="w-full border border-slate-205 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl px-4 py-2.5 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-445 font-mono mb-1.5">
                                                Patient Email Address
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="e.g. eleanor@wellness.org"
                                                value={patientEmail}
                                                onChange={(e) => setPatientEmail(e.target.value)}
                                                className="w-full border border-slate-205 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl px-4 py-2.5 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Dual columns Age & Gender */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                                Age (Years) (Optional)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="125"
                                                placeholder="e.g. 28"
                                                value={patientAge}
                                                onChange={(e) => setPatientAge(e.target.value)}
                                                className="w-full border border-slate-205 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl px-4 py-2.5 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-445 font-mono mb-1.5">
                                                Gender (Optional)
                                            </label>
                                            <select
                                                value={patientGender}
                                                onChange={(e) => setPatientGender(e.target.value)}
                                                className="w-full border border-slate-205 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl px-4 py-2.5 text-sm bg-white cursor-pointer"
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                                <option value="Prefer not to say">Prefer not to say</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Medical History */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                            Pre-existing Medical History / Allergies (Optional)
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. Diabetes, Hypertension, Penicillin allergy..."
                                            value={medicalHistory}
                                            onChange={(e) => setMedicalHistory(e.target.value)}
                                            className="w-full border border-slate-205 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl px-4 py-2.5 text-sm"
                                        />
                                    </div>

                                    {/* Reason for consultation / Notes */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                            Consultation Notes / Concerns (Optional)
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="List any ongoing health symptoms, medical background, allergen triggers or current queries..."
                                            value={visitReason}
                                            onChange={(e) => setVisitReason(e.target.value)}
                                            className="w-full border border-slate-205 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl px-4 py-2.5 text-sm"
                                        />
                                    </div>

                                    {/* Medical Reports / Prescriptions / X-Rays */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">
                                            Medical Reports & X-Ray Images (Optional)
                                        </label>
                                        <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 hover:bg-slate-50/50 rounded-2xl p-6 transition-all relative flex flex-col items-center justify-center text-center cursor-pointer group">
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                            />
                                            <div className="p-3 bg-slate-50 group-hover:bg-teal-50 text-slate-400 group-hover:text-teal-650 rounded-xl transition-all mb-3 border border-slate-100">
                                                <UploadCloud className="h-6 w-6" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700">
                                                Click to upload or drag files here
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                PDF, PNG, JPG or JPEG (Max 5MB per file)
                                            </p>
                                        </div>

                                        {/* Uploading Progress list */}
                                        {Object.keys(uploadProgress).length > 0 && (
                                            <div className="space-y-2 pt-2">
                                                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                                    <div key={fileName} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-4 text-xs">
                                                        <div className="flex items-center space-x-2 truncate">
                                                            <Loader2 className="h-4 w-4 animate-spin text-teal-600 shrink-0" />
                                                            <span className="font-medium text-slate-700 truncate">{fileName}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-2 shrink-0">
                                                            <span className="font-mono text-slate-500">{progress}%</span>
                                                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                                <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Upload Errors list */}
                                        {Object.keys(uploadErrors).length > 0 && (
                                            <div className="space-y-1.5 pt-1.5">
                                                {Object.entries(uploadErrors).map(([fileName, errMsg]) => (
                                                    <div key={fileName} className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-[11px] text-rose-700 flex items-start space-x-2">
                                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-550" />
                                                        <div className="truncate text-left">
                                                            <span className="font-bold truncate block text-slate-800">{fileName}</span>
                                                            <span className="text-[10px] text-rose-600 leading-none">{errMsg}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Uploaded Files list */}
                                        {reports.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                                                {reports.map((report, idx) => {
                                                    const isImage = /\.(jpg|jpeg|png)$/i.test(report.name);
                                                    return (
                                                        <div key={idx} className="bg-white border border-slate-150 p-3 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow">
                                                            <div className="flex items-center space-x-2.5 truncate">
                                                                <div className="h-8 w-8 rounded bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden text-slate-400">
                                                                    {isImage ? (
                                                                        <img src={report.url} className="h-full w-full object-cover" alt="preview" />
                                                                    ) : (
                                                                        <FileText className="h-4.5 w-4.5 text-teal-600" />
                                                                    )}
                                                                </div>
                                                                <span className="text-xs font-semibold text-slate-700 truncate block text-left" title={report.name}>
                                                                    {report.name}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveReport(idx)}
                                                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                                                title="Remove file"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Back / Submit Buttons */}
                                    <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                                        <button
                                            type="button"
                                            onClick={handlePrevStep}
                                            className="text-sm font-semibold text-slate-550 hover:text-slate-800 transition-colors cursor-pointer"
                                        >
                                            Back to Schedule
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={activeUploadsCount > 0}
                                            className={`inline-flex items-center space-x-2 font-bold px-7 py-3 rounded-xl text-sm transition-all shadow cursor-pointer ${
                                                activeUploadsCount > 0
                                                    ? 'bg-slate-100 text-slate-450 cursor-not-allowed shadow-none border border-slate-200'
                                                    : 'bg-teal-650 hover:bg-teal-700 active:bg-teal-850 text-white'
                                            }`}
                                        >
                                            {activeUploadsCount > 0 ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />
                                                    <span>Uploading reports...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Finalize My Reservation</span>
                                                    <FileCheck2 className="h-4 w-4 text-emerald-405 shrink-0" />
                                                </>
                                            )}
                                        </button>
                                    </div>

                                </form>
                            </motion.div>
                        )}

                        {/* STEP 5: ABSOLUTE BOOKING SUCCESS PAGE */}
                        {step === 5 && isSuccessfullyBooked && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-8 sm:p-12 text-center space-y-6"
                                id="booking-success-piston"
                            >
                                {/* Centered Green Badge */}
                                <div className="mx-auto h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border-2 border-emerald-500 animate-bounce">
                                    <CheckCircle className="h-8 w-8 text-emerald-650" />
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 font-mono uppercase tracking-wider px-3 py-1 rounded-full">
                                        Health Reservation Confirmed
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-slate-900 pt-1">
                                        Appointment Booking Completed!
                                    </h2>
                                    <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto">
                                        Your appointment has been registered inside our clinical workflow database. Please save or jot down your exclusive reference ID.
                                    </p>
                                </div>

                                {/* Grid details block */}
                                <div className="bg-slate-50 rounded-2xl border border-slate-105 p-6 max-w-md mx-auto text-left space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-200/50 pb-2.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Reference Code</span>
                                        <strong className="text-teal-700 font-mono text-sm leading-none">{isSuccessfullyBooked.id}</strong>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 text-xs text-slate-705">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 text-teal-600 mr-2.5 shrink-0" />
                                            <span>Patient: <strong className="text-slate-900">{isSuccessfullyBooked.patientName}</strong></span>
                                        </div>
                                        <div className="flex items-center">
                                            <HeartPulse className="h-4 w-4 text-teal-600 mr-2.5 shrink-0" />
                                            <span>Doctor: <strong className="text-slate-900">{isSuccessfullyBooked.doctorName}</strong></span>
                                        </div>
                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 text-teal-600 mr-2.5 shrink-0" />
                                            <span>Date: <strong className="text-slate-900">{isSuccessfullyBooked.date}</strong></span>
                                        </div>
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 text-teal-600 mr-2.5 shrink-0" />
                                            <span>Time: <strong className="text-slate-900">{isSuccessfullyBooked.timeSlot}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Instructions guidelines check card */}
                                <div className="max-w-md mx-auto p-4 bg-teal-50/40 border border-teal-100 rounded-xl text-left text-[11px] sm:text-xs text-teal-900 space-y-2">
                                    <p className="font-bold">📌 Preparation Checklist for your visit:</p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-teal-850">
                                        <li>Please check in at the front reception desk 10 minutes prior to slot.</li>
                                        <li>Bring any historical clinical scans, prescriptions or medical lists.</li>
                                        <li>Bring a valid insurance membership card or proof of ID.</li>
                                    </ul>
                                </div>

                                {/* Foot CTA actions */}
                                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        onClick={() => setCurrentPage('my-appointments')}
                                        className="w-full sm:w-auto inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow cursor-pointer font-sans"
                                        id="success-view-bookings-btn"
                                    >
                                        <span>View Scheduled Bookings</span>
                                    </button>
                                    <button
                                        onClick={handleFullReset}
                                        className="w-full sm:w-auto inline-flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold py-3 px-6 rounded-xl text-sm transition-all cursor-pointer font-sans"
                                        id="success-book-another-btn"
                                    >
                                        <span>Book Another Appointment</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
