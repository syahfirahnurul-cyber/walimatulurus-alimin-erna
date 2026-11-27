/**
 * BUKU UCAPAN & DOA — Alimin & Erna
 * Google Apps Script untuk menyimpan ucapan tetamu dalam Google Sheets milik keluarga.
 *
 * LANGKAH PEMASANGAN (sekali sahaja, ~5 minit):
 *  1. Log masuk akaun Google keluarga/klien, buka https://sheets.new (Google Sheet baharu).
 *     Namakan fail, contoh: "Buku Ucapan Alimin & Erna".
 *  2. Menu: Extensions > Apps Script. Padam semua kod sedia ada, tampal SELURUH fail ini, tekan Save.
 *  3. Klik Deploy > New deployment > ikon gear > pilih "Web app".
 *       - Execute as:      Me (akaun anda)
 *       - Who has access:  Anyone
 *     Klik Deploy, benarkan akses (Authorize) bila diminta.
 *  4. Salin "Web app URL" (berakhir dengan /exec).
 *  5. Dalam script.js, tampal URL itu ke CARD_CONFIG.wishesEndpoint, contoh:
 *       wishesEndpoint: 'https://script.google.com/macros/s/XXXX/exec'
 *
 * MENGURUS UCAPAN:
 *  - Semua ucapan masuk ke tab "Ucapan" (Masa, Nama, Ucapan, Sembunyi).
 *  - Untuk menyembunyikan ucapan yang tidak sesuai: tandakan kotak "Sembunyi" (TRUE) atau padam barisnya.
 *  - Jika kod ini diubah, buat Deploy > Manage deployments > Edit > Version: New version
 *    supaya URL yang sama mendapat kod baharu.
 */

const SHEET_NAME = 'Ucapan';
const MAX_NAME = 80;
const MAX_WISH = 500;
const LIST_LIMIT = 300;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Masa', 'Nama', 'Ucapan', 'Sembunyi']);
    sheet.setFrozenRows(1);
    sheet.getRange('D2:D').insertCheckboxes();
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Buang aksara kawalan (kekalkan baris baharu), hadkan panjang, dan halang "formula injection":
// teks yang bermula dengan = + - @ akan dibaca Sheets sebagai formula, jadi diawali dengan '.
function clean_(value, max) {
  let s = String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** Senarai ucapan (terbaru dahulu), tidak termasuk yang ditanda "Sembunyi". */
function doGet() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return json_({ ok: true, wishes: [] });

  const rows = sheet.getRange(2, 1, last - 1, 4).getValues();
  const wishes = rows
    .filter((r) => r[1] && r[2] && r[3] !== true)
    .map((r) => ({
      name: String(r[1]),
      wish: String(r[2]),
      time: r[0] instanceof Date ? r[0].toISOString() : ''
    }))
    .reverse()
    .slice(0, LIST_LIMIT);

  return json_({ ok: true, wishes: wishes });
}

/** Terima ucapan baharu: body JSON { name, wish, website } dihantar sebagai text/plain. */
function doPost(e) {
  let data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }

  // Perangkap bot: medan "website" tersembunyi daripada manusia.
  if (data.website) return json_({ ok: true });

  const name = clean_(data.name, MAX_NAME);
  const wish = clean_(data.wish, MAX_WISH);
  if (!name || !wish) return json_({ ok: false, error: 'missing_fields' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_().appendRow([new Date(), name, wish, false]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
