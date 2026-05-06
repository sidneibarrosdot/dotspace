/**
 * Script para sincronizar automaticamente uma planilha do Google Sheets com o Banco de PMVs DOT.
 *
 * Instruções:
 * 1. No Google Sheets, vá em Extensões > Apps Script.
 * 2. Substitua o conteúdo pelo código abaixo.
 * 3. Configure as variáveis APP_URL e SYNC_API_KEY.
 * 4. Salve e clique em 'Executar' para testar.
 * 5. Use 'Acionadores' (ícone de relógio) para agendar a sincronização automática.
 */

const APP_URL = 'https://bancopmvs.dotgroup.com.br'; // URL do seu app

function getSyncApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('SYNC_API_KEY');
  if (!key) {
    throw new Error('Configure SYNC_API_KEY em Propriedades do script antes de sincronizar.');
  }
  return key;
}

function syncPortfolio() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    Logger.log('Planilha vazia ou sem dados.');
    return;
  }

  const headers = data[0].map(h => normalizeKey(h));
  const projects = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const project = {};
    let hasData = false;

    headers.forEach((header, index) => {
      const val = row[index];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        project[header] = val;
        hasData = true;
      }
    });

    if (hasData && project.Projeto && project.Cliente) {
      projects.push(project);
    }
  }

  if (projects.length === 0) {
    Logger.log('Nenhum projeto válido encontrado para sincronizar.');
    return;
  }

  const payload = JSON.stringify({ projects: projects });
  const syncApiKey = getSyncApiKey();
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-sync-api-key': syncApiKey
    },
    payload: payload,
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(`${APP_URL}/api/sync`, options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200) {
      Logger.log(`Sincronização concluída com sucesso! ${result.count} projetos sincronizados.`);
      SpreadsheetApp.getUi().alert(`Sincronização concluída: ${result.count} projetos.`);
    } else {
      Logger.log(`Erro na sincronização: ${result.error}`);
      SpreadsheetApp.getUi().alert(`Erro na sincronização: ${result.error}`);
    }
  } catch (e) {
    Logger.log(`Erro de conexão: ${e.message}`);
    SpreadsheetApp.getUi().alert(`Erro de conexão: ${e.message}`);
  }
}

function normalizeKey(key) {
  const mapping = {
    'imagem_capa': 'Imagem_capa',
    'capa': 'Imagem_capa',
    'thumbnail': 'Imagem_capa',
    'projeto': 'Projeto',
    'nome_do_projeto': 'Projeto',
    'nome': 'Projeto',
    'cliente': 'Cliente',
    'empresa': 'Cliente',
    'time': 'Time',
    'equipe': 'Time',
    'data': 'Data',
    'ano': 'Data',
    'assunto_geral': 'Assunto_geral',
    'assunto': 'Assunto_geral',
    'tema': 'Assunto_geral',
    'assunto_especifico': 'Assunto_especifico',
    'subtema': 'Assunto_especifico',
    'publico_alvo': 'Publico_alvo',
    'publico': 'Publico_alvo',
    'metodologias': 'Metodologias',
    'metodologia': 'Metodologias',
    'midias': 'Mídias',
    'midia': 'Mídias',
    'recursos': 'Outros_recursos',
    'outros_recursos': 'Outros_recursos',
    'di': 'DI',
    'design_instrucional': 'DI',
    'dm': 'DM',
    'design_multimidia': 'DM',
    'link_pmv': 'Link_PMV',
    'pmv': 'Link_PMV',
    'link': 'Link_PMV',
    'tags': 'tags'
  };

  const normalized = key.toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  return mapping[normalized] || normalized;
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('DOT Sync')
    .addItem('Sincronizar Portfólio', 'syncPortfolio')
    .addToUi();
}
