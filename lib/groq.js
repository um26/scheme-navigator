// lib/groq.js
//
// The LLM's ONLY two jobs in this app:
//   1. extractProfile()  — turn the user's free text into a structured profile
//   2. explainMatches()  — write a plain-language explanation of schemes the rule
//                           engine has ALREADY approved
// It never decides eligibility. See lib/ruleEngine.js for that.
//
// Model note: llama-3.3-70b-versatile was deprecated by Groq (2026-06-17). Using
// openai/gpt-oss-120b instead, with include_reasoning:false so reasoning tokens
// aren't included in the response (Groq-specific param for OSS reasoning models).
//
// Language note: extraction always returns English-keyed enum values (gender,
// category, state) since those are matched against a fixed English database — only
// the free-text explanation is written in the person's chosen UI language.

import { localeName } from "./i18n/config";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

async function callGroq({ messages, jsonMode = false, temperature = 0.2 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const body = {
    model: MODEL,
    messages,
    temperature,
    include_reasoning: false,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const EXTRACTION_SYSTEM_PROMPT = `You extract a structured profile from a person's free-text description of their situation, for the purpose of matching them to Indian government welfare schemes. The person may write in English, Hindi, Telugu, Tamil, or a mix — extract regardless of input language.

Return ONLY a JSON object, no other text, with these fields (use null for anything not stated or not confidently inferable — never guess):
{
  "age": number|null,
  "gender": "male"|"female"|null,
  "annualIncome": number|null,
  "state": string|null,
  "category": "SC"|"ST"|"OBC"|"EWS"|"General"|null,
  "isBPL": boolean|null,
  "hasDisability": boolean|null,
  "occupation": string|null
}

Always use these exact English values for gender/category/state (e.g. "Maharashtra", not "महाराष्ट्र") regardless of the input language, since these are matched against a fixed English-keyed database — only the "occupation" field should stay in whatever language/wording the person used.

Do not infer category, BPL status, or disability unless explicitly stated. Do not guess income from vague phrases like "poor" or "struggling" — leave it null.`;

export async function extractProfile(userText) {
  const content = await callGroq({
    jsonMode: true,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: userText },
    ],
  });
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Failed to parse profile extraction as JSON");
  }
}

function buildExplanationSystemPrompt(languageCode) {
  const langName = localeName(languageCode);
  const languageInstruction =
    languageCode && languageCode !== "en"
      ? `Write your ENTIRE response in ${langName} (not English), using natural, plain everyday ${langName} — not a stiff word-for-word translation. Scheme names may stay in English if that's how they're officially known, but all explanatory sentences must be in ${langName}.`
      : `Write your response in plain, everyday English.`;

  return `You explain, in plain and warm language, why a person qualifies for a set of Indian government welfare schemes.

CRITICAL RULE: You may ONLY discuss schemes given to you in the approved list below. Do not mention, imply, or reference any other scheme by name, even if you know of one that might also fit. If you are unsure whether something is one of the approved schemes, do not mention it.

For each approved scheme, write 1-2 short sentences on why it fits and what it offers. Keep the tone plain-spoken, not bureaucratic. Do not repeat exact eligibility text verbatim — paraphrase.

${languageInstruction}`;
}

export async function explainMatches(profile, approvedSchemes, languageCode = "en") {
  const schemeList = approvedSchemes
    .map((s) => `- ${s.name}: ${s.description || ""}`)
    .join("\n");

  const content = await callGroq({
    temperature: 0.4,
    messages: [
      { role: "system", content: buildExplanationSystemPrompt(languageCode) },
      {
        role: "user",
        content: `Person's situation (structured): ${JSON.stringify(profile)}\n\nAPPROVED SCHEMES (only discuss these):\n${schemeList}`,
      },
    ],
  });
  return content;
}
