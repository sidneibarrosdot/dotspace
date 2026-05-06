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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Sync Endpoint
  app.post("/api/sync", async (req, res) => {
    const apiKey = req.headers['x-sync-api-key'];
    // Fallback inserido caso a variável não possa ser configurada na AWS
    const expectedKey = process.env.SYNC_API_KEY || "AIzaSyAt-zzcYFTdgcNOpY86tHawAQ0WGqEe2E4";

    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
    }

    const { projects } = req.body;

    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: "Invalid payload: 'projects' must be an array" });
    }

    try {
      const firestore = getDb();
      console.log(`Starting sync of ${projects.length} projects...`);
      
      const collectionRef = firestore.collection('projects');
      
      // Clear existing projects
      const snapshot = await collectionRef.get();
      const batch = firestore.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Add new projects
      projects.forEach(project => {
        const newDocRef = collectionRef.doc();
        // Ensure tags is an array if present
        if (project.tags && typeof project.tags === 'string') {
          project.tags = project.tags.split(';').map((s: string) => s.trim()).filter(Boolean);
        }
        batch.set(newDocRef, project);
      });

      await batch.commit();

      // Log the sync
      await firestore.collection('uploadLogs').add({
        fileName: 'Automatic Sync (API)',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      await firestore.collection('auditLogs').add({
        userEmail: 'api-sync@dotgroup.com.br',
        action: 'SYNC_API',
        details: `Sincronização automática via API: ${projects.length} projetos carregados`,
        version: '1.0.6',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Sync completed successfully: ${projects.length} projects.`);
      res.json({ success: true, count: projects.length });
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
