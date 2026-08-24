// Display-only translations for state/UT names.
//
// IMPORTANT: rule-engine values, URL filters and the source dataset always keep the
// canonical English state strings. This helper changes display text only.
import { GENERATED_STATE_NAMES } from "./generated";

const MANUAL_STATE_NAMES = {
  hi: {
    "Andaman and Nicobar Islands": "अंडमान और निकोबार द्वीपसमूह",
    "Andhra Pradesh": "आंध्र प्रदेश",
    "Arunachal Pradesh": "अरुणाचल प्रदेश",
    Assam: "असम", Bihar: "बिहार", Chandigarh: "चंडीगढ़", Chhattisgarh: "छत्तीसगढ़",
    "Dadra & Nagar Haveli and Daman & Diu": "दादरा और नगर हवेली और दमन और दीव",
    Delhi: "दिल्ली", Goa: "गोवा", Gujarat: "गुजरात", Haryana: "हरियाणा",
    "Himachal Pradesh": "हिमाचल प्रदेश", "Jammu and Kashmir": "जम्मू और कश्मीर",
    Jharkhand: "झारखंड", Karnataka: "कर्नाटक", Kerala: "केरल", Ladakh: "लद्दाख",
    Lakshadweep: "लक्षद्वीप", "Madhya Pradesh": "मध्य प्रदेश", Maharashtra: "महाराष्ट्र",
    Manipur: "मणिपुर", Meghalaya: "मेघालय", Mizoram: "मिज़ोरम", Nagaland: "नागालैंड",
    Odisha: "ओडिशा", Puducherry: "पुडुचेरी", Punjab: "पंजाब", Rajasthan: "राजस्थान",
    Sikkim: "सिक्किम", "Tamil Nadu": "तमिलनाडु", Telangana: "तेलंगाना", Tripura: "त्रिपुरा",
    "Uttar Pradesh": "उत्तर प्रदेश", Uttarakhand: "उत्तराखंड", "West Bengal": "पश्चिम बंगाल",
  },
  te: {
    "Andaman and Nicobar Islands": "అండమాన్ మరియు నికోబార్ దీవులు",
    "Andhra Pradesh": "ఆంధ్ర ప్రదేశ్", "Arunachal Pradesh": "అరుణాచల్ ప్రదేశ్",
    Assam: "అస్సాం", Bihar: "బిహార్", Chandigarh: "చండీగఢ్", Chhattisgarh: "ఛత్తీస్‌గఢ్",
    "Dadra & Nagar Haveli and Daman & Diu": "దాద్రా మరియు నగర్ హవేలీ మరియు దమన్ మరియు దియు",
    Delhi: "ఢిల్లీ", Goa: "గోవా", Gujarat: "గుజరాత్", Haryana: "హర్యానా",
    "Himachal Pradesh": "హిమాచల్ ప్రదేశ్", "Jammu and Kashmir": "జమ్మూ మరియు కాశ్మీర్",
    Jharkhand: "ఝార్ఖండ్", Karnataka: "కర్ణాటక", Kerala: "కేరళ", Ladakh: "లడఖ్",
    Lakshadweep: "లక్షద్వీప్", "Madhya Pradesh": "మధ్య ప్రదేశ్", Maharashtra: "మహారాష్ట్ర",
    Manipur: "మణిపూర్", Meghalaya: "మేఘాలయ", Mizoram: "మిజోరం", Nagaland: "నాగాలాండ్",
    Odisha: "ఒడిశా", Puducherry: "పుదుచ్చేరి", Punjab: "పంజాబ్", Rajasthan: "రాజస్థాన్",
    Sikkim: "సిక్కిం", "Tamil Nadu": "తమిళనాడు", Telangana: "తెలంగాణ", Tripura: "త్రిపుర",
    "Uttar Pradesh": "ఉత్తర ప్రదేశ్", Uttarakhand: "ఉత్తరాఖండ్", "West Bengal": "పశ్చిమ బెంగాల్",
  },
  ta: {
    "Andaman and Nicobar Islands": "அந்தமான் மற்றும் நிக்கோபார் தீவுகள்",
    "Andhra Pradesh": "ஆந்திரப் பிரதேசம்", "Arunachal Pradesh": "அருணாச்சலப் பிரதேசம்",
    Assam: "அசாம்", Bihar: "பீகார்", Chandigarh: "சண்டிகர்", Chhattisgarh: "சத்தீஸ்கர்",
    "Dadra & Nagar Haveli and Daman & Diu": "தாத்ரா மற்றும் நகர் ஹவேலி மற்றும் டாமன் மற்றும் டையூ",
    Delhi: "டெல்லி", Goa: "கோவா", Gujarat: "குஜராத்", Haryana: "ஹரியானா",
    "Himachal Pradesh": "ஹிமாச்சலப் பிரதேசம்", "Jammu and Kashmir": "ஜம்மு மற்றும் காஷ்மீர்",
    Jharkhand: "ஜார்கண்ட்", Karnataka: "கர்நாடகா", Kerala: "கேரளா", Ladakh: "லடாக்",
    Lakshadweep: "லட்சத்தீவு", "Madhya Pradesh": "மத்தியப் பிரதேசம்", Maharashtra: "மகாராஷ்டிரா",
    Manipur: "மணிப்பூர்", Meghalaya: "மேகாலயா", Mizoram: "மிசோரம்", Nagaland: "நாகாலாந்து",
    Odisha: "ஒடிசா", Puducherry: "புதுச்சேரி", Punjab: "பஞ்சாப்", Rajasthan: "ராஜஸ்தான்",
    Sikkim: "சிக்கிம்", "Tamil Nadu": "தமிழ்நாடு", Telangana: "தெலங்கானா", Tripura: "திரிபுரா",
    "Uttar Pradesh": "உத்தரப் பிரதேசம்", Uttarakhand: "உத்தரகாண்ட்", "West Bengal": "மேற்கு வங்காளம்",
  },
};

export function localizeState(locale, state) {
  if (!state) return state;
  return MANUAL_STATE_NAMES[locale]?.[state] || GENERATED_STATE_NAMES[locale]?.[state] || state;
}
