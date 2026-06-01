const SHEET_ID = '1oyLl-ppgQ-6cwTBeuiOEuCVpP1vJgzTLCqF0Rry5X7I';
const SH_USERS = 'Utilisateurs';
const SH_TRAVAUX = 'Travaux';
const SH_RESIDENTS = 'Residents';
const SH_SESSIONS = 'Sessions';

function doGet(e) {
  if (!e.parameter || !e.parameter.action) {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Dermatologie')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  initSheets();
  var p = e.parameter;
  var action = p.action;
  var token = p.token || '';
  var session = checkToken(token);
  if (action === 'ping') return ok({ message: 'alive' });
  if (action === 'login') return login(p.login, p.password);
  if (!session) return err('Non authentifié');
  if (action === 'logout') return logout(token);
  if (action === 'getTravaux') return ok({ data: getTravaux() });
  if (action === 'getResidents') return ok({ data: getResidents() });
  if (action === 'addTravail') return addTravail(JSON.parse(p.fields || '{}'), session.login);
  if (action === 'updateTravail') return updateTravail(p.id, JSON.parse(p.fields || '{}'));
  if (action === 'deleteTravail') {
    if (session.role !== 'admin') return err('Admin requis');
    return deleteTravail(p.id);
  }
  if (session.role !== 'admin') return err('Admin requis');
  if (action === 'getUsers') return ok({ data: getUsers() });
  if (action === 'addUser') return addUser(p.nom, p.login, p.password, p.role);
  if (action === 'updateUser') return updateUser(p.id, JSON.parse(p.fields || '{}'));
  if (action === 'deleteUser') return deleteUser(p.id);
  if (action === 'addResident') return addResident(p.nom, p.annee);
  if (action === 'deleteResident') return deleteResident(p.id);
  if (action === 'uploadFile') return ok(uploadFile(p.base64Data, p.fileName, p.mimeType));
  return err('Action inconnue: ' + action);
}

function doPost(e) { return doGet(e); }

// Appelé via google.script.run depuis l'interface HTML
function handleRequest(paramsJson) {
  try {
    var _result = _handleRequestInner(paramsJson);
    return JSON.stringify(_result);
  } catch(e) {
    Logger.log('handleRequest outer error: ' + e.message);
    return JSON.stringify({ ok: false, error: e.message });
  }
}
function _handleRequestInner(paramsJson) {
  try {
    var params = JSON.parse(paramsJson);
    var action = params.action;
    var token = params.token || '';
    var session = checkToken(token);
    
    if (action === 'ping') return { ok: true, message: 'alive' };
    if (action === 'login') {
      initSheets();
      var users = sheetToObjects(getSheet(SH_USERS));
      var user = users.find(function(u) { return u.login === params.login && String(u.actif).toLowerCase() === 'true'; });
      if (!user) return { ok: false, error: 'Identifiant introuvable ou compte désactivé' };
      if (user.password_hash !== hashPw(params.password)) return { ok: false, error: 'Mot de passe incorrect' };
      var token = genId() + genId();
      var expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24h
      getSheet(SH_SESSIONS).appendRow([token, user.id, user.login, user.role, user.nom, expires]);
      return { ok: true, token: token, role: user.role, nom: user.nom, login: user.login, userId: user.id };
    }
    if (!session) return { ok: false, error: 'Non authentifié' };
    
    initSheets();
    if (action === 'logout') { logout(token); return { ok: true }; }
    if (action === 'getTravaux') {
      var t = getTravaux();
      return { ok: true, data: t };
    }
    if (action === 'getResidents') {
      var r = getResidents();
      return { ok: true, data: r };
    }
    if (action === 'addTravail') {
      var fields = JSON.parse(params.fields || '{}');
      getSheet(SH_TRAVAUX).appendRow([
        genId(), fields.intitule, fields.resident, fields.superviseur,
        fields.evenement || '', fields.date || '', fields.notes || '',
        fields.fileName || '', fields.fileUrl || '', 'pending',
        new Date().toISOString(), session.login
      ]);
      return { ok: true, message: 'Travail ajouté' };
    }
    if (action === 'updateTravail') {
      var sh = getSheet(SH_TRAVAUX);
      var data = sh.getDataRange().getValues();
      var headers = data[0];
      var updateFields = JSON.parse(params.fields || '{}');
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(params.id)) {
          Object.keys(updateFields).forEach(function(k) {
            var idx = headers.indexOf(k);
            if (idx >= 0) data[i][idx] = updateFields[k];
          });
          sh.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
          return { ok: true, message: 'Mis à jour' };
        }
      }
      return { ok: false, error: 'Travail introuvable' };
    }
    if (action === 'deleteTravail') {
      if (session.role !== 'admin') return { ok: false, error: 'Admin requis' };
      var sh2 = getSheet(SH_TRAVAUX);
      var data2 = sh2.getDataRange().getValues();
      for (var j = 1; j < data2.length; j++) {
        if (String(data2[j][0]) === String(params.id)) {
          sh2.deleteRow(j + 1);
          return { ok: true, message: 'Supprimé' };
        }
      }
      return { ok: false, error: 'Introuvable' };
    }
    // Upload fichier accessible à tous les utilisateurs connectés
    if (action === 'uploadFile') {
      return uploadFile(params.base64Data, params.fileName, params.mimeType);
    }
    // Résidents : accessible à admin et professeurs
    if (action === 'addResident') {
      if (session.role !== 'admin' && session.role !== 'prof') return { ok: false, error: 'Non autorisé' };
      return addResidentData(params.nom, params.annee);
    }
    if (action === 'deleteResident') {
      if (session.role !== 'admin' && session.role !== 'prof') return { ok: false, error: 'Non autorisé' };
      return deleteResidentData(params.id);
    }
    // Actions réservées à l'admin uniquement
    if (session.role !== 'admin') return { ok: false, error: 'Admin requis' };
    if (action === 'getUsers') {
      var u = getUsers();
      return { ok: true, data: u };
    }
    if (action === 'addUser') return addUserData(params.nom, params.login, params.password, params.role);
    if (action === 'updateUser') return updateUserData(params.id, JSON.parse(params.fields || '{}'));
    if (action === 'deleteUser') return deleteUserData(params.id);
    return { ok: false, error: 'Action inconnue: ' + action };
  } catch(e) {
    Logger.log('handleRequest error: ' + e.message + ' | stack: ' + e.stack);
    return { ok: false, error: e.message };
  }
}

function doOptions(e) {
  return cors(ContentService.createTextOutput(''))
    .setMimeType(ContentService.MimeType.TEXT);
}

function initSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  ensureSheet(ss, SH_USERS, ['id','nom','login','password_hash','role','actif','created_at']);
  ensureSheet(ss, SH_TRAVAUX, ['id','intitule','resident','superviseur','evenement','date_soumission','notes','fileName','fileUrl','statut','created_at','created_by']);
  ensureSheet(ss, SH_RESIDENTS, ['id','nom','annee','created_at']);
  ensureSheet(ss, SH_SESSIONS, ['token','user_id','login','role','nom','expires_at']);
  var uSh = ss.getSheetByName(SH_USERS);
  if (uSh.getLastRow() <= 1) {
    uSh.appendRow([genId(), 'Superviseur', 'admin', hashPw('admin123'), 'admin', 'true', new Date().toISOString()]);
  }
}

function ensureSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0d2240').setFontColor('#ffffff');
  }
  return sh;
}

function genId() {
  return Utilities.getUuid().replace(/-/g,'').substring(0,16);
}

function hashPw(pw) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw);
  return bytes.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join('');
}

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function sheetToObjects(sh) {
  if (!sh || sh.getLastRow() <= 1) return [];
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  return rows.map(function(r) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = r[i] !== undefined ? String(r[i]) : ''; });
    return obj;
  });
}

function cors(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    .setHeader('Access-Control-Max-Age', '86400');
}

function jsonResp(data) {
  return cors(ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON));
}

function err(msg) { return jsonResp({ ok: false, error: msg }); }
function ok(data) { return jsonResp(Object.assign({ ok: true }, data)); }

function login(loginVal, password) {
  initSheets();
  var users = sheetToObjects(getSheet(SH_USERS));
  var user = users.find(function(u) { return u.login === loginVal && String(u.actif).toLowerCase() === 'true'; });
  if (!user) return err('Identifiant introuvable ou compte désactivé');
  if (user.password_hash !== hashPw(password)) return err('Mot de passe incorrect');
  var token = genId() + genId();
  var expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24h
  getSheet(SH_SESSIONS).appendRow([token, user.id, user.login, user.role, user.nom, expires]);
  return ok({ token: token, role: user.role, nom: user.nom, login: user.login, userId: user.id });
}

function checkToken(token) {
  if (!token) return null;
  var tokenClean = String(token).trim();
  try {
    var sessions = sheetToObjects(getSheet(SH_SESSIONS));
    var s = sessions.find(function(x) { return String(x.token).trim() === tokenClean; });
    if (!s) return null;
    if (new Date(s.expires_at) < new Date()) {
      // Session expirée - supprimer et retourner null
      return null;
    }
    return s;
  } catch(e) {
    Logger.log('checkToken error: ' + e.message);
    return null;
  }
}

function logout(token) {
  var sh = getSheet(SH_SESSIONS);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) { sh.deleteRow(i + 1); break; }
  }
  return ok({ message: 'Déconnecté' });
}

function getUsers() {
  return sheetToObjects(getSheet(SH_USERS)).map(function(u) {
    return { id: u.id, nom: u.nom, login: u.login, role: u.role, actif: u.actif, created_at: u.created_at };
  });
}

function addUser(nom, login, password, role) {
  var sh = getSheet(SH_USERS);
  var users = sheetToObjects(sh);
  if (users.find(function(u) { return u.login === login; })) return err('Login déjà utilisé');
  sh.appendRow([genId(), nom, login, hashPw(password), role, 'true', new Date().toISOString()]);
  return ok({ message: 'Utilisateur créé' });
}

function addUserData(nom, login, password, role) {
  var sh = getSheet(SH_USERS);
  var users = sheetToObjects(sh);
  if (users.find(function(u) { return u.login === login; })) return { ok: false, error: 'Login déjà utilisé' };
  sh.appendRow([genId(), nom, login, hashPw(password), role, 'true', new Date().toISOString()]);
  return { ok: true, message: 'Utilisateur créé' };
}

function updateUserData(id, fields) {
  var sh = getSheet(SH_USERS);
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      if (fields.actif !== undefined) data[i][headers.indexOf('actif')] = String(fields.actif).toLowerCase();
      if (fields.role) data[i][headers.indexOf('role')] = fields.role;
      if (fields.password) data[i][headers.indexOf('password_hash')] = hashPw(fields.password);
      if (fields.nom) data[i][headers.indexOf('nom')] = fields.nom;
      sh.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
      return { ok: true, message: 'Mis à jour' };
    }
  }
  return { ok: false, error: 'Utilisateur introuvable' };
}

function deleteUserData(id) {
  var sh = getSheet(SH_USERS);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok: true, message: 'Supprimé' }; }
  }
  return { ok: false, error: 'Introuvable' };
}

function addResidentData(nom, annee) {
  getSheet(SH_RESIDENTS).appendRow([genId(), nom, annee, new Date().toISOString()]);
  return { ok: true, message: 'Résident ajouté' };
}

function deleteResidentData(id) {
  var sh = getSheet(SH_RESIDENTS);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok: true, message: 'Supprimé' }; }
  }
  return { ok: false, error: 'Introuvable' };
}

function updateUser(id, fields) {
  var sh = getSheet(SH_USERS);
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      if (fields.actif !== undefined) data[i][headers.indexOf('actif')] = String(fields.actif).toLowerCase();
      if (fields.role) data[i][headers.indexOf('role')] = fields.role;
      if (fields.password) data[i][headers.indexOf('password_hash')] = hashPw(fields.password);
      if (fields.nom) data[i][headers.indexOf('nom')] = fields.nom;
      sh.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
      return ok({ message: 'Mis à jour' });
    }
  }
  return err('Utilisateur introuvable');
}

function deleteUser(id) {
  var sh = getSheet(SH_USERS);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); return ok({ message: 'Supprimé' }); }
  }
  return err('Introuvable');
}

function getResidents() { return sheetToObjects(getSheet(SH_RESIDENTS)); }

function addResident(nom, annee) {
  getSheet(SH_RESIDENTS).appendRow([genId(), nom, annee, new Date().toISOString()]);
  return ok({ message: 'Résident ajouté' });
}

function deleteResident(id) {
  var sh = getSheet(SH_RESIDENTS);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); return ok({ message: 'Supprimé' }); }
  }
  return err('Introuvable');
}

function getTravaux() { return sheetToObjects(getSheet(SH_TRAVAUX)); }

// ── GOOGLE DRIVE FILE UPLOAD ─────────────────────────────
var DRIVE_FOLDER_NAME = 'Dermatologie — Résumés';

function getDriveFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function uploadFile(base64Data, fileName, mimeType) {
  try {
    var folder = getDriveFolder();
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType || 'application/octet-stream', fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { ok: true, fileId: file.getId(), fileUrl: file.getUrl(), fileName: fileName };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// Appelable directement depuis google.script.run (sans passer par handleRequest)
function uploadFileFromBase64(base64Data, fileName, mimeType) {
  return uploadFile(base64Data, fileName, mimeType);
}

function addTravail(fields, createdBy) {
  getSheet(SH_TRAVAUX).appendRow([
    genId(), fields.intitule, fields.resident, fields.superviseur,
    fields.evenement || '', fields.date || '', fields.notes || '',
    fields.fileName || '', fields.fileUrl || '', 'pending', new Date().toISOString(), createdBy || ''
  ]);
  return ok({ message: 'Travail ajouté' });
}

function updateTravail(id, fields) {
  var sh = getSheet(SH_TRAVAUX);
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      Object.keys(fields).forEach(function(k) {
        var idx = headers.indexOf(k);
        if (idx >= 0) data[i][idx] = fields[k];
      });
      sh.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
      return ok({ message: 'Mis à jour' });
    }
  }
  return err('Travail introuvable');
}

function deleteTravail(id) {
  var sh = getSheet(SH_TRAVAUX);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); return ok({ message: 'Supprimé' }); }
  }
  return err('Introuvable');
}
