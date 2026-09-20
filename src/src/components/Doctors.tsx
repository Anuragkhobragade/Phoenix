import React from 'react';
import { Doctor, Page } from '../types';
import { DEPARTMENTS, DOCTORS } from '../data';
import { useLanguage } from '../context/LanguageContext';
import {
    Star,
    Search,
    Sparkles,
    GraduationCap,
    Calendar,
    PhoneCall,
    Clock,
    ArrowRight
} from 'lucide-react';

interface DoctorsProps {
    setCurrentPage: (page: Page) => void;
    setSelectedDepartmentId: (id: string | null) => void;
    setSelectedDoctorId: (id: string | null) => void;
}

export default function Doctors({
    setCurrentPage,
    setSelectedDepartmentId,
    setSelectedDoctorId
}: DoctorsProps) {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedDeptFilter, setSelectedDeptFilter] = React.useState<string>('all');

    // Filter logic runs on state change
    const filteredDoctors = DOCTORS.filter((doc) => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDeptFilter === 'all' || doc.departmentId === selectedDeptFilter;
        return matchesSearch && matchesDept;
    });

    const handleInstantBook = (deptId: string, doctorId: string) => {
        setSelectedDepartmentId(deptId);
        setSelectedDoctorId(doctorId);
        setCurrentPage('booking');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getDeptName = (deptId: string) => {
        return DEPARTMENTS.find((d) => d.id === deptId)?.name || 'General Medicine';
    };

    return (
        <div className="bg-slate-50/50 min-h-screen py-12 lg:py-16" id="doctors-directory-page">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* TITLE AND LEAD */}
                <div className="text-center max-w-3xl mx-auto mb-10">
                    <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                        {t('doc.sub')}
                    </span>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-sans text-slate-900 mt-2">
                        {t('doc.title')}
                    </h1>
                    <p className="text-slate-505 text-sm sm:text-base mt-2">
                        Vitalis physicians are elite clinical specialists, lecturers, and board-certified practitioners. Narrow your search by clinical branch, review credentials, and coordinate consultation diaries.
                    </p>
                </div>

                {/* CONTROLS BAR: SEARCH & DEPARTMENT FILTER TABS */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 mb-10 space-y-4" id="directory-controls-panel">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                        {/* Search inputs */}
                        <div className="lg:col-span-4 relative">
                            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search doctors by name or specialty..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-sm font-sans"
                            />
                        </div>

                        {/* Department selector filter pills */}
                        <div className="lg:col-span-8 overflow-x-auto">
                            <div className="flex space-x-2 pb-0.5" id="dept-filter-tabs">
                                <button
                                    onClick={() => setSelectedDeptFilter('all')}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider font-mono shrink-0 transition-colors cursor-pointer ${selectedDeptFilter === 'all'
                                            ? 'bg-teal-600 text-white shadow-sm'
                                            : 'bg-slate-50 text-slate-650 hover:bg-slate-100 border border-slate-100'
                                        }`}
                                >
                                    All Specialists
                                </button>
                                {DEPARTMENTS.map((dept) => (
                                    <button
                                        key={dept.id}
                                        onClick={() => setSelectedDeptFilter(dept.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider font-mono shrink-0 transition-colors cursor-pointer ${selectedDeptFilter === dept.id
                                                ? 'bg-teal-600 text-white shadow-sm'
                                                : 'bg-slate-50 text-slate-650 hover:bg-slate-100 border border-slate-100'
                                            }`}
                                    >
                                        {t(`dept.${dept.id}.title`) || dept.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* DOCTORS DIRECTORY GRID */}
                {filteredDoctors.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="doctors-cards-grid">
                        {filteredDoctors.map((doc) => (
                            <div
                                key={doc.id}
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden text-left group"
                                id={`doctor-card-${doc.id}`}
                            >
                                <div className="space-y-4">
                                    {/* Department Badge Header */}
                                    <div className="flex justify-between items-center">
                                        <span className="bg-teal-50 text-teal-700 text-[10px] font-bold font-mono tracking-wider uppercase px-2.5 py-1 rounded-lg">
                                            {t(`dept.${doc.departmentId}.title`) || getDeptName(doc.departmentId)}
                                        </span>
                                    </div>

                                    {/* Avatar / Summary block */}
                                    <div className="flex space-x-4 items-start">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-150/50 shadow-inner">
                                            <img
                                                src={doc.image}
                                                alt={doc.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>

                                        <div className="space-y-1 flex-1 min-w-0">
                                            <h3 className="font-extrabold text-slate-900 font-sans text-md sm:text-lg leading-tight tracking-tight">
                                                {doc.name}
                                            </h3>
                                            <p className="text-xs text-teal-650 font-bold font-sans">
                                                {t(`doc.${doc.id}.specialty`) || doc.specialty}
                                            </p>

                                            {/* Rating block */}
                                            <div className="flex items-center space-x-1 pt-0.5">
                                                <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                                                <span className="text-xs text-slate-800 font-bold">{doc.rating}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">({doc.reviewsCount} reviews)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Biography text */}
                                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-3">
                                        {t(`doc.${doc.id}.bio`) || doc.bio}
                                    </p>

                                    <div className="space-y-2 pt-3 border-t border-slate-100">
                                        {/* Experience Info */}
                                        <div className="flex items-center text-xs text-slate-505 font-medium">
                                            <Sparkles className="h-4 w-4 text-teal-600 mr-2 shrink-0" />
                                            <span>{doc.experienceYears} {t('doc.exp')}</span>
                                        </div>

                                        {/* Education Academic Degree */}
                                        <div className="flex items-start text-xs text-slate-505 font-medium">
                                            <GraduationCap className="h-4 w-4 text-teal-600 mr-2 shrink-0 mt-0.5" />
                                            <span className="truncate leading-tight" title={doc.education}>
                                                {doc.education}
                                            </span>
                                        </div>

                                        {/* Weekly Schedule text */}
                                        <div className="flex items-start text-xs text-slate-505 font-medium">
                                            <Calendar className="h-4 w-4 text-teal-600 mr-2 shrink-0 mt-0.5" />
                                            <span className="leading-tight">
                                                {t('doc.days')}: <strong className="text-slate-800">{doc.availability.days.join(', ')}</strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Reservation action button */}
                                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider font-mono">
                                            {t('doc.slots')}
                                        </span>
                                        <span className="text-xs font-semibold text-emerald-600 flex items-center mt-0.5">
                                            <Clock className="h-3.5 w-3.5 mr-1" />
                                            <span>{t('doc.avail')}</span>
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleInstantBook(doc.departmentId, doc.id)}
                                        className="inline-flex items-center space-x-1 bg-slate-950 hover:bg-teal-650 active:bg-teal-700 text-white hover:text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer group/btn shadow"
                                    >
                                        <span>{t('hero.bookBtn')}</span>
                                        <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>

                            </div>
                        ))}
                    </div>
                ) : (
                    /* EMPTY STATE */
                    <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center max-w-lg mx-auto shadow-sm" id="empty-doctors-state">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
                            <Search className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg font-sans">
                            No Doctors Match Your Filters
                        </h3>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Double-check your name criteria spelling, or select a different specialty department to find available medical personnel.
                        </p>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedDeptFilter('all');
                            }}
                            className="mt-5 inline-flex items-center justify-center bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold px-5 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                        >
                            Reset Search Filter
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
