// Your Firebase config (exact)
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

// Auto-detect Firebase Functions URL for Razorpay
const FUNCTIONS_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? `http://127.0.0.1:5001/${firebaseConfig.projectId}/us-central1/api`
  : `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/api`;

// Subject list
const subjects = [
  { name: "Anatomy", free: true },
  { name: "Physiology", free: false },
  { name: "Biochemistry", free: false },
  { name: "Pathology", free: false },
  { name: "Pharmacology", free: false },
  { name: "Microbiology", free: false },
  { name: "Forensic Medicine", free: false },
  { name: "Community Medicine", free: false },
  { name: "ENT", free: false },
  { name: "Ophthalmology", free: false },
  { name: "General Medicine", free: false },
  { name: "General Surgery", free: false },
  { name: "Obstetrics & Gynaecology", free: false },
  { name: "Pediatrics", free: false },
  { name: "Orthopaedics", free: false },
  { name: "Dermatology", free: false },
  { name: "Psychiatry", free: false },
  { name: "Respiratory Medicine", free: false },
  { name: "Anesthesiology", free: false }
];

let currentUser = null;
let isPaidUser = false;

// Render subjects on homepage
function renderSubjects() {
  const container = document.getElementById("subjectsContainer");
  container.innerHTML = "";
  subjects.forEach(sub => {
    const card = document.createElement("div");
    card.className = "subject-card";
    // random pastel gradient background for rainbow effect
    const hue1 = Math.floor(Math.random() * 360);
    const hue2 = (hue1 + 30) % 360;
    card.style.background = `linear-gradient(135deg, hsl(${hue1}, 70%, 80%), hsl(${hue2}, 70%, 75%))`;

    const isUnlocked = sub.free || isPaidUser || (currentUser && currentUser.email === "y3knishu@gmail.com");
    card.innerHTML = `
      <h3>${sub.name} ${isUnlocked ? "" : "🔒"}</h3>
      <div class="progress-bar"><div class="progress-fill" id="progress-${sub.name.replace(/\s+/g,'-')}"></div></div>
      <p id="stats-${sub.name.replace(/\s+/g,'-')}">Attempted: 0 | Correct: 0 | Wrong: 0</p>
    `;

    if (isUnlocked) {
      card.style.cursor = "pointer";
      card.onclick = () => window.location.href = `quiz.html?subject=${encodeURIComponent(sub.name)}`;
    } else {
      card.classList.add("locked");
      card.onclick = () => startPayment();
    }

    container.appendChild(card);

    if (currentUser) loadProgress(currentUser.uid, sub.name);
  });
}

// Load progress from Firestore for a subject and user
function loadProgress(uid, subject) {
  db.collection("users").doc(uid).collection("progress").doc(subject)
    .get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        const attempted = data.attempted || 0;
        const correct = data.correct || 0;
        const wrong = data.wrong || 0;
        const totalQuestions = data.totalQuestions || 20; // default total

        document.getElementById(`stats-${subject.replace(/\s+/g,'-')}`).innerText =
          `Attempted: ${attempted} | Correct: ${correct} | Wrong: ${wrong}`;
        const progressPercent = (attempted / totalQuestions) * 100;
        document.getElementById(`progress-${subject.replace(/\s+/g,'-')}`).style.width = `${progressPercent}%`;
      }
    });
}

// Login with Google
async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
}

// Logout user
async function logoutUser() {
  await auth.signOut();
}

// Auth state listener
auth.onAuthStateChanged(async user => {
  currentUser = user;
  if (user) {
    const doc = await db.collection("users").doc(user.uid).get();
    isPaidUser = doc.exists && doc.data().isPaid === true;
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("logoutBtn").style.display = "inline-block";
    document.getElementById("userName").innerText = `Hello, ${user.displayName || user.email}`;
  } else {
    isPaidUser = false;
    document.getElementById("loginBtn").style.display = "inline-block";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("userName").innerText = "";
  }
  renderSubjects();
});

// Razorpay payment start
function startPayment() {
  if (!currentUser) {
    alert("Please login to unlock all subjects.");
    return;
  }
  fetch(`${FUNCTIONS_BASE_URL}/createOrder`, { method: "POST" })
    .then(res => res.json())
    .then(order => {
      const options = {
        key: "rzp_live_7nZptAUoDrsfRb",
        amount: order.amount,
        currency: "INR",
        name: "NEET PG Quiz",
        description: "Unlock all subjects",
        order_id: order.id,
        handler: function (response) {
          alert("Payment successful! Unlocking all subjects.");
          db.collection("users").doc(currentUser.uid).set({ isPaid: true }, { merge: true });
          isPaidUser = true;
          renderSubjects();
        },
        modal: {
          ondismiss: function () {
            alert("Payment cancelled.");
          }
        }
      };
      new Razorpay(options).open();
    })
    .catch(err => {
      alert("Payment error: " + err.message);
    });
}

// Attach login/logout buttons (make sure these exist in your HTML)
document.getElementById("loginBtn").onclick = loginWithGoogle;
document.getElementById("logoutBtn").onclick = logoutUser;
