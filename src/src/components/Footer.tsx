import { HeartPulse, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { Page } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
    setCurrentPage: (page: Page) => void;
}

export default function Footer({ setCurrentPage }: FooterProps) {
    const { t } = useLanguage();
    const handleLinkClick = (page: Page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-slate-900 text-slate-350 border-t border-slate-800" id="main-footer">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

                    {/* Column 1: Hospital Mission & Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <div className="bg-teal-600 text-white p-2 rounded-lg shadow-inner">
                                <HeartPulse className="h-5 w-5" />
                            </div>
                            <span className="text-xl font-bold font-sans tracking-tight text-white leading-none">
                                {t('nav.brand')} {t('nav.subBrand')}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed pt-2">
                            {t('footer.about')}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                            <Clock className="h-4 w-4 text-emerald-450 shrink-0" />
                            <span>{t('hero.badge')}</span>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wider uppercase font-mono mb-4 text-[13px] border-l-2 border-teal-500 pl-3">
                            Quick Navigation
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <button
                                    onClick={() => handleLinkClick('home')}
                                    className="hover:text-teal-400 transition-colors text-slate-400 font-medium cursor-pointer"
                                >
                                    Home & Reception
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => handleLinkClick('about')}
                                    className="hover:text-teal-400 transition-colors text-slate-400 font-medium cursor-pointer"
                                >
                                    About Our Center
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => handleLinkClick('departments')}
                                    className="hover:text-teal-400 transition-colors text-slate-400 font-medium cursor-pointer"
                                >
                                    Medical Departments
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => handleLinkClick('doctors')}
                                    className="hover:text-teal-400 transition-colors text-slate-400 font-medium cursor-pointer"
                                >
                                    Our Medical Team
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => handleLinkClick('booking')}
                                    className="hover:text-teal-400 transition-colors text-slate-400 font-semibold text-teal-400 cursor-pointer"
                                >
                                    Schedule Appointment
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Typical Hours */}
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wider uppercase font-mono mb-4 text-[13px] border-l-2 border-teal-500 pl-3">
                            Working Hours
                        </h3>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li className="flex justify-between items-center py-1 border-b border-slate-800/30">
                                <span>Monday - Friday</span>
                                <span className="font-mono text-xs text-slate-300">08:00 AM - 08:00 PM</span>
                            </li>
                            <li className="flex justify-between items-center py-1 border-b border-slate-800/30">
                                <span>Saturday</span>
                                <span className="font-mono text-xs text-slate-300">09:00 AM - 05:00 PM</span>
                            </li>
                            <li className="flex justify-between items-center py-1 border-b border-slate-800/30">
                                <span>Sunday</span>
                                <span className="font-mono text-xs text-teal-400">Closed (On-Call Only)</span>
                            </li>
                            <li className="text-xs text-teal-500 font-mono italic pt-1">
                                * Please note individual doctor availability varies.
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Contact Clinic */}
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wider uppercase font-mono mb-4 text-[13px] border-l-2 border-teal-500 pl-3">
                            Contact & Location
                        </h3>
                        <ul className="space-y-3.5 text-sm text-slate-400">
                            <li className="flex items-start space-x-3">
                                <MapPin className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                                <span>Ratanlal plots Mahadev Mandir Road, Yavatmal, Maharashtra 445301</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <Phone className="h-5 w-5 text-teal-500 shrink-0" />
                                <span>+91 9552625262</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <Mail className="h-5 w-5 text-teal-500 shrink-0" />
                                <span>tksanjeevan@gmail.com</span>
                            </li>
                        </ul>
                    </div>

                </div>

                {/* Divider & Copyright */}
                <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono">
                    <p>© {new Date().getFullYear()} Sanjeevani Medical Center. All rights reserved.</p>
                    <p className="mt-2 sm:mt-0">Design & Care Excellence • ISO 9001 Certified</p>
                </div>
            </div>
        </footer>
    );
}
