// data/evalTestSet.js
//
// Hand-written gold test set for the extraction eval: each case pairs a free-text
// description with the profile fields a correct extraction SHOULD produce. This
// tests lib/groq.js:extractProfile() — the one place in the whole pipeline where
// the LLM's output feeds into anything (see lib/ruleEngine.js header). It does NOT
// test eligibility correctness, since the rule engine is itself the ground truth
// for that by design — there's no independent oracle to check it against.
//
// Deliberately varied: some cases are easy/explicit, some are ambiguous on purpose
// (to check the model correctly leaves a field null rather than guessing), some use
// lakh/crore notation, some mix multiple facts in one sentence.

export const EVAL_TEST_SET = [
  {
    id: "e01",
    text: "I am a 34 year old farmer in Maharashtra, my annual income is around ₹1.5 lakh.",
    expected: { age: 34, gender: null, annualIncome: 150000, state: "Maharashtra", category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e02",
    text: "26F from Kerala, SC category, family income under 2 lakh per year.",
    expected: { age: 26, gender: "female", annualIncome: 200000, state: "Kerala", category: "SC", isBPL: null, hasDisability: null },
  },
  {
    id: "e03",
    text: "I'm a 60 year old man living in Punjab. I have a BPL card.",
    expected: { age: 60, gender: "male", annualIncome: null, state: "Punjab", category: null, isBPL: true, hasDisability: null },
  },
  {
    id: "e04",
    text: "My daughter is 12 years old and studies in a government school in Bihar.",
    expected: { age: 12, gender: "female", annualIncome: null, state: "Bihar", category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e05",
    text: "I don't have a BPL card. I am a 45 year old woman, ST, from Odisha, income about 3.2 lakhs.",
    expected: { age: 45, gender: "female", annualIncome: 320000, state: "Odisha", category: "ST", isBPL: false, hasDisability: null },
  },
  {
    id: "e06",
    text: "Person with a physical disability, age 29, based in Gujarat.",
    expected: { age: 29, gender: null, annualIncome: null, state: "Gujarat", category: null, isBPL: null, hasDisability: true },
  },
  {
    id: "e07",
    text: "We are a poor family struggling to make ends meet.",
    expected: { age: null, gender: null, annualIncome: null, state: null, category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e08",
    text: "I run a small business in Tamil Nadu and want to expand. Annual turnover roughly 8 lakh, I'm 38.",
    expected: { age: 38, gender: null, annualIncome: null, state: "Tamil Nadu", category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e09",
    text: "22 year old OBC male from Karnataka, no income right now, still studying.",
    expected: { age: 22, gender: "male", annualIncome: null, state: "Karnataka", category: "OBC", isBPL: null, hasDisability: null },
  },
  {
    id: "e10",
    text: "Widow, 52, EWS category, Uttar Pradesh, household income roughly 1.8 lakh a year.",
    expected: { age: 52, gender: "female", annualIncome: 180000, state: "Uttar Pradesh", category: "EWS", isBPL: null, hasDisability: null },
  },
  {
    id: "e11",
    text: "My income is definitely below 5,00,000 rupees. I live in Rajasthan and I'm not disabled.",
    expected: { age: null, gender: null, annualIncome: 500000, state: "Rajasthan", category: null, isBPL: null, hasDisability: false },
  },
  {
    id: "e12",
    text: "I'm from West Bengal, general category, 41 years old, salaried employee earning 6.5 lakh annually.",
    expected: { age: 41, gender: null, annualIncome: 650000, state: "West Bengal", category: "General", isBPL: null, hasDisability: null },
  },
  {
    id: "e13",
    text: "Looking for schemes for my elderly parents, both in their late 60s, in Assam.",
    expected: { age: null, gender: null, annualIncome: null, state: "Assam", category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e14",
    text: "17F, disabled, no fixed income, Delhi resident, SC.",
    expected: { age: 17, gender: "female", annualIncome: null, state: "Delhi", category: "SC", isBPL: null, hasDisability: true },
  },
  {
    id: "e15",
    text: "Male, 33, ₹75000 a year, Jharkhand, holds a BPL card, ST category.",
    expected: { age: 33, gender: "male", annualIncome: 75000, state: "Jharkhand", category: "ST", isBPL: true, hasDisability: null },
  },
  {
    id: "e16",
    text: "Fisherman from a coastal village, lost his boat in a storm, needs relief assistance.",
    expected: { age: null, gender: "male", annualIncome: null, state: null, category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e17",
    text: "I earn about 12 lakhs a year working in IT in Telangana, 29 years old.",
    expected: { age: 29, gender: null, annualIncome: 1200000, state: "Telangana", category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e18",
    text: "Housewife, 48, husband passed away recently, we live in Himachal Pradesh, no savings.",
    expected: { age: 48, gender: "female", annualIncome: null, state: "Himachal Pradesh", category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e19",
    text: "Student, 19 years old, wants a scholarship, from Chhattisgarh, OBC, family income 2.4 lakh.",
    expected: { age: 19, gender: null, annualIncome: 240000, state: "Chhattisgarh", category: "OBC", isBPL: null, hasDisability: null },
  },
  {
    id: "e20",
    text: "Not sure about my exact income but I definitely qualify as below poverty line. Live in Madhya Pradesh.",
    expected: { age: null, gender: null, annualIncome: null, state: "Madhya Pradesh", category: null, isBPL: true, hasDisability: null },
  },
  {
    id: "e21",
    text: "36 year old, hearing impaired, works as a teacher, lives in Goa, income around 4 lakh.",
    expected: { age: 36, gender: null, annualIncome: 400000, state: "Goa", category: null, isBPL: null, hasDisability: true },
  },
  {
    id: "e22",
    text: "I am neither SC, ST, OBC nor EWS. 27 years old, from Haryana, earning 9 lakh per annum.",
    expected: { age: 27, gender: null, annualIncome: 900000, state: "Haryana", category: "General", isBPL: null, hasDisability: null },
  },
  {
    id: "e23",
    text: "Farmer's family in Ladakh, three generations living together, income is seasonal and irregular.",
    expected: { age: null, gender: null, annualIncome: null, state: "Ladakh", category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e24",
    text: "24 year old woman, recently divorced, Sikkim, no dependents, works part time.",
    expected: { age: 24, gender: "female", annualIncome: null, state: "Sikkim", category: null, isBPL: null, hasDisability: null },
  },
  {
    id: "e25",
    text: "We're a joint family of 8 in rural Bihar. My father is 70 and blind.",
    expected: { age: 70, gender: "male", annualIncome: null, state: "Bihar", category: null, isBPL: null, hasDisability: true },
  },
];
