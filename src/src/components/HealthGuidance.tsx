import React, { useState } from 'react';
import { Page, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  DANGER_SIGNS,
  CHIEF_COMPLAINTS,
  ADAPTIVE_QUESTIONS,
  evaluateTriage,
  TriageResult,
  Language
} from '../lib/triageRules';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Phone,
  ArrowRight,
  RotateCcw,
  Stethoscope,
  HeartPulse,
  Thermometer,
  Wind,
  Activity,
  Bone,
  Sparkles,
  Brain,
  Droplets,
  HelpCircle,
  Clock,
  ChevronLeft,
  CalendarDays,
  Info
} from 'lucide-react';

interface HealthGuidanceProps {
  setCurrentPage: (page: Page) => void;
  user: any;
  userProfile?: UserProfile | null;
}

export default function HealthGuidance({
  setCurrentPage,
  user,
  userProfile
}: HealthGuidanceProps) {
  const { t, language } = useLanguage();
  const currentLang = (language as Language) || 'en';

  // Step state: 1 = Danger Signs, 2 = Basics, 3 = Adaptive Questions, 4 = Recommendation
  const [step, setStep] = useState<number>(1);

  // Form selections
  const [dangerSigns, setDangerSigns] = useState<Record<string, boolean>>({});
  const [chiefComplaint, setChiefComplaint] = useState<string>('fever');
  const [customSymptomText, setCustomSymptomText] = useState<string>('');
  const [duration, setDuration] = useState<string>('1-3d');
  const [severity, setSeverity] = useState<number>(4);
  const [ageGroup, setAgeGroup] = useState<'child' | 'adult' | 'elderly'>('adult');
  const [isPregnant, setIsPregnant] = useState<boolean>(false);
  const [comorbidities, setComorbidities] = useState<Record<string, boolean>>({
    diabetes: false,
    hypertension: false,
    heartDisease: false,
    kidneyDisease: false,
    asthma: false,
    immunocompromised: false
  });
  const [adaptiveAnswers, setAdaptiveAnswers] = useState<Record<string, boolean>>({});

  // Computed result state
  const [result, setResult] = useState<TriageResult | null>(null);

  // Toggle single danger sign
  const handleDangerSignToggle = (id: string) => {
    setDangerSigns((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      return updated;
    });
  };

  // Check if any danger sign is selected
  const hasDangerSigns = Object.values(dangerSigns).some(Boolean);

  // Handle Step 1 Submit
  const handleStep1Submit = () => {
    if (hasDangerSigns) {
      // Direct escalation to Urgent Hospital
      const computed = evaluateTriage({
        dangerSigns,
        chiefComplaint,
        duration,
        severity,
        ageGroup,
        isPregnant,
        comorbidities,
        adaptiveAnswers,
        lang: currentLang
      });
      setResult(computed);
      setStep(4);
    } else {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Step 2 Submit
  const handleStep2Submit = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Step 3 Submit (Calculate final result)
  const handleStep3Submit = () => {
    const computed = evaluateTriage({
      dangerSigns,
      chiefComplaint,
      duration,
      severity,
      ageGroup,
      isPregnant,
      comorbidities,
      adaptiveAnswers,
      lang: currentLang
    });
    setResult(computed);
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset entire flow
  const handleStartOver = () => {
    setStep(1);
    setDangerSigns({});
    setChiefComplaint('fever');
    setCustomSymptomText('');
    setDuration('1-3d');
    setSeverity(4);
    setAgeGroup('adult');
    setIsPregnant(false);
    setComorbidities({
      diabetes: false,
      hypertension: false,
      heartDisease: false,
      kidneyDisease: false,
      asthma: false,
      immunocompromised: false
    });
    setAdaptiveAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render Icon helper for Chief Complaints
  const renderComplaintIcon = (iconName: string) => {
    switch (iconName) {
      case 'Thermometer':
        return <Thermometer className="h-5 w-5 text-teal-600" />;
      case 'Wind':
        return <Wind className="h-5 w-5 text-teal-600" />;
      case 'Activity':
        return <Activity className="h-5 w-5 text-teal-600" />;
      case 'Bone':
        return <Bone className="h-5 w-5 text-teal-600" />;
      case 'Sparkles':
        return <Sparkles className="h-5 w-5 text-teal-600" />;
      case 'Brain':
        return <Brain className="h-5 w-5 text-teal-600" />;
      case 'Droplets':
        return <Droplets className="h-5 w-5 text-teal-600" />;
      default:
        return <HelpCircle className="h-5 w-5 text-teal-600" />;
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen py-10 lg:py-14" id="rural-health-guidance-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* TOP NON-DIAGNOSTIC MANDATORY DISCLAIMER */}
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 mb-8 shadow-xs flex items-start space-x-3.5" id="guidance-disclaimer-banner">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="text-xs sm:text-sm text-amber-900 leading-relaxed font-sans">
            <p className="font-extrabold uppercase text-[11px] tracking-wider text-amber-800 font-mono mb-0.5">
              Medical Disclaimer & Notice / सूचना
            </p>
            <p className="font-medium">
              {t('guidance.disclaimer')}
            </p>
          </div>
        </div>

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center space-x-2 bg-teal-100/80 text-teal-850 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider mb-2">
              <Stethoscope className="h-3.5 w-3.5 text-teal-650" />
              <span>Patient Portal • Rural Triage Assistant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              {t('guidance.dashboardTitle')}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {t('guidance.dashboardDesc')}
            </p>
          </div>

          <button
            onClick={() => setCurrentPage('my-appointments')}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>

        {/* PROGRESS STEPPER */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 mb-8 shadow-xs">
          <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-semibold text-slate-500">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-teal-700 font-bold' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${step >= 1 ? 'bg-teal-650 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                1
              </div>
              <span className="hidden sm:inline">Emergency Check</span>
            </div>

            <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? 'bg-teal-600' : 'bg-slate-200'}`} />

            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-teal-700 font-bold' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${step >= 2 ? 'bg-teal-650 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                2
              </div>
              <span className="hidden sm:inline">Symptoms</span>
            </div>

            <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? 'bg-teal-600' : 'bg-slate-200'}`} />

            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-teal-700 font-bold' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${step >= 3 ? 'bg-teal-650 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                3
              </div>
              <span className="hidden sm:inline">Follow-up</span>
            </div>

            <div className={`h-0.5 flex-1 mx-3 ${step >= 4 ? 'bg-teal-600' : 'bg-slate-200'}`} />

            <div className={`flex items-center space-x-2 ${step >= 4 ? 'text-teal-700 font-bold' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${step === 4 ? 'bg-teal-650 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                4
              </div>
              <span className="hidden sm:inline">Guidance</span>
            </div>
          </div>
        </div>

        {/* STEP 1: DANGER SIGNS SAFETY SCREEN */}
        {step === 1 && (
          <div className="bg-white rounded-3xl border border-slate-150 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200" id="safety-screen-step-1">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2 text-rose-600 font-extrabold text-xs uppercase font-mono tracking-wider mb-1">
                <ShieldAlert className="h-4 w-4" />
                <span>{t('guidance.safetyTitle')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans">
                {currentLang === 'hi'
                  ? 'क्या आप इनमें से कोई गंभीर लक्षण महसूस कर रहे हैं?'
                  : currentLang === 'mr'
                  ? 'तुम्हाला यापैकी कोणतीही गंभीर लक्षणे जाणवत आहेत का?'
                  : 'Are you experiencing any emergency red flag symptoms?'}
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                {t('guidance.safetyDesc')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {DANGER_SIGNS.map((ds) => {
                const isChecked = Boolean(dangerSigns[ds.id]);
                return (
                  <label
                    key={ds.id}
                    onClick={() => handleDangerSignToggle(ds.id)}
                    className={`flex items-start space-x-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-300/40 text-rose-950 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 text-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by wrapper label onClick
                      className="h-5 w-5 mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 shrink-0"
                    />
                    <div className="text-xs sm:text-sm leading-snug">
                      <span className="font-bold block">
                        {ds.label[currentLang] || ds.label.en}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            {hasDangerSigns && (
              <div className="bg-rose-100/80 border border-rose-300 text-rose-950 p-4 rounded-2xl text-xs sm:text-sm flex items-center space-x-3 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <span className="font-bold">
                  {currentLang === 'hi'
                    ? 'चेतावनी: आपने आपातकालीन खतरे का संकेत चुना है। आगे बढ़ने पर आपको तुरंत अस्पताल जाने का सुझाव मिलेगा।'
                    : currentLang === 'mr'
                    ? 'इशारा: तुम्ही तातडीच्या धोक्याचे लक्षण निवडले आहे. पुढे गेल्यावर तुम्हाला तातडीने रुग्णालयात जाण्याचा सल्ला मिळेल.'
                    : 'Warning: You selected an emergency danger sign! Continuing will immediately escalate to Urgent Hospital Guidance.'}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDangerSigns({})}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold transition-colors cursor-pointer"
              >
                {currentLang === 'hi' ? 'सभी विकल्प हटाएं (No Danger Signs)' : currentLang === 'mr' ? 'सर्व पर्याय हटवा' : 'Clear All Selections (No Danger Signs)'}
              </button>

              <button
                type="button"
                onClick={handleStep1Submit}
                className={`w-full sm:w-auto font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center space-x-2 ${
                  hasDangerSigns
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/20'
                    : 'bg-teal-650 hover:bg-teal-750 active:bg-teal-800 text-white shadow-teal-700/20'
                }`}
              >
                <span>{hasDangerSigns ? (currentLang === 'hi' ? 'तत्काल अस्पताल परिणाम देखें →' : currentLang === 'mr' ? 'तातडीचा निकाल पहा →' : 'Escalate to Urgent Guidance →') : t('guidance.next')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHIEF COMPLAINT & BASICS */}
        {step === 2 && (
          <div className="bg-white rounded-3xl border border-slate-150 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200" id="basics-screen-step-2">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2 text-teal-650 font-extrabold text-xs uppercase font-mono tracking-wider mb-1">
                <Stethoscope className="h-4 w-4" />
                <span>{t('guidance.basicsTitle')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans">
                {currentLang === 'hi' ? 'अपनी मुख्य समस्या का चयन करें' : currentLang === 'mr' ? 'तुमची मुख्य समस्या निवडा' : 'Select Primary Chief Complaint'}
              </h2>
            </div>

            {/* Complaint Selector Grid */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">
                1. Main Symptom Category / मुख्य लक्षण श्रेणी:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CHIEF_COMPLAINTS.map((c) => {
                  const isSelected = chiefComplaint === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChiefComplaint(c.id)}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col items-start space-y-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/30 text-teal-900 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-teal-650 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        {renderComplaintIcon(c.iconName)}
                      </div>
                      <span className="text-xs font-bold leading-tight">
                        {c.label[currentLang] || c.label.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Description Text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">
                2. Briefly describe symptoms (Optional) / विवरण:
              </label>
              <input
                type="text"
                value={customSymptomText}
                onChange={(e) => setCustomSymptomText(e.target.value)}
                placeholder={currentLang === 'hi' ? 'उदा. 2 दिन से बुखार और गले में दर्द...' : currentLang === 'mr' ? 'उदा. २ दिवसांपासून ताप आणि घसा दुखणे...' : 'e.g., Mild fever with headache since yesterday...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-650/40 focus:bg-white"
              />
            </div>

            {/* Duration & Severity row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">
                  3. Duration / लक्षण कब से हैं?
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: '<24h', labelEn: '< 24 Hours', labelHi: '24 घंटे से कम', labelMr: '२४ तासांपेक्षा कमी' },
                    { id: '1-3d', labelEn: '1-3 Days', labelHi: '1 से 3 दिन', labelMr: '१ ते ३ दिवस' },
                    { id: '4-7d', labelEn: '4-7 Days', labelHi: '4 से 7 दिन', labelMr: '४ ते ७ दिवस' },
                    { id: '>1w', labelEn: '> 1 Week', labelHi: '1 हफ्ते से अधिक', labelMr: '१ आठवड्यापेक्षा जास्त' }
                  ].map((dur) => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setDuration(dur.id)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                        duration === dur.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {currentLang === 'hi' ? dur.labelHi : currentLang === 'mr' ? dur.labelMr : dur.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase tracking-wider flex justify-between">
                  <span>4. Severity Level / दर्द/तकलीफ स्तर:</span>
                  <span className="text-teal-700 font-extrabold">{severity}/10 ({severity <= 3 ? 'Mild' : severity <= 6 ? 'Moderate' : 'Severe'})</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-650"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
                  <span>1 (Mild)</span>
                  <span>5 (Moderate)</span>
                  <span>10 (Severe)</span>
                </div>
              </div>
            </div>

            {/* Age group & Pregnancy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">
                  5. Age Group / मरीज का आयु वर्ग:
                </label>
                <div className="flex space-x-2 text-xs">
                  {[
                    { id: 'child', label: 'Child (<12 y)' },
                    { id: 'adult', label: 'Adult (12-60 y)' },
                    { id: 'elderly', label: 'Elderly (>60 y)' }
                  ].map((ag) => (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => setAgeGroup(ag.id as any)}
                      className={`flex-1 py-2 px-2 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                        ageGroup === ag.id
                          ? 'bg-teal-650 text-white border-teal-650 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {ag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">
                  6. Pregnancy Status / गर्भावस्था स्थिति:
                </label>
                <button
                  type="button"
                  onClick={() => setIsPregnant(!isPregnant)}
                  className={`w-full py-2 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    isPregnant
                      ? 'bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{currentLang === 'hi' ? 'क्या गर्भवती महिला हैं?' : currentLang === 'mr' ? 'गरोदर महिला आहे का?' : 'Is Patient Currently Pregnant?'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono ${isPregnant ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {isPregnant ? 'Yes' : 'No'}
                  </span>
                </button>
              </div>
            </div>

            {/* Key Comorbidities Toggles */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">
                7. Key Medical History / पुरानी बीमारियां (यदि कोई हो):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { key: 'diabetes', labelEn: 'Diabetes / शुगर', labelHi: 'डायबिटीज', labelMr: 'मधुमेह' },
                  { key: 'hypertension', labelEn: 'High BP / बीपी', labelHi: 'हाई बीपी', labelMr: 'उच्च रक्तदाब' },
                  { key: 'heartDisease', labelEn: 'Heart Condition / हृदय रोग', labelHi: 'हृदय रोग', labelMr: 'हृदयरोग' },
                  { key: 'kidneyDisease', labelEn: 'Kidney Issue / किडनी समस्या', labelHi: 'किडनी की बीमारी', labelMr: 'किडनीचे आजार' },
                  { key: 'asthma', labelEn: 'Asthma/Lung Disease', labelHi: 'अस्थमा/दमा', labelMr: 'दमा' },
                  { key: 'immunocompromised', labelEn: 'Low Immunity / कैंसर इतिहास', labelHi: 'कमजोर इम्युनिटी', labelMr: 'कमकुवत प्रतिकारशक्ती' }
                ].map((item) => {
                  const active = Boolean(comorbidities[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setComorbidities((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key]
                        }))
                      }
                      className={`p-2 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500/40'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="mr-1">{active ? '✓' : '+'}</span>
                      {currentLang === 'hi' ? item.labelHi : currentLang === 'mr' ? item.labelMr : item.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center space-x-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{t('guidance.back')}</span>
              </button>

              <button
                type="button"
                onClick={handleStep2Submit}
                className="bg-teal-650 hover:bg-teal-750 active:bg-teal-800 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-sm shadow-teal-700/20 cursor-pointer flex items-center space-x-2"
              >
                <span>{t('guidance.next')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ADAPTIVE FOLLOW-UP QUESTIONS */}
        {step === 3 && (
          <div className="bg-white rounded-3xl border border-slate-150 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200" id="adaptive-screen-step-3">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2 text-teal-650 font-extrabold text-xs uppercase font-mono tracking-wider mb-1">
                <Activity className="h-4 w-4" />
                <span>{t('guidance.adaptiveTitle')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans">
                {currentLang === 'hi' ? 'लक्षित स्वास्थ्य प्रश्न' : currentLang === 'mr' ? 'लक्ष्यित आरोग्य प्रश्न' : 'Targeted Symptom Clarification'}
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                {currentLang === 'hi'
                  ? 'आपके चुने हुए मुख्य लक्षण के आधार पर निम्नलिखित प्रश्नों के उत्तर दें:'
                  : currentLang === 'mr'
                  ? 'तुम्ही निवडलेल्या मुख्य लक्षणाच्या आधारे खालील प्रश्नांची उत्तरे द्या:'
                  : 'Answer these targeted follow-up questions to refine our guidance logic:'}
              </p>
            </div>

            <div className="space-y-4">
              {(ADAPTIVE_QUESTIONS[chiefComplaint] || ADAPTIVE_QUESTIONS['other']).map((q, idx) => {
                const isChecked = Boolean(adaptiveAnswers[q.id]);
                return (
                  <div
                    key={q.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isChecked
                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase font-mono text-teal-700 tracking-wider">
                          Question {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                          {q.label[currentLang] || q.label.en}
                        </p>
                      </div>

                      <div className="flex space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAdaptiveAnswers((prev) => ({ ...prev, [q.id]: true }))}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Yes
                        </button>

                        <button
                          type="button"
                          onClick={() => setAdaptiveAnswers((prev) => ({ ...prev, [q.id]: false }))}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            !isChecked
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center space-x-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{t('guidance.back')}</span>
              </button>

              <button
                type="button"
                onClick={handleStep3Submit}
                className="bg-teal-650 hover:bg-teal-750 active:bg-teal-800 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-sm shadow-teal-700/20 cursor-pointer flex items-center space-x-2"
              >
                <span>{t('guidance.resultTitle')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RECOMMENDATION SCREEN */}
        {step === 4 && result && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200" id="recommendation-result-screen">

            {/* 1. URGENT HOSPITAL RESULT */}
            {result.level === 'urgent_hospital' && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-rose-600 text-white font-mono text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest animate-pulse">
                  Emergency Level 1
                </div>

                <div className="flex items-center space-x-3.5 mb-4 text-rose-700">
                  <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm animate-bounce">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-rose-800 block">
                      Triage Recommendation
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans">
                      {result.title[currentLang] || result.title.en}
                    </h2>
                  </div>
                </div>

                {/* Call to action emergency buttons */}
                <div className="bg-white border border-rose-200 rounded-2xl p-4 sm:p-5 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {currentLang === 'hi' ? 'तुरंत निकटतम अस्पताल जाएं या 108 डायल करें' : currentLang === 'mr' ? 'तातडीने जवळच्या रुग्णालयात जा किंवा १०८ वर कॉल करा' : 'Proceed immediately to emergency hospital or call 108'}
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {currentLang === 'hi' ? 'इमरजेंसी सहायता 24 घंटे उपलब्ध है।' : currentLang === 'mr' ? 'आपत्कालीन मदत २४ तास उपलब्ध आहे.' : 'Emergency support active 24/7 with immediate triage.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 shrink-0 w-full sm:w-auto">
                    <a
                      href="tel:108"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{t('guidance.callEmergency')}</span>
                    </a>

                    <button
                      onClick={() => setCurrentPage('emergency')}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      <span>Emergency Ambulance 🚑</span>
                    </button>
                  </div>
                </div>

                {/* Bullet Reasons */}
                <div className="space-y-3 mb-6 bg-white/70 p-5 rounded-2xl border border-rose-200/60">
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-rose-900 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1.5 text-rose-600 shrink-0" />
                    <span>{t('guidance.reasonsHeader')}</span>
                  </h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-800 pl-2">
                    {result.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-rose-600 font-bold font-mono shrink-0">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next Steps */}
                <div className="space-y-2 mb-6">
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-700">
                    {t('guidance.nextStepsHeader')}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-700">
                    {result.nextSteps.map((stepText, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-rose-100 flex items-start space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{stepText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. NEAREST CLINIC RESULT */}
            {result.level === 'nearest_clinic' && (
              <div className="bg-amber-50/70 border-2 border-amber-300/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center space-x-3.5 mb-5 text-amber-900">
                  <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-xs">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-amber-800 block">
                      Triage Recommendation
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans">
                      {result.title[currentLang] || result.title.en}
                    </h2>
                  </div>
                </div>

                {/* Bullet Reasons */}
                <div className="space-y-3 mb-6 bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs">
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-900 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-amber-600 shrink-0" />
                    <span>{t('guidance.reasonsHeader')}</span>
                  </h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-800">
                    {result.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-amber-600 font-bold font-mono shrink-0">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Nearest Clinic Structured Details Box */}
                {result.clinicInfo && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase font-mono text-teal-700 tracking-wider">
                          {t('guidance.nearestClinicInfo')}
                        </span>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-sans">
                          {result.clinicInfo.name}
                        </h3>
                      </div>
                      <span className="bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1 rounded-full text-xs font-bold font-mono self-start sm:self-auto">
                        📍 {result.clinicInfo.distance}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                      <div>
                        <p className="text-slate-400 font-mono uppercase text-[10px] font-bold">Doctor in Charge:</p>
                        <p className="font-bold text-slate-900">{result.clinicInfo.doctorInCharge}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-mono uppercase text-[10px] font-bold">Operating Hours:</p>
                        <p className="font-bold text-slate-900">{result.clinicInfo.hours}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-mono uppercase text-[10px] font-bold">Address / स्थान:</p>
                        <p className="font-medium text-slate-800">{result.clinicInfo.address}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-mono uppercase text-[10px] font-bold">Contact Phone:</p>
                        <p className="font-bold text-slate-900 font-mono">{result.clinicInfo.phone}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100">
                      <a
                        href={`tel:${result.clinicInfo.phone.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center space-x-1.5 bg-teal-650 hover:bg-teal-750 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Call PHC Clinic</span>
                      </a>

                      <button
                        onClick={() => setCurrentPage('booking')}
                        className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>Book Clinic Slot</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="space-y-2 mb-6">
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-700">
                    {t('guidance.nextStepsHeader')}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-700">
                    {result.nextSteps.map((stepText, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-amber-100 flex items-start space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{stepText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. HOME CARE RESULT */}
            {result.level === 'home_care' && (
              <div className="bg-emerald-50/80 border-2 border-emerald-300/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center space-x-3.5 mb-5 text-emerald-900">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs">
                    <HeartPulse className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-800 block">
                      Triage Recommendation
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans">
                      {result.title[currentLang] || result.title.en}
                    </h2>
                  </div>
                </div>

                {/* Bullet Reasons */}
                <div className="space-y-3 mb-6 bg-white p-5 rounded-2xl border border-emerald-200/70 shadow-xs">
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-emerald-900 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600 shrink-0" />
                    <span>{t('guidance.reasonsHeader')}</span>
                  </h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-800">
                    {result.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-emerald-600 font-bold font-mono shrink-0">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next Steps */}
                <div className="space-y-2 mb-6">
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-700">
                    {t('guidance.nextStepsHeader')}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-700">
                    {result.nextSteps.map((stepText, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-emerald-100 flex items-start space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{stepText}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    onClick={() => setCurrentPage('booking')}
                    className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <CalendarDays className="h-4 w-4 text-emerald-400" />
                    <span>Book Routine Doctor Consultation</span>
                  </button>
                </div>
              </div>
            )}

            {/* MANDATORY DISCLAIMER REPEATED AT BOTTOM OF RESULTS */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 text-center">
              <p className="font-semibold">{t('guidance.disclaimer')}</p>
            </div>

            {/* ACTION BUTTON: START OVER */}
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleStartOver}
                className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{t('guidance.startOver')}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
