// Firebase initialization
const firebaseConfig = {
  apiKey: "AIzaSyDohygxGWFCQ-Kn2yROr_cviSUcD0drt0M",
  authDomain: "nishant-website.firebaseapp.com",
  projectId: "nishant-website",
  storageBucket: "nishant-website.firebasestorage.app",
  messagingSenderId: "92337870765",
  appId: "1:92337870765:web:664418f551133e356fb324",
  measurementId: "G-08FZCL9GVS"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// helper functions used by app.js and admin.js
async function getSubjects() {
  return [
    {id:'anatomy', title:'Anatomy', year:'1st Year', price:0},
    {id:'physiology', title:'Physiology', year:'1st Year', price:99},
    {id:'biochemistry', title:'Biochemistry', year:'1st Year', price:99},
    {id:'pathology', title:'Pathology', year:'2nd Year', price:99},
    {id:'pharmacology', title:'Pharmacology', year:'2nd Year', price:99},
    {id:'microbiology', title:'Microbiology', year:'2nd Year', price:99},
    {id:'forensic', title:'Forensic Medicine', year:'2nd Year', price:99},
    {id:'community', title:'Community Medicine', year:'3rd Year', price:99},
    {id:'ent', title:'ENT', year:'3rd Year', price:99},
    {id:'ophthalmology', title:'Ophthalmology', year:'3rd Year', price:99},
    {id:'medicine', title:'General Medicine', year:'Final Year', price:99},
    {id:'surgery', title:'General Surgery', year:'Final Year', price:99},
    {id:'obg', title:'Obstetrics & Gynaecology', year:'Final Year', price:99},
    {id:'pediatrics', title:'Pediatrics', year:'Final Year', price:99},
    {id:'orthopaedics', title:'Orthopaedics', year:'Final Year', price:99},
    {id:'dermatology', title:'Dermatology', year:'Final Year', price:99},
    {id:'psychiatry', title:'Psychiatry', year:'Final Year', price:99},
    {id:'respiratory', title:'Respiratory Medicine', year:'Final Year', price:99},
    {id:'anesthesia', title:'Anesthesiology', year:'Final Year', price:99}
  ];
}

// helper for current user doc
function userDocRef(uid){
  return db.collection('users').doc(uid);
}
