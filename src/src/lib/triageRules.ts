export type Language = 'en' | 'hi' | 'mr';

export interface DangerSign {
  id: string;
  label: Record<Language, string>;
  reason: Record<Language, string>;
}

export interface ChiefComplaintOption {
  id: string;
  label: Record<Language, string>;
  iconName: string;
}

export interface AdaptiveQuestion {
  id: string;
  label: Record<Language, string>;
  isHighRisk?: boolean;
}

export interface ClinicInfo {
  name: string;
  doctorInCharge: string;
  distance: string;
  address: string;
  phone: string;
  hours: string;
  services: string[];
}

export type TriageLevel = 'home_care' | 'nearest_clinic' | 'urgent_hospital';

export interface TriageResult {
  level: TriageLevel;
  title: Record<Language, string>;
  reasons: string[];
  nextSteps: string[];
  clinicInfo?: ClinicInfo;
}

export const DANGER_SIGNS: DangerSign[] = [
  {
    id: 'chest_pain',
    label: {
      en: 'Severe chest pain, tightness, or crushing pressure',
      hi: 'छाती में तेज दर्द, जकड़न या अत्यधिक दबाव',
      mr: 'छातीत तीव्र वेदना, आवळल्यासारखे वाटणे किंवा प्रचंड दाब'
    },
    reason: {
      en: 'Severe chest pain indicates potential acute cardiac emergency (heart attack).',
      hi: 'छाती में तेज दर्द दिल के दौरे (हार्ट अटैक) का गंभीर संकेत हो सकता है।',
      mr: 'छातीत तीव्र वेदना हे हृदयविकाराच्या तीव्र झटक्याचे लक्षण असू शकते.'
    }
  },
  {
    id: 'breathing_difficulty',
    label: {
      en: 'Severe difficulty breathing or gasping for air',
      hi: 'सांस लेने में अत्यधिक तकलीफ या हवा के लिए तड़पना',
      mr: 'श्वास घेण्यास तीव्र त्रास होणे किंवा धाप लागणे'
    },
    reason: {
      en: 'Acute respiratory distress requires immediate oxygen support and airway management.',
      hi: 'सांस लेने में गंभीर तकलीफ के लिए तत्काल ऑक्सीजन और आपातकालीन सहायता की आवश्यकता होती है।',
      mr: 'श्वास घेण्याच्या तीव्र त्रासासाठी तातडीने ऑक्सिजन व वैद्यकीय उपचारांची गरज असते.'
    }
  },
  {
    id: 'unconsciousness',
    label: {
      en: 'Fainting, sudden loss of consciousness, or unresponsiveness',
      hi: 'बेहोशी, अचानक चेतना खोना या कोई प्रतिक्रिया न देना',
      mr: 'बेहोश होणे, सुध हरपणे किंवा प्रतिसाद न देणे'
    },
    reason: {
      en: 'Loss of consciousness indicates severe neurological or cardiovascular collapse.',
      hi: 'बेहोशी न्यूरोलॉजिकल या कार्डियोवैस्कुलर आपात स्थिति का गंभीर संकेत है।',
      mr: 'सुध हरपणे हे मेंदू किंवा हृदयाशी संबंधित गंभीर समस्येचे लक्षण आहे.'
    }
  },
  {
    id: 'severe_bleeding',
    label: {
      en: 'Severe bleeding that will not stop after direct pressure',
      hi: 'अत्यधिक बहता रक्तस्राव जो दबाने पर भी नहीं रुक रहा',
      mr: 'दाब देऊनही न थांबणारा तीव्र रक्तस्राव'
    },
    reason: {
      en: 'Uncontrolled hemorrhage can trigger life-threatening hemorrhagic shock.',
      hi: 'अनियंत्रित रक्तस्राव से जानलेवा शॉक लग सकता है।',
      mr: 'नियंत्रणाबाहेर रक्तस्रावामुळे जीवाला धोका निर्माण होऊ शकतो.'
    }
  },
  {
    id: 'stroke_signs',
    label: {
      en: 'Signs of stroke (face drooping, arm weakness, speech slurring)',
      hi: 'स्ट्रोक के लक्षण (चेहरा लटकना, हाथ में कमजोरी, बोली लड़खड़ाना)',
      mr: 'स्ट्रोकची लक्षणे (चेहरा वाकडा होणे, हात कमजोर होणे, बोलताना अडखळणे)'
    },
    reason: {
      en: 'Acute stroke symptoms require immediate emergency stroke care within the golden hour.',
      hi: 'स्ट्रोक के लक्षणों के लिए तत्काल आपातकालीन स्ट्रोक केयर की आवश्यकता होती है।',
      mr: 'स्ट्रोकच्या लक्षणांवर पहिल्या तासातच तातडीचे वैद्यकीय उपचार आवश्यक असतात.'
    }
  },
  {
    id: 'rigid_belly',
    label: {
      en: 'Severe abdominal pain with hard, rigid, board-like belly',
      hi: 'कड़ा/सख्त पेट के साथ पेट में अत्यधिक तेज दर्द',
      mr: 'पोट कडक/ताणलेले असताना होणाऱ्या अत्यंत तीव्र वेदना'
    },
    reason: {
      en: 'A rigid abdominal wall with severe pain suggests acute internal organ perforation or peritonitis.',
      hi: 'कड़ा पेट और तेज दर्द पेट की गंभीर अंदरूनी आपात स्थिति का संकेत है।',
      mr: 'कडक पेट आणि वेदना हे पोटातील गंभीर अंतर्गत समस्येचे लक्षण आहे.'
    }
  },
  {
    id: 'high_fever_confusion',
    label: {
      en: 'High fever with confusion, stiff neck, or extreme drowsiness',
      hi: 'तेज बुखार के साथ मानसिक भ्रम, गर्दन में अकड़न या अत्यधिक सुस्ती',
      mr: 'तीव्र तापासोबत गोंधळलेले वाटणे, मान ताठ होणे किंवा अतिशय झापड येणे'
    },
    reason: {
      en: 'High fever with altered mental status can indicate meningitis or severe systemic sepsis.',
      hi: 'बुखार के साथ मानसिक भ्रम मेनिनजाइटिस या सेप्सिस का संकेत हो सकता है।',
      mr: 'तापासोबत गोंधळलेले वाटणे हे मेंदूज्वर किंवा सेप्सिसचे लक्षण असू शकते.'
    }
  },
  {
    id: 'severe_dehydration',
    label: {
      en: 'Severe dehydration (no urine for >12 hours, dry mouth, extreme weakness)',
      hi: 'गंभीर डिहाइड्रेशन (12+ घंटे से पेशाब न होना, अत्यधिक कमजोरी, सूखा मुंह)',
      mr: 'तीव्र पाण्याचे प्रमाण कमी होणे (१२+ तास लघवी न होणे, अतिशय अशक्तपणा)'
    },
    reason: {
      en: 'Severe dehydration can rapidly trigger acute renal failure and electrolyte collapse.',
      hi: 'गंभीर डिहाइड्रेशन से किडनी फेलियर का खतरा हो सकता है।',
      mr: 'शरीरातील पाण्याचे प्रमाण तीव्र कमी झाल्याने किडनीवर गंभीर परिणाम होऊ शकतो.'
    }
  },
  {
    id: 'trauma_poisoning',
    label: {
      en: 'Major injury/trauma, head injury, poisoning, or drug overdose',
      hi: 'गंभीर चोट, सिर पर चोट, विषपान या दवा का ओवरडोज़',
      mr: 'मोठी दुखापत, डोक्याला गंभीर मार, विषबाधा किंवा औषधांचा अतिवापर'
    },
    reason: {
      en: 'Major trauma and toxic exposure require immediate emergency trauma stabilization.',
      hi: 'गंभीर चोट या जहर के प्रभाव के लिए तत्काल आपातकालीन आईसीयू सहायता चाहिए।',
      mr: 'गंभीर दुखापत व विषबाधेसाठी तातडीची आयसीयू उपचारांची गरज असते.'
    }
  },
  {
    id: 'pregnancy_red_flags',
    label: {
      en: 'Pregnancy red flags (heavy vaginal bleeding, severe headache, reduced baby movements)',
      hi: 'गर्भावस्था के गंभीर लक्षण (रक्तस्राव, तेज सिरदर्द, बच्चे की हलचल कम होना)',
      mr: 'गरोदरपणातील धोक्याची लक्षणे (रक्तस्राव, डोकेदुखी, बाळाची हालचाल कमी होणे)'
    },
    reason: {
      en: 'Obstetric emergency red flags jeopardize maternal and fetal safety.',
      hi: 'गर्भावस्था में ये लक्षण मां और बच्चे दोनों के लिए गंभीर खतरा हो सकते हैं।',
      mr: 'गरोदरपणात अशी लक्षणे माता आणि बाळासाठी अत्यंत धोक्याची असू शकतात.'
    }
  }
];

export const CHIEF_COMPLAINTS: ChiefComplaintOption[] = [
  {
    id: 'fever',
    label: {
      en: 'Fever & Chills',
      hi: 'बुखार और सर्दी/कंपकंपी',
      mr: 'ताप आणि थंडी वाजणे'
    },
    iconName: 'Thermometer'
  },
  {
    id: 'respiratory',
    label: {
      en: 'Cough, Cold & Breathing Issue',
      hi: 'खांसी, जुकाम और सांस की समस्या',
      mr: 'खोकला, सर्दी आणि श्वास घेण्यास त्रास'
    },
    iconName: 'Wind'
  },
  {
    id: 'stomach',
    label: {
      en: 'Stomach Pain, Vomiting & Diarrhea',
      hi: 'पेट दर्द, उल्टी और दस्त',
      mr: 'पोटदुखी, उलट्या आणि जुलाब'
    },
    iconName: 'Activity'
  },
  {
    id: 'pain',
    label: {
      en: 'Body, Joint or Muscle Pain',
      hi: 'शरीर, जोड़ या मांसपेशियों का दर्द',
      mr: 'अंगदुखी, सांधेदुखी किंवा स्नायू दुखी'
    },
    iconName: 'Bone'
  },
  {
    id: 'skin',
    label: {
      en: 'Skin Rash, Infection or Wound',
      hi: 'त्वचा पर चकत्ते, संक्रमण या घाव',
      mr: 'त्वचेवर पुरळ, संसर्ग किंवा जखम'
    },
    iconName: 'Sparkles'
  },
  {
    id: 'headache',
    label: {
      en: 'Headache, Dizziness or Weakness',
      hi: 'सिरदर्द, चक्कर या कमजोरी',
      mr: 'डोकेदुखी, चक्कर किंवा अशक्तपणा'
    },
    iconName: 'Brain'
  },
  {
    id: 'urinary',
    label: {
      en: 'Urinary Pain or Burning Sensation',
      hi: 'पेशाब में दर्द या जलन',
      mr: 'लघवी करताना होणारा त्रास किंवा जळजळ'
    },
    iconName: 'Droplets'
  },
  {
    id: 'other',
    label: {
      en: 'Other Symptoms / General Unwell',
      hi: 'अन्य लक्षण / अस्वस्थता',
      mr: 'इतर लक्षणे / अस्वस्थ वाटणे'
    },
    iconName: 'HelpCircle'
  }
];

export const ADAPTIVE_QUESTIONS: Record<string, AdaptiveQuestion[]> = {
  fever: [
    {
      id: 'high_temp',
      label: {
        en: 'High fever (>102°F / 39°C) persisting for more than 3 days?',
        hi: 'क्या 3 दिनों से अधिक समय से तेज बुखार (>102°F) है?',
        mr: '३ दिवसांपेक्षा जास्त वेळ तीव्र ताप (>१०२°F) आहे का?'
      }
    },
    {
      id: 'fever_rash',
      label: {
        en: 'New unexplained skin rash or red spots appearing on body?',
        hi: 'क्या शरीर पर नए चकत्ते या लाल धब्बे दिखाई दे रहे हैं?',
        mr: 'शरीरावर नवीन लाल चट्टे किंवा पुरळ दिसत आहे का?'
      }
    },
    {
      id: 'burning_urine',
      label: {
        en: 'Pain, burning sensation, or dark color during urination?',
        hi: 'क्या पेशाब करते समय दर्द, जलन या गहरा रंग है?',
        mr: 'लघवी करताना वेदना, जळजळ किंवा गडद रंग आहे का?'
      }
    },
    {
      id: 'joint_swelling',
      label: {
        en: 'Severe joint swelling or debilitating bone pain?',
        hi: 'क्या जोड़ों में सूजन या हड्डियों में अत्यधिक दर्द है?',
        mr: 'सांध्यांमध्ये सूज किंवा हाडांमध्ये तीव्र वेदना आहे का?'
      }
    },
    {
      id: 'mosquito_exposure',
      label: {
        en: 'Recent travel to malaria/dengue/chikungunya affected area or heavy mosquito bites?',
        hi: 'क्या हाल ही में मलेरिया/डेंगू प्रभावित क्षेत्र की यात्रा की है?',
        mr: 'अलीकडे मलेरिया/डेंगू प्रभावित भागात प्रवास केला आहे का?'
      }
    }
  ],
  respiratory: [
    {
      id: 'cough_blood',
      isHighRisk: true,
      label: {
        en: 'Coughing up blood or rust-colored phlegm?',
        hi: 'क्या खांसी में खून या जंग जैसा कफ आ रहा है?',
        mr: 'खोकल्यातून रक्त किंवा लालसर कफ येतो का?'
      }
    },
    {
      id: 'cough_duration',
      label: {
        en: 'Has the cough lasted for more than 2 weeks continuously?',
        hi: 'क्या खांसी 2 हफ्ते से अधिक समय से बनी हुई है?',
        mr: 'खोकला २ आठवड्यांपेक्षा जास्त काळ टिकून आहे का?'
      }
    },
    {
      id: 'chest_tightness',
      label: {
        en: 'Wheezing sound or tightness in chest when breathing in/out?',
        hi: 'क्या सांस लेते समय सीटी जैसी आवाज या सीने में जकड़न होती है?',
        mr: 'श्वास घेताना शिट्टीसारखा आवाज किंवा छातीत जकडन होते का?'
      }
    },
    {
      id: 'high_fever_cough',
      label: {
        en: 'High fever (>101°F) accompanied by chills with the cough?',
        hi: 'क्या खांसी के साथ 101°F से ज्यादा बुखार और ठंड लग रही है?',
        mr: 'खोकल्यासोबत १०१°F पेक्षा जास्त ताप आणि थंडी वाजते का?'
      }
    }
  ],
  stomach: [
    {
      id: 'persistent_vomiting',
      isHighRisk: true,
      label: {
        en: 'Inability to keep fluids down due to persistent vomiting for >12 hours?',
        hi: 'क्या लगातार उल्टी के कारण 12+ घंटे से पानी भी पेट में नहीं रुक रहा?',
        mr: '१२+ तासांपेक्षा जास्त वेळ उलट्यांमुळे पाणीही पोटात राहत नाही का?'
      }
    },
    {
      id: 'blood_in_stool',
      isHighRisk: true,
      label: {
        en: 'Dark black tarry stool or visible blood in vomit or stool?',
        hi: 'क्या उल्टी या मल में खून या काला रंग दिख रहा है?',
        mr: 'उलटी किंवा विष्ठेत रक्त किंवा काळा रंग दिसतो का?'
      }
    },
    {
      id: 'severe_diarrhea',
      label: {
        en: 'Frequent watery diarrhea (more than 5-6 times in a single day)?',
        hi: 'क्या एक दिन में 5-6 से अधिक बार पतले पानी जैसे दस्त हो रहे हैं?',
        mr: 'दिवसातून ५-६ पेक्षा जास्त वेळा पातळ जुलाब होत आहेत का?'
      }
    },
    {
      id: 'right_lower_pain',
      isHighRisk: true,
      label: {
        en: 'Sharp localized pain specifically in the lower right side of abdomen?',
        hi: 'क्या पेट के निचले दाहिने हिस्से में तेज दर्द है?',
        mr: 'पोटाच्या उजव्या बाजूला खालील भागात तीव्र वेदना आहे का?'
      }
    }
  ],
  pain: [
    {
      id: 'weight_bearing',
      label: {
        en: 'Unable to bear weight on leg/foot or move the affected joint?',
        hi: 'क्या पैर पर वजन डालना या प्रभावित जोड़ हिलाना असंभव है?',
        mr: 'पायावर वजन ठेवणे किंवा बाधित सांधा हलवणे अशक्य आहे का?'
      }
    },
    {
      id: 'joint_redness',
      label: {
        en: 'Joint is hot to touch, noticeably red, and swollen?',
        hi: 'क्या जोड़ छूने पर गर्म, लाल और सूजा हुआ लग रहा है?',
        mr: 'सांधा स्पर्शाला गरम, लाल आणि सुजलेला वाटतो का?'
      }
    },
    {
      id: 'trauma_history',
      label: {
        en: 'Did this pain start immediately after a fall, accident, or heavy strain?',
        hi: 'क्या यह दर्द किसी गिरावट, दुर्घटना या भारी तनाव के तुरंत बाद शुरू हुआ?',
        mr: 'हा त्रास पडल्यामुळे, अपघातानंतर किंवा ताणामुळे सुरू झाला का?'
      }
    }
  ],
  skin: [
    {
      id: 'spreading_redness',
      label: {
        en: 'Is the redness or swelling spreading rapidly across the skin?',
        hi: 'क्या त्वचा पर लालिमा या सूजन तेजी से फैल रही है?',
        mr: 'त्वचेवर लालसरपणा किंवा सूज वेगाने पसरत आहे का?'
      }
    },
    {
      id: 'pus_discharge',
      label: {
        en: 'Open wound showing pus, foul odor, or failure to heal after 7 days?',
        hi: 'क्या घाव से मवाद, बदबू आ रही है या 7 दिनों से नहीं भर रहा?',
        mr: 'जखमेतून पू, दुर्गंधी येत आहे किंवा ७ दिवसांपेक्षा जास्त काळ भरत नाही?'
      }
    },
    {
      id: 'fever_with_rash',
      label: {
        en: 'Fever or chills accompanying the skin lesion or rash?',
        hi: 'क्या त्वचा पर दाने या घाव के साथ बुखार भी है?',
        mr: 'पुरळासोबत किंवा जखमेसोबत तापही आहे का?'
      }
    }
  ],
  headache: [
    {
      id: 'sudden_severe',
      isHighRisk: true,
      label: {
        en: 'Sudden onset of explosive severe headache ("worst headache of life")?',
        hi: 'क्या अचानक अब तक का सबसे तेज सिरदर्द महसूस हुआ है?',
        mr: 'अचानक आयुष्यातील सर्वात तीव्र डोकेदुखी झाली का?'
      }
    },
    {
      id: 'vision_blur',
      label: {
        en: 'Blurry vision, double vision, or severe light sensitivity?',
        hi: 'क्या धुंधला दिखाई देना, दो-दो दिखना या तेज रोशनी से तकलीफ है?',
        mr: 'धुरकट दिसणे, दोन दोन दिसणे किंवा प्रकाशाचा त्रास होतो का?'
      }
    },
    {
      id: 'neck_stiffness',
      label: {
        en: 'Inability to bend chin down to touch chest due to neck stiffness?',
        hi: 'क्या गर्दन में अकड़न के कारण ठुड्डी को छाती से लगाना मुश्किल है?',
        mr: 'मानेच्या कडकपणामुळे हनुवटी छातीला टेकवणे कठीण जाते का?'
      }
    }
  ],
  urinary: [
    {
      id: 'fever_flank_pain',
      isHighRisk: true,
      label: {
        en: 'High fever accompanied by back/side pain near the kidneys?',
        hi: 'क्या पीठ/कमर में दर्द के साथ तेज बुखार महसूस हो रहा है?',
        mr: 'पाठीत/कमरेत वेदनेसोबत तीव्र ताप जाणवत आहे का?'
      }
    },
    {
      id: 'bloody_urine',
      isHighRisk: true,
      label: {
        en: 'Visible blood or dark brownish color in urine?',
        hi: 'क्या पेशाब में खून या गहरा भूरा रंग दिख रहा है?',
        mr: 'लघवीमध्ये रक्त किंवा गडद तपकिरी रंग दिसतो का?'
      }
    }
  ],
  other: [
    {
      id: 'unexplained_weight_loss',
      label: {
        en: 'Unexplained significant weight loss or total appetite loss?',
        hi: 'क्या बिना कारण तेजी से वजन कम हुआ है या भूख खत्म हो गई है?',
        mr: 'विनाकारण वजन कमी झाले आहे किंवा भूक अजिबात लागत नाही का?'
      }
    },
    {
      id: 'extreme_fatigue',
      label: {
        en: 'Extreme ongoing fatigue preventing basic daily home activities?',
        hi: 'क्या अत्यधिक थकान के कारण दैनिक कार्य करना कठिन हो गया है?',
        mr: 'अतिशय थकव्यामुळे दैनंदिन कामे करणेही कठीण जात आहे का?'
      }
    }
  ]
};

export const MOCK_NEAREST_CLINIC: ClinicInfo = {
  name: 'Rampur Primary Health Center (PHC)',
  doctorInCharge: 'Dr. Rajesh Sharma (MBBS, DNB)',
  distance: '3.2 km away',
  address: 'Main Station Road, PHC Campus, Yavatmal District, MH 445301',
  phone: '+91 98765 43210',
  hours: '08:00 AM - 06:00 PM (Mon - Sat)',
  services: [
    'Free OPD Doctor Consultation',
    'Essential Medicine Dispensing',
    'Basic Blood & Urine Lab Testing',
    '24/7 Emergency Ambulance Transfer'
  ]
};

export function evaluateTriage({
  dangerSigns,
  chiefComplaint,
  duration,
  severity,
  ageGroup,
  isPregnant,
  comorbidities,
  adaptiveAnswers,
  lang = 'en'
}: {
  dangerSigns: Record<string, boolean>;
  chiefComplaint: string;
  duration: string; // '<24h' | '1-3d' | '4-7d' | '>1w'
  severity: number; // 1-10
  ageGroup: 'child' | 'adult' | 'elderly';
  isPregnant: boolean;
  comorbidities: Record<string, boolean>;
  adaptiveAnswers: Record<string, boolean>;
  lang?: Language;
}): TriageResult {
  // 1. Check Danger Signs
  const activeDangerSignIds = Object.keys(dangerSigns).filter((key) => dangerSigns[key]);

  if (activeDangerSignIds.length > 0) {
    const reasons: string[] = [];
    activeDangerSignIds.forEach((id) => {
      const item = DANGER_SIGNS.find((ds) => ds.id === id);
      if (item) {
        reasons.push(item.reason[lang] || item.reason.en);
      }
    });

    if (reasons.length === 0) {
      reasons.push(
        lang === 'hi'
          ? 'रेड-फ्लैग आपातकालीन लक्षण मौजूद हैं जो तत्काल अस्पताल देखभाल की मांग करते हैं।'
          : lang === 'mr'
          ? 'तातडीच्या धोक्याची लक्षणे आढळली आहेत ज्यासाठी त्वरित रुग्णालयात जाणे आवश्यक आहे.'
          : 'Red-flag emergency danger signs present requiring immediate hospital care.'
      );
    }

    const nextSteps = [
      lang === 'hi'
        ? 'बिना देरी किए तुरंत निकटतम अस्पताल के आपातकालीन कक्ष (Emergency Room) में जाएं।'
        : lang === 'mr'
        ? 'उशीर न करता तातडीने जवळच्या रुग्णालयाच्या आपत्कालीन विभागात जा.'
        : 'Go directly to the emergency department of the nearest hospital immediately.',
      lang === 'hi'
        ? 'यदि वाहन उपलब्ध नहीं है तो तुरंत 108 या आपातकालीन एम्बुलेंस को कॉल करें।'
        : lang === 'mr'
        ? 'वाहन उपलब्ध नसल्यास तातडीने १०८ किंवा रुग्णवाहिकेला कॉल करा.'
        : 'Call 108 or emergency ambulance services right away if transportation is not ready.',
      lang === 'hi'
        ? 'अकेले न जाएं; सहायता के लिए किसी परिवार के सदस्य या पड़ोसी को साथ ले जाएं।'
        : lang === 'mr'
        ? 'एकटे जाऊ नका; मदतीसाठी कुटुंबातील सदस्याला किंवा शेजाऱ्याला सोबत घ्या.'
        : 'Do not travel alone; ask a family member or neighbor to assist you.'
    ];

    return {
      level: 'urgent_hospital',
      title: {
        en: 'Urgent Hospital Visit Required (Emergency)',
        hi: 'तत्काल अस्पताल जाने की आवश्यकता है (आपातकालीन)',
        mr: 'तातडीने रुग्णालयात जाण्याची आवश्यकता आहे (आपत्कालीन)'
      },
      reasons: reasons.slice(0, 3),
      nextSteps
    };
  }

  // 2. Evaluate adaptive answers high risk flags
  const activeAdaptiveKeys = Object.keys(adaptiveAnswers).filter((k) => adaptiveAnswers[k]);
  const categoryQuestions = ADAPTIVE_QUESTIONS[chiefComplaint] || [];
  const activeHighRiskAdaptive = categoryQuestions.filter(
    (q) => q.isHighRisk && adaptiveAnswers[q.id]
  );

  const hasComorbidities = Object.values(comorbidities).some((val) => val);

  // High risk triggers -> Urgent Hospital
  if (activeHighRiskAdaptive.length > 0 || (isPregnant && severity >= 7)) {
    const reasons: string[] = [];
    activeHighRiskAdaptive.forEach((q) => {
      reasons.push(
        lang === 'hi'
          ? `लक्षित लक्षण: ${q.label.hi} (उच्च जोखिम संकेत)`
          : lang === 'mr'
          ? `लक्ष्यित लक्षण: ${q.label.mr} (उच्च धोक्याचा संकेत)`
          : `High-risk indicator reported: ${q.label.en}`
      );
    });

    if (isPregnant && severity >= 7) {
      reasons.push(
        lang === 'hi'
          ? 'गर्भावस्था के दौरान उच्च तीव्रता के लक्षण मां और बच्चे के लिए तत्काल अस्पताल जांच की मांग करते हैं।'
          : lang === 'mr'
          ? 'गरोदरपणात तीव्र लक्षणे आढळल्यास माता व बाळाच्या सुरक्षेसाठी रुग्णालयात जाणे आवश्यक आहे.'
          : 'High severity symptoms during pregnancy necessitate immediate hospital evaluation.'
      );
    }

    if (reasons.length < 2) {
      reasons.push(
        lang === 'hi'
          ? 'लक्षणों की गंभीरता और जटिलताओं के जोखिम के कारण अस्पताल जाना सुरक्षित है।'
          : lang === 'mr'
          ? 'लक्षणांची तीव्रता आणि धोक्यामुळे रुग्णालयात जाणे सुरक्षित आहे.'
          : 'Symptom acuity and potential risk factors warrant immediate hospital presentation.'
      );
    }

    return {
      level: 'urgent_hospital',
      title: {
        en: 'Urgent Hospital Visit Required',
        hi: 'तत्काल अस्पताल जाने की आवश्यकता है',
        mr: 'तातडीने रुग्णालयात जाण्याची आवश्यकता आहे'
      },
      reasons: reasons.slice(0, 3),
      nextSteps: [
        lang === 'hi'
          ? 'आज ही निकटतम अस्पताल के इमरजेंसी या विशेषज्ञ ओपीडी में जाएं।'
          : lang === 'mr'
          ? 'आजच जवळच्या रुग्णालयात किंवा तज्ज्ञ डॉक्टरांकडे जा.'
          : 'Proceed to the nearest hospital emergency or specialty OPD today.',
        lang === 'hi'
          ? 'अपनी पिछली मेडिकल रिपोर्ट और दवाइयों के पर्चे साथ ले जाएं।'
          : lang === 'mr'
          ? 'तुमच्या जुन्या वैद्यकीय रिपोर्ट आणि औषधांच्या चिठ्ठ्या सोबत घ्या.'
          : 'Bring your medical history records and active prescription lists with you.',
        lang === 'hi'
          ? 'यदि लक्षण बिगड़ें तो तुरंत आपातकालीन हेल्पलाइन (108) डायल करें।'
          : lang === 'mr'
          ? 'लक्षणे वाढल्यास तातडीने १०८ हेल्पलाइनवर कॉल करा.'
          : 'Call 108 emergency hotline immediately if symptoms deteriorate during transit.'
      ]
    };
  }

  // 3. Check for Clinic Recommendation vs Home Care
  const isClinicWarranted =
    severity >= 5 ||
    duration === '4-7d' ||
    duration === '>1w' ||
    activeAdaptiveKeys.length > 0 ||
    hasComorbidities ||
    ageGroup === 'elderly' ||
    ageGroup === 'child';

  if (isClinicWarranted) {
    const reasons: string[] = [];

    if (severity >= 5) {
      reasons.push(
        lang === 'hi'
          ? `लक्षणों का स्तर मध्यम/तेज है (स्कोर: ${severity}/10), जिसका चिकित्सकीय परीक्षण आवश्यक है।`
          : lang === 'mr'
          ? `लक्षणांची तीव्रता मध्यम/जास्त आहे (स्कोर: ${severity}/१०), ज्यासाठी डॉक्टरांचा सल्ला आवश्यक आहे.`
          : `Symptom severity reported as moderate (${severity}/10), requiring clinical physical assessment.`
      );
    }

    if (duration === '4-7d' || duration === '>1w') {
      reasons.push(
        lang === 'hi'
          ? `लक्षण लगातार 4 या अधिक दिनों से बने हुए हैं, जो कि प्राथमिक क्लिनिक परामर्श का संकेत है।`
          : lang === 'mr'
          ? `लक्षणे सलग ४ किंवा अधिक दिवसांपासून आहेत, जे क्लिनिकमध्ये तपासणीचे संकेत देतात.`
          : `Persistent duration (${duration === '>1w' ? 'more than a week' : '4-7 days'}) warrants OPD clinical review.`
      );
    }

    if (activeAdaptiveKeys.length > 0 && reasons.length < 3) {
      reasons.push(
        lang === 'hi'
          ? 'विशिष्ट अनुवर्ती लक्षणों की उपस्थिति से सटीक निदान और दवा के लिए डॉक्टर परामर्श जरूरी है।'
          : lang === 'mr'
          ? 'विशिष्ट लक्षणांमुळे अचूक निदान आणि औषधांसाठी डॉक्टरांचा सल्ला आवश्यक आहे.'
          : 'Specific secondary symptoms noted during follow-up require diagnostic clinical verification.'
      );
    }

    if (hasComorbidities && reasons.length < 3) {
      reasons.push(
        lang === 'hi'
          ? 'पूर्व-विद्यमान स्वास्थ्य स्थितियों (जैसे डायबिटीज/हृदय रोग) के कारण चिकित्सकीय निगरानी की सलाह दी जाती है।'
          : lang === 'mr'
          ? 'पूर्वीच्या आजारांमुळे (उदा. मधुमेह/हृदयरोग) डॉक्टरांच्या देखरेखीची गरज आहे.'
          : 'Pre-existing comorbidities (e.g., diabetes/cardiac) increase complexity, favoring clinical guidance.'
      );
    }

    if (reasons.length === 0) {
      reasons.push(
        lang === 'hi'
          ? 'आयु वर्ग या लक्षणों की प्रकृति को देखते हुए 24 घंटे के भीतर क्लिनिक में डॉक्टर को दिखाना उचित है।'
          : lang === 'mr'
          ? 'वयोगट किंवा लक्षणांचे स्वरूप पाहता २४ तासांच्या आत क्लिनिकमध्ये दाखवणे योग्य आहे.'
          : 'Age group and presentation indicate a safe recommendation to visit a clinic within 24 hours.'
      );
    }

    return {
      level: 'nearest_clinic',
      title: {
        en: 'Visit Nearest Clinic (Within 24 Hours)',
        hi: 'नजदीकी क्लिनिक जाएं (24 घंटे के भीतर)',
        mr: 'जवळच्या क्लिनिकला भेट द्या (२४ तासांच्या आत)'
      },
      reasons: reasons.slice(0, 3),
      nextSteps: [
        lang === 'hi'
          ? 'निकटतम प्राथमिक स्वास्थ्य केंद्र (PHC) या डॉक्टर क्लिनिक में अपॉइंटमेंट लें।'
          : lang === 'mr'
          ? 'जवळच्या प्राथमिक आरोग्य केंद्रात (PHC) किंवा क्लिनिकमध्ये डॉक्टरांना भेटा.'
          : 'Schedule a visit or walk in to your nearest Primary Health Center (PHC) or clinic.',
        lang === 'hi'
          ? 'पर्याप्त पानी पिएं, आराम करें और डॉक्टर की सलाह के बिना भारी दवाएं न लें।'
          : lang === 'mr'
          ? 'पुरेशे पाणी प्या, विश्रांती घ्या आणि डॉक्टरांच्या सल्ल्याशिवाय औषधे घेऊ नका.'
          : 'Maintain hydration, rest, and avoid self-medicating with strong antibiotics.',
        lang === 'hi'
          ? 'यदि बुखार 102°F से अधिक हो जाए या सांस फूले तो तुरंत अस्पताल जाएं।'
          : lang === 'mr'
          ? 'ताप १०२°F पेक्षा जास्त झाल्यास किंवा श्वास फुलल्यास तातडीने रुग्णालयात जा.'
          : 'Upgrade to urgent hospital care if fever exceeds 102°F or breathing difficulties develop.'
      ],
      clinicInfo: MOCK_NEAREST_CLINIC
    };
  }

  // 4. Default -> Home Care
  return {
    level: 'home_care',
    title: {
      en: 'Home Care & Self-Monitoring Recommended',
      hi: 'घरेलू देखभाल और स्व-निगरानी की सिफारिश की जाती है',
      mr: 'घरगुती काळजी आणि स्वतः देखरेख करण्याची शिफारस'
    },
    reasons: [
      lang === 'hi'
        ? 'आकलन के दौरान कोई आपातकालीन खतरे के संकेत (Danger Signs) नहीं पाए गए।'
        : lang === 'mr'
        ? 'तपासणीदरम्यान कोणतीही तातडीच्या धोक्याची लक्षणे आढळली नाहीत.'
        : 'No emergency red flags or severe warning signs detected during safety screening.',
      lang === 'hi'
        ? `लक्षणों की तीव्रता हल्की (${severity}/10) और अवधि कम है, जो आमतौर पर घरेलू देखभाल से ठीक होती है।`
        : lang === 'mr'
        ? `लक्षणांची तीव्रता कमी (${severity}/१०) आणि कालावधी कमी आहे, जे घरगुती काळजीने ठीक होते.`
        : `Symptom severity is mild (${severity}/10) with short duration, manageable via supportive care.`,
      lang === 'hi'
        ? 'कोई उच्च-जोखिम वाली पूर्व बीमारी या जटिलता नहीं पाई गई है।'
        : lang === 'mr'
        ? 'कोणताही उच्च-धोक्याचा आजार किंवा गुंतागुंत आढळलेली नाही.'
        : 'No high-risk comorbid factors identified requiring immediate intervention.'
    ],
    nextSteps: [
      lang === 'hi'
        ? 'पर्याप्त विश्राम करें और पर्याप्त मात्रा में साफ पानी / ओआरएस घोल पिएं।'
        : lang === 'mr'
        ? 'पुरेशी विश्रांती घ्या आणि पुरेसे स्वच्छ पाणी / ओआरएसचे द्रावण प्या.'
        : 'Get plenty of rest and stay well-hydrated with clean fluids, warm water, or ORS.',
      lang === 'hi'
        ? 'हल्के बुखार या बदन दर्द के लिए लेबल के अनुसार पेरासिटामोल लें (यदि आवश्यकता हो)।'
        : lang === 'mr'
        ? 'सौम्य ताप किंवा अंगदुखीसाठी सल्ल्यानुसार पॅरासिटामॉल घ्या (गरज असल्यास).'
        : 'Use OTC antipyretics like paracetamol per package directions if mild fever or aches exist.',
      lang === 'hi'
        ? 'यदि लक्षण 3 दिनों से अधिक बने रहें या बिगड़ें तो नजदीकी क्लिनिक में डॉक्टर से परामर्श लें।'
        : lang === 'mr'
        ? 'लक्षणे ३ दिवसांपेक्षा जास्त काळ राहिल्यास किंवा वाढल्यास क्लिनिकमध्ये डॉक्टरांचा सल्ला घ्या.'
        : 'If symptoms persist beyond 3 days or worsen, visit your nearest clinic for review.'
    ]
  };
}
