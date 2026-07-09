export const SECTION_REGISTRY = {
  A: { id: "A", title: "Vocabulary & Grammar MCQ", type: "mcq", autoScored: true, answerKeyAvailable: true, practiceCount: 10, mockCount: 10 },
  B: { id: "B", title: "Signs MCQ with image", type: "signs_mcq", autoScored: true, answerKeyAvailable: true, practiceCount: 5, mockCount: 5 },
  C: { id: "C", title: "Reading passage MCQ group", type: "reading_group", autoScored: true, answerKeyAvailable: true, practiceCount: 1, mockCount: 1 },
  D: { id: "D", title: "Cloze text MCQ group", type: "cloze_group", autoScored: true, answerKeyAvailable: true, practiceCount: 1, mockCount: 1 },
  E: { id: "E", title: "Sentence transformation", type: "sentence_transformation", autoScored: true, answerKeyAvailable: true, practiceCount: 10, mockCount: 5 },
  F: { id: "F", title: "Email/Letter writing", type: "email_writing", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 1 },
  G: { id: "G", title: "Essay writing", type: "essay_writing", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 1 },
  H: { id: "H", title: "Listening fill blanks", type: "listening_fill_blanks", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 1 },
  I: { id: "I", title: "Listening MCQ", type: "listening_abc", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 2 },
  J: { id: "J", title: "Listening True/False", type: "listening_tf", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 2 },
  K: { id: "K", title: "Speaking topics", type: "speaking_topic", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 1 }
};

export const appState = {
  examBank: null,
  scopedBank: null,
  studyProfile: null,
  selectedMode: null,
  currentScreen: "mode-selection",
  isDataLoaded: false,
  loadErrors: []
};
window.__ONTAP_B1_STATE__ = appState;

export const BLUEPRINT = { A: 10, B: 5, C: 1, D: 1, E: 5, F: 1, G: 2, H: 2 };
export const SECTION_LABELS = { A: "Vocabulary", B: "Signs", C: "Reading", D: "Cloze Text", E: "Transformation", F: "Listening Fill", G: "Listening ABC", H: "True / False" };
