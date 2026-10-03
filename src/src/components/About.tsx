import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import {
    Heart,
    ShieldCheck,
    Users,
    Flame,
    CalendarClock,
    Award,
    Globe,
    TrendingUp
} from 'lucide-react';

export default function About() {
    const { t } = useLanguage();

    const valuesList = [
        {
            icon: Heart,
            title: t('about.val.v1.t'),
            desc: t('about.val.v1.d')
        },
        {
            icon: ShieldCheck,
            title: t('about.val.v2.t'),
            desc: t('about.val.v2.d')
        },
        {
            icon: Flame,
            title: t('about.val.v3.t'),
            desc: t('about.val.v3.d')
        },
        {
            icon: Users,
            title: t('about.val.v4.t'),
            desc: t('about.val.v4.d')
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    return (
        <div className="bg-slate-50/50 min-h-screen py-12 lg:py-16" id="about-page">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* 1. TITLE HEADER */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                        {t('about.sub')}
                    </span>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-sans text-slate-900 mt-2">
                        {t('about.title')}
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-3 leading-relaxed">
                        {t('about.desc')}
                    </p>
                </div>

                {/* 2. MAIN STORY SECTION */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20" id="about-story">
                    <div className="relative">
                        <div className="absolute -top-4 -left-4 w-12 h-12 bg-teal-100 rounded-xl blur-lg opacity-80" />
                        <img
                            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800"
                            alt="Medical Team Collaboration"
                            className="w-full h-[400px] object-cover rounded-2xl shadow-lg border border-white"
                            referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-6 -right-6 bg-teal-650 text-white p-6 rounded-xl hidden sm:flex flex-col text-left max-w-[240px]">
                            <span className="text-3xl font-bold font-sans">15+</span>
                            <span className="text-xs text-teal-100 font-mono mt-1">{t('hero.stat2.lbl')}</span>
                        </div>
                    </div>

                    <div className="text-left space-y-5">
                        <h2 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">
                            {t('about.story.title')}
                        </h2>
                        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                            {t('about.story.desc')}
                        </p>
                    </div>
                </section>

                {/* 3. CORE VALUES SECTION */}
                <section className="mb-20" id="about-values">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                            {t('about.sub')}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans mt-1">
                            {t('about.val.title')}
                        </h2>
                    </div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        {valuesList.map((val, idx) => (
                            <motion.div
                                key={idx}
                                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start space-x-4"
                                variants={itemVariants}
                            >
                                <div className="bg-teal-50 text-teal-700 p-3 rounded-lg shrink-0 h-fit">
                                    <val.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base font-sans">{val.title}</h3>
                                    <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">{val.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* 4. CLINIC HISTORY TIMELINE */}
                <section className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm" id="about-history-timeline">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                            {t('about.journey.sub')}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans mt-1">
                            {t('about.journey.title')}
                        </h2>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            {t('about.journey.desc')}
                        </p>
                    </div>

                    <div className="relative border-l border-slate-205 ml-4 sm:ml-8 md:mx-auto max-w-3xl space-y-12">
                        {[
                            { year: '2008', title: t('about.t1.title'), desc: t('about.t1.desc'), icon: CalendarClock },
                            { year: '2014', title: t('about.t2.title'), desc: t('about.t2.desc'), icon: Award },
                            { year: '2020', title: t('about.t3.title'), desc: t('about.t3.desc'), icon: Globe },
                            { year: '2026', title: t('about.t4.title'), desc: t('about.t4.desc'), icon: TrendingUp }
                        ].map((item, idx) => (
                            <div key={idx} className="relative pl-8 md:pl-12 text-left">
                                {/* Timeline badge or dot */}
                                <div className="absolute -left-[17px] top-1.5 bg-teal-600 text-white rounded-full p-1.5 border border-white shrink-0 shadow-md">
                                    <item.icon className="h-3.5 w-3.5" />
                                </div>

                                {/* Year tag */}
                                <span className="inline-block bg-teal-50 text-teal-700 font-semibold font-mono text-xs px-2.5 py-0.5 rounded-full">
                                    {item.year}
                                </span>

                                {/* Text description */}
                                <h3 className="font-bold text-slate-900 mt-2 font-sans text-md sm:text-lg">
                                    {item.title}
                                </h3>
                                <p className="text-slate-650 text-xs sm:text-sm mt-1 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}
