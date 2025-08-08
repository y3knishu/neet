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

const subjects = [
  { id: "Anatomy", year: "1st Year", className: "anatomy", price: 0 },
  { id: "Physiology", year: "1st Year", className: "physiology", price: 99 },
  { id: "Biochemistry", year: "1st Year", className: "biochemistry", price: 99 },
  { id: "Pathology", year: "2nd Year", className: "pathology", price: 99 },
  { id: "Pharmacology", year: "2nd Year", className: "pharmacology", price: 99 },
  { id: "Microbiology", year: "2nd Year", className: "microbiology", price: 99 },
  { id: "Forensic Medicine", year: "2nd Year", className: "forensic", price: 99 },
  { id: "Community Medicine", year: "3rd Year", className: "community", price: 99 },
  { id: "ENT", year: "3rd Year", className: "ent", price: 99 },
  { id: "Ophthalmology", year: "3rd Year", className: "ophthalmology", price: 99 },
  { id: "General Medicine", year: "Final Year", className: "generalmedicine", price: 99 },
  { id: "General Surgery", year: "Final Year", className: "generalsurgery", price: 99 },
  { id: "Obstetrics & Gynaecology", year: "Final Year", className: "obgyn", price: 99 },
  { id: "Pediatrics", year: "Final Year", className: "pediatrics", price: 99 },
  { id: "Orthopaedics", year: "Final Year", className: "orthopaedics", price: 99 },
  { id: "Dermatology", year: "Final Year", className: "dermatology", price: 99 },
  { id: "Psychiatry", year: "Final Year", className: "psychiatry", price: 99 },
  { id: "Respiratory Medicine", year: "Final Year", className: "respiratory", price: 99 },
  { id: "Anesthesiology", year: "Final Year", className: "anesthesiology", price: 99 },
];

let currentUser = null;
const userPurchases = {};

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmailSpan = document.getElementById("userEmail");
const subjectsContainer = document.getElementById("subjectsContainer");

function renderSubjects() {
  subjectsContainer.innerHTML = "";
  subjects.forEach(sub => {
    const card = document.createElement("div");
    card.classList.add("subject-card", sub.className);
    card.textContent = sub.id + " (" + sub.year + ")";
    if (!currentUser) {
      if (sub.price > 0) {
        card.innerHTML += '<div class="locked-overlay">Login Required</div>';
        card.style.cursor = "default";
        card.onclick = null;
      } else {
        card.onclick = () => alert("Free Subject: " + sub.id + " - Start Quiz (TODO)");
      }
    } else {
      if (sub.price > 0 && !userPurchases[sub.id]) {
        card.innerHTML += '<div class="locked-overlay">Locked - Pay ₹' + sub.price + '</div>';
        card.onclick = () => alert("Please pay to unlock " + sub.id + " (TODO Razorpay integration)");
      } else {
        card.onclick = () => alert("Start Quiz: " + sub.id + " (TODO: navigate to quiz page)");
      }
    }
    subjectsContainer.appendChild(card);
  });
}

loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => alert("Login failed: " + err.message));
};

logoutBtn.onclick = () => {
  auth.signOut();
};

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    userEmailSpan.textContent = user.email;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    if(user.email === "y3knishu@gmail.com") {
      // admin has all access free
      subjects.forEach(s => userPurchases[s.id] = true);
    } else {
      userPurchases["Anatomy"] = true; // everyone gets free Anatomy
    }
  } else {
    userEmailSpan.textContent = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    Object.keys(userPurchases).forEach(k => delete userPurchases[k]);
  }
  renderSubjects();
});
