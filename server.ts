import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let serviceAccount = null;
const saStr = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
if (saStr) {
  try {
    serviceAccount = JSON.parse(saStr.startsWith('{') ? saStr : `{${saStr}}`);
  } catch (error) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT. Ensure it is a valid JSON object.");
    // Do not log the raw string as it contains secrets
  }
}

if (serviceAccount || process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
}

const getDb = () => {
  if (admin.apps.length === 0) {
    throw new Error("Firebase Admin is not initialized");
  }
  if (process.env.FIREBASE_DATABASE_ID) {
    return admin.firestore().databaseId === process.env.FIREBASE_DATABASE_ID
      ? admin.firestore()
      : (admin as any).firestore(process.env.FIREBASE_DATABASE_ID);
  }
  return admin.firestore();
};

const makeMatchKey = (value: unknown) => {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
};

const getProjectMatchKey = (project: Record<string, unknown>) => {
  return `${makeMatchKey(project.Projeto)}___${makeMatchKey(project.Cliente)}___${makeMatchKey(project.Time)}`;
};

const normalizeProjectForSync = (project: Record<string, any>) => {
  const normalized = { ...project };

  if (typeof normalized.tags === "string") {
    normalized.tags = normalized.tags
      .split(";")
      .map((tag: string) => tag.trim())
      .filter(Boolean);
  }

  return normalized;
};

const collectProjectReferenceCounts = async (
  firestore: admin.firestore.Firestore,
) => {
  const counts = new Map<string, number>();
  const collections = ["favorites", "likes"];

  for (const collectionName of collections) {
    const snapshot = await firestore.collection(collectionName).get();
    snapshot.docs.forEach((doc) => {
      const projectId = doc.get("projectId");
      if (typeof projectId === "string" && projectId) {
        counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
      }
    });
  }

  return counts;
};

const commitInChunks = async (
  firestore: admin.firestore.Firestore,
  operations: ((batch: admin.firestore.WriteBatch) => void)[],
) => {
  for (let index = 0; index < operations.length; index += 500) {
    const batch = firestore.batch();
    operations.slice(index, index + 500).forEach((operation) => operation(batch));
    await batch.commit();
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Sync Endpoint
  app.post("/api/sync", async (req, res) => {
    const apiKey = req.headers['x-sync-api-key'];
    const expectedKey = process.env.SYNC_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
    }

    const { projects } = req.body;

    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: "Invalid payload: 'projects' must be an array" });
    }

    try {
      const firestore = getDb();
      console.log(`Starting smart sync of ${projects.length} rows...`);

      const collectionRef = firestore.collection('projects');
      const snapshot = await collectionRef.get();

      const referenceCounts = await collectProjectReferenceCounts(firestore);
      const existingByKey = new Map<string, admin.firestore.QueryDocumentSnapshot[]>();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const key = getProjectMatchKey(data);
        if (!data.Projeto || !data.Cliente) return;

        const existing = existingByKey.get(key) ?? [];
        existing.push(doc);
        existingByKey.set(key, existing);
      });

      existingByKey.forEach((docs, key) => {
        docs.sort((a, b) => {
          const referenceDelta = (referenceCounts.get(b.id) ?? 0) - (referenceCounts.get(a.id) ?? 0);
          if (referenceDelta !== 0) return referenceDelta;
          return a.createTime.toMillis() - b.createTime.toMillis();
        });
        existingByKey.set(key, docs);
      });

      const incomingByKey = new Map<string, Record<string, any>>();
      let skippedRows = 0;

      projects.forEach((project) => {
        const normalized = normalizeProjectForSync(project);
        const key = getProjectMatchKey(normalized);

        if (!normalized.Projeto || !normalized.Cliente || !key) {
          skippedRows++;
          return;
        }

        if (incomingByKey.has(key)) skippedRows++;
        incomingByKey.set(key, normalized);
      });

      const operations: ((batch: admin.firestore.WriteBatch) => void)[] = [];
      let updatedCount = 0;
      let deletedCount = 0;

      incomingByKey.forEach((project, key) => {
        const existingDocs = existingByKey.get(key) ?? [];
        const docToKeep = existingDocs.shift();
        const docRef = docToKeep ? docToKeep.ref : collectionRef.doc();

        operations.push((batch) => batch.set(docRef, project));
        updatedCount++;

        existingDocs.forEach((duplicateDoc) => {
          operations.push((batch) => batch.delete(duplicateDoc.ref));
          deletedCount++;
        });

        existingByKey.delete(key);
      });

      existingByKey.forEach((orphanDocs) => {
        orphanDocs.forEach((orphanDoc) => {
          operations.push((batch) => batch.delete(orphanDoc.ref));
          deletedCount++;
        });
      });

      await commitInChunks(firestore, operations);

      // Log the sync
      await firestore.collection('uploadLogs').add({
        fileName: 'SYNC API',
        userEmail: 'api-sync@dotgroup.com.br',
        details: `Atualizou ${updatedCount}, removeu ${deletedCount} e ignorou/deduplicou ${skippedRows} (Smart Sync)`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Smart sync completed successfully: ${updatedCount} upserted, ${deletedCount} deleted, ${skippedRows} skipped.`);
      res.json({ success: true, count: updatedCount, deleted: deletedCount, skipped: skippedRows });
    } catch (error: any) {
      console.error("Error during sync:", error);
      res.status(500).json({ error: "Internal Server Error during sync", details: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
