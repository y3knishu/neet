// Admin panel logic — accessible only if logged-in user email matches ADMIN_EMAIL
const ADMIN_EMAIL = 'y3knishu@gmail.com';

const adminAreaEl = document.getElementById('adminArea');

auth.onAuthStateChanged(async user=>{
  if(!user) {
    adminAreaEl.innerHTML = '<p>Please login to access admin panel.</p>';
    return;
  }
  if(user.email !== ADMIN_EMAIL){
    adminAreaEl.innerHTML = '<p>Access denied. You are not admin.</p>';
    return;
  }
  renderAdmin();
});

async function renderAdmin(){
  const subjects = await getSubjects();
  adminAreaEl.innerHTML = `
    <h3>Admin — Manage Questions</h3>
    <div class="admin-form">
      <label>Choose subject:</label>
      <select id="subSelect"></select>

      <div id="editor">
        <label>Question number (qno)</label>
        <input id="qno" type="number" />

        <label>Question text</label>
        <textarea id="qText" rows="3"></textarea>

        <div class="row">
          <div class="col">
            <label>Option 1</label>
            <input id="opt0" type="text" />
          </div>
          <div class="col">
            <label>Option 2</label>
            <input id="opt1" type="text" />
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Option 3</label>
            <input id="opt2" type="text" />
          </div>
          <div class="col">
            <label>Option 4</label>
            <input id="opt3" type="text" />
          </div>
        </div>

        <label>Correct option</label>
        <select id="correctOpt">
          <option value="0">Option 1</option>
          <option value="1">Option 2</option>
          <option value="2">Option 3</option>
          <option value="3">Option 4</option>
        </select>

        <label>Image URL (optional)</label>
        <input id="imgUrl" type="text" placeholder="https://..." />

        <div class="controls">
          <button id="addQ">Add Question</button>
          <button id="updateQ" class="hidden">Update Question</button>
          <button id="clearForm">Clear</button>
        </div>

        <hr />
        <div class="controls">
          <input id="bulkFile" type="file" accept="application/json" />
          <button id="bulkUpload">Bulk Upload (from file)</button>
          <button id="exportSubject">Export Subject JSON</button>
          <button id="exportAll">Export All Subjects</button>
        </div>
      </div>
    </div>

    <div id="questionsList" style="margin-top:16px"></div>
  `;

  const subSelect = document.getElementById('subSelect');
  subjects.forEach(s=>{ const op = document.createElement('option'); op.value=s.id; op.textContent=s.title; subSelect.appendChild(op); });

  subSelect.addEventListener('change', ()=> loadQuestions(subSelect.value));
  document.getElementById('addQ').addEventListener('click', ()=> addQuestion(subSelect.value));
  document.getElementById('updateQ').addEventListener('click', ()=> saveUpdate(subSelect.value));
  document.getElementById('clearForm').addEventListener('click', clearForm);
  document.getElementById('bulkUpload').addEventListener('click', ()=> handleBulkFile(subSelect.value));
  document.getElementById('exportSubject').addEventListener('click', ()=> exportSubjectJSON(subSelect.value));
  document.getElementById('exportAll').addEventListener('click', exportAllSubjectsJSON);

  // load first subject by default
  if(subjects[0]) loadQuestions(subjects[0].id);
}

async function loadQuestions(subId){
  const qList = document.getElementById('questionsList');
  qList.innerHTML = 'Loading...';
  const snap = await db.collection('subjects').doc(subId).collection('questions').orderBy('qno').get();
  qList.innerHTML = '';
  snap.forEach(doc=>{
    const d = doc.data();
    const div = document.createElement('div'); div.className='admin-q';
    div.innerHTML = `<strong>Q${d.qno}:</strong> ${escapeHtml(d.q).slice(0,200)} <button data-id="${doc.id}" data-sub="${subId}" class="editBtn">Edit</button> <button data-id="${doc.id}" data-sub="${subId}" class="delBtn">Delete</button>`;
    qList.appendChild(div);
  });
  qList.querySelectorAll('.editBtn').forEach(b=> b.addEventListener('click', e=> editQuestion(e.target.dataset.sub, e.target.dataset.id)));
  qList.querySelectorAll('.delBtn').forEach(b=> b.addEventListener('click', e=> deleteQuestion(e.target.dataset.sub, e.target.dataset.id)));
}

function escapeHtml(text){ return text ? text.replace(/[&\"'<>]/g, c => ({'&':'&amp;','\"':'&quot;',\"'\":\"&#39;\",'<':'&lt;','>':'&gt;'}[c])) : ''; }

async function addQuestion(subId){
  const payload = readForm();
  if(!payload) return;
  await db.collection('subjects').doc(subId).collection('questions').add(payload);
  alert('Question added');
  clearForm();
  loadQuestions(subId);
}

let editing = null;
async function editQuestion(subId, docId){
  const doc = await db.collection('subjects').doc(subId).collection('questions').doc(docId).get();
  if(!doc.exists) return alert('Not found');
  const d = doc.data();
  document.getElementById('qno').value = d.qno || '';
  document.getElementById('qText').value = d.q || '';
  document.getElementById('opt0').value = d.options?.[0] || '';
  document.getElementById('opt1').value = d.options?.[1] || '';
  document.getElementById('opt2').value = d.options?.[2] || '';
  document.getElementById('opt3').value = d.options?.[3] || '';
  document.getElementById('correctOpt').value = d.answer ?? 0;
  document.getElementById('imgUrl').value = d.imageUrl || '';
  editing = {subId, docId};
  document.getElementById('addQ').classList.add('hidden');
  document.getElementById('updateQ').classList.remove('hidden');
}

async function saveUpdate(subId){
  if(!editing) return;
  const payload = readForm();
  if(!payload) return;
  await db.collection('subjects').doc(editing.subId).collection('questions').doc(editing.docId).set(payload);
  alert('Updated');
  editing = null;
  document.getElementById('addQ').classList.remove('hidden');
  document.getElementById('updateQ').classList.add('hidden');
  clearForm();
  loadQuestions(subId);
}

function readForm(){
  const qno = parseInt(document.getElementById('qno').value || '0');
  const q = document.getElementById('qText').value.trim();
  const options = [document.getElementById('opt0').value.trim(), document.getElementById('opt1').value.trim(), document.getElementById('opt2').value.trim(), document.getElementById('opt3').value.trim()];
  const answer = parseInt(document.getElementById('correctOpt').value);
  const imageUrl = document.getElementById('imgUrl').value.trim();
  if(!q || options.some(o=>!o)) return alert('Please fill question and all 4 options');
  return { qno, q, options, answer, imageUrl };
}

function clearForm(){
  document.getElementById('qno').value = '';
  document.getElementById('qText').value = '';
  document.getElementById('opt0').value = '';
  document.getElementById('opt1').value = '';
  document.getElementById('opt2').value = '';
  document.getElementById('opt3').value = '';
  document.getElementById('correctOpt').value = '0';
  document.getElementById('imgUrl').value = '';
  editing = null;
  document.getElementById('addQ').classList.remove('hidden');
  document.getElementById('updateQ').classList.add('hidden');
}

async function deleteQuestion(subId, docId){
  if(!confirm('Delete this question?')) return;
  await db.collection('subjects').doc(subId).collection('questions').doc(docId).delete();
  alert('Deleted');
  loadQuestions(subId);
}

async function handleBulkFile(subId){
  const f = document.getElementById('bulkFile').files[0];
  if(!f) return alert('Choose a JSON file');
  const text = await f.text();
  let data;
  try{ data = JSON.parse(text); } catch(e){ return alert('Invalid JSON'); }
  let arr = [];
  if(Array.isArray(data)) arr = data;
  else if(data[subId] && Array.isArray(data[subId])) arr = data[subId];
  else return alert('JSON must be an array of question objects or an object keyed by subjectId');

  if(!confirm(`Upload ${arr.length} questions to ${subId}?`)) return;
  for(const item of arr){
    const payload = { qno: item.qno || 0, q: item.q || '', options: item.options || [], answer: item.answer || 0, imageUrl: item.imageUrl || '' };
    await db.collection('subjects').doc(subId).collection('questions').add(payload);
  }
  alert('Bulk upload complete');
  loadQuestions(subId);
}

async function exportSubjectJSON(subId){
  const snap = await db.collection('subjects').doc(subId).collection('questions').orderBy('qno').get();
  const arr = [];
  snap.forEach(d=> arr.push(d.data()));
  const blob = new Blob([JSON.stringify({[subId]: arr}, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${subId}_questions.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

async function exportAllSubjectsJSON(){
  const subjects = await getSubjects();
  const out = {};
  for(const s of subjects){
    const snap = await db.collection('subjects').doc(s.id).collection('questions').orderBy('qno').get();
    const arr = []; snap.forEach(d=> arr.push(d.data())); out[s.id] = arr;
  }
  const blob = new Blob([JSON.stringify(out, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `all_subjects_questions.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}