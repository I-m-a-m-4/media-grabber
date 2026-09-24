import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA_DIpDOkIEWiKVzyO6kE8xugkb_H_RDV4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "media-grabber-downloader.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "media-grabber-downloader",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "media-grabber-downloader.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "701651538888",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:701651538888:web:2a131ee099c1bf73d126fd",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-PWC8J021YM"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  }).catch(() => {});
}

export { app, auth, db };

export interface UserProfile {
  uid: string;
  isAnonymous: boolean;
  firstSeenAt: any;
  lastSeenAt: any;
  platform?: string;
  userAgent?: string;
}

export interface PaymentRecord {
  id?: string;
  uid: string;
  email?: string;
  name?: string;
  amount: number;
  currency: string;
  status: string;
  tx_ref: string;
  transaction_id?: string | number;
  createdAt: any;
}

/**
 * Ensures user is authenticated anonymously and records their session in Firestore
 */
export async function initAnonymousUser(): Promise<User | null> {
  if (typeof window === "undefined") return null;

  try {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          await syncUserProfile(user);
          resolve(user);
        } else {
          try {
            const credential = await signInAnonymously(auth);
            await syncUserProfile(credential.user);
            resolve(credential.user);
          } catch (err) {
            console.error("Anonymous auth failed:", err);
            resolve(null);
          }
        }
        unsubscribe();
      });
    });
  } catch (err) {
    console.error("Firebase init error:", err);
    return null;
  }
}

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfile(user: User) {
  if (!db) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    const platform = typeof window !== "undefined" && (window as any).__TAURI__ ? "Tauri Desktop" : "Web Browser";
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        isAnonymous: user.isAnonymous,
        firstSeenAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        platform,
        userAgent
      });
    } else {
      await setDoc(userRef, {
        lastSeenAt: serverTimestamp(),
        platform,
        userAgent
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Could not sync user profile to Firestore (check Firestore Rules if needed):", err);
  }
}

/**
 * Record payment transaction to Firestore
 */
export async function recordPaymentTransaction(paymentData: Omit<PaymentRecord, "createdAt">) {
  if (!db) return;
  try {
    const paymentsRef = collection(db, "payments");
    await addDoc(paymentsRef, {
      ...paymentData,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to record payment in Firestore:", err);
  }
}

/**
 * Fetch metrics for Admin Dashboard
 */
export async function fetchAdminMetrics() {
  if (!db) return { totalUsers: 0, totalPayments: 0, totalRevenue: 0, users: [], payments: [] };
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const paymentsSnap = await getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(50)));

    const users: UserProfile[] = [];
    usersSnap.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });

    const payments: PaymentRecord[] = [];
    let totalRevenue = 0;
    paymentsSnap.forEach((doc) => {
      const data = doc.data() as PaymentRecord;
      payments.push({ id: doc.id, ...data });
      if (data.status === "successful" || data.status === "completed") {
        totalRevenue += Number(data.amount) || 0;
      }
    });

    return {
      totalUsers: users.length,
      totalPayments: payments.length,
      totalRevenue,
      users,
      payments
    };
  } catch (err) {
    console.error("Error fetching admin metrics:", err);
    return { totalUsers: 0, totalPayments: 0, totalRevenue: 0, users: [], payments: [] };
  }
}
