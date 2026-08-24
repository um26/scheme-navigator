// Extra messages added while closing i18n gaps in screens that originally shipped
// with hard-coded English. Keeping these separate lets us fix the current locales
// without duplicating the large base dictionaries; new locales should include the
// same keys either here or in their base dictionary.

export const EXTRA_MESSAGES = {
  en: {
    browse_state: "State",
    map_title: "Explore schemes by state",
    map_subtitle: "Click a state or union territory to see schemes available there.",
    map_boundary_note:
      "Boundaries shown per Survey of India records. Lakshadweep and Chandigarh are too small to render reliably at this scale.",
    map_loading: "Loading map…",
    footer_credit: "Made with ❤ by BinaryBots",
  },
  hi: {
    browse_state: "राज्य",
    map_title: "राज्य के अनुसार योजनाएँ खोजें",
    map_subtitle: "किसी राज्य या केंद्र शासित प्रदेश पर क्लिक करके वहाँ उपलब्ध योजनाएँ देखें।",
    map_boundary_note:
      "सीमाएँ भारतीय सर्वेक्षण के अभिलेखों के अनुसार दिखाई गई हैं। लक्षद्वीप और चंडीगढ़ इस पैमाने पर विश्वसनीय रूप से दिखाने के लिए बहुत छोटे हैं।",
    map_loading: "मानचित्र लोड हो रहा है…",
    footer_credit: "BinaryBots द्वारा ❤ के साथ बनाया गया",
  },
  te: {
    browse_state: "రాష్ట్రం",
    map_title: "రాష్ట్రాల వారీగా పథకాలను అన్వేషించండి",
    map_subtitle: "అక్కడ అందుబాటులో ఉన్న పథకాలను చూడటానికి రాష్ట్రం లేదా కేంద్ర పాలిత ప్రాంతంపై క్లిక్ చేయండి.",
    map_boundary_note:
      "సరిహద్దులు సర్వే ఆఫ్ ఇండియా రికార్డుల ప్రకారం చూపబడ్డాయి. లక్షద్వీప్ మరియు చండీగఢ్ ఈ స్థాయిలో నమ్మదగిన విధంగా చూపడానికి చాలా చిన్నవి.",
    map_loading: "మ్యాప్ లోడ్ అవుతోంది…",
    footer_credit: "BinaryBots ద్వారా ❤ తో రూపొందించబడింది",
  },
  ta: {
    browse_state: "மாநிலம்",
    map_title: "மாநில வாரியாக திட்டங்களை ஆராயுங்கள்",
    map_subtitle: "அங்கு கிடைக்கும் திட்டங்களைப் பார்க்க ஒரு மாநிலம் அல்லது ஒன்றியப் பிரதேசத்தைத் தேர்ந்தெடுக்கவும்.",
    map_boundary_note:
      "எல்லைகள் இந்திய சர்வே பதிவுகளின்படி காட்டப்பட்டுள்ளன. லட்சத்தீவும் சண்டிகரும் இந்த அளவில் நம்பகமாகக் காட்டுவதற்கு மிகவும் சிறியவை.",
    map_loading: "வரைபடம் ஏற்றப்படுகிறது…",
    footer_credit: "BinaryBots மூலம் ❤ உடன் உருவாக்கப்பட்டது",
  },
};
