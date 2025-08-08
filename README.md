# NEET-PG Quiz (Wix embed / GitHub static + Firebase)

## Overview
This project implements the features you asked for:
- 19 MBBS subjects (year-wise)
- Subject-wise quiz pages (1 question/page)
- NEET PG–like UI with question palette and image support
- Instant live validation: wrong answers red, correct green
- Progress tracking saved to Firestore per-user
- Admin panel (only accessible by `y3knishu@gmail.com`) to add/edit/delete/bulk-upload questions
- Razorpay integration for unlocking paid subjects (client-side checkout in demo)
- Login with Email/Google (Firebase Auth)
- Colorful rainbow homepage with subject cards and progress bars
- WhatsApp floating help button

## Deployment
1. Create a GitHub repo `neet`. Push the files from this ZIP to that repo.
2. Enable GitHub Pages or host on Netlify/Vercel.
3. In Wix, use the HTML iframe/embed component and point it to the published site URL (or host the static files somewhere and embed).

## Important notes
- **Razorpay:** production must verify payments server-side. This demo marks subjects unlocked on successful checkout client-side — not secure for real money flows.
- **Admin:** admin UI checks `user.email === 'y3knishu@gmail.com'` to display admin features. For production use Firebase custom claims.
- **Sensitive keys:** Do not commit secret keys. The Firebase client config is okay to be public. Do not store Razorpay secret key in frontend.


## Razorpay backend (Firebase Cloud Functions)

The `functions` folder contains an Express app with two endpoints:

- `POST /createOrder` — create a Razorpay order securely on server-side. Expects JSON `{ amount, subjectId, uid }`.
- `POST /verifyPayment` — verify payment signature and unlock subject for user. Expects `{ razorpay_payment_id, razorpay_order_id, razorpay_signature, subjectId, uid }`.

**Setup:**
1. In your Firebase project, set Razorpay secret via:
```
firebase functions:config:set razorpay.key_id="YOUR_KEY_ID" razorpay.key_secret="YOUR_KEY_SECRET"
```
2. Deploy functions:
```
firebase deploy --only functions
```
3. After deployment you'll get a functions URL. In the frontend, replace the client-side URLs `/.netlify/functions/createOrder` and `/.netlify/functions/verifyPayment` with your functions base URL + `/createOrder` and `/verifyPayment` respectively, or proxy them via your hosting.

**Security note:** The functions use the Razorpay secret only on the server. Do not expose the secret on the client.
