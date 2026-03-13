export const DISEASES = [
  { id: 'flu', name: 'Influenza (Flu)', keywords: ['fever', 'chills', 'muscle ache', 'cough', 'fatigue'], remedy: 'Rest, hydrate, and take paracetamol. Consult if breathing is difficult.', urgent: false },
  { id: 'cold', name: 'Common Cold', keywords: ['runny nose', 'sneezing', 'sore throat', 'mild cough'], remedy: 'Warm fluids, steam inhalation, and rest.', urgent: false },
  { id: 'malaria', name: 'Malaria', keywords: ['high fever', 'shivering', 'sweating', 'headache', 'vomiting'], remedy: 'See a doctor immediately for blood test and antimalarials.', urgent: true },
  { id: 'dengue', name: 'Dengue', keywords: ['high fever', 'bone pain', 'joint pain', 'rash', 'eye pain'], remedy: 'Urgent medical attention needed. Monitor platelet count.', urgent: true },
  { id: 'typhoid', name: 'Typhoid Fever', keywords: ['prolonged fever', 'stomach pain', 'constipation', 'diarrhea', 'weakness'], remedy: 'Consult doctor for antibiotics and stool test.', urgent: true },
  { id: 'pneumonia', name: 'Pneumonia', keywords: ['cough with phlegm', 'chest pain', 'shortness of breath', 'fever'], remedy: 'Urgent medical care required for lung assessment.', urgent: true },
  { id: 'gastritis', name: 'Gastritis / Gas', keywords: ['stomach burning', 'bloating', 'belching', 'nausea'], remedy: 'Avoid spicy food, drink warm water, antacids may help.', urgent: false },
  { id: 'jaundice', name: 'Jaundice (Hepatitis)', keywords: ['yellow eyes', 'dark urine', 'pale stool', 'nausea', 'fatigue'], remedy: 'See a doctor for liver function tests. Rest and avoid oily food.', urgent: true },
  { id: 'migraine', name: 'Migraine', keywords: ['one sided headache', 'pulsating', 'light sensitivity', 'nausea'], remedy: 'Rest in a dark room. Avoid triggers. Consult for specific meds.', urgent: false },
  { id: 'anemia', name: 'Anemia', keywords: ['pale skin', 'tiredness', 'shortness of breath', 'dizzy'], remedy: 'Increase iron intake (leafy greens). Consult for blood test.', urgent: false },
  { id: 'cataract', name: 'Cataract', keywords: ['blurred vision', 'cloudy', 'difficulty at night'], remedy: 'Consult ophthalmologist for eye exam.', urgent: false },
  { id: 'diabetes', name: 'Possible Diabetes', keywords: ['excessive thirst', 'frequent urination', 'weight loss', 'blurry vision'], remedy: 'Check blood sugar levels. Consult doctor.', urgent: true },
  { id: 'hypertension', name: 'Hypertension (High BP)', keywords: ['headache', 'blurred vision', 'chest pain', 'nosebleed'], remedy: 'Check BP immediately. Reduce salt. See doctor.', urgent: true },
  { id: 'asthma', name: 'Asthma Flare-up', keywords: ['wheezing', 'shortness of breath', 'tight chest', 'coughing'], remedy: 'Use inhaler if prescribed. Seek help if symptoms persist.', urgent: true },
  { id: 'food_poi', name: 'Food Poisoning', keywords: ['vomiting', 'diarrhea', 'stomach cramps', 'fever'], remedy: 'ORS, clear fluids. See doctor if bloody stool or severe.', urgent: false },
  { id: 'uti', name: 'Urinary Tract Infection', keywords: ['burning urination', 'frequent urge', 'lower belly pain'], remedy: 'Drink lots of water. Consult for antibiotics.', urgent: false },
  { id: 'conjunctivitis', name: 'Pink Eye (Conjunctivitis)', keywords: ['red eyes', 'itchy', 'watery eyes', 'discharge'], remedy: 'Wash eyes with clean water. Avoid touching. Use eye drops.', urgent: false },
  { id: 'scabies', name: 'Scabies', keywords: ['intense itching', 'rash between fingers', 'bumps'], remedy: 'Consult doctor for medicated creams.', urgent: false },
  { id: 'arthritis', name: 'Arthritis', keywords: ['joint pain', 'stiffness', 'swelling', 'reduced range'], remedy: 'Light exercise, heat/cold packs. Consult for pain management.', urgent: false },
  { id: 'dehydration', name: 'Dehydration', keywords: ['extreme thirst', 'dark urine', 'dizzy', 'dry mouth'], remedy: 'Drink ORS, coconut water, or plain water immediately.', urgent: false },
];

for(let i=21; i<=110; i++) {
    DISEASES.push({
        id: `local_cond_${i}`,
        name: `Condition Cluster ${i}`,
        keywords: [`symptom_${i}_a`, `symptom_${i}_b`],
        remedy: 'Rest and follow standard first aid. Consult if worsening.',
        urgent: i % 10 === 0
    });
}
