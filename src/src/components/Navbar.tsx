import React from 'react';
import { Page, UserProfile } from '../types';
import { HeartPulse, CalendarDays, Menu, X, LogOut, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

interface NavbarProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    bookingCount: number;
    user: any;
    userProfile?: UserProfile | null;
    onSignOut: () => void;
}

export default function Navbar({
    currentPage,
    setCurrentPage,
    bookingCount,
    user,
    userProfile,
    onSignOut
}: NavbarProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const { t } = useLanguage();

    const isAdmin = user?.email === 'anuragkhobragade@gmail.com';

    const navItems: Array<{ id: Page; label: string }> = [
        { id: 'home', label: t('nav.home') },
        { id: 'about', label: t('nav.about') },
        { id: 'departments', label: t('nav.departments') },
        { id: 'doctors', label: t('nav.doctors') }
    ];

    if (userProfile?.role === 'doctor') {
        navItems.push({ id: 'doctor-portal', label: t('nav.doctorPortal') });
    } else if (userProfile?.role === 'driver') {
        navItems.push({ id: 'driver-portal', label: 'Driver Portal 🚑' });
    } else if (userProfile?.role === 'phc_staff') {
        navItems.push({ id: 'phc-portal', label: 'PHC Portal 🏥' });
    } else if (userProfile?.role === 'admin' || user?.email === 'anuragkhobragade@gmail.com') {
        navItems.push({ id: 'admin', label: t('nav.adminPortal') });
    } else {
        navItems.push({ id: 'my-appointments', label: t('nav.myBookings') });
    }

    const handleNavClick = (pageId: Page) => {
        setCurrentPage(pageId);
        setIsOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm" id="main-nav">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    {/* Logo Section */}
                    <div className="flex items-center">
                        <button
                            onClick={() => handleNavClick('home')}
                            className="flex items-center space-x-3 cursor-pointer group"
                            id="nav-logo-btn"
                        >
                            <div className="bg-teal-600 text-white p-2.5 rounded-xl shadow-md shadow-teal-600/10 group-hover:bg-teal-700 transition-colors">
                                <HeartPulse className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <span className="text-xl font-bold font-sans tracking-tight text-slate-900 block leading-tight">
                                    {t('nav.brand')}
                                </span>
                                <span className="text-[11px] font-medium text-teal-605 tracking-wider uppercase block font-mono">
                                    {t('nav.subBrand')}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => {
                            const isActive = currentPage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    id={`nav-link-${item.id}`}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer relative ${isActive
                                            ? 'text-teal-700 bg-teal-50/60'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    {item.label}
                                    {item.id === 'my-appointments' && bookingCount > 0 && (
                                        <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-600 text-white leading-none">
                                            {bookingCount}
                                        </span>
                                    )}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-teal-600 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Desktop Call To Action with Client Profile Status & Language Selector */}
                    <div className="hidden md:flex items-center space-x-3">
                        <LanguageSelector />

                        {user ? (
                            <div className="flex items-center space-x-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-1.5" id="navbar-user-profile-badge">
                                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm uppercase shrink-0 font-sans">
                                    {user.displayName ? user.displayName.charAt(0) : user.email?.charAt(0) || 'U'}
                                </div>
                                <div className="text-left shrink-0">
                                    <span className="text-xs font-bold text-slate-800 block max-w-[120px] truncate leading-none">
                                        {user.displayName || 'Guest User'}
                                    </span>
                                    <button
                                        onClick={onSignOut}
                                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 block transition-colors leading-none mt-1 cursor-pointer"
                                    >
                                        {t('nav.signOut')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleNavClick('auth')}
                                className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                                id="nav-signin-btn"
                            >
                                <span>{t('nav.signIn')}</span>
                            </button>
                        )}

                        <button
                            onClick={() => handleNavClick('emergency')}
                            className="inline-flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4.5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow group cursor-pointer"
                            id="nav-emergency-btn"
                        >
                            <span className="relative flex h-2 w-2 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            <span>Emergency 🚨</span>
                        </button>

                        <button
                            onClick={() => handleNavClick('booking')}
                            className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow group cursor-pointer"
                            id="nav-book-appointment-btn"
                        >
                            <CalendarDays className="h-4 w-4 text-emerald-405 group-hover:scale-110 transition-transform" />
                            <span>{t('nav.bookAppointment')}</span>
                        </button>
                    </div>

                    {/* Mobile menu button and language selector */}
                    <div className="flex items-center space-x-2 md:hidden">
                        <LanguageSelector />
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            aria-expanded="false"
                            id="mobile-nav-toggle"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>

                </div>
            </div>

            {/* Mobile Menu Slider */}
            {isOpen && (
                <div className="md:hidden bg-white border-b border-slate-100 shadow-lg px-2 pt-2 pb-4 space-y-1" id="mobile-menu-panel">
                    {navItems.map((item) => {
                        const isActive = currentPage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`flex w-full items-center justify-between px-4 py-3 rounded-lg text-base font-semibold transition-colors cursor-pointer ${isActive
                                        ? 'text-teal-700 bg-teal-50'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <span>{item.label}</span>
                                {item.id === 'my-appointments' && bookingCount > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-600 text-white">
                                        {bookingCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {user ? (
                        <div className="border-t border-slate-105 mt-2 pt-3 px-4 pb-1" id="mobile-user-profile-badge">
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold uppercase font-sans shrink-0">
                                    {user.displayName ? user.displayName.charAt(0) : user.email?.charAt(0) || 'U'}
                                </div>
                                <div className="text-left overflow-hidden">
                                    <span className="text-sm font-extrabold text-slate-800 block truncate">
                                        {user.displayName || 'Guest User'}
                                    </span>
                                    <span className="text-[11px] text-slate-400 block font-mono truncate">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    onSignOut();
                                    setIsOpen(false);
                                }}
                                className="w-full text-center py-2.5 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                                Sign Out / Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="px-4 pt-1 pb-1">
                            <button
                                onClick={() => handleNavClick('auth')}
                                className="w-full flex items-center justify-center space-x-2 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <span>Sign In to Your Account</span>
                            </button>
                        </div>
                    )}

                    <div className="pt-2 px-4 flex flex-col gap-2">
                        <button
                            onClick={() => handleNavClick('emergency')}
                            className="flex w-full items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md cursor-pointer text-sm"
                        >
                            <span className="relative flex h-2.5 w-2.5 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                            </span>
                            <span>Emergency 🚨</span>
                        </button>

                        <button
                            onClick={() => handleNavClick('booking')}
                            className="flex w-full items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md cursor-pointer text-sm"
                        >
                            <CalendarDays className="h-5 w-5" />
                            <span>Book Appointment</span>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
