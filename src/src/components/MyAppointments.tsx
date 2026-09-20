import React from 'react';
import { Appointment, Page } from '../types';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import {
    Calendar,
    Clock,
    HeartPulse,
    ClipboardList,
    Trash2,
    X,
    ShieldAlert,
    CheckCircle,
    FileText,
    Edit,
    Video,
    UserRound
} from 'lucide-react';

interface MyAppointmentsProps {
    setCurrentPage: (page: Page) => void;
    appointments: Appointment[];
    setAppointments: (appointments: Appointment[]) => void;
    user: any;
    onEditAppointment: (appointment: Appointment) => void;
    onJoinVideoCall: (appointment: Appointment) => void;
}

export default function MyAppointments({
    setCurrentPage,
    appointments,
    setAppointments,
    user,
    onEditAppointment,
    onJoinVideoCall
}: MyAppointmentsProps) {
    const { t } = useLanguage();

    // State to filter appointments lists on-the-fly
    const [filter, setFilter] = React.useState<'all' | 'Confirmed' | 'Cancelled'>('all');

    // Dialog configurations
    const [activeModal, setActiveModal] = React.useState<{
        type: 'cancel' | 'delete' | 'alert' | null;
        id?: string;
        title: string;
        message: string;
        okText?: string;
        cancelText?: string;
        onConfirm?: () => Promise<void> | void;
    } | null>(null);

    const [dialogLoading, setDialogLoading] = React.useState(false);

    // File preview state
    const [previewFile, setPreviewFile] = React.useState<{ name: string; url: string } | null>(null);

    // Prescription preview state
    const [selectedPrescription, setSelectedPrescription] = React.useState<any | null>(null);

    // Cancel booking action wrapper
    const handleCancelAppointment = (id: string) => {
        setActiveModal({
            type: 'cancel',
            id,
            title: 'Cancel Medical Appointment',
            message: 'Are you sure you want to cancel this scheduled medical appointment? This slot will be released back to other patients.',
            okText: 'Yes, Cancel Appointment',
            cancelText: 'Keep Appointment',
            onConfirm: async () => {
                setDialogLoading(true);
                try {
                    try {
                        await updateDoc(doc(db, 'appointments', id), {
                            status: 'Cancelled'
                        });
                    } catch (errWrite) {
                        handleFirestoreError(errWrite, OperationType.UPDATE, `appointments/${id}`);
                    }

                    const updated = appointments.map((apt) => {
                        if (apt.id === id) {
                            return { ...apt, status: 'Cancelled' as const };
                        }
                        return apt;
                    });
                    setAppointments(updated);
                    setActiveModal(null);
                } catch (e: any) {
                    console.error('Error cancelling clinical appointment record', e);
                    setActiveModal({
                        type: 'alert',
                        title: 'Synchronization Failure',
                        message: 'Failed to sync cancellation request with Firebase Cloud: ' + (e.message || 'Please verify your connection and try again.')
                    });
                } finally {
                    setDialogLoading(false);
                }
            }
        });
    };

    // Completely delete archival logs from database
    const handleDeleteAppointment = (id: string) => {
        setActiveModal({
            type: 'delete',
            id,
            title: 'Erase Historical Log',
            message: 'Are you sure you want to completely erase this appointment from history logs? This action is permanent and cannot be undone.',
            okText: 'Permanently Erase Record',
            cancelText: 'Go Back',
            onConfirm: async () => {
                setDialogLoading(true);
                try {
                    try {
                        await deleteDoc(doc(db, 'appointments', id));
                    } catch (errDelete) {
                        handleFirestoreError(errDelete, OperationType.DELETE, `appointments/${id}`);
                    }
                    const updated = appointments.filter(apt => apt.id !== id);
                    setAppointments(updated);
                    setActiveModal(null);
                } catch (e: any) {
                    console.error('Error erasing file from database logs', e);
                    setActiveModal({
                        type: 'alert',
                        title: 'Database Deletion Error',
                        message: 'Failed to remove log archive from medical cloud database folder: ' + (e.message || 'Please retry.')
                    });
                } finally {
                    setDialogLoading(false);
                }
            }
        });
    };

    // Run list filtration
    const filteredAppointments = appointments.filter((apt) => {
        if (filter === 'all') return true;
        return apt.status === filter;
    });

    return (
        <div className="bg-slate-50/50 min-h-screen py-12 lg:py-16" id="my-appointments-dashboard">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* CONTROLS PROFILE BAR */}
                {appointments.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono">
                        <span className="font-bold text-slate-500 uppercase tracking-wide">
                            Active Records Filter:
                        </span>
                        <div className="flex space-x-2">
                            {(['all', 'Pending', 'Confirmed', 'Cancelled'] as const).map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setFilter(opt)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide capitalize cursor-pointer transition-colors ${filter === opt
                                        ? 'bg-teal-650 text-white shadow-sm'
                                        : 'bg-slate-50 text-slate-650 hover:bg-slate-100 border border-slate-100/50'
                                        }`}
                                >
                                    {opt === 'all' ? 'All Bookings' : opt === 'Pending' ? 'Pending Approval' : opt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* LIST RENDER */}
                {filteredAppointments.length > 0 ? (
                    <div className="space-y-6" id="appointments-cards-stack">
                        {filteredAppointments.map((apt) => {
                            const canCancel = apt.status === 'Confirmed' || apt.status === 'Pending';

                            return (
                                <div
                                    key={apt.id}
                                    className={`bg-white rounded-2xl border border-slate-150/70 p-5 sm:p-6 text-left flex flex-col sm:flex-row justify-between gap-6 transition-all hover:border-slate-300 relative overflow-hidden`}
                                    id={`appointment-card-${apt.id}`}
                                >
                                    {/* Visual Left Status Border strip */}
                                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${apt.status === 'Confirmed' ? 'bg-teal-600' :
                                            apt.status === 'Pending' ? 'bg-amber-500' :
                                                'bg-slate-350'
                                        }`} />

                                    {/* Main Content Info block */}
                                    <div className="space-y-4 pl-1 sm:pl-2 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Code Tag */}
                                            <span className="inline-block bg-slate-900 text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded-md leading-none select-all uppercase">
                                                Ref: {apt.id}
                                            </span>

                                            {/* Diagnostic Status Badge */}
                                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono tracking-wider ${apt.status === 'Confirmed' ? 'bg-teal-100 text-teal-800' :
                                                    apt.status === 'Cancelled' ? 'bg-stone-100 text-slate-500 line-through' :
                                                        'bg-amber-100 text-amber-800 animate-pulse'
                                                }`}>
                                                {apt.status === 'Confirmed' ? (
                                                    <>
                                                        <span className="h-1.5 w-1.5 rounded-full bg-teal-600 mr-1 shrink-0 animate-pulse" />
                                                        <span>Confirmed</span>
                                                    </>
                                                ) : apt.status === 'Cancelled' ? (
                                                    <>
                                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-1 shrink-0" />
                                                        <span>Cancelled</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1 shrink-0" />
                                                        <span>Pending</span>
                                                    </>
                                                )}
                                            </span>

                                            {/* Consultation Type Badge */}
                                            {apt.consultationType && (
                                                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono tracking-wider ${
                                                    apt.consultationType === 'Online'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {apt.consultationType === 'Online' ? (
                                                        <>
                                                            <Video className="h-3 w-3 mr-1 shrink-0 text-emerald-600 animate-pulse" />
                                                            <span>Online Call</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserRound className="h-3 w-3 mr-1 shrink-0 text-slate-500" />
                                                            <span>In-Person</span>
                                                        </>
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {/* Doctors and Department title */}
                                        <div>
                                            <h3 className="font-extrabold text-slate-905 font-sans text-md sm:text-lg flex items-center leading-tight">
                                                <HeartPulse className="h-4 w-4 text-teal-650 mr-2 shrink-0 md:block hidden" />
                                                <span>{apt.doctorName}</span>
                                            </h3>
                                            <p className="text-xs text-slate-450 font-mono mt-0.5 uppercase tracking-wide">
                                                Specialty of {apt.departmentName}
                                            </p>
                                        </div>

                                        {/* Time Slot Details strip */}
                                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-105 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-sans font-medium text-slate-700">
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 text-teal-605 mr-2 shrink-0" />
                                                <span>Date: <strong className="text-slate-900">{apt.date}</strong></span>
                                            </div>
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 text-teal-610 mr-2 shrink-0" />
                                                <span>Time: <strong className="text-slate-900">{apt.timeSlot}</strong></span>
                                            </div>
                                        </div>

                                        {/* Patient identity detail */}
                                        <div className="text-xs text-slate-650 border-t border-slate-100 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <span>Patient: <strong className="text-slate-900 font-sans">{apt.patientName}</strong></span>
                                            {(apt.patientAge || apt.patientGender) && (
                                                <>
                                                    <span className="text-slate-205 hidden md:block">|</span>
                                                    <span>Info: <strong className="text-slate-905">{[apt.patientAge ? `${apt.patientAge} Yrs` : '', apt.patientGender || ''].filter(Boolean).join(', ')}</strong></span>
                                                </>
                                            )}
                                            <span className="text-slate-205 hidden md:block">|</span>
                                            <span>Phone: <strong className="text-slate-900 font-mono">{apt.patientPhone}</strong></span>
                                        </div>

                                        {/* Optional Medical History */}
                                        {apt.medicalHistory && (
                                            <div className="text-stone-550 text-[11px] bg-rose-50/20 p-2.5 rounded-lg border border-rose-100/30">
                                                <strong>Medical History:</strong> {apt.medicalHistory}
                                            </div>
                                        )}

                                        {/* Optional Notes block */}
                                        {apt.notes && (
                                            <div className="text-stone-505 text-[11px] bg-amber-50/30 p-2.5 rounded-lg border border-amber-100/40 italic">
                                                <strong>Reason:</strong> "{apt.notes}"
                                            </div>
                                        )}

                                        {/* Optional Attachments list */}
                                        {apt.reports && apt.reports.length > 0 && (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                                                    Attached Medical Reports:
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {apt.reports.map((report, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => setPreviewFile(report)}
                                                            className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 text-[11px] font-semibold text-slate-700 hover:text-teal-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer truncate max-w-[200px]"
                                                            title={report.name}
                                                        >
                                                            <FileText className="h-3.5 w-3.5 text-teal-650 shrink-0" />
                                                            <span className="truncate">{report.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions buttons column */}
                                    <div className="flex sm:flex-col justify-end items-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-105 pt-4 sm:pt-0 sm:pl-6 min-w-[120px]">
                                        {apt.status === 'Confirmed' && apt.consultationType === 'Online' && (
                                            apt.videoCallStatus === 'ended' ? (
                                                <button
                                                    disabled
                                                    className="w-full inline-flex items-center justify-center space-x-1.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold py-2 px-3.5 rounded-xl text-xs cursor-not-allowed"
                                                    title="Online Consultation Completed"
                                                >
                                                    <Video className="h-3.5 w-3.5" />
                                                    <span>Call Completed</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onJoinVideoCall(apt)}
                                                    className="w-full inline-flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-sm hover:shadow-md transition-all cursor-pointer animate-pulse"
                                                    title="Join Online Video Consultation Room"
                                                >
                                                    <Video className="h-3.5 w-3.5" />
                                                    <span>Join Call</span>
                                                </button>
                                            )
                                        )}
                                        {apt.prescription && (
                                            <button
                                                onClick={() => setSelectedPrescription({ ...apt.prescription, doctorName: apt.doctorName, departmentName: apt.departmentName, patientName: apt.patientName, patientAge: apt.patientAge, patientGender: apt.patientGender })}
                                                className="w-full inline-flex items-center justify-center space-x-1.5 bg-teal-650 hover:bg-teal-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                                                title="View Prescription Details"
                                            >
                                                <ClipboardList className="h-3.5 w-3.5" />
                                                <span>Prescription</span>
                                            </button>
                                        )}
                                        {apt.status !== 'Cancelled' && (
                                            <button
                                                onClick={() => onEditAppointment(apt)}
                                                className="w-full inline-flex items-center justify-center space-x-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold py-2 px-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                                                title="Edit Booking Details"
                                            >
                                                <Edit className="h-3.5 w-3.5 text-teal-650" />
                                                <span>Edit Booking</span>
                                            </button>
                                        )}
                                        {canCancel ? (
                                            <button
                                                onClick={() => handleCancelAppointment(apt.id)}
                                                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 border border-rose-250 text-rose-700 hover:bg-rose-50 font-semibold py-2 px-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                                                title="Cancel Appointment"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                <span>Cancel Booking</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleDeleteAppointment(apt.id)}
                                                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 border border-slate-205 text-slate-500 hover:text-slate-905 hover:bg-slate-100 py-2 px-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                                                title="Erase Archival Logs"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Delete Archive</span>
                                            </button>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* EMPTY STATE APPOINTMENTS CARD */
                    <div className="bg-white rounded-3xl border border-slate-100 py-16 px-6 text-center max-w-lg mx-auto shadow-sm" id="empty-state-canvas">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-5 border border-slate-100">
                            <ClipboardList className="h-7 w-7" />
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-lg font-sans">
                            {filter === 'all'
                                ? 'No Appointments Registered Yet'
                                : `No ${filter} Appointments Found`}
                        </h3>

                        <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                            {filter === 'all'
                                ? 'You do not have any active clinical consults booked. Launch our scheduling assistant to secure your preferred slot.'
                                : `You do not have any appointments categorized as "${filter}" currently logged under this session.`}
                        </p>

                        <div className="pt-6 flex justify-center space-x-3">
                            {filter !== 'all' && (
                                <button
                                    onClick={() => setFilter('all')}
                                    className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setCurrentPage('booking');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-teal-650 hover:bg-teal-750 active:bg-teal-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow shadow-teal-700/10 hover:shadow-teal-700/20 transition-all cursor-pointer inline-flex items-center space-x-1.5"
                            >
                                <span>Book Appointment Now</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* CUSTOM MODAL OVERLAY */}
                {activeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="appointments-portal-dialog">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-8 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center space-x-3 text-amber-600 mb-4">
                                <ShieldAlert className="h-6 w-6 shrink-0" />
                                <h3 className="font-extrabold text-slate-900 text-lg font-sans">
                                    {activeModal.title}
                                </h3>
                            </div>
                            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
                                {activeModal.message}
                            </p>
                            <div className="flex flex-col gap-2">
                                {activeModal.type !== 'alert' && (
                                    <button
                                        disabled={dialogLoading}
                                        onClick={async () => {
                                            if (activeModal.onConfirm) {
                                                await activeModal.onConfirm();
                                            }
                                        }}
                                        className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all cursor-pointer flex items-center justify-center space-x-2 ${activeModal.type === 'delete'
                                            ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm'
                                            : 'bg-teal-650 hover:bg-teal-750 active:bg-teal-800 shadow-sm'
                                            }`}
                                    >
                                        {dialogLoading ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                                                <span>Updating Record...</span>
                                            </>
                                        ) : (
                                            <span>{activeModal.okText || 'Confirm'}</span>
                                        )}
                                    </button>
                                )}
                                <button
                                    disabled={dialogLoading}
                                    onClick={() => setActiveModal(null)}
                                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                                >
                                    {activeModal.cancelText || 'Dismiss'}
                                </button>
                            </div>
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
                        View Prescription Slip
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
