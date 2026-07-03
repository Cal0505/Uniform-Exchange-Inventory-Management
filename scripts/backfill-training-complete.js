/*
Backfill script: aggregates training_progress documents and writes trainingComplete counts to users collection.
Requires a Firebase Admin SDK service account. Save service account JSON to: ./serviceAccountKey.json
Usage:
  node scripts/backfill-training-complete.js
*/

const admin = require('firebase-admin');
const fs = require('fs');

if (!fs.existsSync('./serviceAccountKey.json')) {
  console.error('Missing ./serviceAccountKey.json. Place your service account key there and re-run.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require('../serviceAccountKey.json'))
});

const db = admin.firestore();

async function run() {
  console.log('Reading training_progress...');
  const progressSnap = await db.collection('training_progress').get();
  const countsByEmail = {};

  progressSnap.forEach(doc => {
    const data = doc.data();
    const lessons = Array.isArray(data.lessonsCompleted) ? data.lessonsCompleted : [];
    const id = doc.id; // training_progress doc id likely equals user's email
    const email = id.toString().trim().toLowerCase();
    countsByEmail[email] = (countsByEmail[email] || 0) + lessons.length;
  });

  console.log('Updating users documents...');
  const userSnap = await db.collection('users').get();
  let updated = 0;
  userSnap.forEach(async (u) => {
    const udata = u.data();
    const email = (udata.email || '').toString().trim().toLowerCase();
    const count = countsByEmail[email] || 0;
    await u.ref.update({ trainingComplete: count }).catch(err => console.error('Failed update for', u.id, err));
    updated++;
  });

  console.log(`Backfill complete. Processed ${Object.keys(countsByEmail).length} progress docs and updated ${updated} users.`);
}

run().catch(err => { console.error(err); process.exit(1); });
