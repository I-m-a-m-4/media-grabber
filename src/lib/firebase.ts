import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
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
  serverTimestamp,
  increment,
  arrayUnion
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
  visitCount?: number;
  activeDates?: string[];
  totalDownloads?: number;
  totalImageExports?: number;
  totalVideoExports?: number;
  totalAudioExports?: number;
  totalZipExports?: number;
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

export interface DownloadActivity {
  id?: string;
  uid: string;
  title: string;
  url: string;
  domain?: string;
  assetType: "video" | "audio" | "image" | "zip";
  format?: string;
  resolution?: string;
  platform?: string;
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
 * Sync user profile to Firestore with visit counting & retention dates
 */
export async function syncUserProfile(user: User) {
  if (!db) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const platform = typeof window !== "undefined" && (window as any).__TAURI__ ? "Tauri Desktop" : "Web Browser";
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";
    const todayStr = new Date().toISOString().slice(0, 10);

    const hasSyncedSession = typeof sessionStorage !== "undefined" && sessionStorage.getItem("mg_session_synced");

    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          isAnonymous: user.isAnonymous,
          firstSeenAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
          platform,
          userAgent,
          visitCount: 1,
          activeDates: [todayStr],
          totalDownloads: 0,
          totalImageExports: 0,
          totalVideoExports: 0,
          totalAudioExports: 0,
          totalZipExports: 0,
        });
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("mg_session_synced", "true");
        }
      } else {
        const updateData: any = {
          lastSeenAt: serverTimestamp(),
          platform,
          userAgent,
        };
        if (!hasSyncedSession) {
          updateData.visitCount = increment(1);
          updateData.activeDates = arrayUnion(todayStr);
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("mg_session_synced", "true");
          }
        }
        await setDoc(userRef, updateData, { merge: true });
      }
    } catch (innerErr: any) {
      if (innerErr?.code === "permission-denied") {
        return;
      }
      console.warn("User profile sync skipped:", innerErr?.message || innerErr);
    }
  } catch (err) {
    // Silent catch fallback
  }
}

/**
 * Record media download/export activity to Firestore
 */
export async function recordDownloadActivity(activity: {
  title?: string;
  mediaTitle?: string;
  url?: string;
  mediaUrl?: string;
  domain?: string;
  sourceDomain?: string;
  assetType: "video" | "audio" | "image" | "zip";
  format?: string;
  resolution?: string;
  isDesktop?: boolean;
}) {
  if (!db) return;
  try {
    const user = auth.currentUser;
    const uid = user?.uid || "anonymous_client";
    const platform =
      activity.isDesktop !== undefined
        ? (activity.isDesktop ? "Tauri Desktop" : "Web Browser")
        : typeof window !== "undefined" && (window as any).__TAURI__
        ? "Tauri Desktop"
        : "Web Browser";

    const title = activity.title || activity.mediaTitle || "Untitled Media";
    const url = activity.url || activity.mediaUrl || "";
    const domain = activity.domain || activity.sourceDomain || "web";

    // 1. Add to downloads activity log collection
    const downloadsRef = collection(db, "downloads");
    await addDoc(downloadsRef, {
      uid,
      title,
      url,
      domain,
      assetType: activity.assetType,
      format: activity.format || "",
      resolution: activity.resolution || "",
      platform,
      createdAt: serverTimestamp(),
    });

    // 2. Increment user profile stats if user is known
    if (user?.uid) {
      const userRef = doc(db, "users", user.uid);
      const isImg = activity.assetType === "image";
      const isVid = activity.assetType === "video";
      const isAud = activity.assetType === "audio";
      const isZip = activity.assetType === "zip";

      await setDoc(userRef, {
        totalDownloads: increment(1),
        ...(isImg ? { totalImageExports: increment(1) } : {}),
        ...(isVid ? { totalVideoExports: increment(1) } : {}),
        ...(isAud ? { totalAudioExports: increment(1) } : {}),
        ...(isZip ? { totalZipExports: increment(1) } : {}),
        lastSeenAt: serverTimestamp(),
      }, { merge: true });
    }

    // 3. Increment platform-wide aggregate in analytics/summary
    const summaryRef = doc(db, "analytics", "summary");
    const isImg = activity.assetType === "image";
    const isVid = activity.assetType === "video";
    const isAud = activity.assetType === "audio";
    const isZip = activity.assetType === "zip";

    await setDoc(summaryRef, {
      totalExports: increment(1),
      ...(isImg ? { totalImageExports: increment(1) } : {}),
      ...(isVid ? { totalVideoExports: increment(1) } : {}),
      ...(isAud ? { totalAudioExports: increment(1) } : {}),
      ...(isZip ? { totalZipExports: increment(1) } : {}),
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (err: any) {
    console.warn("Failed to record download activity:", err?.message || err);
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
 * Fetch comprehensive metrics for Admin Dashboard
 */
export async function fetchAdminMetrics() {
  const emptyResult = {
    totalUsers: 0,
    dau: 0,
    wau: 0,
    mau: 0,
    returningUsers: 0,
    retentionRate: 0,
    avgVisitsPerUser: 1,
    totalExports: 0,
    totalImageExports: 0,
    totalVideoExports: 0,
    totalAudioExports: 0,
    totalZipExports: 0,
    totalPayments: 0,
    totalRevenue: 0,
    desktopUsersCount: 0,
    webUsersCount: 0,
    users: [] as UserProfile[],
    payments: [] as PaymentRecord[],
    recentDownloads: [] as DownloadActivity[],
    cohorts: { singleVisit: 0, returning2to5: 0, powerUsers6plus: 0 },
  };

  if (!db) return emptyResult;

  try {
    const [usersSnap, paymentsSnap, downloadsSnap, summarySnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(50))),
      getDocs(query(collection(db, "downloads"), orderBy("createdAt", "desc"), limit(100))).catch(() => null),
      getDoc(doc(db, "analytics", "summary")).catch(() => null),
    ]);

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

    const recentDownloads: DownloadActivity[] = [];
    let imageExportsCount = 0;
    let videoExportsCount = 0;
    let audioExportsCount = 0;
    let zipExportsCount = 0;

    if (downloadsSnap) {
      downloadsSnap.forEach((d) => {
        const item = { id: d.id, ...d.data() } as DownloadActivity;
        recentDownloads.push(item);
        if (item.assetType === "image") imageExportsCount++;
        else if (item.assetType === "video") videoExportsCount++;
        else if (item.assetType === "audio") audioExportsCount++;
        else if (item.assetType === "zip") zipExportsCount++;
      });
    }

    let totalExports = recentDownloads.length;
    if (summarySnap && summarySnap.exists()) {
      const sumData = summarySnap.data();
      totalExports = Math.max(totalExports, sumData.totalExports || 0);
      imageExportsCount = Math.max(imageExportsCount, sumData.totalImageExports || 0);
      videoExportsCount = Math.max(videoExportsCount, sumData.totalVideoExports || 0);
      audioExportsCount = Math.max(audioExportsCount, sumData.totalAudioExports || 0);
      zipExportsCount = Math.max(zipExportsCount, sumData.totalZipExports || 0);
    }

    // Calculate Active Users (DAU, WAU, MAU) and Retention
    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let dau = 0;
    let wau = 0;
    let mau = 0;
    let returningUsers = 0;
    let totalVisitsAccum = 0;
    let desktopCount = 0;
    let webCount = 0;
    let singleVisit = 0;
    let returning2to5 = 0;
    let powerUsers6plus = 0;

    users.forEach((u) => {
      const visits = Number(u.visitCount) || 1;
      totalVisitsAccum += visits;

      if (visits === 1) singleVisit++;
      else if (visits <= 5) {
        returning2to5++;
        returningUsers++;
      } else {
        powerUsers6plus++;
        returningUsers++;
      }

      if (u.platform?.toLowerCase().includes("tauri") || u.platform?.toLowerCase().includes("desktop")) {
        desktopCount++;
      } else {
        webCount++;
      }

      let lastSeenMs = 0;
      if (u.lastSeenAt?.toDate) lastSeenMs = u.lastSeenAt.toDate().getTime();
      else if (u.lastSeenAt?.seconds) lastSeenMs = u.lastSeenAt.seconds * 1000;
      else if (u.lastSeenAt) lastSeenMs = new Date(u.lastSeenAt).getTime();

      if (lastSeenMs > 0) {
        const diff = nowMs - lastSeenMs;
        if (diff <= dayMs) dau++;
        if (diff <= 7 * dayMs) wau++;
        if (diff <= 30 * dayMs) mau++;
      }
    });

    const totalUsers = users.length;
    const retentionRate = totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0;
    const avgVisitsPerUser = totalUsers > 0 ? (totalVisitsAccum / totalUsers) : 1;

    return {
      totalUsers,
      dau: Math.max(dau, totalUsers > 0 ? 1 : 0),
      wau: Math.max(wau, totalUsers > 0 ? 1 : 0),
      mau: Math.max(mau, totalUsers > 0 ? 1 : 0),
      returningUsers,
      retentionRate,
      avgVisitsPerUser,
      totalExports,
      totalImageExports: imageExportsCount,
      totalVideoExports: videoExportsCount,
      totalAudioExports: audioExportsCount,
      totalZipExports: zipExportsCount,
      totalPayments: payments.length,
      totalRevenue,
      desktopUsersCount: desktopCount,
      webUsersCount: webCount,
      users,
      payments,
      recentDownloads,
      cohorts: { singleVisit, returning2to5, powerUsers6plus },
    };
  } catch (err) {
    console.error("Error fetching admin metrics:", err);
    return emptyResult;
  }
}

/**
 * Google Auth for Admin Login
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google Auth error:", error);
    throw error;
  }
}

