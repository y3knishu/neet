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
        <button data-id="${doc.id}" class="deleteBtn" style="color:red;">Delete</button>
      </td>
    `;
    questionsTableBody.appendChild(tr);
  });

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
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    adminPanel.style.display = "block";
    loadQuestions();
  } else {
    adminEmailSpan.textContent = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    adminPanel.style.display = "none";
  }
});

questionForm.onsubmit = async e => {
  e.preventDefault();
  if (!isAdmin(currentUser)) {
    alert("Not authorized");
    return;
  }
  const data = {
    subject: subjectSelect.value,
    questionNumber: Number(questionNumberInput.value),
    question: questionTextInput.value.trim(),
    options: optionInputs.map(input => input.value.trim()),
    answer: Number(correctAnswerInput.value),
    imageUrl: imageUrlInput.value.trim(),
  };
  if (editingQuestionId) {
    await db.collection("questions").doc(editingQuestionId).set(data);
  } else {
    await db.collection("questions").add(data);
  }
  alert("Question saved!");
  clearForm();
  loadQuestions();
};

document.getElementById("resetFormBtn").onclick = () => {
  clearForm();
};

bulkUploadBtn.onclick = async () => {
  if (!isAdmin(currentUser)) {
    alert("Not authorized");
    return;
  }
  try {
    const questionsArray = JSON.parse(bulkUploadTextarea.value);
    if (!Array.isArray(questionsArray)) throw new Error("Invalid JSON array");
    const batch = db.batch();
    questionsArray.forEach(q => {
      const docRef = db.collection("questions").doc();
      batch.set(docRef, {
        subject: q.subject,
        questionNumber: q.questionNumber,
        question: q.question,
        options: q.options,
        answer: q.answer,
        imageUrl: q.imageUrl || "",
      });
    });
    await batch.commit();
    alert("Bulk upload successful!");
    bulkUploadTextarea.value = "";
    loadQuestions();
  } catch (e) {
    alert("Bulk upload error: " + e.message);
  }
};
