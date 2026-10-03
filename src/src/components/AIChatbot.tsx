import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { DEPARTMENTS, DOCTORS } from '../data';
import { getGeminiHealthResponse } from '../lib/geminiService';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
    Bot,
    X,
    Send,
    Paperclip,
    Sparkles,
    Stethoscope,
    FileText,
    FileImage,
    ArrowRight,
    AlertCircle,
    User,
    CheckCircle2,
    RefreshCw,
    Loader2,
    Activity,
    HeartPulse,
    ThumbsUp,
    ThumbsDown,
    Check,
    Truck
} from 'lucide-react';

interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    attachmentName?: string;
    imageUrl?: string;
    recommendedDoctorId?: string;
    recommendedDeptId?: string;
    isEmergencyAlert?: boolean;
    timestamp: string;
    feedback?: 'like' | 'dislike';
}

interface AIChatbotProps {
    onSelectDoctorAndBook: (deptId: string, doctorId: string) => void;
    onBookAmbulance?: () => void;
}

/**
 * Fast offscreen HTML5 canvas color analyzer & keyword fusion engine to detect image features
 */
function analyzeImageColors(
    dataUrl: string,
    fileName?: string,
    queryText?: string
): Promise<'cut_bleed' | 'burn' | 'insect_bite' | 'rash' | 'non_medical' | undefined> {
    return new Promise((resolve) => {
        const textLower = ((fileName || '') + ' ' + (queryText || '')).toLowerCase();

        // 1. DIRECT KEYWORD MATCHING FROM FILE NAME OR QUERY
        if (
            textLower.includes('car') ||
            textLower.includes('auto') ||
            textLower.includes('bike') ||
            textLower.includes('maggi') ||
            textLower.includes('food') ||
            textLower.includes('tree') ||
            textLower.includes('flower') ||
            textLower.includes('nature') ||
            textLower.includes('dog') ||
            textLower.includes('cat') ||
            textLower.includes('wallpaper')
        ) {
            return resolve('non_medical');
        }

        if (
            textLower.includes('cut') ||
            textLower.includes('bleed') ||
            textLower.includes('blood') ||
            textLower.includes('wound') ||
            textLower.includes('blade') ||
            textLower.includes('knife') ||
            textLower.includes('injury') ||
            textLower.includes('घाव') ||
            textLower.includes('कट') ||
            textLower.includes('खून')
        ) {
            return resolve('cut_bleed');
        }

        if (
            textLower.includes('infec') ||
            textLower.includes('pus') ||
            textLower.includes('boil') ||
            textLower.includes('abscess') ||
            textLower.includes('ulcer') ||
            textLower.includes('fungal') ||
            textLower.includes('rash') ||
            textLower.includes('allergy') ||
            textLower.includes('संक्रमण') ||
            textLower.includes('इन्फेक्शन')
        ) {
            return resolve('rash');
        }

        if (textLower.includes('burn') || textLower.includes('jala') || textLower.includes('fire') || textLower.includes('heat') || textLower.includes('steam')) {
            return resolve('burn');
        }

        if (textLower.includes('bite') || textLower.includes('sting') || textLower.includes('mosquito') || textLower.includes('bee') || textLower.includes('ant')) {
            return resolve('insect_bite');
        }

        // 2. OFFSCREEN CANVAS COLOR PIXEL MATRIX
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(undefined);

                ctx.drawImage(img, 0, 0, 32, 32);
                const imageData = ctx.getImageData(0, 0, 32, 32).data;

                let freshLiquidBlood = 0;
                let burnCharredSkin = 0;
                let rashInflamedSkin = 0;
                let greenPixels = 0;
                let skinPixels = 0;
                const pixelCount = imageData.length / 4;

                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];

                    // 1. Green Nature / Trees
                    if (g > 80 && g > r * 1.1 && g > b * 1.1) {
                        greenPixels++;
                    }

                    // 2. FRESH LIQUID BLOOD (Cut/Bleeding): Pure bright crimson (R > 140, G < 70, B < 70, R > G * 2.2, R > B * 2.2)
                    if (r > 140 && g < 70 && b < 70 && r > g * 2.2 && r > b * 2.2) {
                        freshLiquidBlood++;
                    }

                    // 3. BURN MARK: Brownish/Purplish dark discolored charred skin (R = 95..165, G = 45..105, B = 45..105, R > G * 1.15)
                    if (r > 95 && r < 165 && g > 45 && g < 105 && b > 45 && b < 105 && r > g * 1.15) {
                        burnCharredSkin++;
                    }

                    // 4. SKIN RASH / INFECTION / ECZEMA: Pinkish/Reddish skin with G > 75 (R > 145, G > 75, R > G * 1.15)
                    if (r > 145 && g > 75 && r > g * 1.15 && r > b * 1.15) {
                        rashInflamedSkin++;
                    }

                    // 5. Human skin tone (Tan / Peach / Brown skin)
                    if (r > 115 && g > 75 && b > 50 && r > g && g > b) {
                        skinPixels++;
                    }
                }

                const greenRatio = greenPixels / pixelCount;
                const bloodRatio = freshLiquidBlood / pixelCount;
                const burnRatio = burnCharredSkin / pixelCount;
                const rashRatio = rashInflamedSkin / pixelCount;
                const skinRatio = skinPixels / pixelCount;

                // Priority 1: Green Nature / Trees / Plants -> Non-Medical
                if (greenRatio > 0.05) {
                    return resolve('non_medical');
                }

                // Priority 2: Fresh Liquid Blood -> Cut & Bleeding Wound
                if (bloodRatio > 0.006) {
                    return resolve('cut_bleed');
                }

                // Priority 3: Burn Mark -> Burn Injury
                if (burnRatio > 0.06 || (burnRatio > 0.03 && bloodRatio < 0.003)) {
                    return resolve('burn');
                }

                // Priority 4: Skin Rash / Infection / Eczema -> Rash & Allergy
                if (rashRatio > 0.012 || (skinRatio > 0.10 && rashRatio > 0.004)) {
                    return resolve('rash');
                }

                // Priority 5: Insect Bite Mark
                if (skinRatio > 0.12 && (bloodRatio > 0.001 || burnRatio > 0.02)) {
                    return resolve('insect_bite');
                }

                // Priority 6: General Skin Photo / Health Concern -> General Analysis (undefined)
                if (skinRatio > 0.15) {
                    return resolve(undefined);
                }

                // Priority 7: Non-Medical Object (Car, Food, Furniture, Wallpaper)
                return resolve('non_medical');
            } catch (e) {
                resolve(undefined);
            }
        };
        img.onerror = () => resolve(undefined);
        img.src = dataUrl;
    });
}

export default function AIChatbot({ onSelectDoctorAndBook, onBookAmbulance }: AIChatbotProps) {
    const { t, language } = useLanguage();
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [inputQuery, setInputQuery] = React.useState<string>('');
    const [attachedFile, setAttachedFile] = React.useState<File | null>(null);
    const [attachedImagePreview, setAttachedImagePreview] = React.useState<string | null>(null);
    const [selectedCategoryTag, setSelectedCategoryTag] = React.useState<'cut_bleed' | 'burn' | 'insect_bite' | 'rash' | 'non_medical' | null>(null);
    const [isTyping, setIsTyping] = React.useState<boolean>(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const chatEndRef = React.useRef<HTMLDivElement | null>(null);

    const [pendingDoctor, setPendingDoctor] = React.useState<{ docId: string; deptId: string } | null>(null);
    const [feedbackToast, setFeedbackToast] = React.useState<string | null>(null);

    // Handle Thumbs Up (👍) / Thumbs Down (👎) feedback recording in Firestore
    const handleFeedback = async (msgId: string, feedbackType: 'like' | 'dislike') => {
        const targetMsg = messages.find((m) => m.id === msgId);
        if (!targetMsg) return;

        // Find preceding user prompt
        const msgIndex = messages.findIndex((m) => m.id === msgId);
        const userPrompt = msgIndex > 0 ? messages[msgIndex - 1].text : 'General Health Query';

        // Update local state
        setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, feedback: feedbackType } : m))
        );

        // Toast feedback acknowledgement
        const toastMsg = feedbackType === 'dislike'
            ? (language === 'hi'
                ? 'शुक्रिया! आपका फ़ीडबैक AI को सुधारने के लिए chatbot_feedback में रिकॉर्ड कर लिया गया है।'
                : language === 'mr'
                ? 'धन्यवाद! तुमचा अभिप्राय AI सुधारण्यासाठी नोंदवला गेला आहे.'
                : 'Thank you! Your feedback has been recorded in chatbot_feedback to help improve AI accuracy.')
            : (language === 'hi'
                ? 'शुक्रिया! आपकी प्रतिक्रिया के लिए धन्यवाद।'
                : language === 'mr'
                ? 'धन्यवाद!'
                : 'Thank you for your feedback!');

        setFeedbackToast(toastMsg);
        setTimeout(() => setFeedbackToast(null), 4000);

        // Save feedback in Firestore collection `chatbot_feedback`
        try {
            await addDoc(collection(db, 'chatbot_feedback'), {
                prompt: userPrompt,
                aiResponse: targetMsg.text,
                feedback: feedbackType,
                recommendedDoctorId: targetMsg.recommendedDoctorId || null,
                language,
                timestamp: new Date().toISOString(),
                createdAt: serverTimestamp()
            });
        } catch (err) {
            console.warn('Firestore feedback log notice:', err);
        }
    };

    // Initial conversation state
    const [messages, setMessages] = React.useState<ChatMessage[]>([
        {
            id: 'msg-welcome',
            sender: 'bot',
            text: t('bot.welcome'),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);

    // Auto-scroll chat area when new message arrives
    React.useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, isOpen]);

    // Handle Sending User Message with Real Gemini AI Processing
    const handleSendMessage = async (customText?: string) => {
        const textToSend = customText || inputQuery;
        if (!textToSend.trim() && !attachedFile && !attachedImagePreview) return;

        const userMsgId = 'user-' + Date.now();
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const currentImagePreview = attachedImagePreview;
        const fileToAnalyze = attachedFile;
        const currentCategoryTag = selectedCategoryTag;

        const newUserMsg: ChatMessage = {
            id: userMsgId,
            sender: 'user',
            text: textToSend || (attachedFile ? `${t('bot.reportPill')}: ${attachedFile.name}` : ''),
            attachmentName: attachedFile ? attachedFile.name : undefined,
            imageUrl: currentImagePreview || undefined,
            timestamp
        };

        setMessages((prev) => [...prev, newUserMsg]);
        setInputQuery('');
        setAttachedFile(null);
        setAttachedImagePreview(null);
        setSelectedCategoryTag(null);
        setIsTyping(true);

        try {
            // Convert image preview to payload format for Gemini Vision API if present
            let imagePayload: { mimeType: string; data: string; detectedCategory?: 'cut_bleed' | 'burn' | 'insect_bite' | 'rash' | 'non_medical' } | undefined = undefined;
            if (fileToAnalyze && fileToAnalyze.type.startsWith('image/') && currentImagePreview) {
                // Perform fast offscreen canvas pixel color analysis & keyword fusion
                const detectedColor = await analyzeImageColors(currentImagePreview, fileToAnalyze.name, textToSend);

                imagePayload = {
                    mimeType: fileToAnalyze.type,
                    data: currentImagePreview,
                    detectedCategory: currentCategoryTag || detectedColor
                };
            }

            // Call Gemini AI Medical Service with pending doctor context and optional image payload
            const result = await getGeminiHealthResponse(
                textToSend,
                language,
                fileToAnalyze ? fileToAnalyze.name : undefined,
                pendingDoctor || undefined,
                imagePayload
            );

            if (result.pendingDoctorId && result.pendingDeptId) {
                setPendingDoctor({ docId: result.pendingDoctorId, deptId: result.pendingDeptId });
            } else if (result.recommendedDoctorId) {
                setPendingDoctor(null);
            }

            // Check for emergency intent or severe injury photo
            const emergencyKeywords = [
                'ambulance', 'emergency', 'accident', 'chest pain', 'bleeding', 'heart attack',
                'stroke', 'unconscious', 'saans', 'breath', 'blood', 'khoon', 'hospital', 'urgent',
                'एम्बुलेंस', 'इमरजेंसी', 'एक्सीडेंट', 'खून', 'सीने में दर्द', 'सांस'
            ];
            const textLower = textToSend.toLowerCase();
            const isEmergencyQuery = emergencyKeywords.some(kw => textLower.includes(kw));
            const isEmergency = isEmergencyQuery || imagePayload?.detectedCategory === 'cut_bleed' || imagePayload?.detectedCategory === 'burn';

            const botMsg: ChatMessage = {
                id: 'bot-' + Date.now(),
                sender: 'bot',
                text: result.responseText,
                recommendedDoctorId: result.recommendedDoctorId,
                recommendedDeptId: result.recommendedDeptId,
                isEmergencyAlert: isEmergency,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (error) {
            console.error('Error generating AI response:', error);
            const fallbackMsg: ChatMessage = {
                id: 'bot-err-' + Date.now(),
                sender: 'bot',
                text: language === 'hi'
                    ? 'क्षमा करें, AI सेवा से जुड़ने में समस्या हुई। कृपया पुनः प्रयास करें।'
                    : 'Sorry, could not connect to Gemini AI service. Please try again.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages((prev) => [...prev, fallbackMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAttachedFile(file);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAttachedImagePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setAttachedImagePreview(null);
            }
        }
    };

    return (
        <>
            {/* FLOATING TOGGLE BUTTON */}
            <div className="fixed bottom-6 right-6 z-50">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-650 hover:to-teal-800 text-white p-4 rounded-full shadow-2xl flex items-center justify-center border-2 border-white cursor-pointer group"
                    id="ai-chatbot-toggle-btn"
                >
                    <Bot className="h-7 w-7" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold font-sans ml-0 group-hover:ml-2">
                        {t('bot.badge')}
                    </span>
                </motion.button>
            </div>

            {/* CHATBOT MODAL WINDOW */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[80vh] h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-sans"
                        id="ai-chatbot-window"
                    >
                        {/* 1. HEADER BAR */}
                        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shadow">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-teal-600/30 text-teal-400 rounded-2xl border border-teal-500/30">
                                    <Bot className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm sm:text-base leading-tight font-sans text-white">
                                        {t('bot.name')}
                                    </h3>
                                    <div className="flex items-center space-x-2 mt-0.5">
                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] text-teal-300 font-mono">
                                            {t('bot.status')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 2. DISCLAIMER BANNER */}
                        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-[11px] text-amber-800 flex items-start space-x-2">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="leading-tight">{t('bot.disclaimer')}</p>
                        </div>

                        {/* 2.1 FEEDBACK TOAST ACKNOWLEDGEMENT BANNER */}
                        {feedbackToast && (
                            <div className="bg-teal-700 text-white px-4 py-2 text-xs font-medium flex items-center space-x-2 border-b border-teal-800 animate-fadeIn">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                                <span className="truncate">{feedbackToast}</span>
                            </div>
                        )}

                        {/* 3. QUICK ACTION PILLS */}
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center space-x-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => handleSendMessage(language === 'hi' ? '🚨 आपातकालीन स्थिति: मुझे तुरंत एम्बुलेंस चाहिए' : language === 'mr' ? '🚨 तातडीने रुग्णवाहिका पाठवा' : '🚨 Urgent: I need an emergency ambulance dispatch!')}
                                className="px-3 py-1 bg-rose-50 border border-rose-200 hover:border-rose-500 text-rose-700 text-xs font-bold rounded-full shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                            >
                                <Truck className="h-3 w-3 text-rose-600 animate-pulse" />
                                <span>{language === 'hi' ? '🚑 एम्बुलेंस बुक करें' : language === 'mr' ? '🚑 ॲम्ब्युलन्स बुक करा' : '🚑 Book Ambulance'}</span>
                            </button>
                            <button
                                onClick={() => handleSendMessage(language === 'hi' ? 'बच्चे को बुखार और जुकाम है' : language === 'mr' ? 'लहान मुलाला ताप आहे' : 'Child has fever and cough')}
                                className="px-3 py-1 bg-white border border-slate-200 hover:border-teal-500 text-slate-700 text-xs font-medium rounded-full shrink-0 transition-colors shadow-2xs cursor-pointer"
                            >
                                {t('bot.symptomPill')}
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1 bg-white border border-slate-200 hover:border-teal-500 text-slate-700 text-xs font-medium rounded-full shrink-0 transition-colors shadow-2xs cursor-pointer"
                            >
                                {t('bot.reportPill')}
                            </button>
                            <button
                                onClick={() => handleSendMessage(language === 'hi' ? 'घुटने और जोड़ों में दर्द है' : language === 'mr' ? 'सांधेदुखी आणि गुडघेदुखी' : 'Knee pain and joint stiffness')}
                                className="px-3 py-1 bg-white border border-slate-200 hover:border-teal-500 text-slate-700 text-xs font-medium rounded-full shrink-0 transition-colors shadow-2xs cursor-pointer"
                            >
                                {t('bot.findDocPill')}
                            </button>
                        </div>

                        {/* 4. CHAT MESSAGES AREA */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] space-y-2 text-xs sm:text-sm`}>
                                        {/* Message Bubble */}
                                        <div
                                            className={`p-3.5 rounded-2xl shadow-xs leading-relaxed ${
                                                msg.sender === 'user'
                                                    ? 'bg-teal-600 text-white rounded-br-none'
                                                    : 'bg-white text-slate-800 border border-slate-150 rounded-bl-none'
                                            }`}
                                        >
                                            {/* Attached image thumbnail if present */}
                                            {msg.imageUrl && (
                                                <div className="mb-2 rounded-xl overflow-hidden border border-white/20 shadow-xs max-w-[220px]">
                                                    <img
                                                        src={msg.imageUrl}
                                                        alt="Uploaded medical condition photo"
                                                        className="w-full h-auto object-cover max-h-48 rounded-lg"
                                                    />
                                                </div>
                                            )}

                                            {/* Attached file tag if present */}
                                            {msg.attachmentName && !msg.imageUrl && (
                                                <div className="mb-2 p-2 bg-black/10 rounded-lg flex items-center space-x-2 text-xs">
                                                    <FileText className="h-4 w-4 text-teal-200" />
                                                    <span className="font-mono truncate">{msg.attachmentName}</span>
                                                </div>
                                            )}
                                            <p className="whitespace-pre-line">{msg.text}</p>

                                            {/* Recommended Doctor Card inside Bot Bubble */}
                                            {msg.recommendedDoctorId && (
                                                <div className="mt-3 pt-3 border-t border-slate-100 bg-teal-50/60 p-3 rounded-xl border border-teal-100">
                                                    <div className="flex items-center space-x-2 text-teal-800 font-bold text-xs">
                                                        <Stethoscope className="h-4 w-4 text-teal-600" />
                                                        <span>Recommended Sanjeevani Specialist</span>
                                                    </div>
                                                    {(() => {
                                                        const docObj = DOCTORS.find((d) => d.id === msg.recommendedDoctorId);
                                                        if (!docObj) return null;
                                                        return (
                                                            <div className="mt-2 space-y-2">
                                                                <div className="flex items-center space-x-2.5">
                                                                    <img
                                                                        src={docObj.image}
                                                                        alt={docObj.name}
                                                                        className="w-10 h-10 rounded-full object-cover border border-teal-200 shadow-xs"
                                                                    />
                                                                    <div>
                                                                        <p className="font-extrabold text-slate-900 text-xs">
                                                                            {docObj.name}
                                                                        </p>
                                                                        <p className="text-[10px] text-teal-700 font-medium">
                                                                            {t(`doc.${docObj.id}.specialty`) || docObj.specialty}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        onSelectDoctorAndBook(msg.recommendedDeptId || docObj.departmentId, docObj.id);
                                                                        setIsOpen(false);
                                                                    }}
                                                                    className="w-full mt-2 inline-flex items-center justify-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                                                                >
                                                                    <span>{t('bot.bookDoc')}</span>
                                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* Emergency Red Alert Ambulance Dispatch Card */}
                                            {msg.isEmergencyAlert && (
                                                <div className="mt-3 p-3.5 bg-rose-50/90 border-2 border-rose-200 rounded-2xl shadow-sm text-left">
                                                    <div className="flex items-center space-x-2 text-rose-700 font-extrabold text-xs">
                                                        <AlertCircle className="h-4.5 w-4.5 text-rose-600 animate-bounce shrink-0" />
                                                        <span>🚨 Emergency Ambulance Alert</span>
                                                    </div>
                                                    <p className="text-[11px] text-rose-900 mt-1 font-medium leading-relaxed">
                                                        {language === 'hi'
                                                            ? 'क्या आपको तुरंत आपातकालीन एम्बुलेंस चाहिए? लाइव जीपीएस और ड्राइवर डिस्पैच के लिए नीचे बटन पर क्लिक करें!'
                                                            : language === 'mr'
                                                            ? 'तुम्हाला तातडीने रुग्णवाहिका हवी आहे का? लाइव्ह GPS आणि ड्रायव्हर डिस्पॅचसाठी खालील बटणावर क्लिक करा!'
                                                            : 'Need urgent emergency medical transport? Click below for 1-Click Ambulance Dispatch with live GPS tracking!'}
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            if (onBookAmbulance) {
                                                                onBookAmbulance();
                                                            }
                                                            setIsOpen(false);
                                                        }}
                                                        className="w-full mt-2.5 inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold py-2.5 px-3.5 rounded-xl text-xs shadow-md transition-all transform hover:scale-[1.01] cursor-pointer"
                                                    >
                                                        <Truck className="h-4 w-4 text-white animate-pulse" />
                                                        <span>🚨 {language === 'hi' ? 'तुरंत एम्बुलेंस बुक करें' : language === 'mr' ? 'तात्काळ ॲम्ब्युलन्स बुक करा' : 'Dispatch Emergency Ambulance Now'}</span>
                                                        <ArrowRight className="h-3.5 w-3.5 text-white" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* MACHINE LEARNING FEEDBACK LOOP (👍 / 👎) */}
                                            {msg.sender === 'bot' && msg.id !== 'msg-welcome' && (
                                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end text-[11px] text-slate-400">
                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeedback(msg.id, 'like')}
                                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                                                                msg.feedback === 'like'
                                                                    ? 'bg-emerald-100 text-emerald-700 font-bold border border-emerald-300'
                                                                    : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'
                                                            }`}
                                                            title="Thumbs Up (Helpful)"
                                                        >
                                                            <ThumbsUp className="h-3.5 w-3.5" />
                                                            {msg.feedback === 'like' && <span className="text-[9px]">👍 Saved</span>}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeedback(msg.id, 'dislike')}
                                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                                                                msg.feedback === 'dislike'
                                                                    ? 'bg-rose-100 text-rose-700 font-bold border border-rose-300'
                                                                    : 'hover:bg-slate-100 text-slate-400 hover:text-rose-600'
                                                            }`}
                                                            title="Thumbs Down (Report Mistake)"
                                                        >
                                                            <ThumbsDown className="h-3.5 w-3.5" />
                                                            {msg.feedback === 'dislike' && <span className="text-[9px]">👎 Reported</span>}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <span
                                            className={`text-[10px] text-slate-400 font-mono block ${
                                                msg.sender === 'user' ? 'text-right' : 'text-left'
                                            }`}
                                        >
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Typing Animation */}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-150 p-3 rounded-2xl rounded-bl-none shadow-xs flex items-center space-x-2.5">
                                        <Loader2 className="h-4 w-4 text-teal-600 animate-spin shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-teal-700 font-mono">
                                                Analyzing with Gemini Vision AI...
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                Scanning injury & calculating first-aid safety rules
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* 5. ATTACHMENT / IMAGE PREVIEW TAG & TRIAGE SELECTOR */}
                        {(attachedFile || attachedImagePreview) && (
                            <div className="bg-teal-50/90 px-3.5 py-2.5 border-t border-teal-100 flex flex-col space-y-2 text-xs text-teal-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 truncate">
                                        {attachedImagePreview ? (
                                            <img
                                                src={attachedImagePreview}
                                                alt="Preview"
                                                className="w-10 h-10 rounded-xl object-cover border border-teal-300 shrink-0 shadow-xs"
                                            />
                                        ) : (
                                            <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                                        )}
                                        <div className="truncate">
                                            <p className="font-mono text-xs font-bold text-teal-900 truncate">
                                                {attachedFile?.name || 'Medical Photo'}
                                            </p>
                                            <p className="text-[10px] text-teal-600 font-mono">
                                                {attachedImagePreview ? '📷 Vision AI Image Ready' : '📄 Document Attached'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setAttachedFile(null);
                                            setAttachedImagePreview(null);
                                            setSelectedCategoryTag(null);
                                        }}
                                        className="text-teal-600 hover:text-teal-900 font-bold ml-2 cursor-pointer p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Optional Category Selector Pills for 100% Exact Result */}
                                {attachedImagePreview && (
                                    <div className="pt-1 border-t border-teal-100/60 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                                        <span className="text-[10px] font-bold text-teal-900 shrink-0 mr-1">Triage:</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategoryTag('cut_bleed')}
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors shrink-0 cursor-pointer ${
                                                selectedCategoryTag === 'cut_bleed'
                                                    ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-rose-400'
                                            }`}
                                        >
                                            🩸 Cut / Bleed
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategoryTag('insect_bite')}
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors shrink-0 cursor-pointer ${
                                                selectedCategoryTag === 'insect_bite'
                                                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                                            }`}
                                        >
                                            🦟 Insect Bite
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategoryTag('burn')}
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors shrink-0 cursor-pointer ${
                                                selectedCategoryTag === 'burn'
                                                    ? 'bg-orange-600 text-white border-orange-700 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-orange-400'
                                            }`}
                                        >
                                            🔥 Burn Mark
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategoryTag('rash')}
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors shrink-0 cursor-pointer ${
                                                selectedCategoryTag === 'rash'
                                                    ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-purple-400'
                                            }`}
                                        >
                                            🌸 Rash
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategoryTag('non_medical')}
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors shrink-0 cursor-pointer ${
                                                selectedCategoryTag === 'non_medical'
                                                    ? 'bg-slate-700 text-white border-slate-800 shadow-2xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                            }`}
                                        >
                                            🚗 Not Medical
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 6. INPUT BAR */}
                        <div className="p-3 bg-white border-t border-slate-150 flex items-center space-x-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.txt"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                title={t('bot.uploadReport')}
                            >
                                <Paperclip className="h-5 w-5" />
                            </button>

                            <input
                                type="text"
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSendMessage();
                                }}
                                placeholder={t('bot.placeholder')}
                                className="flex-1 bg-slate-100 text-slate-800 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-transparent focus:border-teal-500 focus:bg-white focus:outline-none transition-all"
                            />

                            <button
                                type="button"
                                onClick={() => handleSendMessage()}
                                className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow transition-colors cursor-pointer"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
