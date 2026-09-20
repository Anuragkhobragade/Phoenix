export interface Doctor {
    id: string;
    name: string;
    departmentId: string;
    specialty: string;
    bio: string;
    rating: number;
    reviewsCount: number;
    image: string;
    education: string;
    experienceYears: number;
    availability: {
        days: string[]; // e.g., ["Monday", "Wednesday", "Friday"]
        hours: string[]; // e.g., ["09:00 AM", "10:30 AM", ...]
    };
}

export interface Department {
    id: string;
    name: string;
    iconName: string; // The Lucide icon string
    description: string;
    longDescription: string;
    services: string[];
    stats: {
        label: string;
        value: string;
    }[];
    heroImage: string;
}

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: 'patient' | 'doctor' | 'admin' | 'driver' | 'phc_staff';
    doctorId?: string | null; // linked doctor ID from data.ts
    driverId?: string | null; // linked ambulance driver ID from ambulances collection
    phcName?: string;
    phcLocation?: string;
    createdAt: string;
}

export interface PatientShareLog {
    referralId?: string | null;
    patientName: string;
    patientPhone: string;
    sharedByDoctor: string;
    sharedWithDoctorId: string;
    sharedWithDoctorName: string;
    sharedWithDoctorSpecialty?: string;
    notes: string;
    sharedAt: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachments?: { name: string; url: string }[];
}

export interface VillageReferral {
    id: string;
    phcName: string;
    phcLocation: string;
    phcStaffName: string;
    patientName: string;
    patientPhone: string;
    patientAge: number;
    patientGender: 'Male' | 'Female' | 'Other';
    symptoms: string;
    bloodTestResults?: string; // e.g. "Platelets: 15,000 / mm3"
    reportUrl?: string;
    decision: 'Treated_Locally' | 'Referred_Urgently';
    urgencyReason?: 'Severe Dengue' | 'Low Platelets' | 'ICU Needed' | 'Cardiac Emergency' | 'Trauma' | 'Other';
    urgencyDetails?: string;
    targetDoctorId?: string;
    targetDoctorName?: string;
    localPrescription?: string;
    mainDoctorResponse?: {
        doctorId?: string;
        doctorName: string;
        assignedBed?: string; // e.g. "Bed #104 - ICU"
        instructions: string; // e.g. "Platelets bohot kam hain, turant shahar aao..."
        respondedAt: string;
    };
    status: 'Treated_Locally' | 'Pending_Main_Doctor' | 'Bed_Reserved' | 'Admitted' | 'Completed';
    createdAt: string;
    updatedAt: string;
    sharedHistory?: PatientShareLog[];
    lastSharedWith?: string;
}

export interface AmbulanceDriver {
    id: string;
    name: string;
    role: string;
    phone: string;
    vehicleType: string;
    vehicleNo: string;
    status: 'Available' | 'On Emergency Call';
    initials: string;
    bgColor: string;
    rating: number;
    tripsCompleted: number;
    experience: string;
    driverEmail?: string;
    driverUid?: string;
    updatedAt?: string;
}

export interface PrescriptionMedicine {
    name: string;
    dosage: string;      // e.g. "1 Tablet", "500mg"
    frequency: string;   // e.g. "Twice a day", "Morning (After Food)"
    timing?: string;     // Specific time e.g. "08:00 AM", "02:00 PM"
    duration: string;    // e.g. "5 Days"
    notes?: string;      // e.g. "Take with warm water"
}

export interface Prescription {
    diagnosis: string;
    doctorNotes?: string;
    medicines: PrescriptionMedicine[];
    updatedAt: string;
}

export interface Appointment {
    id: string;
    doctorId: string;
    doctorName: string;
    departmentId: string;
    departmentName: string;
    date: string; // YYYY-MM-DD
    timeSlot: string; // e.g. "10:30 AM"
    patientName: string;
    patientPhone: string;
    patientEmail: string;
    patientAge?: number;
    patientGender?: string;
    medicalHistory?: string;
    notes?: string;
    status: 'Pending' | 'Confirmed' | 'Cancelled';
    createdAt: string;
    userId?: string | null;
    reports?: { name: string; url: string }[];
    prescription?: Prescription;
    consultationType?: 'In-Person' | 'Online';
    videoCallStatus?: 'inactive' | 'ready' | 'active' | 'ended';
    videoRoomId?: string;
    lastSharedWith?: string;
}

export type Page = 'home' | 'about' | 'departments' | 'doctors' | 'booking' | 'my-appointments' | 'auth' | 'admin' | 'doctor-portal' | 'driver-portal' | 'emergency' | 'phc-portal';
