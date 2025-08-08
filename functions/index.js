const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Use config variables for secrets. Set via: firebase functions:config:set razorpay.key_id="YOUR_KEY_ID" razorpay.key_secret="YOUR_KEY_SECRET"
const RAZORPAY_KEY_ID = functions.config().razorpay?.key_id || 'rzp_live_7nZptAUoDrsfRb';
const RAZORPAY_KEY_SECRET = functions.config().razorpay?.key_secret || 'REPLACE_WITH_YOUR_SECRET';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Create an order
app.post('/createOrder', async (req, res) => {
  try {
    const { amount, subjectId, uid } = req.body;
    if(!amount || !subjectId || !uid) return res.status(400).json({error:'Missing params'});
    const options = {
      amount: parseInt(amount),
      currency: "INR",
      receipt: "order_rcptid_" + Date.now(),
      payment_capture: 1
    };
    const order = await razorpay.orders.create(options);
    // store order in firestore for later verification
    await db.collection('payments').doc(order.id).set({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      subjectId,
      uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'created'
    });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
});

// Verify payment signature and update user unlock
app.post('/verifyPayment', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, subjectId, uid } = req.body;
    if(!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !subjectId || !uid) return res.status(400).json({error:'Missing params'});

    // verify signature
    const generated_signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if(generated_signature === razorpay_signature){
      // mark as paid/unlocked in firestore
      await db.collection('payments').doc(razorpay_order_id).set({
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'paid'
      }, {merge:true});

      // update user doc to unlock the subject (or mark isPaid)
      await db.collection('users').doc(uid).collection('progress').doc(subjectId).set({ unlocked: true, unlockedAt: admin.firestore.FieldValue.serverTimestamp() }, {merge:true});

      res.json({verified: true});
    } else {
      await db.collection('payments').doc(razorpay_order_id).set({ verified: false, status: 'signature_mismatch'}, {merge:true});
      res.status(400).json({verified: false, error: 'Signature mismatch'});
    }
  } catch(err){
    console.error(err);
    res.status(500).json({error: err.message});
  }
});

exports.api = functions.https.onRequest(app);
