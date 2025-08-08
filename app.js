const firebaseConfig = {
  apiKey: "AIzaSyDr3_9dpo55esyfpkwsAjfFi_1KMu0ZDrU",
  authDomain: "neet-88499.firebaseapp.com",
  projectId: "neet-88499",
  storageBucket: "neet-88499.firebasestorage.app",
  messagingSenderId: "889163298965",
  appId: "1:889163298965:web:fbae28b0ba478cff2f839c",
  measurementId: "G-GEG090K2JQ"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Your quiz app logic below — example skeleton:

let currentUser = null;
let selectedSubject = null;
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // questionNumber -> chosenOptionIndex

// Auth state observer
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    console.log("User logged in:", user.email);
    loadUserProgress();
  } else {
    console.log("User logged out");
    // Show login buttons or homepage accordingly
  }
});

// Example: Load questions of selected subject
async function loadQuestions(subject) {
  selectedSubject = subject;
  const snapshot = await db.collection("questions")
    .where("subject", "==", subject)
    .orderBy("questionNumber")
    .get();
  questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  currentQuestionIndex = 0;
  userAnswers = {};
  renderQuestion();
}

// Example: Save progress to Firestore per user and subject
async function saveProgress() {
  if (!currentUser || !selectedSubject) return;
  const progressRef = db.collection("users").doc(currentUser.uid).collection("progress").doc(selectedSubject);
  await progressRef.set({
    answers: userAnswers,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Example: Load user progress
async function loadUserProgress() {
  if (!currentUser || !selectedSubject) return;
  const progressRef = db.collection("users").doc(currentUser.uid).collection("progress").doc(selectedSubject);
  const doc = await progressRef.get();
  if (doc.exists) {
    userAnswers = doc.data().answers || {};
    renderQuestion();
  }
}

// Implement your UI renderQuestion, handleAnswerSelection, submitQuiz, resetQuiz, palette etc. below...
