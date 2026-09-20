import React from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import About from './components/About';
import Departments from './components/Departments';
import Doctors from './components/Doctors';
import BookingForm from './components/BookingForm';
import MyAppointments from './components/MyAppointments';
import AuthForm from './components/AuthForm';
import { Page, Appointment, UserProfile } from './types';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Loader2, ShieldCheck, MailWarning } from 'lucide-react';
import DoctorPortal from './components/DoctorPortal';
import VideoCallRoom from './components/VideoCallRoom';
import AdminPortal from './components/AdminPortal';
import Emergency from './components/Emergency';
import DriverPortal from './components/DriverPortal';
import PhcPortal from './components/PhcPortal';
import AIChatbot from './components/AIChatbot';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';

export default function App() {
    const [currentPage, setCurrentPage] = React.useState<Page>('home');
    const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = React.useState<string | null>(null);

    // Track authenticated user state
    const [user, setUser] = React.useState<User | null>(null);
    const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
    const [loadingAuth, setLoadingAuth] = React.useState<boolean>(true);

    // Track appointments array for global badge and rendering usage
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);

    // Track appointment being edited
    const [editingAppointment, setEditingAppointment] = React.useState<Appointment | null>(null);

    // Track active video call appointment
    const [activeVideoCall, setActiveVideoCall] = React.useState<Appointment | null>(null);


    // Listen to Authentication State changes & User Profile live sync
    React.useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            
            if (unsubscribeProfile) {
                unsubscribeProfile();
                unsubscribeProfile = null;
            }

            if (firebaseUser) {
                try {
                    const profileRef = doc(db, 'users', firebaseUser.uid);
                    unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setUserProfile({
                                ...data,
                                role: data.role || 'patient'
                            } as UserProfile);
                        } else {
                            // Create temporary/default mapping
                            setUserProfile({
                                uid: firebaseUser.uid,
                                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Guest User',
                                email: firebaseUser.email || '',
                                phoneNumber: firebaseUser.phoneNumber || '',
                                role: 'patient',
                                doctorId: null,
                                createdAt: new Date().toISOString()
                            });
                        }
                        setLoadingAuth(false);
                    }, (err) => {
                        console.error("Error fetching user profile snapshot:", err);
                        setLoadingAuth(false);
                    });
                } catch (e) {
                    console.error("Setup profile snapshot setup error:", e);
                    setLoadingAuth(false);
                }
            } else {
                setUserProfile(null);
                setLoadingAuth(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    // Role-based auto redirecting
    React.useEffect(() => {
        if (userProfile) {
            if (userProfile.role === 'doctor' && (currentPage === 'home' || currentPage === 'auth')) {
                setCurrentPage('doctor-portal');
            } else if (userProfile.role === 'admin' && (currentPage === 'home' || currentPage === 'auth')) {
                setCurrentPage('admin');
            } else if (userProfile.role === 'driver' && (currentPage === 'home' || currentPage === 'auth')) {
                setCurrentPage('driver-portal');
            } else if (userProfile.role === 'phc_staff' && (currentPage === 'home' || currentPage === 'auth')) {
                setCurrentPage('phc-portal');
            }
        }
    }, [userProfile]);

    // Live Sync Appointments query from Firestore
    React.useEffect(() => {
        if (!user) {
            setAppointments([]);
            return;
        }

        try {
            // Query appointments collection for documents matching this user's UID
            const q = query(collection(db, 'appointments'), where('userId', '==', user.uid));

            const unsubscribeLiveListener = onSnapshot(q, (snapshot) => {
                const syncedList: Appointment[] = [];
                snapshot.forEach((docSnap) => {
                    syncedList.push(docSnap.data() as Appointment);
                });

                // Order by creation date descending
                syncedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setAppointments(syncedList);
            }, (error) => {
                console.warn('Background live-sync encountered an issue (e.g., offline or empty cloud indexes):', error);
                try {
                    const stored = localStorage.getItem('sanjeevani_appointments');
                    if (stored) {
                        const fallbackAppointments = JSON.parse(stored) as Appointment[];
                        // Avoid cross-user leaks: filter by current user's uid or matched email
                        const filteredByOwner = fallbackAppointments.filter(apt =>
                            apt.userId === user.uid ||
                            (apt.patientEmail && apt.patientEmail.toLowerCase() === user.email?.toLowerCase())
                        );
                        setAppointments(filteredByOwner);
                    }
                } catch (localErr) {
                    console.warn('Local storage recovery fallback skipped:', localErr);
                }
            });

            return () => unsubscribeLiveListener();
        } catch (e) {
            console.error('Failed booting active appointments synced listener:', e);
        }
    }, [user]);

    // Handle user Sign Out
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setCurrentPage('home');
        } catch (e) {
            console.error('Error logging out from Sanjeevani system:', e);
        }
    };

    const handleAppointmentBooked = () => {
        // Navigates securely back to check bookings page upon finished transaction
        setEditingAppointment(null);
        setCurrentPage('my-appointments');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Safe count of actively confirmed bookings
    const activeConfirmedCount = appointments.filter(a => a.status === 'Confirmed').length;

    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans antialiased" id="app-root-container">
            {/* Dynamic Navigation Header with auth bindings */}
            <Navbar
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                bookingCount={activeConfirmedCount}
                user={user}
                userProfile={userProfile}
                onSignOut={handleSignOut}
            />

            {/* Main Viewport Content Block */}
            <main className="flex-grow" id="main-route-renderer">
                {loadingAuth ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4 font-sans" id="auth-loading-spinner-wrapper">
                        <Loader2 className="h-10 w-10 text-teal-650 animate-spin" />
                        <span className="text-sm font-bold text-slate-500 font-mono">Authenticating secure clinic session...</span>
                    </div>
                ) : (
                    <>
                        {currentPage === 'home' && (
                            <Home setCurrentPage={setCurrentPage} />
                        )}
                        {currentPage === 'about' && (
                            <About />
                        )}
                        {currentPage === 'departments' && (
                            <Departments
                                setCurrentPage={setCurrentPage}
                                setSelectedDepartmentId={setSelectedDepartmentId}
                                setSelectedDoctorId={setSelectedDoctorId}
                            />
                        )}
                        {currentPage === 'doctors' && (
                            <Doctors
                                setCurrentPage={setCurrentPage}
                                setSelectedDepartmentId={setSelectedDepartmentId}
                                setSelectedDoctorId={setSelectedDoctorId}
                            />
                        )}

                        {/* Protected Route: Auth Form page */}
                        {currentPage === 'auth' && (
                            <div className="bg-slate-50/50 min-h-screen py-16 px-4" id="standalone-auth-route">
                                {user ? (
                                    <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                                        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-650 flex items-center justify-center">
                                            <ShieldCheck className="h-6 w-6" />
                                        </div>
                                        <h3 className="font-extrabold text-slate-900 text-lg">Already Logged In</h3>
                                        <p className="text-slate-500 text-xs sm:text-sm">
                                            You are actively connected as <strong className="text-slate-800">{user.email}</strong>. Welcome to your patient center!
                                        </p>
                                        <button
                                            onClick={() => setCurrentPage('home')}
                                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm transition-all cursor-pointer w-full"
                                        >
                                            Return to Homepage
                                        </button>
                                    </div>
                                ) : (
                                    <AuthForm onSuccess={() => setCurrentPage('booking')} />
                                )}
                            </div>
                        )}

                        {/* Protected Route: BookingForm */}
                        {currentPage === 'booking' && (
                            user ? (
                                <BookingForm
                                    setCurrentPage={setCurrentPage}
                                    selectedDepartmentId={selectedDepartmentId}
                                    setSelectedDepartmentId={setSelectedDepartmentId}
                                    selectedDoctorId={selectedDoctorId}
                                    setSelectedDoctorId={setSelectedDoctorId}
                                    onAppointmentBooked={handleAppointmentBooked}
                                    user={user}
                                    editingAppointment={editingAppointment}
                                    setEditingAppointment={setEditingAppointment}
                                />
                            ) : (
                                <div className="bg-slate-50/50 min-h-screen py-16 px-4" id="booking-unauthenticated-barrier">
                                    <div className="max-w-md mx-auto mb-6 bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-3">
                                        <MailWarning className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Authentication Required</p>
                                            <p className="text-amber-800 mt-0.5">Please sign up or sign in to your WeCare Hospitals Patient Portal to book an appointment and secure your slot with our practitioners.</p>
                                        </div>
                                    </div>
                                    <AuthForm onSuccess={() => setCurrentPage('booking')} initialMode="signup" />
                                </div>
                            )
                        )}

                        {/* Protected Route: MyAppointments */}
                        {currentPage === 'my-appointments' && (
                            user ? (
                                <MyAppointments
                                    setCurrentPage={setCurrentPage}
                                    appointments={appointments}
                                    setAppointments={setAppointments}
                                    user={user}
                                    onEditAppointment={(apt) => {
                                        setEditingAppointment(apt);
                                        setSelectedDepartmentId(apt.departmentId);
                                        setSelectedDoctorId(apt.doctorId);
                                        setCurrentPage('booking');
                                    }}
                                    onJoinVideoCall={(apt) => setActiveVideoCall(apt)}
                                />
                            ) : (
                                <div className="bg-slate-50/50 min-h-screen py-16 px-4" id="bookings-unauthenticated-barrier">
                                    <div className="max-w-md mx-auto mb-6 bg-slate-900 text-slate-100 rounded-2xl p-5 text-xs flex items-start space-x-3 shadow-md">
                                        <MailWarning className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-extrabold text-sm text-white">Access Patient Portal History</p>
                                            <p className="text-slate-300 mt-1 leading-relaxed">Sign in with your clinical credentials to retrieve, cancel, or review your complete cloud appointment archives securely.</p>
                                        </div>
                                    </div>
                                    <AuthForm onSuccess={() => setCurrentPage('my-appointments')} initialMode="signin" />
                                </div>
                            )
                        )}



                        {/* Secured Doctor Portal Route */}
                        {currentPage === 'doctor-portal' && userProfile && (
                            <DoctorPortal
                                setCurrentPage={setCurrentPage}
                                userProfile={userProfile}
                                onSignOut={handleSignOut}
                                onJoinVideoCall={(apt) => setActiveVideoCall(apt)}
                            />
                        )}

                        {/* Secured Driver Portal Route */}
                        {currentPage === 'driver-portal' && (
                            <DriverPortal
                                setCurrentPage={setCurrentPage}
                                userProfile={userProfile}
                                onSignOut={handleSignOut}
                            />
                        )}

                        {/* Secured Admin Portal Route */}
                        {currentPage === 'admin' && (
                            <AdminPortal
                                setCurrentPage={setCurrentPage}
                                user={user}
                            />
                        )}

                        {/* Secured PHC Portal Route */}
                        {currentPage === 'phc-portal' && userProfile && (
                            <PhcPortal
                                userProfile={userProfile}
                                onLogout={handleSignOut}
                            />
                        )}

                        {/* Emergency Services Route */}
                        {currentPage === 'emergency' && (
                            <Emergency setCurrentPage={setCurrentPage} />
                        )}
                    </>
                )}
            </main>

            {/* Persistent Footer */}
            <Footer setCurrentPage={setCurrentPage} />

            {/* AI Medical Chatbot & Report Analyzer */}
            <AIChatbot
                onSelectDoctorAndBook={(deptId, docId) => {
                    setSelectedDepartmentId(deptId);
                    setSelectedDoctorId(docId);
                    setCurrentPage('booking');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onBookAmbulance={() => {
                    setCurrentPage('emergency');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            />

            {/* Video Call Overlay */}
            {activeVideoCall && userProfile && (
                <VideoCallRoom
                    appointment={activeVideoCall}
                    userProfile={userProfile}
                    onLeave={() => setActiveVideoCall(null)}
                />
            )}
        </div>
    );
}
