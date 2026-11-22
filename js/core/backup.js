/* ============================================================
   core/backup.js
   JSON 导出 / 导入 / 结构校验 / 旧站数据迁移
   旧站结构：{ courses, tasks, expenses, gpa, kv }
   新结构：Campus.store.normalize(...) 的完整对象
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};
  var APP_ID = 'campus-static';
  var CURRENT_SCHEMA = 1;
  var MAX_TEXT_BYTES = 8 * 1024 * 1024;
  var MAX_ROWS = 20000;

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function num(v, fb) { var n = Number(v); return isFinite(n) ? n : (fb || 0); }

  function bad(message, code) {
    var e = new Error(message);
    e.code = code || 'IMPORT_INVALID';
    return e;
  }

  var ARRAY_KEYS = [
    'courses', 'tasks', 'expenses', 'gpa',
    'parcels', 'foods', 'roommates', 'notes', 'moods'
  ];

  function hasDomain(obj) {
    if (!isObj(obj)) return false;
    if (isObj(obj.kv) || isObj(obj.settings)) return true;
    return ARRAY_KEYS.some(function (k) { return Array.isArray(obj[k]); });
  }

  /* 找到真正承载数据的对象，兼容几种常见外壳 */
  function unwrap(parsed) {
    if (!isObj(parsed)) throw bad('文件内容不是 JSON 对象');

    var candidates = [];
    if (isObj(parsed.data) &&
        (parsed.app === APP_ID || num(parsed.schema, 0) > 0 || hasDomain(parsed.data))) {
      candidates.push({ data: parsed.data, schema: num(parsed.schema, 0), wrapper: parsed });
    }
    if (hasDomain(parsed)) candidates.push({ data: parsed, schema: num(parsed.schema, 0), wrapper: parsed });

    if (!candidates.length) {
      throw bad('这个 JSON 里找不到课表 / 待办 / 账目等字段，可能不是本站的备份');
    }
    return candidates[0];
  }

  /* 结构性校验：类型错就拒绝，不拿坏文件覆盖数据 */
  function validateShape(src) {
    var warnings = [];
    var totalRows = 0;
    var badRows = 0;
    if (!isObj(src)) throw bad('数据主体不是对象');

    if (src.settings != null && !isObj(src.settings)) throw bad('settings 字段结构错误');
    if (src.kv != null && !isObj(src.kv)) throw bad('kv 字段结构错误');

    ARRAY_KEYS.forEach(function (key) {
      if (src[key] == null) return;
      if (!Array.isArray(src[key])) throw bad(key + ' 字段不是数组，备份文件可能被改坏了');
      if (src[key].length > MAX_ROWS) throw bad(key + ' 条数异常（' + src[key].length + '），拒绝导入');
      src[key].forEach(function (row, i) {
        totalRows += 1;
        if (!isObj(row)) {
          badRows += 1;
          warnings.push(key + ' 第 ' + (i + 1) + ' 条不是对象，已跳过');
        }
      });
    });

    /* 坏行超过三成：宁可不导，也不拿半份垃圾覆盖现有数据 */
    if (totalRows > 0 && badRows / totalRows > 0.3) {
      throw bad('超过 30% 的记录结构损坏（' + badRows + '/' + totalRows + '），已拒绝导入');
    }

    return warnings;
  }

  function summary(data) {
    return {
      courses: arr(data.courses).length,
      tasks: arr(data.tasks).length,
      expenses: arr(data.expenses).length,
      gpa: arr(data.gpa).length,
      parcels: arr(data.parcels).length,
      foods: arr(data.foods).length,
      roommates: arr(data.roommates).length,
      notes: arr(data.notes).length,
      moods: arr(data.moods).length
    };
  }

  function summarizeCounts(s) {
    return '课程 ' + s.courses + ' · DDL ' + s.tasks + ' · 账目 ' + s.expenses +
      ' · 绩点 ' + s.gpa + ' · 快递 ' + s.parcels + ' · 便利贴 ' + s.notes;
  }

  /* 旧站迁移：kv 是当年所有零散设置的集合 */
  function migrate(src) {
    var out = {
      settings: isObj(src.settings) ? Object.assign({}, src.settings) : {},
      courses: arr(src.courses),
      tasks: arr(src.tasks),
      expenses: arr(src.expenses),
      gpa: arr(src.gpa),
      parcels: arr(src.parcels),
      foods: arr(src.foods),
      roommates: arr(src.roommates),
      notes: arr(src.notes),
      moods: arr(src.moods)
    };

    var kv = isObj(src.kv) ? src.kv : null;
    var legacy = !!kv;

    if (kv) {
      if (kv.budget != null) out.settings.budget = num(kv.budget, 1200);
      if (kv.termStart) out.settings.termStart = kv.termStart;
      if (Array.isArray(kv.billRef)) out.settings.billRef = kv.billRef;
      if (!out.foods.length && Array.isArray(kv.food)) {
        out.foods = kv.food.map(function (name) {
          return typeof name === 'string' ? { name: name } : name;
        });
      }
    }

    return { data: out, legacy: legacy };
  }

  /* ---------------- 解析导入文本 ---------------- */

  function parseImport(text) {
    if (typeof text !== 'string' || !text.trim()) {
      throw bad('文件是空的');
    }
    if (text.length > MAX_TEXT_BYTES) {
      throw bad('文件超过 8MB，可能不是本工具导出的备份');
    }

    var parsed;
    try {
      parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch (e) {
      throw bad('JSON 解析失败：' + (e && e.message ? e.message : '格式不合法'));
    }

    var env = unwrap(parsed);
    var sourceSchema = env.schema;

    if (sourceSchema > CURRENT_SCHEMA) {
      throw bad('这份备份来自更新版本（schema ' + sourceSchema +
        '），请先用新版本页面再导入，避免丢字段');
    }

    var warnings = validateShape(env.data);
    var migrated = migrate(env.data);

    /* 统一走 store 的归一化，保证类型、范围、默认值一致 */
    var normalized = Campus.store.normalize(migrated.data);
    var before = summary(migrated.data);
    var after = summary(normalized);

    ARRAY_KEYS.forEach(function (k) {
      if (before[k] && after[k] < before[k]) {
        warnings.push(k + '：' + (before[k] - after[k]) + ' 条缺字段的记录被跳过');
      }
    });

    if (summary(normalized).courses === 0 &&
        summary(normalized).tasks === 0 &&
        summary(normalized).expenses === 0 &&
        summary(normalized).notes === 0 &&
        summary(normalized).moods === 0 &&
        summary(normalized).parcels === 0) {
      warnings.push('这份备份里没有任何可恢复的记录，导入后会是空数据');
    }

    return {
      ok: true,
      data: normalized,
      warnings: warnings,
      legacy: migrated.legacy,
      sourceSchema: sourceSchema,
      summary: summary(normalized),
      summaryText: summarizeCounts(summary(normalized))
    };
  }

  function applyImport(text) {
    var result = parseImport(text);
    Campus.store.replace(result.data);
    return result;
  }

  /* ---------------- 导出 ---------------- */

  function exportPayload() {
    var data = Campus.store.load();
    return {
      app: APP_ID,
      schema: CURRENT_SCHEMA,
      exportedAt: new Date().toISOString(),
      summary: summary(data),
      data: data
    };
  }

  function stamp() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function downloadText(text, filename) {
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function exportFile() {
    var payload = exportPayload();
    var text = JSON.stringify(payload, null, 2);
    var filename = 'campus-backup-' + stamp() + '.json';
    downloadText(text, filename);
    return { filename: filename, bytes: text.length, payload: payload };
  }

  Campus.backup = {
    APP_ID: APP_ID,
    CURRENT_SCHEMA: CURRENT_SCHEMA,
    summary: summary,
    parseImport: parseImport,
    applyImport: applyImport,
    exportPayload: exportPayload,
    exportFile: exportFile,
    validateShape: validateShape,
    migrate: migrate
  };
})(window);
