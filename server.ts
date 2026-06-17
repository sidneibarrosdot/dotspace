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

  // Cabeçalhos de Segurança (Security Headers)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    next();
  });

  // Limite de Requisições (Rate Limiter)
  interface RateLimitInfo {
    count: number;
    resetTime: number;
  }

  const rateLimitStore = new Map<string, RateLimitInfo>();

  // Limpeza periódica do cache de rate limit para liberar memória
  setInterval(() => {
    const now = Date.now();
    for (const [ip, info] of rateLimitStore.entries()) {
      if (info.resetTime < now) {
        rateLimitStore.delete(ip);
      }
    }
  }, 10 * 60 * 1000); // Executa a cada 10 minutos

  const apiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'anonymous').split(',')[0].trim();
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // Janela de 15 minutos
    const maxRequests = 100; // Limite de 100 requisições por IP por janela

    let clientInfo = rateLimitStore.get(ip);

    if (!clientInfo || clientInfo.resetTime < now) {
      clientInfo = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(ip, clientInfo);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil(clientInfo.resetTime / 1000));
      return next();
    }

    clientInfo.count++;
    const remaining = Math.max(0, maxRequests - clientInfo.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientInfo.resetTime / 1000));

    if (clientInfo.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((clientInfo.resetTime - now) / 1000));
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Limite de requisições excedido para esta API. Por favor, tente novamente mais tarde.",
        retryAfterSeconds: Math.ceil((clientInfo.resetTime - now) / 1000)
      });
    }

    next();
  };

  // Aplica o rate limiter em todas as rotas da API (/api/*)
  app.use("/api", apiRateLimiter);

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

  app.get("/api/calendar/events", async (req, res) => {
    const calendarId = String(req.query.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary');
    const maxResults = Math.min(Math.max(Number(req.query.maxResults || 5), 1), 10);
    const timeMin = String(req.query.timeMin || new Date().toISOString());
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY?.trim();
    const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN?.trim();

    if (!apiKey && !accessToken) {
      return res.status(503).json({
        error: 'Google Calendar não configurado no servidor.',
        hint: 'Defina GOOGLE_CALENDAR_API_KEY para calendário público ou GOOGLE_CALENDAR_ACCESS_TOKEN para acesso autenticado.',
      });
    }

    try {
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: String(maxResults),
        timeMin,
      });

      if (apiKey) params.set('key', apiKey);

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: payload.error?.message || 'Falha ao buscar eventos no Google Calendar.',
        });
      }

      const payload = await response.json() as { items?: unknown[]; nextSyncToken?: string; timeZone?: string; accessRole?: string };
      const items = Array.isArray(payload.items) ? payload.items : [];

      res.json({
        calendarId,
        accessRole: payload.accessRole || null,
        timeZone: payload.timeZone || null,
        items: items.map((event: any) => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
          htmlLink: event.htmlLink,
          status: event.status,
          start: event.start,
          end: event.end,
        })),
        nextSyncToken: payload.nextSyncToken || null,
      });
    } catch (error: any) {
      console.error('Error fetching Google Calendar events:', error);
      res.status(500).json({ error: 'Erro ao consultar Google Calendar.', details: error.message });
    }
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
