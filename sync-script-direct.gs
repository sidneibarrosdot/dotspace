// ==== CONFIGURAÇÕES DO FIREBASE ====
const CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@bancopmvs-492018.iam.gserviceaccount.com';

const PROJECT_ID = 'bancopmvs-492018';
const DATABASE_ID = 'ai-studio-246517dd-309c-4b97-8325-3c8821906926';
const AUTO_SYNC_DELAY_MS = 5 * 60 * 1000;
const AUTO_SYNC_TRIGGER_FUNCTION = 'runScheduledSync';
const EDIT_TRIGGER_FUNCTION = 'schedulePortfolioSyncOnEdit';

function getPrivateKey() {
  const key = PropertiesService.getScriptProperties().getProperty('FIREBASE_PRIVATE_KEY');
  if (!key) {
    throw new Error('Configure FIREBASE_PRIVATE_KEY em Propriedades do script antes de sincronizar.');
  }
  return key;
}

function makeMatchKey(str) {
  if (!str) return "";
  return String(str).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

function getProjectMatchKey(project) {
  return makeMatchKey(project.Projeto) + "___" + makeMatchKey(project.Cliente) + "___" + makeMatchKey(project.Time);
}

function installAutoSyncTrigger() {
  deleteTriggersByFunction(EDIT_TRIGGER_FUNCTION);
  ScriptApp.newTrigger(EDIT_TRIGGER_FUNCTION)
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  SpreadsheetApp.getUi().alert('Sincronização automática instalada. As edições agora agendam uma sync em alguns minutos, sem popup bloqueante.');
}

function schedulePortfolioSyncOnEdit(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return;

  try {
    deleteTriggersByFunction(AUTO_SYNC_TRIGGER_FUNCTION);
    PropertiesService.getScriptProperties().setProperty('LAST_EDIT_AT', new Date().toISOString());

    ScriptApp.newTrigger(AUTO_SYNC_TRIGGER_FUNCTION)
      .timeBased()
      .after(AUTO_SYNC_DELAY_MS)
      .create();

    SpreadsheetApp.getActiveSpreadsheet().toast('Alteração registrada. Sincronização agendada.', 'DOT Sync', 3);
  } finally {
    lock.releaseLock();
  }
}

function runScheduledSync() {
  deleteTriggersByFunction(AUTO_SYNC_TRIGGER_FUNCTION);
  syncPortfolio({ silent: true });
}

function deleteTriggersByFunction(functionName) {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function syncPortfolio(options) {
  const silent = options && options.silent === true;
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  const projects = [];

  sheets.forEach(function(sheet) {
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return;

    const headers = data[0].map(function(h) { return normalizeKey(h); });

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const project = {};
      let hasData = false;

      headers.forEach(function(header, index) {
        const val = row[index];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          project[header] = String(val).trim();
          hasData = true;
        }
      });

      if (hasData && project.Projeto && project.Cliente) {
        projects.push(project);
      }
    }
  });

  if (projects.length === 0) {
    notifySync('Aviso: Nenhum projeto válido encontrado.', silent, true);
    return;
  }

  try {
    notifyProgress('Autenticando no Firebase...', silent, 3);
    const token = getOAuthToken();

    notifyProgress('Verificando projetos existentes e processando...', silent, 5);
    const result = saveToFirestore(projects, token);

    notifySync("Sucesso! O banco foi sincronizado:\n- Atualizados/Criados: " + result.updated + "\n- Removidos (órfãos/duplicados): " + result.deleted + "\n- Linhas duplicadas/ignoradas: " + result.skipped, silent, false);
  } catch (e) {
    Logger.log(e);
    notifySync("Erro na sincronização: " + e.message, silent, true);
  }
}

function notifyProgress(message, silent, seconds) {
  if (!silent) {
    SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Sincronização', seconds);
  }
}

function notifySync(message, silent, isError) {
  if (silent) {
    Logger.log(message);
    if (isError) {
      SpreadsheetApp.getActiveSpreadsheet().toast(message, 'DOT Sync', 5);
    }
    return;
  }

  SpreadsheetApp.getUi().alert(message);
}

function saveToFirestore(projects, token) {
  const baseUrl = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/" + DATABASE_ID + "/documents";
  const writes = [];
  const resourcePathPrefix = baseUrl.replace("https://firestore.googleapis.com/v1/", "");
  const referenceCounts = getProjectReferenceCounts(token);
  const uniqueProjects = {};
  const projectOrder = [];
  let skippedCount = 0;

  projects.forEach(function(p) {
    const key = getProjectMatchKey(p);
    if (!p.Projeto || !p.Cliente || key === "___") {
      skippedCount++;
      return;
    }

    if (!uniqueProjects[key]) {
      projectOrder.push(key);
    } else {
      skippedCount++;
    }
    uniqueProjects[key] = p;
  });

  // 1. Buscar documentos existentes para Mapeamento Inteligente (sem apagar tudo!)
  let nextPageToken = "";
  let existingDocsMap = {}; // Dicionário de projetos já existentes

  do {
    let url = baseUrl + "/projects?pageSize=1000";
    if (nextPageToken) url += "&pageToken=" + nextPageToken;

    const existingDocsRes = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': "Bearer " + token },
      muteHttpExceptions: true
    });

    if (existingDocsRes.getResponseCode() === 200) {
      const data = JSON.parse(existingDocsRes.getContentText());
      if (data.documents) {
        data.documents.forEach(function(doc) {
          let pName = "";
          let cName = "";
          let tName = "";
          if (doc.fields) {
            if (doc.fields.Projeto && doc.fields.Projeto.stringValue) pName = doc.fields.Projeto.stringValue;
            if (doc.fields.Cliente && doc.fields.Cliente.stringValue) cName = doc.fields.Cliente.stringValue;
            if (doc.fields.Time && doc.fields.Time.stringValue) tName = doc.fields.Time.stringValue;
          }
          if (!pName || !cName) return;
          const key = makeMatchKey(pName) + "___" + makeMatchKey(cName) + "___" + makeMatchKey(tName);

          if (!existingDocsMap[key]) {
            existingDocsMap[key] = [];
          }
          existingDocsMap[key].push({
            name: doc.name,
            id: doc.name.split("/").pop(),
            createTime: doc.createTime || "",
            updateTime: doc.updateTime || ""
          }); // Salva o ID real do banco
        });
      }
      nextPageToken = data.nextPageToken || "";
    } else {
      nextPageToken = ""; // Falha ao buscar, abortar paginação
    }
  } while (nextPageToken);

  let updatedCount = 0;
  let deletedCount = 0;

  for (const k in existingDocsMap) {
    existingDocsMap[k].sort(function(a, b) {
      const refDiff = (referenceCounts[b.id] || 0) - (referenceCounts[a.id] || 0);
      if (refDiff !== 0) return refDiff;
      return String(a.createTime).localeCompare(String(b.createTime));
    });
  }

  // 2. Preparar as escritas para os Projetos da Planilha
  projectOrder.forEach(function(key) {
    const p = uniqueProjects[key];

    let docName;
    // Se o projeto já existe no banco, reaproveita o ID para não perder os Favoritos!
    if (existingDocsMap[key] && existingDocsMap[key].length > 0) {
      docName = existingDocsMap[key].shift().name;
    } else {
      // Se não existe, cria um ID novo
      docName = resourcePathPrefix + "/projects/" + generateId();
    }

    const fields = {};
    for (const k in p) {
      let val = p[k];
      if (k === 'tags') {
        const tagArray = val.split(';').map(function(t) { return t.trim(); }).filter(Boolean);
        fields[k] = { arrayValue: { values: tagArray.map(function(t) { return { stringValue: t }; }) } };
      } else {
        fields[k] = { stringValue: val };
      }
    }

    writes.push({
      update: {
        name: docName,
        fields: fields
      }
    });
    updatedCount++;
  });

  // 3. Limpar Duplicados ou Órfãos (Projetos que saíram da planilha ou duplicaram)
  for (const k in existingDocsMap) {
    existingDocsMap[k].forEach(function(docInfo) {
      writes.push({ delete: docInfo.name });
      deletedCount++;
    });
  }

  // 4. Adicionar Logs de Sincronização
  writes.push({
    update: {
      name: resourcePathPrefix + "/uploadLogs/" + generateId(),
      fields: {
        fileName: { stringValue: 'SYNC PLANILHA' },
        userEmail: { stringValue: 'sheets-sync@dotgroup.com.br' },
        details: { stringValue: "Atualizou " + updatedCount + ", removeu " + deletedCount + " e ignorou/deduplicou " + skippedCount + " (Smart Sync)" },
        timestamp: { timestampValue: new Date().toISOString() }
      }
    }
  });

  // 5. Enviar requisições em lotes
  const chunkedWrites = chunkArray(writes, 500);
  chunkedWrites.forEach(function(chunk) {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': "Bearer " + token },
      payload: JSON.stringify({ writes: chunk }),
      muteHttpExceptions: true
    };

    const commitUrl = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/" + DATABASE_ID + "/documents:commit";
    const res = UrlFetchApp.fetch(commitUrl, options);
    if (res.getResponseCode() !== 200) {
      throw new Error(res.getContentText());
    }
  });

  return { updated: updatedCount, deleted: deletedCount, skipped: skippedCount };
}

function getProjectReferenceCounts(token) {
  const baseUrl = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/" + DATABASE_ID + "/documents";
  const counts = {};
  const collections = ["favorites", "likes"];

  collections.forEach(function(collectionName) {
    let nextPageToken = "";

    do {
      let url = baseUrl + "/" + collectionName + "?pageSize=1000";
      if (nextPageToken) url += "&pageToken=" + nextPageToken;

      const res = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: { 'Authorization': "Bearer " + token },
        muteHttpExceptions: true
      });

      if (res.getResponseCode() !== 200) {
        nextPageToken = "";
        return;
      }

      const data = JSON.parse(res.getContentText());
      if (data.documents) {
        data.documents.forEach(function(doc) {
          if (!doc.fields || !doc.fields.projectId || !doc.fields.projectId.stringValue) return;
          const projectId = doc.fields.projectId.stringValue;
          counts[projectId] = (counts[projectId] || 0) + 1;
        });
      }

      nextPageToken = data.nextPageToken || "";
    } while (nextPageToken);
  });

  return counts;
}

function chunkArray(array, size) {
  const chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
}

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getOAuthToken() {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const toBase64 = function(obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  };

  const signatureInput = toBase64(header) + "." + toBase64(claim);

  let keyStr = getPrivateKey().replace(/\\n/g, '\n').trim();

  let signature;
  try {
    signature = Utilities.computeRsaSha256Signature(signatureInput, keyStr);
  } catch (e) {
    throw new Error("Formato da PRIVATE_KEY inválido.");
  }

  const jwt = signatureInput + "." + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');

  const options = {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    },
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', options);
  if (res.getResponseCode() !== 200) {
    throw new Error("Autenticação falhou.");
  }
  return JSON.parse(res.getContentText()).access_token;
}

function normalizeKey(key) {
  const mapping = {
    'imagem_capa': 'Imagem_capa', 'capa': 'Imagem_capa', 'thumbnail': 'Imagem_capa',
    'projeto': 'Projeto', 'nome_do_projeto': 'Projeto', 'nome': 'Projeto',
    'cliente': 'Cliente', 'empresa': 'Cliente', 'time': 'Time', 'equipe': 'Time',
    'data': 'Data', 'ano': 'Data', 'assunto_geral': 'Assunto_geral', 'assunto': 'Assunto_geral',
    'tema': 'Assunto_geral', 'assunto_especifico': 'Assunto_especifico', 'subtema': 'Assunto_especifico',
    'publico_alvo': 'Publico_alvo', 'publico': 'Publico_alvo', 'metodologias': 'Metodologias',
    'metodologia': 'Metodologias', 'midias': 'Mídias', 'midia': 'Mídias',
    'recursos': 'Outros_recursos', 'outros_recursos': 'Outros_recursos', 'di': 'DI',
    'design_instrucional': 'DI', 'dm': 'DM', 'design_multimidia': 'DM',
    'link_pmv': 'Link_PMV', 'pmv': 'Link_PMV', 'link': 'Link_PMV', 'tags': 'tags'
  };

  const normalized = String(key).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return mapping[normalized] || normalized;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DOT Sync')
    .addItem('Sincronizar agora', 'syncPortfolio')
    .addItem('Instalar sincronização automática', 'installAutoSyncTrigger')
    .addToUi();
}
