/**
 * Firebase Admin wrapper with graceful degradation.
 *
 * If the service account or project ID is missing, token verification simply
 * returns null so the app can continue using non-Firebase auth paths.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

let initialised = false;

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || null;
}

function getServiceAccountJson() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  return raw ? raw : null;
}

function ensureInitialised() {
  if (initialised || getApps().length > 0) {
    initialised = true;
    return true;
  }

  const projectId = getProjectId();
  const serviceAccountJson = getServiceAccountJson();

  if (!projectId) {
    console.warn("[firebase-admin] No project ID found. Firebase Admin disabled.");
    return false;
  }

  try {
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
      console.log("[firebase-admin] Initialised with service account, project:", projectId);
    } else {
      initializeApp({ projectId });
      console.log("[firebase-admin] Initialised without service account, project:", projectId);
      console.warn(
        "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON is not set. Token verification may fail."
      );
    }

    initialised = true;
    return true;
  } catch (err) {
    console.warn("[firebase-admin] Failed to initialise:", (err as Error).message);
    return false;
  }
}

export async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken | null> {
  if (!idToken) return null;
  if (!ensureInitialised() || getApps().length === 0) return null;

  try {
    return await getAuth().verifyIdToken(idToken);
  } catch (err) {
    console.error("[firebase-admin] Token verification failed:", (err as Error).message);
    return null;
  }
}

export async function setCustomUserClaims(
  uid: string,
  claims: Record<string, any>
): Promise<boolean> {
  if (!uid) return false;
  if (!ensureInitialised() || getApps().length === 0) return false;

  try {
    await getAuth().setCustomUserClaims(uid, claims);
    return true;
  } catch (err) {
    console.error("[firebase-admin] Failed to set custom claims:", (err as Error).message);
    return false;
  }
}
