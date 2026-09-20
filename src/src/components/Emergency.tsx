import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { collection, onSnapshot, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { 
    Phone, 
    Truck, 
    ShieldAlert, 
    Activity, 
    MapPin, 
    Clock, 
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    RefreshCw,
    Navigation,
    User,
    X,
    Send
} from 'lucide-react';
import LiveTrackingMap from './LiveTrackingMap';

interface EmergencyProps {
    setCurrentPage: (page: Page) => void;
}

const AMBULANCE_DRIVERS = [
    {
        id: 'drv-rajesh',
        name: 'Rajesh Kumar',
        role: 'Senior First-Responder Operator',
        phone: '+91 98765 43210',
        driverEmail: 'driver@sanjeevani.com',
        vehicleType: 'Advanced Cardiac Life Support (ACLS)',
        vehicleNo: 'MH-12-QE-4567',
        status: 'Available',
        initials: 'RK',
        bgColor: 'from-emerald-500 to-teal-600',
        rating: 4.9,
        tripsCompleted: 340,
        experience: '8 Years'
    },
    {
        id: 'drv-amit',
        name: 'Amit Patel',
        role: 'Paramedic & Emergency Driver',
        phone: '+91 98765 43211',
        driverEmail: 'amit.driver@sanjeevani.com',
        vehicleType: 'Basic Life Support (BLS) Ambulance',
        vehicleNo: 'MH-12-QE-7890',
        status: 'Available',
        initials: 'AP',
        bgColor: 'from-teal-500 to-cyan-600',
        rating: 4.8,
        tripsCompleted: 210,
        experience: '5 Years'
    },
    {
        id: 'drv-sunita',
        name: 'Dr. Sunita Sharma',
        role: 'Critical Care Ambulance Medic',
        phone: '+91 98765 43212',
        driverEmail: 'sunita.driver@sanjeevani.com',
        vehicleType: 'Neonatal & Pediatric Intensive Care Transport',
        vehicleNo: 'MH-12-QE-1234',
        status: 'On Emergency Call',
        initials: 'SS',
        bgColor: 'from-rose-500 to-red-600',
        rating: 4.95,
        tripsCompleted: 185,
        experience: '6 Years'
    }
];

export default function Emergency({ setCurrentPage }: EmergencyProps) {
    const { t } = useLanguage();
    const [ambulances, setAmbulances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Patient Live GPS Booking State
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [urgencyType, setUrgencyType] = useState('Cardiac Emergency / Chest Pain');
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [patientLocation, setPatientLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [submittingBooking, setSubmittingBooking] = useState(false);
    
    // Active Live Tracking Booking
    const [activeBookingId, setActiveBookingId] = useState<string | null>(() => {
        return localStorage.getItem('sanjeevani_active_ambulance_booking');
    });
    const [bookingData, setBookingData] = useState<any | null>(null);
    const [driverLiveLocation, setDriverLiveLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null);

    // Seed/Fetch Ambulances List
    useEffect(() => {
        const colRef = collection(db, 'ambulances');
        const unsubscribe = onSnapshot(colRef, async (snapshot) => {
            if (snapshot.empty) {
                console.log("Seeding ambulances database...");
                try {
                    for (const driver of AMBULANCE_DRIVERS) {
                        await setDoc(doc(db, 'ambulances', driver.id), driver);
                    }
                } catch (err) {
                    console.error("Failed seeding database:", err);
                }
            } else {
                const list: any[] = [];
                snapshot.forEach((docSnap) => {
                    list.push(docSnap.data());
                });
                list.sort((a, b) => a.id.localeCompare(b.id));
                setAmbulances(list);
                setLoading(false);
            }
        }, (error) => {
            console.error("Firestore onSnapshot error:", error);
            setAmbulances(AMBULANCE_DRIVERS);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Listen to Active Booking Snapshot
    useEffect(() => {
        if (!activeBookingId) {
            setBookingData(null);
            setDriverLiveLocation(null);
            return;
        }

        const bookingRef = doc(db, 'ambulance_bookings', activeBookingId);
        const unsubscribe = onSnapshot(bookingRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setBookingData(data);

                if (data.driverLocation) {
                    setDriverLiveLocation(data.driverLocation);
                }
            } else {
                setActiveBookingId(null);
                localStorage.removeItem('sanjeevani_active_ambulance_booking');
            }
        });

        return () => unsubscribe();
    }, [activeBookingId]);

    // Also listen to assigned driver's location updates if booking has assignedDriverId
    useEffect(() => {
        if (!bookingData || !bookingData.assignedDriverId) return;

        const driverRef = doc(db, 'ambulances', bookingData.assignedDriverId);
        const unsubscribe = onSnapshot(driverRef, (docSnap) => {
            if (docSnap.exists()) {
                const dData = docSnap.data();
                if (dData.driverLocation) {
                    setDriverLiveLocation({
                        ...dData.driverLocation,
                        label: dData.name ? `Driver: ${dData.name}` : 'Ambulance'
                    });
                }
            }
        });

        return () => unsubscribe();
    }, [bookingData?.assignedDriverId]);

    // Detect Patient Live GPS Location
    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            alert("GPS Geolocation is not supported by your browser.");
            return;
        }

        setDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await res.json();
                    if (data && data.display_name) {
                        address = data.display_name;
                    }
                } catch (err) {
                    console.warn("Address geocoding error:", err);
                }

                setPatientLocation({ lat, lng, address });
                setDetectingLocation(false);
            },
            (err) => {
                console.error("GPS Error:", err);
                alert("Could not retrieve GPS location. Please check browser location permissions or click on the map.");
                setDetectingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Create Emergency Ambulance Booking Request
    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName.trim() || !patientPhone.trim()) {
            alert("Please enter patient name and contact phone number.");
            return;
        }

        // Fallback GPS if patient location not detected
        const loc = patientLocation || {
            lat: 19.0760,
            lng: 72.8777,
            address: "Mumbai Central Medical Hub (Default GPS)"
        };

        setSubmittingBooking(true);
        try {
            const bookingId = 'amb-bk-' + Date.now();
            const newBooking = {
                id: bookingId,
                patientName: patientName.trim(),
                patientPhone: patientPhone.trim(),
                urgency: urgencyType,
                patientLocation: loc,
                status: 'Pending', // 'Pending' | 'Accepted' | 'On_The_Way' | 'Arrived' | 'Completed' | 'Cancelled'
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'ambulance_bookings', bookingId), newBooking);
            setActiveBookingId(bookingId);
            localStorage.setItem('sanjeevani_active_ambulance_booking', bookingId);
        } catch (err: any) {
            console.error("Failed creating ambulance booking:", err);
            alert("Failed to submit emergency request: " + (err.message || 'Firestore error'));
        } finally {
            setSubmittingBooking(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!activeBookingId) return;
        if (!window.confirm("Are you sure you want to cancel this ambulance request?")) return;

        try {
            await updateDoc(doc(db, 'ambulance_bookings', activeBookingId), {
                status: 'Cancelled',
                updatedAt: new Date().toISOString()
            });
            setActiveBookingId(null);
            localStorage.removeItem('sanjeevani_active_ambulance_booking');
        } catch (err) {
            console.error("Failed to cancel booking:", err);
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-50/50 min-h-screen flex items-center justify-center" id="emergency-dispatch-loading">
                <div className="flex flex-col items-center space-y-4">
                    <Clock className="h-10 w-10 text-rose-600 animate-spin" />
                    <p className="text-slate-500 font-bold text-sm tracking-wide">Connecting to active fleet dispatch...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50/50 min-h-screen py-10 lg:py-14 font-sans relative overflow-hidden" id="emergency-dispatch-root">
            {/* Ambient Background Decorative Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-200/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-200/10 blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-8">

                {/* Back to Home Navigation */}
                <button
                    type="button"
                    onClick={() => {
                        setCurrentPage('home');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span>{t('nav.home')}</span>
                </button>

                {/* HEADER SECTION */}
                <div className="text-left space-y-2">
                    <div className="inline-flex items-center space-x-1.5 bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        <Activity className="h-3.5 w-3.5 animate-pulse text-rose-600" />
                        <span>Live GPS Ambulance Dispatch</span>
                    </div>
                    <h1 className="text-3xl font-extrabold font-sans text-slate-900 tracking-tight">
                        Instant Emergency Ambulance & Live Location Tracking
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-2xl">
                        Request immediate ambulance dispatch with automatic GPS location detection. Track driver position live on map without page reload.
                    </p>
                </div>

                {/* ACTIVE LIVE TRACKING CARD (IF BOOKING EXISTS) */}
                {activeBookingId && bookingData && (
                    <div className="bg-white border-2 border-rose-500 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold font-mono uppercase tracking-wider mb-1">
                                    <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                                    <span>Active Booking Status: {bookingData.status}</span>
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-900">
                                    Patient: {bookingData.patientName} ({bookingData.urgency})
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    📍 Pickup Address: {bookingData.patientLocation?.address}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelBooking}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
                            >
                                Cancel Request
                            </button>
                        </div>

                        {/* STATUS MESSAGE NOTICE */}
                        {bookingData.status === 'Pending' ? (
                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
                                    <span>Broadcasted to active driver fleet! Waiting for nearest driver to accept call...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="font-extrabold text-sm">Ambulance Assigned: {bookingData.assignedDriverName || 'Driver'}</p>
                                        <p className="text-emerald-700">Phone: {bookingData.assignedDriverPhone} | Live GPS active & updating</p>
                                    </div>
                                </div>
                                {bookingData.assignedDriverPhone && (
                                    <a
                                        href={`tel:${bookingData.assignedDriverPhone}`}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>Call Driver</span>
                                    </a>
                                )}
                            </div>
                        )}

                        {/* LIVE TRACKING INTERACTIVE MAP */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <span>Real-time Live Ambulance GPS Tracking Map</span>
                                <span className="text-emerald-600 font-mono flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    Live Continuous Stream
                                </span>
                            </div>
                            <LiveTrackingMap
                                patientLocation={bookingData.patientLocation}
                                driverLocation={driverLiveLocation}
                                showRoute={true}
                                height="400px"
                            />
                        </div>
                    </div>
                )}

                {/* PATIENT BOOKING & GPS PICKER FORM */}
                {!activeBookingId && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
                        <div className="border-b border-slate-150 pb-4">
                            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                <Truck className="w-6 h-6 text-rose-600" />
                                <span>Step 1: Patient Emergency Booking & GPS Location</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Fill patient details or detect GPS coordinates to dispatch the nearest available ambulance immediately.
                            </p>
                        </div>

                        <form onSubmit={handleCreateBooking} className="space-y-6">
                            {/* Patient Info Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                        Patient Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Ramesh Patel"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-rose-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                        Mobile Contact Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 9876543210"
                                        value={patientPhone}
                                        onChange={(e) => setPatientPhone(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-rose-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                        Urgency / Nature of Emergency
                                    </label>
                                    <select
                                        value={urgencyType}
                                        onChange={(e) => setUrgencyType(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-rose-600"
                                    >
                                        <option value="Cardiac Emergency / Chest Pain">🫀 Cardiac Emergency / Chest Pain</option>
                                        <option value="Severe Dengue / Low Platelets">🩸 Severe Dengue / Low Platelets</option>
                                        <option value="Severe Trauma / Accident Fracture">💥 Severe Trauma / Accident Fracture</option>
                                        <option value="Pregnancy / Maternity Delivery">🤱 Pregnancy / Maternity Emergency</option>
                                        <option value="General Critical Transfer">🚑 General Critical Transfer</option>
                                    </select>
                                </div>
                            </div>

                            {/* GPS DETECT & MAP SELECTOR */}
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                                            Pickup Location (Patient GPS) *
                                        </label>
                                        <p className="text-xs text-slate-500">
                                            {patientLocation ? `Detected: ${patientLocation.address}` : 'Click button below to auto-detect GPS coordinates'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDetectLocation}
                                        disabled={detectingLocation}
                                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                                    >
                                        {detectingLocation ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                                        <span>{detectingLocation ? 'Locating Satellite GPS...' : '📍 Auto-Detect My Current GPS'}</span>
                                    </button>
                                </div>

                                {/* MAP PREVIEW FOR SELECTION */}
                                <LiveTrackingMap
                                    patientLocation={patientLocation}
                                    allowClickToSelect={true}
                                    onLocationSelect={(loc) => setPatientLocation(loc)}
                                    height="300px"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submittingBooking}
                                className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {submittingBooking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                <span>Request Emergency Ambulance & Track Live GPS</span>
                            </button>
                        </form>
                    </div>
                )}

                {/* MAIN CRITICAL HOTLINE CARD */}
                <div className="bg-gradient-to-r from-rose-600 to-red-500 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-rose-900/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-rose-500/30">
                    <div className="space-y-2 text-left">
                        <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold w-fit tracking-wide">
                            <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                            <span>24x7 Critical Medical Hotline</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                            Prefer Direct Phone Dispatch Call?
                        </h2>
                        <p className="text-rose-100 text-xs sm:text-sm max-w-lg leading-relaxed">
                            Call central ambulance control for instant priority hotline booking.
                        </p>
                    </div>

                    <a
                        href="tel:+9118001234567"
                        className="inline-flex items-center space-x-2 bg-white hover:bg-rose-50 text-rose-600 font-extrabold py-3.5 px-6 rounded-2xl shadow-sm hover:shadow transition-all group shrink-0 cursor-pointer text-sm font-mono w-full md:w-auto justify-center"
                    >
                        <Phone className="h-4 w-4 animate-bounce text-rose-600" />
                        <span className="text-rose-600">+91 1800-123-4567</span>
                    </a>
                </div>

                {/* LISTING WORKBENCH TITLE */}
                <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-slate-900 text-lg font-sans flex items-center">
                        <Truck className="h-5 w-5 text-rose-600 mr-2" />
                        <span>Available Ambulances & Drivers</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase">
                        Live Fleet Logs
                    </span>
                </div>

                {/* AMBULANCE GRID CARDS */}
                <div className="space-y-6" id="ambulance-cards-list">
                    {ambulances.map((driver) => {
                        const isAvailable = driver.status === 'Available';
                        return (
                            <div 
                                key={driver.id}
                                className="bg-white border border-slate-150/70 hover:border-slate-300 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden"
                            >
                                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                <div className="flex items-center space-x-4 pl-1 sm:pl-2">
                                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${driver.bgColor || 'from-rose-500 to-red-600'} text-white flex items-center justify-center text-lg font-extrabold tracking-wider shrink-0 shadow-sm`}>
                                        {driver.initials || 'DR'}
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                            <h4 className="font-extrabold text-slate-900 text-base font-sans leading-none">
                                                {driver.name}
                                            </h4>
                                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono tracking-wider ${
                                                isAvailable 
                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full mr-1 shrink-0 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span>{driver.status}</span>
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-500 font-mono tracking-wide uppercase leading-none font-semibold">
                                            {driver.role}
                                        </p>

                                        <p className="text-xs text-slate-650 flex items-center font-medium pt-1">
                                            <Phone className="h-3 w-3 text-rose-600 mr-1.5 shrink-0" />
                                            <span className="font-mono text-slate-700 select-all font-bold">{driver.phone}</span>
                                        </p>

                                        <div className="flex items-center space-x-3 text-xs text-slate-500 pt-1">
                                            <span>Trips: <strong className="text-slate-800 font-mono">{driver.tripsCompleted || 0}+</strong></span>
                                            <span className="text-slate-300">|</span>
                                            <span>Exp: <strong className="text-slate-805 font-mono">{driver.experience || '5 Yrs'}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-center space-y-1.5 w-full md:w-auto md:min-w-[240px] text-xs font-sans text-slate-600">
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="text-slate-400 uppercase font-mono font-bold text-[9px] tracking-wider block">Ambulance Unit</span>
                                        <strong className="text-slate-900 text-right truncate max-w-[150px]">{driver.vehicleType}</strong>
                                    </div>
                                    <div className="flex justify-between items-center gap-4 pt-1.5 border-t border-slate-200/50">
                                        <span className="text-slate-400 uppercase font-mono font-bold text-[9px] tracking-wider block">Registration Code</span>
                                        <strong className="text-slate-900 font-mono">{driver.vehicleNo}</strong>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto shrink-0 flex items-center">
                                    <a
                                        href={isAvailable ? `tel:${driver.phone.replace(/\s+/g, '')}` : '#'}
                                        onClick={isAvailable ? undefined : (e) => e.preventDefault()}
                                        className={`w-full md:w-auto inline-flex items-center justify-center space-x-1.5 border font-semibold py-3 px-5 rounded-2xl text-xs transition-colors cursor-pointer ${
                                            isAvailable 
                                                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300' 
                                                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-50'
                                        }`}
                                        title={isAvailable ? "Contact Driver" : "Driver Currently Busy"}
                                    >
                                        <Phone className="h-3.5 w-3.5 shrink-0" />
                                        <span>Dial Dispatch Operator</span>
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
