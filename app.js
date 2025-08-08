// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyDohygxGWFCQ-Kn2yROr_cviSUcD0drt0M",
    authDomain: "nishant-website.firebaseapp.com",
    projectId: "nishant-website",
    storageBucket: "nishant-website.firebasestorage.app",
    messagingSenderId: "92337870765",
    appId: "1:92337870765:web:664418f551133e356fb324",
    measurementId: "G-08FZCL9GVS"
};

// ==================== FIREBASE INIT ====================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==================== AUTO-DETECT FUNCTIONS URL ====================
const FUNCTIONS_BASE_URL = `https://${firebaseConfig.projectId}.cloudfunctions.net`;

// ==================== SUBJECT LIST ====================
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

// ==================== RENDER HOMEPAGE ====================
function renderSubjects(user, isPaid) {
    const container = document.getElementById("subjects-container");
    container.innerHTML = "";

    subjects.forEach(sub => {
        const card = document.createElement("div");
        card.className = "subject-card";
        card.style.background = `linear-gradient(135deg, hsl(${Math.random() * 360}, 80%, 70%), hsl(${Math.random() * 360}, 80%, 60%))`;

        const lockIcon = !sub.free && !isPaid ? "🔒" : "";
        card.innerHTML = `
            <h3>${sub.name} ${lockIcon}</h3>
            <div class="progress-bar">
                <div class="progress-fill" id="progress-${sub.name}"></div>
            </div>
            <p id="stats-${sub.name}">Attempted: 0 | Correct: 0 | Wrong: 0</p>
        `;

        if (sub.free || isPaid) {
            card.onclick = () => {
                window.location.href = `quiz.html?subject=${encodeURIComponent(sub.name)}`;
            };
        } else {
            card.onclick = () => {
                startPayment();
            };
        }

        container.appendChild(card);

        if (user) {
            loadProgress(user.uid, sub.name);
        }
    });
}

// ==================== LOAD PROGRESS ====================
function loadProgress(uid, subject) {
    db.collection("users").doc(uid).collection("progress").doc(subject)
        .get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const attempted = data.attempted || 0;
                const correct = data.correct || 0;
                const wrong = data.wrong || 0;
                const total = attempted + wrong; // approximate

                document.getElementById(`stats-${subject}`).innerText = 
                    `Attempted: ${attempted} | Correct: ${correct} | Wrong: ${wrong}`;
                document.getElementById(`progress-${subject}`).style.width = `${(attempted / (data.totalQuestions || 1)) * 100}%`;
            }
        });
}

// ==================== LOGIN HANDLERS ====================
document.getElementById("google-login").addEventListener("click", () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
});

document.getElementById("email-login").addEventListener("click", () => {
    const email = prompt("Enter Email:");
    const pass = prompt("Enter Password:");
    auth.signInWithEmailAndPassword(email, pass).catch(err => alert(err.message));
});

document.getElementById("logout").addEventListener("click", () => {
    auth.signOut();
});

// ==================== AUTH STATE ====================
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection("users").doc(user.uid).get().then(doc => {
            const isPaid = doc.exists && doc.data().isPaid;
            renderSubjects(user, isPaid || user.email === "y3knishu@gmail.com");
        });
    } else {
        renderSubjects(null, false);
    }
});

// ==================== RAZORPAY PAYMENT ====================
function startPayment() {
    fetch(`${FUNCTIONS_BASE_URL}/createOrder`, { method: "POST" })
        .then(res => res.json())
        .then(order => {
            var options = {
                key: "rzp_live_7nZptAUoDrsfRb",
                amount: order.amount,
                currency: "INR",
                name: "NEET PG Quiz",
                description: "Unlock all subjects",
                order_id: order.id,
                handler: function (response) {
                    alert("Payment successful! Unlocking subjects...");
                    const user = auth.currentUser;
                    if (user) {
                        db.collection("users").doc(user.uid).set({ isPaid: true }, { merge: true });
                        renderSubjects(user, true);
                    }
                }
            };
            new Razorpay(options).open();
        })
        .catch(err => alert(err.message));
}
