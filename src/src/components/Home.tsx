import React from 'react';
import { Page } from '../types';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import {
    ShieldCheck,
    Users,
    Award,
    Heart,
    PhoneCall,
    ArrowRight,
    CalendarDays,
    FileCheck,
    CheckCircle,
    Quote
} from 'lucide-react';

interface HomeProps {
    setCurrentPage: (page: Page) => void;
}

const TESTIMONIALS = [
    {
        quote: "The care I received at Sanjeevani was absolutely life-changing. From the receptionist to Dr. Rostova in Cardiology, everyone showed incredible patience, wisdom, and professional expertise.",
        author: "James L., Cardiovascular Patient",
        rating: 5,
        tag: "Cardiology"
    },
    {
        quote: "As first-time parents, we were extremely anxious about pediatric checkups. Dr. Keyser made our infant feel so comfortable and explained developmental charts with absolute clarity.",
        author: "Samantha & David K., Parents of Leo",
        rating: 5,
        tag: "Pediatrics"
    },
    {
        quote: "Dr. Benton's sports medicine treatment helped me recover from knee surgery twice as fast as my previous orthopedic clinical program. Truly unparalleled dedication to active patient wellness.",
        author: "Sarah M., Professional Athlete",
        rating: 5,
        tag: "Orthopedics"
    }
];

export default function Home({ setCurrentPage }: HomeProps) {
    const { t } = useLanguage();
    const [activeTestimonial, setActiveTestimonial] = React.useState(0);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
    };

    return (
        <div className="bg-slate-50/50 min-h-screen" id="home-page-container">

            {/* 1. HERO SECTION */}
            <section className="relative overflow-hidden bg-white py-12 lg:py-20 border-b border-slate-100" id="hero-section">
                {/* Background glow effects */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-12 left-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

                        {/* Hero Text Column */}
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 tracking-wider font-mono">
                                <CheckCircle className="h-3.5 w-3.5 text-teal-650" />
                                <span>{t('hero.badge')}</span>
                            </span>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-sans text-slate-900 tracking-tight leading-tight">
                                {t('hero.title1')} <span className="text-teal-650">{t('hero.title2')}</span>
                            </h1>

                            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                                {t('hero.subtitle')}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                                <button
                                    onClick={() => setCurrentPage('booking')}
                                    className="inline-flex items-center justify-center space-x-2 bg-teal-650 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold px-7 py-3.5 rounded-xl text-base shadow-lg shadow-teal-750/10 hover:shadow-teal-750/20 transition-all cursor-pointer group"
                                    id="hero-book-now-btn"
                                >
                                    <CalendarDays className="h-5 w-5 text-emerald-400 group-hover:scale-105 transition-transform" />
                                    <span>{t('hero.bookBtn')}</span>
                                    <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    onClick={() => setCurrentPage('departments')}
                                    className="inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-7 py-3.5 rounded-xl text-base transition-all cursor-pointer"
                                    id="hero-departments-btn"
                                >
                                    <span>{t('nav.departments')}</span>
                                </button>
                            </div>

                            {/* Trust Badges */}
                            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 text-left">
                                <div>
                                    <h4 className="text-2xl font-bold font-sans text-slate-900">{t('hero.stat3.val')}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{t('hero.stat3.lbl')}</p>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold font-sans text-slate-900">{t('hero.stat2.val')}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{t('hero.stat2.lbl')}</p>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold font-sans text-slate-900">{t('hero.stat1.val')}</h4>
                                    <p className="text-xs text-slate-500 font-medium font-sans">{t('hero.stat1.lbl')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Hero Image / Badge Column */}
                        <div className="lg:col-span-5 relative">
                            <div className="relative mx-auto max-w-md lg:max-w-none">
                                {/* Decorative dots/squares background */}
                                <div className="absolute -top-6 -left-6 w-24 h-24 bg-teal-100 rounded-3xl opacity-50 blur-xl" />
                                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-emerald-100 rounded-full opacity-60 blur-xl" />

                                <div className="overflow-hidden rounded-2xl shadow-2xl border-4 border-white shadow-slate-350/30">
                                    <img
                                        src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=900"
                                        alt="Sanjeevani Modern Clinic Hallway"
                                        className="w-full h-[450px] object-cover hover:scale-105 transition-transform duration-500"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>

                                {/* Floating Core Indicator Badge */}
                                <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-xl shadow-lg border border-slate-100 flex items-center space-x-3 max-w-xs text-left">
                                    <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg shrink-0">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-slate-900 text-sm">{t('hero.badge1.title')}</h5>
                                        <p className="text-xs text-slate-500">{t('hero.badge1.sub')}</p>
                                    </div>
                                </div>

                                {/* Floating Support Badge */}
                                <div className="absolute -top-4 -right-4 bg-white p-3.5 rounded-xl shadow-lg border border-slate-100 flex items-center space-x-3 max-w-xs text-left">
                                    <div className="bg-teal-50 text-teal-600 p-2 rounded-lg shrink-0">
                                        <PhoneCall className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-slate-900 text-xs">{t('hero.badge2.title')}</h5>
                                        <p className="text-[10px] text-teal-700 font-bold font-mono">+91 9552625262</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 2. CORE FEATURES VALUE PROPOSITION */}
            <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="why-choose-us">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                        {t('why.sub')}
                    </span>
                    <h2 className="text-3xl font-extrabold font-sans text-slate-900 mt-2">
                        {t('why.title')}
                    </h2>
                    <p className="text-slate-500 text-sm sm:text-base mt-2">
                        {t('why.desc')}
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-left"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    {/* Card 1: Certified Staff */}
                    <motion.div
                        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                        variants={itemVariants}
                    >
                        <div className="bg-teal-50 text-teal-700 p-3.5 rounded-xl w-fit group-hover:bg-teal-650 group-hover:text-white transition-all">
                            <Users className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mt-4 font-sans">{t('why.f1.title')}</h3>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                            {t('why.f1.desc')}
                        </p>
                    </motion.div>

                    {/* Card 2: Innovation */}
                    <motion.div
                        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                        variants={itemVariants}
                    >
                        <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-xl w-fit group-hover:bg-emerald-650 group-hover:text-white transition-all">
                            <Award className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mt-4 font-sans">{t('why.f2.title')}</h3>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                            {t('why.f2.desc')}
                        </p>
                    </motion.div>

                    {/* Card 3: Patient Care */}
                    <motion.div
                        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                        variants={itemVariants}
                    >
                        <div className="bg-amber-50 text-amber-700 p-3.5 rounded-xl w-fit group-hover:bg-amber-650 group-hover:text-white transition-all">
                            <Heart className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mt-4 font-sans">{t('why.f3.title')}</h3>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                            {t('why.f3.desc')}
                        </p>
                    </motion.div>

                    {/* Card 4: Quick Records */}
                    <motion.div
                        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                        variants={itemVariants}
                    >
                        <div className="bg-sky-50 text-sky-700 p-3.5 rounded-xl w-fit group-hover:bg-sky-650 group-hover:text-white transition-all">
                            <FileCheck className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mt-4 font-sans">{t('why.f4.title')}</h3>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                            {t('why.f4.desc')}
                        </p>
                    </motion.div>
                </motion.div>
            </section>

            {/* 3. STEP-BY-STEP AD DIRECTIVES */}
            <section className="bg-teal-900 text-white py-16" id="consultation-banner">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-8 text-left space-y-4">
                        <h2 className="text-2xl sm:text-3xl font-extrabold font-sans">
                            {t('banner.title')}
                        </h2>
                        <p className="text-teal-100 text-sm sm:text-base leading-relaxed max-w-2xl">
                            {t('banner.desc')}
                        </p>
                    </div>
                    <div className="lg:col-span-4 flex justify-start lg:justify-end">
                        <button
                            onClick={() => setCurrentPage('booking')}
                            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-white text-teal-900 hover:bg-slate-100 font-bold px-7 py-4 rounded-xl text-md transition-all shadow-md hover:shadow-lg cursor-pointer"
                        >
                            <CalendarDays className="h-5 w-5 text-teal-600" />
                            <span>{t('banner.btn')}</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* 4. CLINIC TESTIMONIALS SLIDER */}
            <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-100" id="testimonials-section">
                <div className="text-center max-w-3xl mx-auto mb-10">
                    <span className="text-xs font-semibold text-teal-650 tracking-wider uppercase font-mono">
                        {t('testim.sub')}
                    </span>
                    <h2 className="text-3xl font-extrabold font-sans text-slate-900 mt-1">
                        {t('testim.title')}
                    </h2>
                </div>

                <div className="relative max-w-4xl mx-auto bg-slate-55 p-1 rounded-2xl" id="testimonial-carousel-panel">
                    {/* Inner card content */}
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-150 p-6 sm:p-10 text-center relative overflow-hidden shadow-inner">
                        <Quote className="h-10 w-10 text-teal-600/10 absolute top-4 left-4" />

                        <p className="text-md sm:text-lg text-slate-700 italic leading-relaxed relative z-10 font-sans max-w-2xl mx-auto">
                            "{TESTIMONIALS[activeTestimonial].quote}"
                        </p>

                        <div className="mt-6">
                            <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                                {TESTIMONIALS[activeTestimonial].author}
                            </h5>
                            <span className="inline-block bg-teal-100/60 text-teal-800 font-mono text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full mt-2">
                                {TESTIMONIALS[activeTestimonial].tag}
                            </span>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex justify-center space-x-3 mt-8">
                            {TESTIMONIALS.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveTestimonial(index)}
                                    className={`h-2.5 w-2.5 rounded-full transition-all cursor-pointer ${activeTestimonial === index ? 'bg-teal-650 w-7' : 'bg-slate-305 hover:bg-slate-400'
                                        }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. NEWSLETTER OR REASSURANCE FOOTER BRANDING CARD */}
            <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" id="emergency-cta-block">
                <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl shadow-slate-950/15">
                    {/* Wave background */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <h2 className="text-3xl sm:text-4xl font-extrabold font-sans tracking-tight leading-tight max-w-3xl mx-auto">
                        {t('cta.title')}
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-md mt-4 max-w-xl mx-auto">
                        {t('cta.desc')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                        <button
                            onClick={() => setCurrentPage('booking')}
                            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-bold px-8 py-3.5 rounded-xl text-base transition-all shadow-md shadow-teal-500/5 cursor-pointer"
                        >
                            <CalendarDays className="h-5 w-5 mr-1" />
                            <span>{t('hero.bookBtn')}</span>
                        </button>
                        <a
                            href="mailto:tksanjeevan@gmail.com"
                            className="w-full sm:w-auto inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white px-8 py-3.5 rounded-xl text-base font-semibold transition-all border border-slate-700/65"
                        >
                            {t('cta.emailBtn')}
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
