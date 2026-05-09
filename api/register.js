import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";
import crypto from "crypto";

const firebaseConfig = {
  apiKey: "AIzaSyDGRsCcT-7Bv_nOAybjXyuIT6Ca0IT4YTg",
  authDomain: "market-d978f.firebaseapp.com",
  databaseURL: "https://market-d978f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "market-d978f",
  storageBucket: "market-d978f.firebasestorage.app",
  messagingSenderId: "291695486607",
  appId: "1:291695486607:web:dd860d16639b47c163f2fa",
  measurementId: "G-2J5YF9BTQJ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'method not allowed' });

  const { name, email, phone, pass } = req.body;
  if (!name || !email || !phone || !pass) return res.status(400).json({ message: "data wajib di isi" });

  const cleanEmail = email.trim().toLowerCase().replace(/\./g, ',');
  const apiKey = "sk-" + crypto.randomBytes(16).toString('hex');

  try {
    const userRef = ref(db, 'users/' + cleanEmail);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return res.status(400).json({ message: "email sudah terdaftar" });
    }

    await set(userRef, {
      fullname: name,
      email: email.trim().toLowerCase(),
      phone: phone,
      password: pass,
      apiKey: apiKey
    });

    return res.status(200).json({ success: true, sessionToken: cleanEmail });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
