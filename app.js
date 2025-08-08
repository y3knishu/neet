// Razorpay + Firebase Functions API base URL
const PROJECT_ID = "neetpg-quiz-app"; // <-- Replace with your actual Firebase project ID
const IS_LOCAL = location.hostname === "localhost" || location.hostname === "127.0.0.1";

const FUNCTIONS_BASE_URL = IS_LOCAL
  ? `http://127.0.0.1:5001/${PROJECT_ID}/us-central1/api`
  : `https://us-central1-${PROJECT_ID}.cloudfunctions.net/api`;

// Main frontend logic (auth, homepage, quiz)
const RAZORPAY_KEY = 'rzp_live_7nZptAUoDrsfRb'; // your key
const ADMIN_EMAIL = 'y3knishu@gmail.com';

// UI elements (index.html)
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailSpan = document.getElementById('userEmail');
const subjectsGrid = document.getElementById('subjectsGrid');

// Quiz page elements may or may not exist on index context
const qText = document.getElementById('qText');
const qImage = document.getElementById('qImage');
const optionsDiv = document.getElementById('options');
const palette = document.getElementById('palette');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const retryBtn = document.getElementById('retryBtn');
const summaryDiv = document.getElementById('summary');
const subjectTitle = document.getElementById('subjectTitle');

let currentUser = null;
let subjectId = null;
let questions = [];
let currentIndex = 0;
let answers = {}; // qid -> selectedIndex
let stats = {correct:0, wrong:0, attempted:0};

// Auth UI
if(loginBtn){
  loginBtn.addEventListener('click', ()=>{
    // simple Google sign-in popup
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err=>alert(err.message));
  });
}

if(logoutBtn){
  logoutBtn.addEventListener('click', ()=>{
    firebase.auth().signOut();
  });
}

// Auth state observer
auth.onAuthStateChanged(async user=>{
  currentUser = user;
  if(user){
    userEmailSpan.textContent = user.email;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
  } else {
    userEmailSpan.textContent = '';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
  }
  if(document.location.pathname.endsWith('index.html') || document.location.pathname === '/' ){
    renderSubjects();
  }
  if(document.location.pathname.endsWith('quiz.html')){
    // quiz will be launched with ?sub=subjectId in URL
    const urlParams = new URLSearchParams(location.search);
    subjectId = urlParams.get('sub');
    await loadSubjectQuiz(subjectId);
    renderQuestion(currentIndex);
  }
});

async function renderSubjects(){
  const subs = await getSubjects();
  subjectsGrid.innerHTML = '';
  for(const s of subs){
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `<h3>${s.title}</h3><p class="year">${s.year}</p><div class="progress"><div class="bar" style="width:0%"></div></div>`;

    const openBtn = document.createElement('button');
    openBtn.textContent = s.price===0? 'Open' : 'Locked';
    openBtn.className = 'open-btn';
    openBtn.addEventListener('click', ()=>openSubject(s));
    card.appendChild(openBtn);
    subjectsGrid.appendChild(card);

    // fetch progress for logged-in users
    if(currentUser){
      const pdoc = await userDocRef(currentUser.uid).collection('progress').doc(s.id).get();
      if(pdoc.exists){
        const d = pdoc.data();
        const percent = Math.round(((d.attempted||0)/(d.totalQuestions||0))*100) || 0;
        card.querySelector('.bar').style.width = percent + '%';
        openBtn.textContent = d.unlocked? 'Open' : (s.price===0? 'Open' : 'Locked');
      } else {
        card.querySelector('.bar').style.width = '0%';
      }
    }
  }
}

async function openSubject(s){
  if(s.price === 0){
    location.href = `quiz.html?sub=${s.id}`;
    return;
  }
  if(!currentUser){
    alert('Please sign in to access this subject');
    return;
  }
  // Check Firestore for user unlock
  const pRef = userDocRef(currentUser.uid).collection('progress').doc(s.id);
  const pSnap = await pRef.get();
  if(pSnap.exists && pSnap.data().unlocked){
    location.href = `quiz.html?sub=${s.id}`;
    return;
  }
  // Not unlocked — start Razorpay checkout
  startRazorpayCheckout(s);
}

function startRazorpayCheckout(s){
  // NOTE: ideally generate order on server. Here we do client-only basic checkout.
  const options = {
    key: RAZORPAY_KEY,
    amount: s.price*100, // in paise
    currency: 'INR',
    name: 'NEET PG Practice',
    description: `${s.title} Unlock`,
    handler: async function (response){
      // response contains payment_id, order_id, signature — verify on server in production
      // For demo, mark as unlocked
      if(currentUser){
        await userDocRef(currentUser.uid).collection('progress').doc(s.id).set({unlocked:true, totalQuestions:0}, {merge:true});
        alert('Payment successful — subject unlocked');
        location.href = `quiz.html?sub=${s.id}`;
      } else {
        alert('Payment success but no user session — please login then contact admin');
      }
    },
    prefill: {email: currentUser? currentUser.email : ''}
  };
  const rzp = new Razorpay(options);
  rzp.open();
}

// Load questions for a subject
async function loadSubjectQuiz(subId){
  subjectTitle && (subjectTitle.textContent = subId);
  // fetch all questions from Firestore collection `subjects/{subId}/questions`
  const qs = [];
  const snap = await db.collection('subjects').doc(subId).collection('questions').orderBy('qno').get();
  snap.forEach(d=>{
    const data = d.data(); data._id = d.id; qs.push(data);
  });
  questions = qs;
  // initialize answers and stats
  answers = {};
  stats = {correct:0, wrong:0, attempted:0};
  currentIndex = 0;
  buildPalette();
}

function buildPalette(){
  if(!palette) return;
  palette.innerHTML = '';
  questions.forEach((q, i)=>{
    const btn = document.createElement('button');
    btn.className = 'pal-btn';
    btn.textContent = i+1;
    btn.addEventListener('click', ()=>{ currentIndex = i; renderQuestion(i); });
    palette.appendChild(btn);
  });
}

function renderQuestion(i){
  if(!questions[i]) return;
  const q = questions[i];
  qText && (qText.textContent = `${i+1}. ${q.q}`);
  if(q.imageUrl){
    qImage.src = q.imageUrl; qImage.style.display = 'block';
  } else { qImage.style.display = 'none'; }

  if(optionsDiv){
    optionsDiv.innerHTML = '';
    q.options.forEach((opt, idx)=>{
      const b = document.createElement('button');
      b.className = 'opt-btn';
      b.innerHTML = opt;
      b.dataset.idx = idx;
      b.addEventListener('click', ()=>{ selectOption(i, idx, b); });
      optionsDiv.appendChild(b);
    });
  }
}

async function selectOption(qi, idx, btnEl){
  const q = questions[qi];
  // instant validation: mark selected red/green
  // disable options after selection
  const optionButtons = optionsDiv.querySelectorAll('.opt-btn');
  optionButtons.forEach(b=> b.disabled = true);

  answers[q._id] = idx;
  const correctIdx = q.answer; // number
  if(idx === correctIdx){
    btnEl.classList.add('correct');
    stats.correct++;
  } else {
    btnEl.classList.add('wrong');
    // highlight correct option
    const cb = Array.from(optionButtons).find(b=> +b.dataset.idx === correctIdx);
    if(cb) cb.classList.add('correct');
    stats.wrong++;
  }
  stats.attempted++;

  // save progress to Firestore
  if(currentUser){
    const pRef = userDocRef(currentUser.uid).collection('progress').doc(subjectId);
    await pRef.set({attempted: stats.attempted, correct: stats.correct, wrong: stats.wrong, totalQuestions: questions.length}, {merge:true});
  }

  // update palette color
  const palBtns = palette.querySelectorAll('.pal-btn');
  if(palBtns[qi]){
    palBtns[qi].classList.toggle('answered', true);
  }
}

if(prevBtn) prevBtn.addEventListener('click', ()=>{ if(currentIndex>0) currentIndex--; renderQuestion(currentIndex); });
if(nextBtn) nextBtn.addEventListener('click', ()=>{ if(currentIndex<questions.length-1) currentIndex++; renderQuestion(currentIndex); });
if(submitBtn) submitBtn.addEventListener('click', showSummary);
if(retryBtn) retryBtn.addEventListener('click', retryTest);

function showSummary(){
  if(!summaryDiv) return;
  summaryDiv.style.display = 'block';
  summaryDiv.innerHTML = `<h3>Summary</h3><p>Attempted: ${stats.attempted}</p><p>Correct: ${stats.correct}</p><p>Wrong: ${stats.wrong}</p><p>Score: ${stats.correct*4 - stats.wrong}</p>`;
}

async function retryTest(){
  if(!confirm('Reset this test?')) return;
  answers = {}; stats = {correct:0, wrong:0, attempted:0};
  // reset Firestore progress for this subject for the user (but keep unlocked)
  if(currentUser){
    const pRef = userDocRef(currentUser.uid).collection('progress').doc(subjectId);
    await pRef.set({attempted:0, correct:0, wrong:0}, {merge:true});
  }
  // rebuild palette and reload
  buildPalette();
  renderQuestion(0);
}

// load Razorpay script on demand
(function loadRzp(){
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  document.head.appendChild(s);
})();