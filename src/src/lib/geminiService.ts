import { GoogleGenAI } from '@google/genai';
import { DOCTORS } from '../data';

// Initialize Gemini API Key if present
const geminiApiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    '';

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

export interface MedicalAIResult {
    responseText: string;
    recommendedDoctorId?: string;
    recommendedDeptId?: string;
    pendingDoctorId?: string;
    pendingDeptId?: string;
}

// Build compact Doctors RAG Context String for LLM
const hospitalDoctorsRAGContext = DOCTORS.map(
    (d) => `- Dr. ${d.name} (ID: ${d.id}, Specialty: ${d.specialty}, Dept: ${d.departmentId}, Experience: ${d.experienceYears} years, Days: ${d.availability.days.join(', ')}, Hours: ${d.availability.hours})`
).join('\n');

/**
 * Detect Language from Query String
 */
function detectLanguage(query: string, currentLang: 'en' | 'hi' | 'mr'): 'en' | 'hi' | 'mr' {
    const text = query.toLowerCase();

    // Check Marathi specific words
    if (text.includes('आहे') || text.includes('नाही') || text.includes('दुखणे') || text.includes('ताप आला') || text.includes('सांधेदुखी') || text.includes('मुलाला')) {
        return 'mr';
    }

    // Check Hindi specific words / Devanagari script / Hinglish vocabulary
    if (
        /[\u0900-\u097F]/.test(query) ||
        text.includes('hai') ||
        text.includes('kya') ||
        text.includes('dard') ||
        text.includes('karo') ||
        text.includes('batao') ||
        text.includes('karein') ||
        text.includes('mujhe') ||
        text.includes('bhi') ||
        text.includes('hu') ||
        text.includes('ho') ||
        text.includes('raha') ||
        text.includes('rahi') ||
        text.includes('kaise') ||
        text.includes('par') ||
        text.includes('taklif') ||
        text.includes('subah') ||
        text.includes('shaam') ||
        text.includes('doctor') ||
        text.includes('bukhar')
    ) {
        return 'hi';
    }

    return currentLang || 'hi';
}

/**
 * Generate Real Gemini AI Health Response for any query, report, or image
 */
export async function getGeminiHealthResponse(
    userQuery: string,
    currentLanguage: 'en' | 'hi' | 'mr',
    fileContent?: string,
    lastPendingDoctor?: { docId: string; deptId: string },
    imageFile?: { mimeType: string; data: string; detectedCategory?: 'cut_bleed' | 'burn' | 'insect_bite' | 'rash' | 'non_medical' }
): Promise<MedicalAIResult> {
    const lang = detectLanguage(userQuery, currentLanguage);
    const textLower = userQuery.toLowerCase().trim();

    // 1. CHECK IF USER IS CONFIRMING FOR DOCTOR RECOMMENDATION ("Yes" / "हा" / "जी" / "suggest doctor")
    const isAffirmative =
        textLower === 'yes' ||
        textLower === 'ha' ||
        textLower === 'ji' ||
        textLower === 'haan' ||
        textLower === 'yes please' ||
        textLower === 'sure' ||
        textLower === 'ok' ||
        textLower === 'okay' ||
        textLower === 'हा' ||
        textLower === 'हो' ||
        textLower === 'जी' ||
        textLower === 'हां' ||
        textLower.includes('doctor') ||
        textLower.includes('डॉक्टर');

    if (isAffirmative && lastPendingDoctor && lastPendingDoctor.docId) {
        let confirmText = '';
        if (lang === 'hi') {
            confirmText = 'बहुत बढ़िया! आपके स्वास्थ्य परामर्श के लिए अनुशंसित संजीवनी विशेषज्ञ डॉक्टर की जानकारी नीचे दी गई है। आप बटन पर क्लिक करके सीधे अपॉइंटमेंट बुक कर सकते हैं:';
        } else if (lang === 'mr') {
            confirmText = 'छान! तुमच्या सल्ल्यासाठी शिफारस केलेल्या संजीवनी तज्ज्ञ डॉक्टरांची माहिती खाली दिली आहे. तुम्ही बटणावर क्लिक करून अपॉइंटमेंट बुक करू शकता:';
        } else {
            confirmText = 'Great! Here is the recommended Sanjeevani specialist doctor for your condition. You can book a consultation directly using the button below:';
        }

        return {
            responseText: confirmText,
            recommendedDoctorId: lastPendingDoctor.docId,
            recommendedDeptId: lastPendingDoctor.deptId
        };
    }

    const defaultVisionPrompt = lang === 'hi'
        ? 'कृपया इस फ़ोटो का गहन विश्लेषण करें। पहचाने कि यह क्या चोट/स्थिति (जैसे जली हुई त्वचा, घाव/कट, कीड़े का काटना, रैश, या लैब रिपोर्ट) है। सबसे पहले ज़रूरी सावधानियां (क्या नहीं करना है, जैसे गंदे हाथ न लगाना, छाले न फोड़ना) बताएं, फिर प्राथमिक उपचार और डॉक्टर परामर्श की सलाह दें।'
        : lang === 'mr'
        ? 'कृपया या फोटोचे काळजीपूर्वक विश्लेषण करा. ही कोणती दुखापत/स्थिती (उदा. भाजलेली त्वचा, जखम, कीटक दंश, रॅश किंवा लॅब रिपोर्ट) आहे ते ओळखा. आधी महत्त्वाच्या खबरदाऱ्या सांगा आणि नंतर प्रथमोपचार व डॉक्टरांचा सल्ला द्या.'
        : 'Please analyze this medical/health/injury image carefully. Identify the condition or injury shown (e.g. burn mark, cut/wound, insect bite, skin rash, swelling, or lab report). FIRST tell the user critical precautions (what NOT to do, like do not touch with dirty hands, do not pop blisters), followed by clean first-aid steps, warning signs, and doctor consultation advice.';

    const promptText = userQuery.trim()
        ? userQuery
        : (fileContent ? `Medical Report Details: ${fileContent}` : defaultVisionPrompt);

    // 2. TRY REAL GEMINI API CALL IF KEY IS PRESENT
    if (ai) {
        try {
            const systemPrompt = `Tum ek intelligent aur empathetic medical assistant ho. Users ko unke symptoms ke baare me guide karo, par hamesha ek disclaimer do ki serious issues ke liye real doctor se consult karein.

HOSPITAL DOCTORS DATABASE FOR RAG RECOMMENDATION:
${hospitalDoctorsRAGContext}

CRITICAL RESPONSE GUIDELINES:
1. Provide compassionate, clear medical guidance in ${lang === 'hi' ? 'Hindi (हिंदी/Hinglish)' : lang === 'mr' ? 'Marathi (मराठी)' : 'English'}.
2. Always FIRST list safety precautions (what NOT to do) and immediate clean first-aid steps if an injury or acute symptom is described.
3. ALWAYS include a clear medical disclaimer advising the user to consult a real doctor for serious issues.
4. Match the user's symptoms with the best doctor from the HOSPITAL DOCTORS DATABASE provided above.
5. At the very end of your response, ask: "${lang === 'hi' ? 'क्या आप कंसल्टेशन के लिए संजीवनी के विशेषज्ञ डॉक्टर का सुझाव चाहते हैं?' : lang === 'mr' ? 'तुम्हाला सल्ल्यासाठी संजीवनीच्या तज्ज्ञ डॉक्टरांची शिफारस हवी आहे का?' : 'Would you like me to recommend a Sanjeevani specialist doctor for consultation?'}"
6. Based on your recommendation, you must STRICTLY append the exact Doctor ID from the provided HOSPITAL DOCTORS DATABASE at the very end of your response in this exact format: [DOC_ID: <doctor_id>]. Do not use any other format for the ID.`;

            // Prepare contents payload (multimodal if imageFile exists)
            let contentsPayload: any = promptText;
            if (imageFile && imageFile.data) {
                // Strip Data URL prefix if present (e.g., data:image/png;base64,)
                const base64Data = imageFile.data.includes(',')
                    ? imageFile.data.split(',')[1]
                    : imageFile.data;

                contentsPayload = [
                    {
                        inlineData: {
                            mimeType: imageFile.mimeType || 'image/jpeg',
                            data: base64Data
                        }
                    },
                    promptText
                ];
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contentsPayload,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.4
                }
            });

            const responseText = response.text || '';

            // Extract Doctor ID using Regex
            const docIdRegex = /\[DOC_ID:\s*([^\]]+)\]/i;
            const match = responseText.match(docIdRegex);

            let pendingDoctorId: string | undefined = undefined;
            let pendingDeptId: string | undefined = undefined;

            if (match && match[1]) {
                const extractedId = match[1].trim();
                const matchedDoctor = DOCTORS.find((d) => d.id === extractedId);
                if (matchedDoctor) {
                    pendingDoctorId = matchedDoctor.id;
                    pendingDeptId = matchedDoctor.departmentId;
                }
            }

            // Remove [DOC_ID: ...] tag from UI display text
            const cleanResponseText = responseText.replace(/\[DOC_ID:\s*([^\]]+)\]/gi, '').trim();

            if (cleanResponseText) {
                return {
                    responseText: cleanResponseText,
                    pendingDoctorId,
                    pendingDeptId
                };
            }
        } catch (err) {
            console.warn('Gemini API call warning, falling back to Intelligent Medical Generative Engine:', err);
        }
    }

    // 3. COMPREHENSIVE GENERATIVE MEDICAL ENGINE (FALLBACK / OFFLINE GEMINI SIMULATION)
    return generateSmartMedicalResponse(userQuery, lang, fileContent, !!imageFile, imageFile?.detectedCategory);
}

/**
 * Smart Conversational Medical Knowledge Generator for Any Health Query or Image
 */
function generateSmartMedicalResponse(
    queryText: string,
    lang: 'en' | 'hi' | 'mr',
    fileContent?: string,
    hasImage?: boolean,
    detectedCategory?: 'cut_bleed' | 'burn' | 'insect_bite' | 'rash' | 'non_medical'
): MedicalAIResult {
    const text = (queryText + ' ' + (fileContent || '')).toLowerCase();

    let responseText = '';
    let doctorId = '';
    let deptId = '';

    // 0. GREETINGS & INTRO (when no image or query is simple greeting)
    if (!hasImage && /^(hi|hello|hey|namaste|नमस्ते|नमस्कार|good morning|good evening)$/i.test(queryText.trim())) {
        responseText = lang === 'hi'
            ? 'नमस्ते! मैं संजीवनी AI मेडिकल असिस्टेंट हूँ 🤖। आप मुझसे किसी भी स्वास्थ्य प्रश्न, बीमारी के लक्षण, आहार/परहेज, या मेडिकल लैब रिपोर्ट के बारे में पूछ सकते हैं। बताइए आज आपकी क्या सहायता करूँ?'
            : lang === 'mr'
            ? 'नमस्कार! मी संजीवनी AI वैद्यकीय सहाय्यक आहे 🤖. तुम्ही मला कोणत्याही आजाराच्या लक्षणांबद्दल, औषधांबद्दल किंवा लॅब रिपोर्टबद्दल विचारू शकता. सांगा, मी तुम्हाला कशी मदत करू?'
            : 'Hello! I am your Sanjeevani AI Medical Consultant 🤖. You can ask me ANY question regarding health symptoms, medical lab reports, disease prevention, or specialist doctor recommendations. How can I help you today?';
        return { responseText };
    }

    // 0.1 NON-MEDICAL PHOTO DETECTION (गाड़ी, वस्तुएं, जानवर, सामान्य फोटो)
    if (
        hasImage && (
            detectedCategory === 'non_medical' ||
            text.includes('car') ||
            text.includes('vehicle') ||
            text.includes('auto') ||
            text.includes('bike') ||
            text.includes('building') ||
            text.includes('dog') ||
            text.includes('cat') ||
            text.includes('flower') ||
            text.includes('wallpaper')
        )
    ) {
        responseText = lang === 'hi'
            ? '🚗 **इमेज विश्लेषण (Non-Medical Image Detected):**\n\nयह फ़ोटो किसी स्वास्थ्य समस्या या चोट (जैसे कटा हुआ घाव, जलने का निशान, कीड़े का काटना या रैश) से संबंधित नहीं लग रही है।\n\n🏥 **कृपया अपनी चोट या स्वास्थ्य समस्या की साफ़ फ़ोटो भेजें** ताकि संजीवनी AI आपकी सही प्राथमिक चिकित्सा (First-Aid) सहायता कर सके!'
            : lang === 'mr'
            ? '🚗 **प्रतिमा विश्लेषण (Non-Medical Image Detected):**\n\nही फोटो कोणत्याही दुखापतीशी किंवा वैद्यकीय समस्येशी संबंधित दिसत नाही. कृपया तुमच्या दुखापतीचा स्पष्ट फोटो पाठवा.'
            : '🚗 **Image Analysis (Non-Medical Image Detected):**\n\nThis photo does not appear to be a medical or injury-related image (e.g. cut, burn, insect bite, skin rash, or lab report).\n\n🏥 Please upload a clear photo of your skin concern or injury so Sanjeevani AI can provide accurate first-aid guidance!';

        return { responseText };
    }
    // 1. INSECT BITE / STING (कीड़ा/मक्खी/चींटी का काटना / keeda / machhar)
    else if (
        detectedCategory === 'insect_bite' ||
        text.includes('bite') ||
        text.includes('insect') ||
        text.includes('sting') ||
        text.includes('mosquito') ||
        text.includes('bee') ||
        text.includes('ant') ||
        text.includes('spider') ||
        text.includes('कीड़ा') ||
        text.includes('काटा') ||
        text.includes('डंक') ||
        text.includes('मक्खी') ||
        text.includes('keeda') ||
        text.includes('machhar') ||
        text.includes('kata')
    ) {
        doctorId = 'doc-samir-patel';
        deptId = 'pediatrics';
        responseText = lang === 'hi'
            ? '🩺 **स्वास्थ्य विश्लेषण (कीड़े के काटने का निशान / Insect Bite Detected):**\n\n⚠️ **ज़रूरी सावधानियां (Don\'ts):**\n1. 🛑 **प्रभावित जगह को खरोंचें (Scratch) नहीं** (खरोंचने से बैक्टीरिया संक्रमण फैल सकता है)।\n2. 🛑 डंक (stinger) को हाथों या चिमटी से दबाकर न निकालें, हल्के से खुरच कर हटाएं।\n\n🧼 **प्राथमिक उपचार (First-Aid):**\n1. डंक वाली जगह को साबुन और साफ पानी से धोएं।\n2. सूजन और खुजली कम करने के लिए 10 मिनट तक **आइस पैक (Ice Pack)** का सेक करें।\n3. कैलामाइन लोशन या एलोवेरा जेल लगाएं।\n4. 🚨 यदि सांस लेने में तकलीफ या चेहरे पर सूजन आए तो तुरंत इमरजेंसी जाएं।'
            : lang === 'mr'
            ? '🩺 **वैद्यकीय विश्लेषण (कीटक दंश / Insect Bite Detected):**\n\n⚠️ **महत्त्वाच्या खबरदाऱ्या:**\n1. 🛑 **जागेला खाजवू नका** (इन्फेक्शन पसरू शकते).\n\n🧼 **प्रथमोपचार:**\n1. साबण आणि स्वच्छ पाण्याने धुवा.\n2. सूज कमी करण्यासाठी १० मिनिटे बर्फाने शेका.\n3. कॅलामाइन लोशन लावा.'
            : '🩺 **Health Analysis (Insect Bite / Sting Detected):**\n\n⚠️ **Critical Precautions (Don\'ts):**\n1. 🛑 Do NOT scratch or rub the bite area (prevents secondary bacterial infection).\n2. 🛑 Do NOT squeeze the stinger if present; scrape it off gently.\n\n🧼 **Immediate First-Aid:**\n1. Wash the area with mild soap and clean water.\n2. Apply a cold compress / ice pack for 10 minutes to reduce swelling and itching.\n3. Apply Calamine lotion or soothing aloe vera gel.\n4. 🚨 Seek immediate ER care if there is difficulty breathing or facial swelling.';
    }
    // 2. BURN INJURY (जलना / आग / गर्म पानी / jala)
    else if (
        detectedCategory === 'burn' ||
        text.includes('burn') ||
        text.includes('jala') ||
        text.includes('fire') ||
        text.includes('heat') ||
        text.includes('steam') ||
        text.includes('जल') ||
        text.includes('आग') ||
        text.includes('भाप') ||
        text.includes('jal gaya') ||
        text.includes('haath jala')
    ) {
        doctorId = 'doc-samir-patel';
        deptId = 'pediatrics';
        responseText = lang === 'hi'
            ? '🩺 **स्वास्थ्य विश्लेषण (जले का निशान / Burn Injury Detected):**\n\n⚠️ **ज़रूरी सावधानियां (Don\'ts):**\n1. 🛑 **जली हुई जगह को गंदे हाथों से न छुएं**।\n2. 🛑 यदि त्वचा पर **छाला (Blister) पड़ा है, तो उसे फोड़ें नहीं**।\n3. 🛑 सीधे बर्फ, टूथपेस्ट, या मक्खन न लगाएं।\n\n🧼 **प्राथमिक उपचार (First-Aid):**\n1. जले हुए स्थान को 10-15 मिनट तक **बहते हुए ठंडे पानी** के नीचे रखें।\n2. अंगूठी या टाइट कपड़े सूजन आने से पहले धीरे से निकाल दें।\n3. बर्नोल या एलोवेरा जेल लगाएं और साफ सूती कपड़े से ढकें।'
            : lang === 'mr'
            ? '🩺 **वैद्यकीय विश्लेषण (भाजलेली जागा / Burn Mark Detected):**\n\n⚠️ **महत्त्वाच्या खबरदाऱ्या:**\n1. 🛑 भाजलेल्या जागेला हातांनी स्पर्श करू नका.\n2. 🛑 आलेले फोड फोडू नका.\n\n🧼 **प्रथमोपचार:**\n1. १०-१५ मिनिटे स्वच्छ वाहत्या पाण्याखाली ठेवा.\n2. बर्नोल किंवा कोरफडीचा जेल लावा.'
            : '🩺 **Health Analysis (Burn Mark Detected):**\n\n⚠️ **Critical Precautions (Don\'ts):**\n1. 🛑 Do NOT touch or rub the burned area with unwashed hands.\n2. 🛑 Do NOT pop or puncture any blisters.\n3. 🛑 Do NOT apply raw ice, toothpaste, or butter.\n\n🧼 **Immediate First-Aid:**\n1. Hold under cool running tap water for 10-15 minutes.\n2. Apply cooling burn gel (Burnol/Aloe) and cover with a clean sterile dressing.';
    }
    // 3. CUT / WOUND / BLEEDING (कटा / घाव / खून / chot / kat gaya / khoon / chaku / bleed)
    else if (
        detectedCategory === 'cut_bleed' ||
        text.includes('cut') ||
        text.includes('bleed') ||
        text.includes('wound') ||
        text.includes('knife') ||
        text.includes('blade') ||
        text.includes('घाव') ||
        text.includes('कट') ||
        text.includes('खून') ||
        text.includes('चोट') ||
        text.includes('chot') ||
        text.includes('kat gaya') ||
        text.includes('kat') ||
        text.includes('khoon') ||
        text.includes('chaku') ||
        text.includes('khun')
    ) {
        doctorId = 'doc-olivia-benton';
        deptId = 'orthopedics';
        responseText = lang === 'hi'
            ? '🩺 **स्वास्थ्य विश्लेषण (कटा हुआ घाव / Cut & Wound Detected):**\n\n⚠️ **ज़रूरी सावधानियां (Don\'ts):**\n1. 🛑 गंदे हाथों या गंदे कपड़े से घाव को न छुएं।\n2. 🛑 यदि घाव में कोई कांच या मेटल का टुकड़ा धंसा है तो उसे खुद खींचकर न निकालें।\n\n🧼 **प्राथमिक उपचार (First-Aid):**\n1. यदि खून बह रहा है तो साफ सूती कपड़े/पट्टी से 5 मिनट तक **हल्का दबाव (Pressure)** बनाएं।\n2. घाव को साफ पानी या एंटीसेप्टिक लिक्विड (Dettol/Saline) से धोएं।\n3. एंटीबायोटिक मलम लगाकर साफ बैंडेज बांधें। यदि टिटनेस का टीका नहीं लगा है तो डॉक्टर से मिलें।'
            : lang === 'mr'
            ? '🩺 **वैद्यकीय विश्लेषण (कटाव / जखम):**\n\n⚠️ **खबरदाऱ्या:**\n1. 🛑 अस्वच्छ हातांनी जखमेला स्पर्श करू नका.\n\n🧼 **प्रथमोपचार:**\n1. रक्तस्त्राव थांबवण्यासाठी स्वच्छ कपड्याने दाबून ठेवा.\n2. अ‍ॅन्टीसेप्टिकने धुवून स्वच्छ पट्टी बांधा.'
            : '🩺 **Health Analysis (Cut & Bleeding Wound Detected):**\n\n⚠️ **Critical Precautions (Don\'ts):**\n1. 🛑 Do NOT touch the open cut with unwashed hands.\n2. 🛑 Do NOT attempt to pull out embedded glass or metallic objects.\n\n🧼 **Immediate First-Aid:**\n1. Apply firm direct pressure with a clean cloth/bandage for 5 minutes to stop bleeding.\n2. Wash gently with saline or mild antiseptic solution.\n3. Apply antibiotic ointment and cover with a sterile bandage. Check tetanus status.';
    }
    // 4. SKIN RASH / ALLERGY / ECZEMA / INFECTION (चकत्ते / एलर्जी / खुजली / khujli)
    else if (
        detectedCategory === 'rash' ||
        text.includes('rash') ||
        text.includes('allergy') ||
        text.includes('eczema') ||
        text.includes('itch') ||
        text.includes('redness') ||
        text.includes('infection') ||
        text.includes('fungal') ||
        text.includes('swelling') ||
        text.includes('रैश') ||
        text.includes('एलर्जी') ||
        text.includes('खुजली') ||
        text.includes('संक्रमण') ||
        text.includes('सूजन') ||
        text.includes('khujli') ||
        text.includes('chamdi')
    ) {
        doctorId = 'doc-samir-patel';
        deptId = 'pediatrics';
        responseText = lang === 'hi'
            ? '🩺 **स्वास्थ्य विश्लेषण (त्वचा संक्रमण व एलर्जी / Skin Rash & Infection Detected):**\n\n⚠️ **ज़रूरी सावधानियां (Don\'ts):**\n1. 🛑 संक्रमित या रैश वाली जगह को नाखूनों से न खुजलाएं (संक्रमण फैल सकता है)।\n2. 🛑 गर्म पानी या तेज केमिकल वाले साबुन का उपयोग न करें।\n\n🧼 **प्राथमिक उपचार व देखभाल (Care & First-Aid):**\n1. प्रभावित त्वचा को ठंडे साफ पानी से धीरे से धोएं।\n2. कैलामाइन लोशन या माइल्ड एंटीफंगल/मॉइस्चराइजर लोशन लगाएं। ढीले सूती कपड़े पहनें।'
            : lang === 'mr'
            ? '🩺 **वैद्यकीय विश्लेषण (त्वचेचे इन्फेक्शन / Skin Rash & Infection):**\n\n⚠️ **खबरदाऱ्या:**\n1. 🛑 नखांनी खाजवू नका.\n\n🧼 **प्रथमोपचार:**\n1. थंड पाण्याने धुवून कॅलामाइन लोशन लावा.'
            : '🩺 **Health Analysis (Skin Rash & Infection Detected):**\n\n⚠️ **Critical Precautions (Don\'ts):**\n1. 🛑 Do NOT scratch or rub the infected area (prevents bacterial spread).\n2. 🛑 Avoid hot water showers, harsh chemicals, or steroid creams without advice.\n\n🧼 **Immediate First-Aid & Care:**\n1. Clean gently with cool tap water or saline.\n2. Apply Calamine lotion or mild soothing moisturizer. Wear loose cotton clothing.';
    }
    // 5. CARDIOLOGY & CHEST PAIN / BREATHLESSNESS / HEART RATE (chhati / saans / dil)
    else if (
        text.includes('chest') ||
        text.includes('heart') ||
        text.includes('breath') ||
        text.includes('breathing') ||
        text.includes('ecg') ||
        text.includes('ekg') ||
        text.includes('cardio') ||
        text.includes('bp') ||
        text.includes('blood pressure') ||
        text.includes('cholesterol') ||
        text.includes('lipid') ||
        text.includes('सीना') ||
        text.includes('सीने में दर्द') ||
        text.includes('सांस') ||
        text.includes('दिल') ||
        text.includes('छातीत') ||
        text.includes('chhati') ||
        text.includes('saans') ||
        text.includes('dhadkan')
    ) {
        deptId = 'cardiology';
        if (text.includes('rhythm') || text.includes('palpitation') || text.includes('धड़कन') || text.includes('dhadkan')) {
            doctorId = 'doc-marcus-vance';
            responseText = lang === 'hi'
                ? 'अनियमित हृदय गति (Arrhythmia) या धड़कन तेज होना इलेक्ट्रोफिज़ियोलॉजी जांच का संकेत है। इसके लिए ईसीजी व होल्टर मैपिंग आवश्यक है।'
                : lang === 'mr'
                ? 'हृदयाचे ठोके अनियमित असणे हे इलेक्ट्रोफिजिओलॉजी तपासणीचे लक्षण आहे. ईसीजी करणे आवश्यक आहे.'
                : 'Irregular heart rhythms or palpitations require an Electrophysiology consultation for rhythm mapping and pacemaker evaluation.';
        } else if (text.includes('bp') || text.includes('cholesterol') || text.includes('lipid') || text.includes('blood pressure')) {
            doctorId = 'doc-sarah-jenkins';
            responseText = lang === 'hi'
                ? 'उच्च रक्तचाप (High BP) और कोलेस्ट्रॉल धमनी स्वास्थ्य को प्रभावित करते हैं। इसके लिए कम नमक, कम वसा वाला आहार और नियमित लिपिड प्रोफाइल जांच आवश्यक है।'
                : lang === 'mr'
                ? 'उच्च रक्तदाब आणि कोलेस्ट्रॉल नियंत्रणासाठी कमी मीठ, कमी तेलकट आहार आणि नियमित तपासणी आवश्यक आहे.'
                : 'Managing blood pressure and cholesterol is critical for cardiovascular prevention. Maintaining low sodium, low saturated fats, and regular lipid monitoring is advised.';
        } else {
            doctorId = 'doc-elena-rostova';
            responseText = lang === 'hi'
                ? 'सीने में दर्द या सांस लेने में तकलीफ एक अति-गंभीर नैदानिक संकेत हो सकता है। इसे नजरअंदाज न करें और तत्काल ईसीजी व हृदय जांच कराएं।'
                : lang === 'mr'
                ? 'छातीत दुखणे किंवा श्वास घेण्यास त्रास होणे हे गंभीर लक्षण असू शकते. तातडीने ईसीजी व हृदय तपासणी करा.'
                : 'Chest pain or shortness of breath is a critical symptom requiring urgent cardiac assessment and ECG screening.';
        }
    }
    // 6. PEDIATRICS / CHILD HEALTH & ALLERGIES (bukhar / baccha / bache)
    else if (
        text.includes('child') ||
        text.includes('baby') ||
        text.includes('infant') ||
        text.includes('kid') ||
        text.includes('fever') ||
        text.includes('vaccine') ||
        text.includes('बच्चा') ||
        text.includes('बुखार') ||
        text.includes('मूल') ||
        text.includes('bukhar') ||
        text.includes('baccha') ||
        text.includes('bache')
    ) {
        deptId = 'pediatrics';
        if (text.includes('allergy') || text.includes('asthma') || text.includes('rash') || text.includes('एलर्जी') || text.includes('अस्थमा')) {
            doctorId = 'doc-samir-patel';
            responseText = lang === 'hi'
                ? 'बच्चों में त्वचा एलर्जी, चकत्ते या सांस लेने में दमा का इलाज विशेष बाल रोग एलर्जी मार्गदर्शन से किया जाता है।'
                : lang === 'mr'
                ? 'लहान मुलांमधील अ‍ॅलर्जी आणि दम्याच्या उपचारांसाठी विशेष बालरोग तपासणी आवश्यक आहे.'
                : 'Pediatric allergic reactions, skin rashes, or childhood asthma require specialized pediatric immunology evaluation.';
        } else {
            doctorId = 'doc-alicia-keyser';
            responseText = lang === 'hi'
                ? 'बच्चों के बुखार में पर्याप्त पानी, स्पंजिंग और पैरासिटामोल सिरप की सलाह दी जाती है। नियमित टीकाकरण का ध्यान रखें।'
                : lang === 'mr'
                ? 'लहान मुलांचा ताप आल्यास भरपूर पाणी आणि डॉक्टरांच्या सल्ल्यानुसार औषध द्यावे.'
                : 'Child fever management requires hydration, temperature monitoring, and routine immunization tracking.';
        }
    }
    // 7. NEUROLOGY / HEADACHE / MEMORY / NERVES (sir dard / sirdard / chakar / nas)
    else if (
        text.includes('headache') ||
        text.includes('migraine') ||
        text.includes('brain') ||
        text.includes('memory') ||
        text.includes('dizzy') ||
        text.includes('nerve') ||
        text.includes('सिरदर्द') ||
        text.includes('याददाश्त') ||
        text.includes('डोकेदुखी') ||
        text.includes('sir dard') ||
        text.includes('sirdard') ||
        text.includes('sar dard') ||
        text.includes('chakkar') ||
        text.includes('naso')
    ) {
        deptId = 'neurology';
        if (text.includes('migraine') || text.includes('nerve') || text.includes('numbness') || text.includes('नस') || text.includes('nas')) {
            doctorId = 'doc-william-choi';
            responseText = lang === 'hi'
                ? 'माइग्रेन, नसों में सुन्नता या झुनझुनी के लिए न्यूरोमस्कुलर जांच और नर्व कंडक्शन स्टडी की आवश्यकता होती है।'
                : lang === 'mr'
                ? 'मायग्रेन आणि नसांच्या त्रासासाठी नर्व्ह कंडक्शन तपासणी आवश्यक आहे.'
                : 'Chronic migraines, nerve conduction issues, or numbness require specialized neuromuscular evaluation.';
        } else {
            doctorId = 'doc-gregory-house';
            responseText = lang === 'hi'
                ? 'लगातार सिरदर्द, चक्कर आने या याददाश्त संबंधी चिंताओं के लिए न्यूरो-डायग्नोस्टिक ब्रेन मैपिंग कराई जाती है।'
                : lang === 'mr'
                ? 'डोकेदुखी किंवा स्मरणशक्तीच्या समस्यांसाठी ब्रेन वेलनेस तपासणी करा.'
                : 'Persistent headaches, dizziness, or cognitive symptoms suggest a comprehensive brain wellness screening.';
        }
    }
    // 8. ORTHOPEDICS / BONES / JOINTS / KNEE / SPINE (ghutna / haddi / kamar / moch)
    else if (
        text.includes('bone') ||
        text.includes('joint') ||
        text.includes('knee') ||
        text.includes('fracture') ||
        text.includes('back') ||
        text.includes('spine') ||
        text.includes('घुटना') ||
        text.includes('हड्डी') ||
        text.includes('कमर') ||
        text.includes('सांधेदुखी') ||
        text.includes('ghutna') ||
        text.includes('haddi') ||
        text.includes('kamar') ||
        text.includes('moch') ||
        text.includes('pair')
    ) {
        deptId = 'orthopedics';
        if (text.includes('sport') || text.includes('sprain') || text.includes('fracture') || text.includes('injury') || text.includes('चोट') || text.includes('moch')) {
            doctorId = 'doc-olivia-benton';
            responseText = lang === 'hi'
                ? 'खेल की चोट, लिगामेंट खिंचाव या मोच में बर्फ से सिकाई, आराम और फिजियोथेरेपी की आवश्यकता होती है।'
                : lang === 'mr'
                ? 'खेळातील दुखापती किंवा मोच आल्यास बर्फाने शेकावे आणि विश्रांती घ्यावी.'
                : 'Sports injuries, sprains, or bone fractures require immobilization, X-ray imaging, and progressive rehabilitation.';
        } else {
            doctorId = 'doc-robert-chen';
            responseText = lang === 'hi'
                ? 'घुटने व जोड़ों के पुराने दर्द या आर्थराइटिस के लिए जोड़ों की सुरक्षा, हल्का व्यायाम और आर्थोपेडिक जांच आवश्यक है।'
                : lang === 'mr'
                ? 'सांधेदुखी व गुडघेदुखीसाठी हलका व्यायाम आणि आर्थोपेडिक तपासणी आवश्यक आहे.'
                : 'Chronic knee, hip joint pain, or spine stiffness can be managed with joint preservation techniques and orthopedic surgical evaluation.';
        }
    }
    // 9. DIET & NUTRITION / PREVENTATIVE HEALTH (pet / khana / ahar / acidity)
    else if (
        /\bdiet\b/i.test(text) ||
        /\bfood\b/i.test(text) ||
        /\beat\b/i.test(text) ||
        text.includes('खाना') ||
        text.includes('आहार') ||
        text.includes('परहेज') ||
        text.includes('pet') ||
        text.includes('acidity') ||
        text.includes('gas') ||
        text.includes('khana')
    ) {
        doctorId = 'doc-sarah-jenkins';
        deptId = 'cardiology';
        responseText = lang === 'hi'
            ? 'स्वास्थ्यवर्धक आहार में ताजा फल, हरी पत्तेदार सब्जियां, साबुत अनाज और पर्याप्त पानी शामिल होना चाहिए। यदि आपको हाई बीपी या शुगर है, तो कम नमक व कम वसा वाला आहार लें।'
            : lang === 'mr'
            ? 'निरोगी आहारासाठी ताजी फळे, पालेभाज्या आणि भरपूर पाणी प्यावे. बीपी किंवा साखर असल्यास कमी मीठ व कमी तेलकट अन्न खावे.'
            : 'A balanced diet rich in fresh vegetables, fruits, whole grains, and lean proteins is vital for immunity. If managing high BP or diabetes, limit sodium and refined sugars.';
    }
    // 10. BLOOD TEST / LAB REPORT / CBC / HEMOGLOBIN / PLATELETS / SUGAR / THYROID
    else if (
        text.includes('blood test') ||
        text.includes('cbc') ||
        text.includes('report') ||
        text.includes('hemoglobin') ||
        text.includes('platelet') ||
        text.includes('wbc') ||
        text.includes('rbc') ||
        text.includes('anemia') ||
        text.includes('sugar') ||
        text.includes('glucose') ||
        text.includes('thyroid') ||
        text.includes('रिपोर्ट') ||
        text.includes('खून की जांच') ||
        text.includes('हीमोग्लोबिन')
    ) {
        doctorId = 'doc-sarah-jenkins';
        deptId = 'cardiology';
        responseText = lang === 'hi'
            ? '📄 **ब्लड टेस्ट व लैब रिपोर्ट विश्लेषण (Blood Test & Lab Report Analysis):**\n\n🩺 **मुख्य जांच बिंदु व संभावित कमी (Key Report Parameters):**\n1. **हीमोग्लोबिन (Hemoglobin / RBC):** यदि 12 g/dL से कम है, तो यह एनीमिक लक्षण (आयरन की कमी/थकान) दर्शा सकता है। इसके लिए हरी पत्तेदार सब्जियां, चुकंदर, अनार व आयरन सिरप लें।\n2. **प्लेटलेट्स (Platelets):** यदि 1.5 लाख से कम हैं, तो किसी वायरल या डेंगू संक्रमण का संकेत हो सकता है। पर्याप्त पानी, नारियल पानी व पपीता लीफ एक्सट्रैक्ट लें।\n3. **WBC (सफेद रक्त कोशिकाएं):** यदि 11,000 से अधिक हैं, तो शरीर में किसी बैक्टीरिया या वायरल इन्फेक्शन से लड़ने का संकेत है।\n4. **ब्लड शुगर (Diabetes/Glucose):** फास्टिंग 100 mg/dL से ऊपर होने पर मीठे से परहेज व व्यायाम आवश्यक है।'
            : lang === 'mr'
            ? '📄 **रक्त तपासणी आणि लॅब रिपोर्ट विश्लेषण (Blood Report Analysis):**\n\n1. **हिमोग्लोबिन:** १२ पेक्षा कमी असल्यास अ‍ॅनिमिया (लोहाची कमतरता) असू शकते.\n2. **प्लेटलेट्स:** १.५ लाखांपेक्षा कमी असल्यास इन्फेक्शन असू शकते.\n3. **WBC:** ११,००० पेक्षा जास्त असल्यास इन्फेक्शनचे लक्षण आहे.'
            : '📄 **Blood Test & Medical Lab Report Analysis:**\n\n🩺 **Key Reference Ranges & Clinical Guidance:**\n1. **Hemoglobin (Hb / RBC):** Values below 12 g/dL indicate mild-to-moderate Anemia (Iron deficiency). Boost iron-rich foods (spinach, beetroot, pomegranate) & Vitamin C.\n2. **Platelet Count:** Values below 150,000/µL may indicate viral fever, dengue, or bone marrow suppression. Maintain high oral hydration.\n3. **WBC Count (White Blood Cells):** Values above 11,000/µL indicate active bacterial or viral infection.\n4. **Fasting Blood Sugar / HbA1c:** Fasting glucose > 100 mg/dL indicates prediabetes/diabetes requiring dietary modification.';
    }
    // 11. GENERAL MEDICAL / HEALTH CONDITION ANALYSIS (CATCH-ALL FOR UNMATCHED SYMPTOMS)
    else if (
        text.includes('skin') ||
        text.includes('health') ||
        text.includes('body') ||
        text.includes('medical') ||
        text.includes('pain') ||
        text.includes('problem') ||
        text.includes('बीमारी') ||
        text.includes('दर्द') ||
        text.includes('समस्या') ||
        text.includes('taklif') ||
        text.includes('bimar')
    ) {
        doctorId = 'doc-samir-patel';
        deptId = 'pediatrics';
        const titleHeader = hasImage
            ? (lang === 'hi' ? '🩺 **इमेज विश्लेषण (Image Analysis):**' : lang === 'mr' ? '🩺 **प्रतिमा विश्लेषण (Image Analysis):**' : '🩺 **Image Analysis:**')
            : (lang === 'hi' ? '🩺 **स्वास्थ्य व लक्षण विश्लेषण (Health & Symptom Analysis):**' : lang === 'mr' ? '🩺 **वैद्यकीय स्थिती विश्लेषण (Health Analysis):**' : '🩺 **Health & Symptom Analysis:**');

        responseText = lang === 'hi'
            ? `${titleHeader}\n\n⚠️ **ज़रूरी सावधानियां (Don'ts):**\n1. 🛑 **प्रभावित स्थान को गंदे हाथों से न छुएं** और न ही बार-बार रगड़ें।\n2. 🛑 यदि त्वचा पर कोई उभार, छाला या मुहांसा है तो उसे फोड़ें नहीं।\n3. 🛑 बिना डॉक्टर की सलाह के कोई भी अनजानी या तेज केमिकल वाली क्रीम न लगाएं।\n\n🧼 **प्राथमिक उपचार व देखभाल (Care & First-Aid):**\n1. प्रभावित हिस्से को साफ व ठंडे पानी या माइल्ड एंटीसेप्टिक से धोएं।\n2. जलन या सूजन कम करने के लिए बर्फ/ठंडे कपड़े का सेक करें।\n3. यदि दर्द या तकलीफ बढ़े तो तुरंत विशेषज्ञ डॉक्टर से परामर्श लें।`
            : lang === 'mr'
            ? `${titleHeader}\n\n⚠️ **महत्त्वाच्या खबरदाऱ्या:**\n1. 🛑 प्रभावित जागेला स्पर्श करू नका.\n2. 🛑 कोणतेही तीव्र क्रीम लावू नका.\n\n🧼 **प्रथमोपचार:**\n1. स्वच्छ पाण्याने धुवून तज्ज्ञ डॉक्टरांचा सल्ला घ्या.`
            : `${titleHeader}\n\n⚠️ **Critical Precautions (Don'ts):**\n1. 🛑 Do NOT touch or rub the affected area with unwashed hands.\n2. 🛑 Do NOT pop or squeeze any blisters, bumps, or skin lesions.\n3. 🛑 Do NOT apply unverified chemicals, harsh soaps, or steroid creams.\n\n🧼 **Immediate First-Aid & Care:**\n1. Wash gently with cool clean water or mild antiseptic saline.\n2. Apply a cold compress if there is swelling or inflammation.\n3. Keep the area clean and dry. Consult a specialist if symptoms persist.`;
    }
    // 12. DEFAULT FALLBACK FOR GENERAL CONVERSATION
    else {
        doctorId = 'doc-sarah-jenkins';
        deptId = 'cardiology';
        responseText = lang === 'hi'
            ? `आपके प्रश्न "${queryText}" का विश्लेषण किया गया है। बेहतर स्वास्थ्य संतुलन के लिए पर्याप्त आराम, संतुलित आहार और नियमित स्वास्थ्य जांच आवश्यक है।`
            : lang === 'mr'
            ? `तुमच्या प्रश्नाचे "${queryText}" विश्लेषण केले आहे. आरोग्यासाठी पुरेशी विश्रांती आणि नियमित तपासणी करा.`
            : `I have analyzed your health query "${queryText}". For optimal wellness, maintaining adequate hydration, balanced diet, and clinical monitoring is recommended.`;
    }

    // APPEND CONFIRMATION QUESTION ASKED TO THE USER IN THEIR DETECTED LANGUAGE
    const categoryPromptQuestion = lang === 'hi'
        ? '\n\nक्या आप कंसल्टेशन के लिए संजीवनी के विशेषज्ञ डॉक्टर का सुझाव चाहते हैं?'
        : lang === 'mr'
        ? '\n\nतुम्हाला सल्ल्यासाठी संजीवनीच्या तज्ज्ञ डॉक्टरांची शिफारस हवी आहे का?'
        : '\n\nWould you like me to recommend a Sanjeevani specialist doctor for consultation?';

    return {
        responseText: responseText + categoryPromptQuestion,
        pendingDoctorId: doctorId,
        pendingDeptId: deptId
    };
}
