const firebaseConfig = {
  apiKey: "AIzaSyDohygxGWFCQ-Kn2yROr_cviSUcD0drt0M",
  authDomain: "nishant-website.firebaseapp.com",
  projectId: "nishant-website",
  storageBucket: "nishant-website.firebasestorage.app",
  messagingSenderId: "92337870765",
  appId: "1:92337870765:web:664418f551133e356fb324",
  measurementId: "G-08FZCL9GVS"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let subject = null;

const paletteDiv = document.getElementById("palette");
const questionText = document.getElementById("questionText");
const questionImage = document.getElementById("questionImage");
const optionsContainer = document.getElementById("optionsContainer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const backHomeBtn = document.getElementById("backHomeBtn");
const scoreSummary = document.getElementById("scoreSummary");

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // key: question index, value: selected option index

function parseQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return params.get("subject");
}

async function loadQuestions(subjectName) {
  subject = subjectName;
  const qSnap = await db.collection("questions")
    .where("subject", "==", subjectName)
    .orderBy("questionNumber")
    .get();

  questions = qSnap.docs.map(doc => {
    let d = doc.data();
    return {
      id: doc.id,
      questionNumber: d.questionNumber,
      question: d.question,
      options: d.options,
      answer: d.answer,
      imageUrl: d.imageUrl || null
    };
  });

  // If no questions, show message
  if (questions.length === 0) {
    questionText.innerText = "No questions found for this subject.";
    optionsContainer.innerHTML = "";
    return;
  }

  // Load user answers from Firestore if logged in
  if (currentUser) {
    const progressDoc = await db.collection("users").doc(currentUser.uid)
      .collection("progress").doc(subject).get();
    if (progressDoc.exists) {
      userAnswers = progressDoc.data().userAnswers || {};
      currentQuestionIndex = progressDoc.data().lastQuestionIndex || 0;
    }
  }

  renderPalette();
  renderQuestion();
  updateNavigationButtons();
  updateSubmitButton();
}

function renderPalette() {
  paletteDiv.innerHTML = "";
  questions.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.textContent = idx + 1;
    btn.className = "";
    if (userAnswers[idx] !== undefined) {
      const correct = questions[idx].answer;
      if (userAnswers[idx] === correct) btn.classList.add("correct");
      else btn.classList.add("wrong");
    }
    if (idx === currentQuestionIndex) btn.classList.add("current");
    btn.onclick = () => {
      currentQuestionIndex = idx;
      renderQuestion();
      updateNavigationButtons();
      updateSubmitButton();
      renderPalette();
    };
    paletteDiv.appendChild(btn);
  });
}

function renderQuestion() {
  const q = questions[currentQuestionIndex];
  questionText.innerText = `Q${q.questionNumber}. ${q.question}`;

  if (q.imageUrl) {
    questionImage.src = q.imageUrl;
    questionImage.style.display = "block";
  } else {
    questionImage.style.display = "none";
  }

  optionsContainer.innerHTML = "";

  q.options.forEach((opt, idx) => {
    const div = document.createElement("div");
    div.className = "option";
    div.textContent = opt;
    div.onclick = () => selectAnswer(idx);
    if (userAnswers[currentQuestionIndex] !== undefined) {
      const correctIndex = q.answer;
      if (idx === userAnswers[currentQuestionIndex]) {
        if (idx === correctIndex) div.classList.add("correct");
        else div.classList.add("wrong");
      } else if (idx === correctIndex) {
        div.classList.add("correct");
      }
      div.style.cursor = "default";
    }
    optionsContainer.appendChild(div);
  });
}

function selectAnswer(optionIndex) {
  if (userAnswers[currentQuestionIndex] !== undefined) return; // prevent change after answering

  userAnswers[currentQuestionIndex] = optionIndex;
  renderQuestion();
  renderPalette();
  updateSubmitButton();

  saveProgress();
}

function updateNavigationButtons() {
  prevBtn.disabled = currentQuestionIndex === 0;
  nextBtn.disabled = currentQuestionIndex === questions.length - 1;
}

function updateSubmitButton() {
  const totalAnswered = Object.keys(userAnswers).length;
  submitBtn.disabled = totalAnswered === 0;
}

function saveProgress() {
  if (!currentUser) return;
  db.collection("users").doc(currentUser.uid).collection("progress").doc(subject).set({
    userAnswers,
    lastQuestionIndex: currentQuestionIndex,
    totalQuestions: questions.length
  });
}

function calculateScore() {
  let correct = 0, wrong = 0, attempted = 0;
  questions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    if (userAns !== undefined) {
      attempted++;
      if (userAns === q.answer) correct++;
      else wrong++;
    }
  });
  return { correct, wrong, attempted };
}

function showScoreSummary() {
  const { correct, wrong, attempted } = calculateScore();
  const score = (correct * 4) - (wrong * 1);
  scoreSummary.innerHTML = `
    <strong>Score Summary</strong><br/>
    Attempted: ${attempted}<br/>
    Correct: ${correct}<br/>
    Wrong: ${wrong}<br/>
    <br/>
    Total Score: ${score}
  `;
}

function resetTest() {
  if (!confirm("Are you sure you want to reset this test? All answers will be cleared.")) return;
  userAnswers = {};
  currentQuestionIndex = 0;
  saveProgress();
  renderQuestion();
  renderPalette();
  updateNavigationButtons();
  updateSubmitButton();
  scoreSummary.innerHTML = "";
}

prevBtn.onclick = () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
    updateNavigationButtons();
    updateSubmitButton();
    renderPalette();
  }
};

nextBtn.onclick = () => {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
    updateNavigationButtons();
    updateSubmitButton();
    renderPalette();
  }
};

submitBtn.onclick = () => {
  if (Object.keys(userAnswers).length === 0) {
    alert("Please attempt at least one question.");
    return;
  }
  showScoreSummary();
};

resetBtn.onclick = resetTest;

backHomeBtn.onclick = () => {
  window.location.href = "index.html";
};

auth.onAuthStateChanged(user => {
  currentUser = user;
  // If no user, redirect to home because quiz needs login
  if (!user) {
    alert("Please login first to attempt quiz.");
    window.location.href = "index.html";
  } else {
    subject = parseQueryParams();
    if (!subject) {
      alert("No subject selected. Redirecting to home.");
      window.location.href = "index.html";
    } else {
      loadQuestions(subject);
    }
  }
});
