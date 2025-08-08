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

const adminEmail = "y3knishu@gmail.com";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminEmailSpan = document.getElementById("adminEmail");
const adminPanel = document.getElementById("adminPanel");

const subjectSelect = document.getElementById("subjectSelect");
const questionNumberInput = document.getElementById("questionNumber");
const questionTextInput = document.getElementById("questionText");
const optionInputs = [
  document.getElementById("option0"),
  document.getElementById("option1"),
  document.getElementById("option2"),
  document.getElementById("option3"),
];
const correctAnswerInput = document.getElementById("correctAnswer");
const imageUrlInput = document.getElementById("imageUrl");
const questionForm = document.getElementById("questionForm");

const bulkUploadTextarea = document.getElementById("bulkUploadTextarea");
const bulkUploadBtn = document.getElementById("bulkUploadBtn");

const questionsTableBody = document.querySelector("#questionsTable tbody");

let editingQuestionId = null;
let currentUser = null;

function isAdmin(user) {
  return user && user.email === adminEmail;
}

function clearForm() {
  subjectSelect.value = "";
  questionNumberInput.value = "";
  questionTextInput.value = "";
  optionInputs.forEach(input => input.value = "");
  correctAnswerInput.value = "";
  imageUrlInput.value = "";
  editingQuestionId = null;
}

async function loadQuestions() {
  questionsTableBody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
  const snapshot = await db.collection("questions").orderBy("subject").orderBy("questionNumber").get();
  questionsTableBody.innerHTML = "";
  snapshot.forEach(doc => {
    const q = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${q.subject}</td>
      <td>${q.questionNumber}</td>
      <td>${q.question.substring(0, 60)}${q.question.length > 60 ? "..." : ""}</td>
      <td>
        <button data-id="${doc.id}" class="editBtn">Edit</button>
        <button data-id="${doc.id}" class="deleteBtn btn-danger">Delete</button>
      </td>
    `;
    questionsTableBody.appendChild(tr);
  });

  // Add event listeners for edit/delete
  document.querySelectorAll(".editBtn").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const doc = await db.collection("questions").doc(id).get();
      if (!doc.exists) return alert("Question not found");
      const q = doc.data();
      editingQuestionId = id;
      subjectSelect.value = q.subject;
      questionNumberInput.value = q.questionNumber;
      questionTextInput.value = q.question;
      q.options.forEach((opt, i) => {
        if (optionInputs[i]) optionInputs[i].value = opt;
      });
      correctAnswerInput.value = q.answer;
      imageUrlInput.value = q.imageUrl || "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });

  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (confirm("Are you sure you want to delete this question?")) {
        await db.collection("questions").doc(id).delete();
        loadQuestions();
      }
    };
  });
}

loginBtn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    if (!isAdmin(result.user)) {
      alert("You are not authorized to access admin panel.");
      await auth.signOut();
      return;
    }
  } catch (e) {
    alert("Login failed: " + e.message);
  }
};

logoutBtn.onclick = async () => {
  await auth.signOut();
};

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (isAdmin(user)) {
    adminEmailSpan.textContent = user.email;
    adminPanel.style.display = "block";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    loadQuestions();
  } else {
    adminEmailSpan.textContent = "";
    adminPanel.style.display = "none";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

questionForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!isAdmin(currentUser)) {
    alert("Unauthorized");
    return;
  }
  const subject = subjectSelect.value.trim();
  const questionNumber = Number(questionNumberInput.value);
  const question = questionTextInput.value.trim();
  const options = optionInputs.map(i => i.value.trim());
  const answer = Number(correctAnswerInput.value);
  const imageUrl = imageUrlInput.value.trim();

  if (!subject || !question || options.some(o => o === "") || isNaN(answer) || answer < 0 || answer > 3) {
    alert("Please fill all fields correctly.");
    return;
  }

  const data = { subject, questionNumber, question, options, answer, imageUrl };

  if (editingQuestionId) {
    await db.collection("questions").doc(editingQuestionId).set(data);
    alert("Question updated");
  } else {
    await db.collection("questions").add(data);
    alert("Question added");
  }
  clearForm();
  loadQuestions();
};

bulkUploadBtn.onclick = async () => {
  if (!isAdmin(currentUser)) {
    alert("Unauthorized");
    return;
  }
  let bulkData;
  try {
    bulkData = JSON.parse(bulkUploadTextarea.value);
    if (!Array.isArray(bulkData)) throw new Error("JSON should be an array");
  } catch (e) {
    alert("Invalid JSON: " + e.message);
    return;
  }

  if (!confirm(`Are you sure you want to upload ${bulkData.length} questions? This may overwrite existing data.`)) return;

  const batch = db.batch();

  bulkData.forEach((q, idx) => {
    if (
      !q.subject || !q.questionNumber || !q.question || !q.options || !Array.isArray(q.options) ||
      q.options.length !== 4 || typeof q.answer !== "number"
    ) {
      console.warn(`Skipping invalid question at index ${idx}`, q);
      return;
    }
    const docRef = db.collection("questions").doc(); // auto ID
    batch.set(docRef, q);
  });

  try {
    await batch.commit();
    alert("Bulk upload completed");
    bulkUploadTextarea.value = "";
    loadQuestions();
  } catch (err) {
    alert("Error uploading bulk questions: " + err.message);
  }
};
