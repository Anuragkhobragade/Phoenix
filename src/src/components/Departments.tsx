import React from 'react';
import { Department, Doctor, Page } from '../types';
import { DEPARTMENTS, DOCTORS } from '../data';
import { useLanguage } from '../context/LanguageContext';
import {
    Heart,
    Baby,
    Brain,
    Activity,
    CheckCircle2,
    ChevronRight,
    CornerDownRight,
    User,
    Star,
    Clock,
    ArrowRight
} from 'lucide-react';

interface DepartmentsProps {
    setCurrentPage: (page: Page) => void;
    setSelectedDepartmentId: (id: string | null) => void;
    setSelectedDoctorId: (id: string | null) => void;
}

// Icon mapper for dynamic and safe resolution
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Heart: Heart,
    Baby: Baby,
    Brain: Brain,
    Activity: Activity
};

export default function Departments({
    setCurrentPage,
    setSelectedDepartmentId,
    setSelectedDoctorId
}: DepartmentsProps) {
    const { t } = useLanguage();
    const [activeDeptId, setActiveDeptId] = React.useState<string | null>(null);

    // Close department active focus and scroll back up
    const handleBackToList = () => {
        setActiveDeptId(null);
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    // Instant booking helper
    const handleInstantBook = (deptId: string, doctorId: string) => {
        setSelectedDepartmentId(deptId);
        setSelectedDoctorId(doctorId);
        setCurrentPage('booking');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Find currently active department details
    const activeDept = DEPARTMENTS.find(d => d.id === activeDeptId);
    // Filter doctors that belong to the active department
    const activeDeptDoctors = activeDeptId
        ? DOCTORS.filter(doc => doc.departmentId === activeDeptId)
        : [];

    return (
        <div className="bg-slate-50/50 min-h-screen py-12 lg:py-16" id="departments-page-view">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* HEADER SECTION */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                        {t('dept.sub')}
                    </span>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-sans text-slate-900 mt-2">
                        {t('dept.title')}
                    </h1>
                    <p className="text-slate-505 text-sm sm:text-base mt-2">
                        Each specialized clinical department is built on board-certified experts, modern mapping labs, and patient-centered protocols. Click any department to explore detailed diagnostics and meet the doctors.
                    </p>
                </div>

                {/* CONDITIONAL RENDERING: LIST VS DETAIL */}
                {!activeDeptId ? (

                    /* --- A. LIST OF ALL DEPARTMENTS --- */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="departments-grid">
                        {DEPARTMENTS.map((dept) => {
                            const IconComponent = ICON_MAP[dept.iconName] || Heart;

                            return (
                                <div
                                    key={dept.id}
                                    className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden text-left cursor-pointer group"
                                    onClick={() => {
                                        setActiveDeptId(dept.id);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    id={`dept-card-${dept.id}`}
                                >
                                    {/* Department Image Header */}
                                    <div className="h-48 overflow-hidden relative">
                                        <img
                                            src={dept.heroImage}
                                            alt={dept.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />

                                        {/* Floating Icon */}
                                        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur text-teal-650 p-3 rounded-2xl shadow">
                                            <IconComponent className="h-6 w-6" />
                                        </div>

                                        <div className="absolute bottom-4 left-4">
                                            <h3 className="text-xl font-bold text-white font-sans">
                                                {t(`dept.${dept.id}.title`) || dept.name}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Card Content body */}
                                    <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-4">
                                        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                                            {t(`dept.${dept.id}.desc`) || dept.description}
                                        </p>

                                        {/* Quick services tags bullets */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">
                                                Primary Care Operations
                                            </h4>
                                            <div className="grid grid-cols-1 gap-1.5 pt-1">
                                                {dept.services.slice(0, 3).map((svc, sIdx) => (
                                                    <div key={sIdx} className="flex items-center text-xs text-slate-600 font-medium">
                                                        <CornerDownRight className="h-3 w-3 text-teal-600 mr-2 shrink-0" />
                                                        <span className="truncate">{svc}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Stats strip */}
                                        <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs font-mono">
                                            <div className="flex space-x-6">
                                                {dept.stats.slice(0, 2).map((stat, stIdx) => (
                                                    <div key={stIdx}>
                                                        <span className="font-sans font-bold text-slate-900 block text-sm">
                                                            {stat.value}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                                                            {stat.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="inline-flex items-center space-x-0.5 text-teal-650 font-bold font-mono group-hover:translate-x-1 transition-transform">
                                                <span>Details</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </span>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>

                ) : (

                    /* --- B. FOCUS DETAIL VIEW FOR THE CHOSEN DEPARTMENT --- */
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="department-details-focused">

                        {/* 1. Header Banner */}
                        <div className="relative h-64 sm:h-80 overflow-hidden">
                            <img
                                src={activeDept?.heroImage}
                                alt={activeDept?.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

                            {/* Back CTA Button over image */}
                            <div className="absolute top-6 left-6 z-10">
                                <button
                                    onClick={handleBackToList}
                                    className="bg-white/95 backdrop-blur text-slate-800 hover:text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md border border-slate-100 flex items-center space-x-2 transition-all cursor-pointer"
                                    id="dept-detail-back-btn"
                                >
                                    <ChevronRight className="h-4 w-4 rotate-180" />
                                    <span>Back to Specialty List</span>
                                </button>
                            </div>

                            {/* Title info inside image */}
                            <div className="absolute bottom-6 left-6 right-6 text-left">
                                <div className="flex items-center space-x-3">
                                    <span className="bg-teal-500 text-white p-2.5 rounded-xl inline-block shadow">
                                        {/* Render matching icon dynamically */}
                                        {activeDept?.iconName === 'Heart' && <Heart className="h-6 w-6" />}
                                        {activeDept?.iconName === 'Baby' && <Baby className="h-6 w-6" />}
                                        {activeDept?.iconName === 'Brain' && <Brain className="h-6 w-6" />}
                                        {activeDept?.iconName === 'Activity' && <Activity className="h-6 w-6" />}
                                    </span>
                                    <div>
                                        <span className="text-xs font-mono font-bold text-teal-400 tracking-wider block uppercase uppercase">
                                            Specialty Department
                                        </span>
                                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-sans leading-none">
                                            Department of {activeDept?.name}
                                        </h2>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Primary Information Split */}
                        <div className="p-6 sm:p-10 lg:p-12 text-left grid grid-cols-1 lg:grid-cols-12 gap-10">

                            {/* Expanded Description & Services */}
                            <div className="lg:col-span-8 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 font-sans border-b border-slate-100 pb-2">
                                        Department Overview
                                    </h3>
                                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed pt-3">
                                        {activeDept?.longDescription}
                                    </p>
                                </div>

                                {/* Services checklist */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 font-sans border-b border-slate-100 pb-2 mb-4">
                                        Clinical Care & Diagnostics Handled
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {activeDept?.services.map((svc, idx) => (
                                            <div key={idx} className="flex items-start space-x-3 text-slate-600 text-sm font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <CheckCircle2 className="h-5 w-5 text-teal-650 shrink-0 mt-0.5" />
                                                <span>{svc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Stats column */}
                            <div className="lg:col-span-4 bg-teal-50/40 border border-teal-100 rounded-3xl p-6 sm:p-8 space-y-8">
                                <h3 className="font-bold text-slate-900 font-sans text-md leading-none uppercase tracking-wide">
                                    Department Stats
                                </h3>
                                <div className="space-y-6">
                                    {activeDept?.stats.map((stat, idx) => (
                                        <div key={idx} className="border-b border-teal-100/50 pb-4 last:border-0 last:pb-0">
                                            <span className="block text-3xl font-extrabold text-teal-700 font-sans">
                                                {stat.value}
                                            </span>
                                            <span className="block text-xs font-mono font-bold tracking-wider text-teal-800 uppercase mt-1">
                                                {stat.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* 3. ROSTER OF MEDICAL DOCTORS ASSOCIATED WITH THIS DEPT */}
                        <div className="bg-slate-50/80 border-t border-slate-100 p-6 sm:p-10 lg:p-12 text-left">
                            <div className="mb-8">
                                <span className="text-xs font-mono font-bold text-teal-650 uppercase tracking-widest block">
                                    Staff Roster
                                </span>
                                <h3 className="text-xl sm:text-2xl font-extrabold font-sans text-slate-900 mt-1">
                                    Meet the Medical Experts in {activeDept?.name}
                                </h3>
                                <p className="text-slate-400 text-xs sm:text-sm">
                                    These board-certified physicians specialize in {activeDept?.name} diagnostics. Click to instantly schedule consultations.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeDeptDoctors.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col justify-between space-y-4"
                                    >
                                        <div className="flex space-x-3.5">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                                                <img
                                                    src={doc.image}
                                                    alt={doc.name}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-slate-900 font-sans text-sm tracking-tight">
                                                    {doc.name}
                                                </h4>
                                                <p className="text-xs text-teal-600 font-semibold font-sans mt-0.5">
                                                    {doc.specialty}
                                                </p>

                                                {/* Rating row */}
                                                <div className="flex items-center space-x-1.5 mt-1">
                                                    <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                                                    <span className="text-xs text-slate-800 font-bold">{doc.rating}</span>
                                                    <span className="text-[10px] text-slate-450 font-mono">({doc.reviewsCount} reviews)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-slate-505 text-xs inline-block leading-relaxed line-clamp-3">
                                            {doc.bio}
                                        </p>

                                        <div className="pt-3 border-t border-slate-100 text-xs">
                                            <div className="flex items-center text-slate-500 font-medium pb-2 select-none">
                                                <Clock className="h-3.5 w-3.5 text-teal-600 mr-1.5 shrink-0" />
                                                <span>Days: {doc.availability.days.join(', ')}</span>
                                            </div>

                                            <button
                                                onClick={() => handleInstantBook(doc.departmentId, doc.id)}
                                                className="w-full inline-flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg text-xs tracking-wide transition-all cursor-pointer group/btn"
                                            >
                                                <span>Schedule Appointment</span>
                                                <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                            </button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
