const firebaseConfig = {
  apiKey: "AIzaSyDr3_9dpo55esyfpkwsAjfFi_1KMu0ZDrU",
  authDomain: "neet-88499.firebaseapp.com",
  projectId: "neet-88499",
  storageBucket: "neet-88499.firebasestorage.app",
  messagingSenderId: "889163298965",
  appId: "1:889163298965:web:fbae28b0ba478cff2f839c",
  measurementId: "G-GEG090K2JQ"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const subject = urlParams.get("subject");
if (!subject) {
  alert("Subject not specified!");
  window.location.href = "index.html";
}

const questionNumberEl = document.getElementById("questionNumber");
const questionTextEl = document.getElementById("questionText");
const questionImageEl = document.getElementById("questionImage");
const optionsEl = document.getElementById("options");
const paletteEl = document.getElementById("palette");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const retryBtn = document.getElementById("retryBtn");
const homeBtn = document.getElementById("homeBtn");

const resultSummary = document.getElementById("resultSummary");
const correctCountEl = document.getElementById("correctCount");
const wrongCountEl = document.getElementById("wrongCount");
const attemptedCountEl = document.getElementById("attemptedCount");
const totalScoreEl = document.getElementById("totalScore");

let questions = [];
let currentIndex = 0;
let answers = {}; // key=questionId, value = chosen option index
let correctAnswers = {}; // key=questionId, value = correct answer index

let currentUser = null;
let userProgressDoc = null;

auth.onAuthStateChanged(user => {
  if (!user) {
    alert("You must login to attempt quiz");
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  loadQuestions();
});

async function loadQuestions() {
  const snapshot = await db.collection("questions")
    .where("subject", "==", subject)
    .orderBy("questionNumber")
    .get();
  if (snapshot.empty) {
    alert("No questions found for " + subject);
    window.location.href = "index.html";
    return;
  }
  questions = [];
  snapshot.forEach(doc => {
    const q = doc.data();
    q.id = doc.id;
    questions.push(q);
    correctAnswers[doc.id] = q.answer;
  });

  // Load user progress if any
  const progressRef = db.collection("users").doc(currentUser.uid).collection("progress").doc(subject);
  userProgressDoc = progressRef;
  const progressSnap = await progressRef.get();
  if (progressSnap.exists) {
    const data = progressSnap.data();
    answers = data.answers || {};
  }

  renderPalette();
  showQuestion(currentIndex);
}

function renderPalette() {
  paletteEl.innerHTML = "";
  questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.classList.add("palette-item");
    if (i === currentIndex) div.classList.add("current");

    if (answers[q.id] !== undefined) {
      div.classList.add("answered");
      if (answers[q.id] === correctAnswers[q.id]) div.classList.add("correct");
      else div.classList.add("wrong");
    }
    div.textContent = i + 1;
    div.onclick = () => {
      if (i === currentIndex) return;
      currentIndex = i;
      showQuestion(currentIndex);
    };
    paletteEl.appendChild(div);
  });
}

function showQuestion(index) {
  const q = questions[index];
  questionNumberEl.textContent = `Q${q.questionNumber}`;
  questionTextEl.textContent = q.question;
  if (q.imageUrl) {
    questionImageEl.src = q.imageUrl;
    questionImageEl.style.display = "block";
  } else {
    questionImageEl.style.display = "none";
  }
  optionsEl.innerHTML = "";
  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.classList.add("option");
    div.textContent = opt;
    if (answers[q.id] !== undefined) {
      div.classList.add("disabled");
      if (i === correctAnswers[q.id]) div.classList.add("correct");
      if (i === answers[q.id] && answers[q.id] !== correctAnswers[q.id]) div.classList.add("wrong");
    }
    div.onclick = () => {
      if (answers[q.id] !== undefined) return;
      answers[q.id] = i;
      saveProgress();
      renderPalette();
      showQuestion(currentIndex);
    };
    optionsEl.appendChild(div);
  });
  updateNavButtons();
}

function updateNavButtons() {
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === questions.length - 1;
  submitBtn.style.display = "inline-block";
  retryBtn.style.display = "none";
  resultSummary.style.display = "none";
}

prevBtn.onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    showQuestion(currentIndex);
  }
};

nextBtn.onclick = () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    showQuestion(currentIndex);
  }
};

submitBtn.onclick = () => {
  let correct = 0, wrong = 0, attempted = 0;
  questions.forEach(q => {
    if (answers[q.id] !== undefined) {
      attempted++;
      if (answers[q.id] === correctAnswers[q.id]) correct++;
      else wrong++;
    }
  });
  const totalScore = (correct * 4) - (wrong);
  correctCountEl.textContent = correct;
  wrongCountEl.textContent = wrong;
  attemptedCountEl.textContent = attempted;
  totalScoreEl.textContent = totalScore;

  resultSummary.style.display = "block";
  submitBtn.style.display = "none";
  retryBtn.style.display = "inline-block";
};

retryBtn.onclick = () => {
  answers = {};
  saveProgress();
  currentIndex = 0;
  showQuestion(currentIndex);
};

homeBtn.onclick = () => {
  window.location.href = "index.html";
};

async function saveProgress() {
  if (!currentUser) return;
  await userProgressDoc.set({ answers }, { merge: true });
}
