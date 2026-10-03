import React from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle,
    Loader2,
    LockKeyhole,
    Phone,
    ArrowLeft,
    Copy,
    ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

const sendOtpEmail = async (targetEmail: string, code: string) => {
    const env = (import.meta as any).env || {};
    const serviceId = env.VITE_EMAILJS_SERVICE_ID || '';
    const templateId = env.VITE_EMAILJS_TEMPLATE_ID || '';
    const publicKey = env.VITE_EMAILJS_PUBLIC_KEY || '';

    if (
        !serviceId || 
        !templateId || 
        !publicKey || 
        serviceId === 'your_emailjs_service_id' || 
        templateId === 'your_emailjs_template_id' || 
        publicKey === 'your_emailjs_public_key'
    ) {
        throw new Error('Email verification service credentials are not configured. Please contact support.');
    }

    const data = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
            email: targetEmail,       // Matches {{email}} in your template's To Email field
            passcode: code,           // Matches {{passcode}} in your template content
            time: '15 minutes',       // Matches {{time}} in your template content
            to_email: targetEmail,    // Backup parameter
            otp_code: code,           // Backup parameter
            project_name: 'Sanjeevani Medical Center'
        }
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to send verification email.');
    }

    return { success: true };
};

interface AuthFormProps {
    onSuccess?: () => void;
    initialMode?: 'signin' | 'signup' | 'forgot' | 'phone' | 'verify-otp';
}

export default function AuthForm({ onSuccess, initialMode = 'signin' }: AuthFormProps) {
    const [mode, setMode] = React.useState<'signin' | 'signup' | 'forgot' | 'phone' | 'verify-otp'>(initialMode);

    // Form fields
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');

    // Email OTP variables
    const [generatedOtp, setGeneratedOtp] = React.useState('');
    const [userEnteredOtp, setUserEnteredOtp] = React.useState('');
    const [pendingReg, setPendingReg] = React.useState<{ name: string; email: string; password: string } | null>(null);

    // Phone Auth variables
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [countryCode, setCountryCode] = React.useState('+91');
    const [verificationCode, setVerificationCode] = React.useState('');
    const [codeSent, setCodeSent] = React.useState(false);
    const [confirmationResult, setConfirmationResult] = React.useState<any>(null);
    const recaptchaVerifierRef = React.useRef<RecaptchaVerifier | null>(null);

    // UI states
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
    const [copied, setCopied] = React.useState(false);
    const [firebaseConfigError, setFirebaseConfigError] = React.useState<{
        type: 'unauthorized-domain' | 'operation-not-allowed';
        provider: 'Google' | 'Phone';
        domain?: string;
    } | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Validate form
    const validate = () => {
        setError(null);
        if (!email.trim()) {
            setError('Email address is required.');
            return false;
        }
        if (mode === 'forgot') return true;

        if (!password) {
            setError('Password is required.');
            return false;
        }

        if (mode === 'signup') {
            if (!name.trim()) {
                setError('Please enter your full name.');
                return false;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters long.');
                return false;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                return false;
            }
        }
        return true;
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setFirebaseConfigError(null);

        try {
            if (mode === 'signin') {
                try {
                    await signInWithEmailAndPassword(auth, email.trim(), password);
                } catch (loginErr: any) {
                    if (
                        loginErr.code === 'auth/user-not-found' || 
                        loginErr.code === 'auth/invalid-credential' || 
                        loginErr.code === 'auth/wrong-password'
                    ) {
                        try {
                            const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                            const cleanEmail = email.trim().toLowerCase();
                            let userRole = cleanEmail === 'anuragkhobragade@gmail.com' ? 'admin' : 'driver';
                            let matchedDriverId = null;
                            let existingPhcData: any = null;

                            try {
                                const usersRef = collection(db, 'users');
                                const snap = await getDocs(usersRef);
                                snap.forEach((docSnap) => {
                                    const d = docSnap.data();
                                    if (d.email?.toLowerCase() === cleanEmail && d.role === 'phc_staff') {
                                        userRole = 'phc_staff';
                                        existingPhcData = d;
                                    }
                                });
                            } catch (e) {
                                console.warn("Error checking existing user role:", e);
                            }

                            if (userRole === 'driver') {
                                try {
                                    const colRef = collection(db, 'ambulances');
                                    const snap = await getDocs(colRef);
                                    snap.forEach((docSnap) => {
                                        const d = docSnap.data();
                                        if (d.driverEmail?.toLowerCase() === cleanEmail) {
                                            matchedDriverId = docSnap.id;
                                        }
                                    });
                                } catch (e) {
                                    console.warn("Error matching driverId on signup:", e);
                                }
                            }

                            await setDoc(doc(db, 'users', userCred.user.uid), {
                                uid: userCred.user.uid,
                                name: existingPhcData?.name || email.split('@')[0],
                                email: cleanEmail,
                                role: userRole,
                                phcName: existingPhcData?.phcName || null,
                                phcLocation: existingPhcData?.phcLocation || null,
                                driverId: matchedDriverId || (userRole === 'driver' ? 'drv-rajesh' : null),
                                createdAt: new Date().toISOString()
                            });
                        } catch (createErr) {
                            throw loginErr;
                        }
                    } else {
                        throw loginErr;
                    }
                }
                onSuccess?.();
            } else if (mode === 'signup') {
                // Step 1: Generate 6-digit verification code
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                setGeneratedOtp(code);
                setPendingReg({ name: name.trim(), email: email.trim(), password });

                // Step 2: Send OTP via EmailJS
                await sendOtpEmail(email.trim(), code);
                setSuccessMessage(`A 6-digit OTP passcode has been sent to ${email.trim()}.`);
                setMode('verify-otp');
            } else if (mode === 'forgot') {
                await sendPasswordResetEmail(auth, email.trim());
                setSuccessMessage('Password reset link sent! Check your inbox.');
                setMode('signin');
            }
        } catch (err: any) {
            console.error('Auth Error:', err);
            setError(err.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setFirebaseConfigError(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            // Store or update user details in Firestore users collection
            try {
                await setDoc(doc(db, 'users', result.user.uid), {
                    uid: result.user.uid,
                    name: result.user.displayName || 'Google User',
                    email: result.user.email || '',
                    createdAt: new Date().toISOString()
                }, { merge: true });
            } catch (firestoreErr) {
                console.error('Error saving Google user to Firestore:', firestoreErr);
            }

            onSuccess?.();
        } catch (err: any) {
            console.error('Google Sign-In Error:', err);
            if (err.code !== 'auth/popup-closed-by-user') {
                let errorMsg = err.message || 'Google authentication failed.';
                if (err.code === 'auth/operation-not-allowed') {
                    errorMsg = 'Google Sign-In is not enabled on this Firebase project. Go to your Firebase Console, enable the Google provider, and configure details.';
                    setFirebaseConfigError({
                        type: 'operation-not-allowed',
                        provider: 'Google'
                    });
                } else if (err.code === 'auth/unauthorized-domain') {
                    errorMsg = 'This website domain is not authorized in your Firebase console. Please add it to Authorized Domains under Firebase Authentication settings.';
                    setFirebaseConfigError({
                        type: 'unauthorized-domain',
                        provider: 'Google',
                        domain: window.location.hostname
                    });
                }
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const resetPhoneStates = () => {
        setPhoneNumber('');
        setVerificationCode('');
        setCodeSent(false);
        setConfirmationResult(null);
        setError(null);
        setSuccessMessage(null);
        setFirebaseConfigError(null);

        if (recaptchaVerifierRef.current) {
            try {
                recaptchaVerifierRef.current.clear();
            } catch (e) {
                console.warn('Failed to clear recaptchaVerifierRef on reset:', e);
            }
            recaptchaVerifierRef.current = null;
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setFirebaseConfigError(null);

        const cleanPhone = phoneNumber.trim().replace(/\s+/g, '').replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 6) {
            setError('Please enter a valid phone number (at least 6 digits).');
            return;
        }

        setLoading(true);

        try {
            // Setup verifier safely without innerHTML manipulation
            if (!recaptchaVerifierRef.current) {
                const container = document.getElementById('recaptcha-container');
                if (!container) {
                    throw new Error('reCAPTCHA container element not found in DOM.');
                }

                recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible',
                    callback: () => {
                        // reCAPTCHA solved
                    },
                    'expired-callback': () => {
                        setError('reCAPTCHA verification expired. Please try again.');
                    }
                });
            }

            const appVerifier = recaptchaVerifierRef.current;
            const fullNumber = `${countryCode}${cleanPhone}`;

            // Call signInWithPhoneNumber
            const result = await signInWithPhoneNumber(auth, fullNumber, appVerifier);
            setConfirmationResult(result);
            setCodeSent(true);
            setSuccessMessage(`A verification code was sent to ${fullNumber}`);
        } catch (err: any) {
            console.error('Error sending phone verification:', err);
            let errMsg = err.message || 'Failed to send verification code via SMS.';
            if (err.code === 'auth/invalid-phone-number') {
                errMsg = 'The format of the phone number is invalid. Please check the digits.';
            } else if (err.code === 'auth/too-many-requests') {
                errMsg = 'Too many SMS requests sent. Please try again later.';
            } else if (err.code === 'auth/operation-not-allowed') {
                errMsg = 'Phone Sign-In is disabled in Firebase Console. Enable Phone provider under Firebase Auth settings.';
                setFirebaseConfigError({
                    type: 'operation-not-allowed',
                    provider: 'Phone'
                });
            } else if (err.code === 'auth/unauthorized-domain') {
                errMsg = 'Domain not authorized in Firebase Console. Add it under Firebase Auth settings.';
                setFirebaseConfigError({
                    type: 'unauthorized-domain',
                    provider: 'Phone',
                    domain: window.location.hostname
                });
            }

            setError(errMsg);

            // Clear stale RecaptchaVerifier instance so subsequent attempts re-initialize cleanly
            if (recaptchaVerifierRef.current) {
                try {
                    recaptchaVerifierRef.current.clear();
                } catch (clearErr) {
                    console.warn('Failed to clear RecaptchaVerifier on error:', clearErr);
                }
                recaptchaVerifierRef.current = null;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        const cleanCode = verificationCode.trim().replace(/\s+/g, '');
        if (!cleanCode || cleanCode.length < 6) {
            setError('Please enter the 6-digit verification code.');
            return;
        }

        setLoading(true);

        try {
            if (!confirmationResult) {
                throw new Error('No pending phone authentication session found. Please request a new code.');
            }

            const result = await confirmationResult.confirm(cleanCode);

            // Store user details in Firestore
            try {
                await setDoc(doc(db, 'users', result.user.uid), {
                    uid: result.user.uid,
                    name: result.user.displayName || `Patient ${result.user.uid.substring(0, 5)}`,
                    phoneNumber: result.user.phoneNumber || `${countryCode}${phoneNumber}`,
                    createdAt: new Date().toISOString()
                }, { merge: true });
            } catch (firestoreErr) {
                console.error('Error saving Phone user to Firestore:', firestoreErr);
            }

            onSuccess?.();
        } catch (err: any) {
            console.error('OTP Verification Error:', err);
            let errMsg = err.message || 'OTP verification failed.';
            if (err.code === 'auth/invalid-verification-code') {
                errMsg = 'The verification code entered is incorrect. Please check and try again.';
            } else if (err.code === 'auth/code-expired') {
                errMsg = 'This verification code has expired. Please send a new code.';
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtpCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const cleanEntered = userEnteredOtp.trim();
            if (cleanEntered.length !== 6) {
                throw new Error('Please enter the 6-digit verification code.');
            }

            if (cleanEntered !== generatedOtp) {
                throw new Error('The OTP code entered is incorrect. Please try again.');
            }

            if (!pendingReg) {
                throw new Error('No pending registration data found. Please start over.');
            }

            // Create Firebase Auth account
            const userCred = await createUserWithEmailAndPassword(auth, pendingReg.email, pendingReg.password);

            // Update user display name profile
            await updateProfile(userCred.user, {
                displayName: pendingReg.name
            });

            // Store user details in Firestore
            try {
                await setDoc(doc(db, 'users', userCred.user.uid), {
                    uid: userCred.user.uid,
                    name: pendingReg.name,
                    email: pendingReg.email.toLowerCase(),
                    createdAt: new Date().toISOString(),
                    role: 'patient'
                });
            } catch (firestoreErr) {
                console.error('Error saving user to Firestore:', firestoreErr);
            }

            setSuccessMessage('Account registered successfully! Welcome.');
            setTimeout(() => {
                onSuccess?.();
            }, 1500);

        } catch (err: any) {
            console.error('OTP Registration Error:', err);
            setError(err.message || 'OTP registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!pendingReg) {
            setError('No pending registration found. Please try signing up again.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);

        try {
            await sendOtpEmail(pendingReg.email, otp);
            setSuccessMessage(`A new 6-digit OTP verification code has been sent to ${pendingReg.email}.`);
        } catch (sendErr: any) {
            console.error('Email sending failed:', sendErr);
            setError(sendErr.message || 'Failed to resend verification email.');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToSignUp = () => {
        setError(null);
        setSuccessMessage(null);
        setMode('signup');
    };

    const countries = [
        { code: '+91', name: 'India (+91)' },
        { code: '+1', name: 'US/Canada (+1)' },
        { code: '+44', name: 'UK (+44)' },
        { code: '+61', name: 'Australia (+61)' },
        { code: '+971', name: 'UAE (+971)' },
        { code: '+65', name: 'Singapore (+65)' },
        { code: '+33', name: 'France (+33)' },
        { code: '+49', name: 'Germany (+49)' },
    ];

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden max-w-md w-full mx-auto" id="auth-form-card">
            <div className="p-6 sm:p-10 text-left">
                {/* Header Indicator */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 mb-4 border border-teal-100/50">
                        {mode === 'phone' ? (
                            <Phone className="h-6 w-6" />
                        ) : mode === 'verify-otp' ? (
                            <Mail className="h-6 w-6" />
                        ) : (
                            <LockKeyhole className="h-6 w-6" />
                        )}
                    </div>
                    <h2 className="text-2xl font-extrabold font-sans text-slate-950">
                        {mode === 'signin' && 'Sign In to Your Account'}
                        {mode === 'signup' && 'Create Your Health Account'}
                        {mode === 'forgot' && 'Reset Password'}
                        {mode === 'phone' && 'Sign In with Mobile OTP'}
                        {mode === 'verify-otp' && 'Verify Email OTP Code'}
                    </h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1.5 font-medium">
                        {mode === 'signin' && 'Access bookings, medical history and clinic updates'}
                        {mode === 'signup' && 'Register details to book schedules and check appointments'}
                        {mode === 'forgot' && 'Enter email to receive custom security recovery link'}
                        {mode === 'phone' && 'Secure authentication via SMS pin delivery verification'}
                        {mode === 'verify-otp' && 'Verify the 6-digit one-time code sent to your email to continue.'}
                    </p>
                </div>

                {/* Notices */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-5 bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 text-xs sm:text-sm flex items-start space-x-2.5"
                        id="auth-error-banner"
                    >
                        <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-650" />
                        <span>{error}</span>
                    </motion.div>
                )}

                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-5 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-150 text-xs sm:text-sm flex items-start space-x-2.5"
                        id="auth-success-banner"
                    >
                        <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-650" />
                        <span>{successMessage}</span>
                    </motion.div>
                )}

                {/* Firebase Config Assistant */}
                {firebaseConfigError && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-5 p-4.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm animate-fade-in text-xs sm:text-sm"
                        id="firebase-config-helper"
                    >
                        <div className="flex items-center space-x-2 text-amber-800 mb-2">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <h3 className="font-bold tracking-tight">Firebase Project Setup Needed</h3>
                        </div>

                        <p className="text-xs text-amber-800/90 leading-relaxed mb-3">
                            Your Firebase project requires a minor setup step to support <strong>{firebaseConfigError.provider} Sign-In</strong>.
                        </p>

                        {firebaseConfigError.type === 'unauthorized-domain' && (
                            <div className="space-y-3.5">
                                <div className="bg-white/85 p-3 rounded-xl border border-amber-200/60 text-slate-700 space-y-1.5 leading-relaxed">
                                    <div className="font-bold text-amber-900">How to authorize this domain:</div>
                                    <ol className="list-decimal list-inside space-y-1 pl-0.5 text-xs">
                                        <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-650 font-bold hover:underline inline-flex items-center space-x-0.5"><span>Firebase Console</span><ExternalLink className="h-3.5 w-3.5 inline text-teal-650" /></a></li>
                                        <li>Open <strong>Authentication</strong> &gt; <strong>Settings</strong> tab</li>
                                        <li>Click <strong>Authorized Domains</strong> &gt; <strong>Add Domain</strong></li>
                                        <li>Paste the domain below and click save:</li>
                                    </ol>
                                </div>

                                <div className="flex items-center justify-between gap-1.5 bg-white p-2.5 rounded-xl border border-amber-200 font-mono text-xs text-slate-800">
                                    <span className="truncate select-all text-[11px] text-teal-850 font-semibold">{firebaseConfigError.domain}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(firebaseConfigError.domain || '')}
                                        className="p-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold transition-all text-xs shrink-0 cursor-pointer flex items-center space-x-1"
                                    >
                                        {copied ? (
                                            <>
                                                <CheckCircle className="h-3 w-3 text-white shrink-0" />
                                                <span>Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3 text-white shrink-0" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {firebaseConfigError.type === 'operation-not-allowed' && (
                            <div className="bg-white/85 p-3 rounded-xl border border-amber-200/60 text-slate-700 space-y-2 leading-relaxed">
                                <div className="font-bold text-amber-900">How to enable this provider:</div>
                                <ol className="list-decimal list-inside space-y-1.5 pl-0.5 text-xs">
                                    <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-650 font-bold hover:underline inline-flex items-center space-x-0.5"><span>Firebase Console</span><ExternalLink className="h-3.5 w-3.5 inline text-teal-650" /></a></li>
                                    <li>Go to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong></li>
                                    <li>Click <strong>Add new provider</strong> (or edit existing)</li>
                                    <li>Select <strong>{firebaseConfigError.provider}</strong>, toggle <strong>Enable</strong>, and click <strong>Save</strong></li>
                                </ol>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Form elements */}
                {mode === 'verify-otp' ? (
                    <form onSubmit={handleVerifyOtpCode} className="space-y-5" id="email-otp-verification-panel">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center space-y-3">
                            <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 border border-teal-100 text-teal-655 flex items-center justify-center animate-pulse">
                                <Mail className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm">Verify OTP Code</h3>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                Please check your email <strong className="text-slate-700">{pendingReg?.email}</strong> and enter the 6-digit verification code below.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                Enter 6-Digit Code
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                placeholder="e.g. 123456"
                                value={userEnteredOtp}
                                onChange={(e) => setUserEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full text-center tracking-widest font-mono font-bold text-lg py-2.5 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl transition-all"
                                id="otp-input-field"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-teal-650 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 active:bg-teal-850 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                            ) : (
                                <span>Verify & Create Account</span>
                            )}
                        </button>

                        <div className="flex flex-col gap-2.5 text-center mt-4">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleResendOtp}
                                className="text-teal-655 hover:text-teal-700 active:text-teal-800 text-xs font-bold transition-colors hover:underline cursor-pointer"
                            >
                                Resend Verification Code
                            </button>
                            <button
                                type="button"
                                onClick={handleBackToSignUp}
                                className="text-slate-400 hover:text-slate-650 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Back to Registration
                            </button>
                        </div>
                    </form>
                ) : mode !== 'phone' ? (
                    <form onSubmit={handleAuth} className="space-y-4" id="email-password-auth-form">

                        {/* Full Name (Sign Up only) */}
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                        <User className="h-4 w-4" />
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Eleanor Vance"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl text-sm transition-all"
                                        id="auth-input-name"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                    <Mail className="h-4 w-4" />
                                </span>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. eleanor@wellness.org"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl text-sm transition-all"
                                    id="auth-input-email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        {mode !== 'forgot' && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">
                                        Password
                                    </label>
                                    {mode === 'signin' && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot')}
                                            className="text-[11px] font-bold text-teal-600 hover:text-teal-700 font-mono"
                                        >
                                            Forgot?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                        <Lock className="h-4 w-4" />
                                    </span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl text-sm transition-all"
                                        id="auth-input-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Confirm Password (Sign Up only) */}
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                        <Lock className="h-4 w-4" />
                                    </span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl text-sm transition-all"
                                        id="auth-input-confirm-password"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit btn */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-4 bg-teal-650 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 active:bg-teal-850 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                            id="auth-submit-btn"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                    <span>Processing Record...</span>
                                </>
                            ) : (
                                <>
                                    <span>
                                        {mode === 'signin' && 'Sign In'}
                                        {mode === 'signup' && 'Register Account'}
                                        {mode === 'forgot' && 'Send Reset Link'}
                                    </span>
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {!codeSent ? (
                            <form onSubmit={handleSendOtp} className="space-y-4" id="phone-otp-send-form">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                        Select Country & Phone Number
                                    </label>
                                    <div className="flex space-x-2">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-teal-100 focus:border-teal-500 rounded-xl px-2 text-xs sm:text-sm transition-all text-slate-700 max-w-[120px]"
                                        >
                                            {countries.map((c) => (
                                                <option key={c.code} value={c.code}>
                                                    {c.code}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="relative flex-1">
                                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                                <Phone className="h-4 w-4" />
                                            </span>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="e.g. 9876543210"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl text-sm transition-all"
                                                id="phone-number-field"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1.5">Please enter phone digits without leading zero or spaces.</p>
                                </div>

                                <div id="recaptcha-container"></div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-teal-650 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 active:bg-teal-850 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                            <span>Sending Verification...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Send OTP Code</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-4" id="phone-otp-verify-form">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-450 font-mono mb-1.5">
                                        Enter Verification Code
                                    </label>
                                    <p className="text-xs text-slate-500 mb-3">
                                        We sent a 6-digit confirmation pin to <span className="font-bold text-teal-600">{countryCode} {phoneNumber}</span>.
                                    </p>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                            <LockKeyhole className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 123456"
                                            maxLength={6}
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-xl text-sm transition-all tracking-widest text-center font-bold"
                                            id="otp-verification-code-field"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-teal-650 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 active:bg-teal-850 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                            <span>Verifying Record...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Verify Code & Sign In</span>
                                        </>
                                    )}
                                </button>

                                <div className="flex justify-between text-xs font-medium pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCodeSent(false);
                                            setVerificationCode('');
                                            setError(null);
                                            setSuccessMessage(null);
                                        }}
                                        className="text-teal-655 hover:text-teal-750 cursor-pointer flex items-center space-x-1"
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                        <span>Change Phone</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={loading}
                                        className="text-slate-500 hover:text-slate-700 disabled:opacity-50 cursor-pointer"
                                    >
                                        <span>Resend OTP Code</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* Third-Party Authentication Options */}
                {mode !== 'forgot' && mode !== 'phone' && mode !== 'verify-otp' && (
                    <>
                        <div className="relative my-6 animate-fade-in">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-3 text-slate-400 font-mono font-bold tracking-wider">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3" id="alternative-auth-options">
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="flex items-center justify-center space-x-2.2 py-2.5 border border-slate-150 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100/50 disabled:bg-slate-50 disabled:text-slate-400 transition-all cursor-pointer shadow-sm hover:shadow-md border-solid"
                                id="auth-google-btn"
                            >
                                <span className="font-extrabold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-lg border border-teal-100">G</span>
                                <span>Google</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setMode('phone');
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                                disabled={loading}
                                className="flex items-center justify-center space-x-2.2 py-2.5 border border-slate-150 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100/50 disabled:bg-slate-50 disabled:text-slate-400 transition-all cursor-pointer shadow-sm hover:shadow-md border-solid"
                                id="auth-phone-toggle-btn"
                            >
                                <div className="bg-teal-50 p-1.5 rounded-lg border border-teal-100 shrink-0">
                                    <Phone className="h-3.5 w-3.5 text-teal-650" />
                                </div>
                                <span>Phone OTP</span>
                            </button>
                        </div>
                    </>
                )}

                {/* Footer Toggle mode */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
                    {mode === 'signin' && (
                        <p>
                            New to Vitalis Center?{' '}
                            <button
                                onClick={() => {
                                    setMode('signup');
                                    setError(null);
                                }}
                                className="font-bold text-teal-650 hover:text-teal-700 cursor-pointer p-0.5"
                                id="auth-change-mode-signup"
                            >
                                Create an account
                            </button>
                        </p>
                    )}
                    {mode === 'signup' && (
                        <p>
                            Already have an account?{' '}
                            <button
                                onClick={() => {
                                    setMode('signin');
                                    setError(null);
                                }}
                                className="font-bold text-teal-650 hover:text-teal-700 cursor-pointer p-0.5"
                                id="auth-change-mode-signin"
                            >
                                Sign In
                            </button>
                        </p>
                    )}
                    {mode === 'phone' && (
                        <p>
                            Preferred email instead?{' '}
                            <button
                                onClick={() => {
                                    setMode('signin');
                                    resetPhoneStates();
                                }}
                                className="font-bold text-teal-650 hover:text-teal-700 cursor-pointer p-0.5"
                                id="auth-phone-back-to-signin"
                            >
                                Use Email Account
                            </button>
                        </p>
                    )}
                    {mode === 'forgot' && (
                        <button
                            onClick={() => {
                                setMode('signin');
                                setError(null);
                            }}
                            className="font-bold text-teal-650 hover:text-teal-700 cursor-pointer font-mono p-0.5"
                        >
                            Back to Sign In
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
