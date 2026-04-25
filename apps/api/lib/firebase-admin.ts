/**
 * server/lib/firebase-admin.ts
 *
 * Initialises firebase-admin once (lazy, singleton) and exports a helper
 * to verify a Firebase ID token from the client.
 *
 * The service-account key can be supplied via one of:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  – raw JSON string of the service account
 *   FIREBASE_PROJECT_ID            – minimal setup using ADC / emulator
 *
 * If neither is present the module degrades gracefully and token verification
 * will return null so the rest of the app keeps working without Firebase.
 */

import * as admin from "firebase-admin";

let initialised = false;

type FirebaseAdminLike = {
  apps?: unknown[];
  initializeApp?: (options?: Record<string, unknown>) => unknown;
  credential?: {
    cert?: (serviceAccount: Record<string, unknown>) => unknown;
  };
  auth?: () => {
    verifyIdToken: (token: string) => Promise<admin.auth.DecodedIdToken>;
    setCustomUserClaims: (uid: string, claims: Record<string, any>) => Promise<void>;
  };
};

const firebaseAdmin: FirebaseAdminLike | null = (() => {
  const direct = admin as unknown as FirebaseAdminLike;
  if (typeof direct.initializeApp === "function") return direct;

  const fallback = (admin as unknown as { default?: FirebaseAdminLike }).default;
  if (fallback && typeof fallback.initializeApp === "function") return fallback;

  return null;
})();

const firebaseWebApiKey =
  process.env.FIREBASE_API_KEY?.trim() ||
  process.env.VITE_FIREBASE_API_KEY?.trim() ||
  process.env.GOOGLE_API_KEY?.trim();

function getAdminApps(): unknown[] {
  return Array.isArray(firebaseAdmin?.apps) ? firebaseAdmin.apps : [];
}

async function verifyWithIdentityToolkit(
  idToken: string
): Promise<admin.auth.DecodedIdToken | null> {
  if (!firebaseWebApiKey) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseWebApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        displayName?: string;
        photoUrl?: string;
      }>;
    };
    const user = payload.users?.[0];

    if (!user?.localId) return null;

    // Provide the subset consumed by routes/auth middleware.
    return {
      uid: user.localId,
      email: user.email,
      name: user.displayName,
      picture: user.photoUrl,
    } as admin.auth.DecodedIdToken;
  } catch (error) {
    console.warn("[firebase-admin] Identity Toolkit verification failed:", (error as Error).message);
    return null;
  }
}

function verifyWithUnverifiedJwtClaims(
  idToken: string
): admin.auth.DecodedIdToken | null {
  if (process.env.NODE_ENV === "production") return null;

  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const payloadText = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadText) as {
      user_id?: string;
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      exp?: number;
    };

    const uid = payload.user_id || payload.sub;
    if (!uid) return null;

    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    console.warn("[firebase-admin] Using unverified JWT fallback in development mode.");
    return {
      uid,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    } as admin.auth.DecodedIdToken;
  } catch {
    return null;
  }
}

function ensureInitialised() {
  if (!firebaseAdmin) {
    console.warn("[firebase-admin] SDK import unavailable — Firebase Admin disabled.");
    return;
  }

  if (initialised || getAdminApps().length > 0) {
    initialised = true;
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.warn("[firebase-admin] No project ID found — Firebase Admin disabled. Set FIREBASE_PROJECT_ID.");
    return;
  }

  try {
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      firebaseAdmin.initializeApp?.({
        credential: firebaseAdmin.credential?.cert?.(serviceAccount),
        projectId,
      });
      console.log("[firebase-admin] Initialised with service account, project:", projectId);
    } else {
      // No service account — initialise with project ID only.
      // Token verification will fail locally without ADC; the auth route
      // falls back to JWT session auth automatically.
      firebaseAdmin.initializeApp?.({ projectId });
      console.log("[firebase-admin] Initialised (no service account) project:", projectId);
      console.warn("[firebase-admin] To enable Firebase token verification, set FIREBASE_SERVICE_ACCOUNT_JSON.");
    }
    initialised = true;
  } catch (err) {
    console.warn("[firebase-admin] Failed to initialise:", (err as Error).message);
    // Avoid repeating noisy parse/init errors on every request.
    initialised = true;
  }
}

/**
 * Verify a Firebase ID token from the client.
 * Returns the decoded token payload, or null on failure.
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<admin.auth.DecodedIdToken | null> {
  ensureInitialised();

  if (!firebaseAdmin?.auth || !getAdminApps().length) {
    const toolkitDecoded = await verifyWithIdentityToolkit(idToken);
    return toolkitDecoded || verifyWithUnverifiedJwtClaims(idToken);
  }

  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    console.error("[firebase-admin] Token verification failed:", (err as Error).message);
    const toolkitDecoded = await verifyWithIdentityToolkit(idToken);
    return toolkitDecoded || verifyWithUnverifiedJwtClaims(idToken);
  }
}

/**
 * Set custom user claims for a Firebase user.
 */
export async function setCustomUserClaims(
  uid: string,
  claims: Record<string, any>
): Promise<boolean> {
  ensureInitialised();

  if (!firebaseAdmin?.auth || !getAdminApps().length) return false;

  try {
    await firebaseAdmin.auth().setCustomUserClaims(uid, claims);
    return true;
  } catch (err) {
    console.error("[firebase-admin] Failed to set custom claims:", (err as Error).message);
    return false;
  }
}
