import React, { useState, useEffect, useRef } from 'react';
import { Page, UserProfile, AmbulanceDriver } from '../types';
import { 
    doc, 
    onSnapshot, 
    updateDoc, 
    setDoc,
    collection, 
    getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
    Truck, 
    Activity, 
    Phone, 
    LogOut, 
    Loader2, 
    AlertCircle, 
    CheckCircle2, 
    Radio, 
    ShieldAlert, 
    Clock, 
    MapPin,
    Navigation,
    Send,
    Check,
    X,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LiveTrackingMap from './LiveTrackingMap';

interface DriverPortalProps {
    setCurrentPage: (page: Page) => void;
    userProfile: UserProfile | null;
    onSignOut: () => void;
}

export default function DriverPortal({
    setCurrentPage,
    userProfile,
    onSignOut
}: DriverPortalProps) {
    const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(
        userProfile?.driverId || null
    );
    const [driverData, setDriverData] = useState<AmbulanceDriver | null>(null);
    const [allAmbulances, setAllAmbulances] = useState<AmbulanceDriver[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
    const [statusToast, setStatusToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Live Booking Requests & Active Trip State
    const [pendingBookings, setPendingBookings] = useState<any[]>([]);
    const [activeTrip, setActiveTrip] = useState<any | null>(null);
    const [isTrackingGps, setIsTrackingGps] = useState<boolean>(false);
    const watchIdRef = useRef<number | null>(null);

    // Fetch list of all ambulances for quick selection if not pre-linked
    useEffect(() => {
        async function fetchAmbulances() {
            try {
                const colRef = collection(db, 'ambulances');
                const snap = await getDocs(colRef);
                const list: AmbulanceDriver[] = [];
                snap.forEach((docSnap) => {
                    list.push({ id: docSnap.id, ...docSnap.data() } as AmbulanceDriver);
                });
                setAllAmbulances(list);

                if (!selectedAmbulanceId && userProfile) {
                    const matched = list.find(
                        (a) =>
                            a.driverEmail?.toLowerCase() === userProfile.email?.toLowerCase() ||
                            a.phone?.replace(/\s+/g, '') === userProfile.phoneNumber?.replace(/\s+/g, '')
                    );
                    if (matched) {
                        setSelectedAmbulanceId(matched.id);
                    } else if (list.length > 0) {
                        setSelectedAmbulanceId(list[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed fetching ambulance list:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchAmbulances();
    }, [userProfile]);

    // Live Snapshot Listener for current active driver's document
    useEffect(() => {
        if (!selectedAmbulanceId) return;

        setLoading(true);
        const docRef = doc(db, 'ambulances', selectedAmbulanceId);
        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setDriverData({ id: docSnap.id, ...docSnap.data() } as AmbulanceDriver);
                } else {
                    setDriverData(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error listening to driver document snapshot:", err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [selectedAmbulanceId]);

    // Live Snapshot Listener for Ambulance Bookings (Pending & Accepted for this driver)
    useEffect(() => {
        const colRef = collection(db, 'ambulance_bookings');
        const unsubscribe = onSnapshot(colRef, (snapshot) => {
            const pendingList: any[] = [];
            let activeBooking: any = null;

            snapshot.forEach((docSnap) => {
                const data: any = { id: docSnap.id, ...docSnap.data() };
                if (data.status === 'Pending') {
                    pendingList.push(data);
                } else if (
                    selectedAmbulanceId &&
                    data.assignedDriverId === selectedAmbulanceId &&
                    (data.status === 'Accepted' || data.status === 'On_The_Way' || data.status === 'Arrived')
                ) {
                    activeBooking = data;
                }
            });

            pendingList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPendingBookings(pendingList);
            setActiveTrip(activeBooking);
        });

        return () => unsubscribe();
    }, [selectedAmbulanceId]);

    // Start Live GPS Watcher when trip is active
    const startLiveGpsTracking = (bookingId: string) => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your mobile browser.");
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        setIsTrackingGps(true);

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const driverLoc = { lat, lng, timestamp: new Date().toISOString() };

                try {
                    if (selectedAmbulanceId) {
                        await updateDoc(doc(db, 'ambulances', selectedAmbulanceId), {
                            driverLocation: driverLoc,
                            status: 'On Emergency Call',
                            updatedAt: new Date().toISOString()
                        });
                    }

                    await updateDoc(doc(db, 'ambulance_bookings', bookingId), {
                        driverLocation: driverLoc,
                        updatedAt: new Date().toISOString()
                    });
                } catch (err) {
                    console.error("Failed pushing GPS location update:", err);
                }
            },
            (err) => {
                console.error("GPS Watch Position Error:", err);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            }
        );

        watchIdRef.current = watchId;
    };

    const stopLiveGpsTracking = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTrackingGps(false);
    };

    useEffect(() => {
        if (activeTrip && !isTrackingGps) {
            startLiveGpsTracking(activeTrip.id);
        } else if (!activeTrip && isTrackingGps) {
            stopLiveGpsTracking();
        }
    }, [activeTrip?.id]);

    useEffect(() => {
        return () => {
            stopLiveGpsTracking();
        };
    }, []);

    // Driver Action: Accept Booking
    const handleAcceptBooking = async (booking: any) => {
        if (!selectedAmbulanceId || !driverData) return;

        setUpdatingStatus(true);
        try {
            await updateDoc(doc(db, 'ambulance_bookings', booking.id), {
                status: 'Accepted',
                assignedDriverId: selectedAmbulanceId,
                assignedDriverName: driverData.name,
                assignedDriverPhone: driverData.phone,
                acceptedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            await updateDoc(doc(db, 'ambulances', selectedAmbulanceId), {
                status: 'On Emergency Call',
                updatedAt: new Date().toISOString()
            });

            startLiveGpsTracking(booking.id);

            setStatusToast({
                type: 'success',
                message: `✅ Emergency Call Accepted for ${booking.patientName}! Live GPS Navigation started.`
            });
            setTimeout(() => setStatusToast(null), 5000);
        } catch (err: any) {
            console.error("Error accepting booking:", err);
            alert("Failed to accept booking: " + (err.message || 'Firestore error'));
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Driver Action: Mark Arrived
    const handleMarkArrived = async (bookingId: string) => {
        try {
            await updateDoc(doc(db, 'ambulance_bookings', bookingId), {
                status: 'Arrived',
                updatedAt: new Date().toISOString()
            });
            setStatusToast({
                type: 'success',
                message: `📍 Marked Arrived at Patient Location.`
            });
            setTimeout(() => setStatusToast(null), 4000);
        } catch (err: any) {
            console.error("Error marking arrived:", err);
        }
    };

    // Driver Action: Complete Trip
    const handleCompleteTrip = async (bookingId: string) => {
        if (!window.confirm("Mark emergency trip as COMPLETED?")) return;

        stopLiveGpsTracking();
        setUpdatingStatus(true);
        try {
            await updateDoc(doc(db, 'ambulance_bookings', bookingId), {
                status: 'Completed',
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            if (selectedAmbulanceId) {
                await updateDoc(doc(db, 'ambulances', selectedAmbulanceId), {
                    status: 'Available',
                    updatedAt: new Date().toISOString()
                });
            }

            setActiveTrip(null);
            setStatusToast({
                type: 'success',
                message: `🏁 Emergency Trip Completed successfully! Status updated to Available.`
            });
            setTimeout(() => setStatusToast(null), 5000);
        } catch (err: any) {
            console.error("Error completing trip:", err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Handler to Toggle Driver Status (Available <-> On Emergency Call)
    const handleToggleStatus = async (newStatus: 'Available' | 'On Emergency Call') => {
        if (!selectedAmbulanceId || !driverData || driverData.status === newStatus) return;

        const previousStatus = driverData.status;

        setDriverData(prev => prev ? { ...prev, status: newStatus } : null);
        setUpdatingStatus(true);
        setStatusToast(null);

        try {
            const docRef = doc(db, 'ambulances', selectedAmbulanceId);
            await setDoc(docRef, {
                status: newStatus,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setStatusToast({
                type: 'success',
                message: `Status updated to "${newStatus}"! Live emergency dispatch notified.`
            });

            setTimeout(() => setStatusToast(null), 4000);
        } catch (err: any) {
            console.error("Failed updating driver availability status:", err);
            setDriverData(prev => prev ? { ...prev, status: previousStatus } : null);
            setStatusToast({
                type: 'error',
                message: `Failed to update status: ${err.message || 'Firestore error'}`
            });
            setTimeout(() => setStatusToast(null), 5000);
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center text-slate-800 px-4">
                <Loader2 className="h-12 w-12 text-rose-600 animate-spin mb-4" />
                <p className="font-bold text-sm text-slate-600 font-sans tracking-wide">
                    Connecting to Emergency Dispatch Console...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-50/60 text-slate-900 min-h-screen pb-16 font-sans relative overflow-hidden" id="driver-portal-root">
            {/* Ambient Background Glow */}
            <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
                driverData?.status === 'Available' ? 'bg-emerald-200/40' : 'bg-rose-200/40'
            }`} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-slate-200/30 blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 relative z-10 space-y-6">

                {/* Top Action Header */}
                <div className="flex items-center justify-between py-4 border-b border-slate-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-xs">
                            <Truck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 font-sans leading-tight">
                                Ambulance Driver Navigation Console
                            </h1>
                            <p className="text-xs text-slate-500 font-mono">
                                Vehicle Unit ID: <span className="text-rose-600 font-bold">{selectedAmbulanceId || 'UNLINKED'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={onSignOut}
                            className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-xs cursor-pointer"
                        >
                            <LogOut className="h-4 w-4 text-rose-600" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>

                {/* Status Toast Alert */}
                <AnimatePresence>
                    {statusToast && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm ${
                                statusToast.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}
                        >
                            <div className="flex items-center space-x-2">
                                {statusToast.type === 'success' ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                                )}
                                <span>{statusToast.message}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Operator / Vehicle Switcher Dropdown (if multiple units) */}
                {allAmbulances.length > 1 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                            <Radio className="h-4 w-4 text-teal-600 shrink-0" />
                            <span>Select Vehicle & Operator Account:</span>
                        </div>
                        <select
                            value={selectedAmbulanceId || ''}
                            onChange={(e) => setSelectedAmbulanceId(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-rose-600"
                        >
                            {allAmbulances.map((amb) => (
                                <option key={amb.id} value={amb.id}>
                                    {amb.name} — {amb.vehicleNo} ({amb.status})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* ACTIVE EMERGENCY TRIP LIVE NAVIGATION VIEW */}
                {activeTrip && (
                    <div className="bg-white border-2 border-rose-500 rounded-3xl p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-extrabold font-mono uppercase tracking-wider mb-1">
                                    <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                                    <span>Active Emergency Trip ({activeTrip.status})</span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Patient: {activeTrip.patientName}
                                </h2>
                                <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>{activeTrip.patientLocation?.address}</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={`tel:${activeTrip.patientPhone}`}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span>Call Patient</span>
                                </a>
                            </div>
                        </div>

                        {/* LIVE NAVIGATION ROAD ROUTE MAP */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <span className="flex items-center gap-1.5 text-teal-700 font-mono">
                                    <Navigation className="w-4 h-4" />
                                    Live Road Driving Route Navigation
                                </span>
                                {isTrackingGps && (
                                    <span className="text-emerald-700 text-[11px] font-mono flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                        Phone GPS Pushing Realtime
                                    </span>
                                )}
                            </div>
                            <LiveTrackingMap
                                patientLocation={activeTrip.patientLocation}
                                driverLocation={driverData?.driverLocation}
                                showRoute={true}
                                height="420px"
                            />
                        </div>

                        {/* DRIVER TRIP CONTROL BUTTONS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {activeTrip.status !== 'Arrived' && (
                                <button
                                    type="button"
                                    onClick={() => handleMarkArrived(activeTrip.id)}
                                    className="py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <MapPin className="w-4 h-4" />
                                    <span>Mark Arrived at Patient Location</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => handleCompleteTrip(activeTrip.id)}
                                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer sm:col-span-1"
                            >
                                <Check className="w-4 h-4" />
                                <span>🏁 Complete Emergency Trip & Free Vehicle</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* PENDING EMERGENCY CALL REQUESTS LIST */}
                {!activeTrip && pendingBookings.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                                <span>Incoming Emergency Patient Calls ({pendingBookings.length})</span>
                            </h3>
                            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Live Dispatch Queue</span>
                        </div>

                        <div className="space-y-3">
                            {pendingBookings.map((bk) => (
                                <div
                                    key={bk.id}
                                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-extrabold text-slate-900 text-sm">{bk.patientName}</h4>
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                                {bk.urgency}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                            <span>{bk.patientLocation?.address || 'Pickup Location'}</span>
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-mono">
                                            Phone: <strong className="text-slate-800">{bk.patientPhone}</strong> | Call Time: {new Date(bk.createdAt).toLocaleTimeString()}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={updatingStatus}
                                        onClick={() => handleAcceptBooking(bk)}
                                        className="py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>Accept & Start Live GPS Navigation</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {driverData ? (
                    <div className="space-y-6">
                        {/* MAIN DRIVER PROFILE CARD */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="flex items-center space-x-4">
                                    <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${driverData.bgColor || 'from-rose-500 to-red-600'} text-white flex items-center justify-center text-xl font-extrabold shadow-sm shrink-0`}>
                                        {driverData.initials || 'DR'}
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-extrabold text-slate-900 font-sans">
                                            {driverData.name}
                                        </h2>
                                        <p className="text-xs font-mono text-slate-500 font-semibold uppercase">
                                            {driverData.role}
                                        </p>
                                        <div className="flex items-center space-x-2 text-xs text-rose-600 pt-1 font-mono font-bold">
                                            <Phone className="h-3.5 w-3.5 shrink-0" />
                                            <span>{driverData.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full sm:w-auto min-w-[200px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block mb-1">
                                        Vehicle Unit
                                    </span>
                                    <p className="text-sm font-extrabold text-slate-900 font-mono">
                                        {driverData.vehicleNo}
                                    </p>
                                    <p className="text-xs text-teal-700 font-medium truncate mt-0.5">
                                        {driverData.vehicleType}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* AVAILABILITY TOGGLE CONTROL */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-6">
                            <div className="space-y-1">
                                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                                    Live Dispatch Status Controller
                                </span>
                                <h3 className="text-2xl font-black text-slate-900 font-sans">
                                    Current Status:{' '}
                                    <span className={driverData.status === 'Available' ? 'text-emerald-600' : 'text-rose-600'}>
                                        {driverData.status}
                                    </span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    disabled={driverData.status === 'Available'}
                                    onClick={() => handleToggleStatus('Available')}
                                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer select-none active:scale-95 ${
                                        driverData.status === 'Available'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-4 ring-emerald-500/20 shadow-md'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-500/50 hover:text-emerald-700'
                                    } ${updatingStatus ? 'opacity-70' : ''}`}
                                >
                                    <div className={`p-4 rounded-2xl ${
                                        driverData.status === 'Available' ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                        <Activity className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <span className="text-base font-extrabold block">🟢 AVAILABLE</span>
                                        <span className="text-[11px] font-medium block text-slate-500 mt-0.5">
                                            Ready for instant emergency dispatch
                                        </span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    disabled={driverData.status === 'On Emergency Call'}
                                    onClick={() => handleToggleStatus('On Emergency Call')}
                                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer select-none active:scale-95 ${
                                        driverData.status === 'On Emergency Call'
                                            ? 'bg-rose-50 border-rose-500 text-rose-900 ring-4 ring-rose-500/20 shadow-md'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-500/50 hover:text-rose-700'
                                    } ${updatingStatus ? 'opacity-70' : ''}`}
                                >
                                    <div className={`p-4 rounded-2xl ${
                                        driverData.status === 'On Emergency Call' ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                        <ShieldAlert className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <span className="text-base font-extrabold block">🔴 ON EMERGENCY CALL</span>
                                        <span className="text-[11px] font-medium block text-slate-500 mt-0.5">
                                            Currently responding to a patient call
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-900">No Linked Ambulance Record Found</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            Please contact your Sanjeevani Clinic Administrator to register your vehicle details in the Ambulance Fleet Ledger.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
