/* ============================================================
   core/store.js
   本地数据层：localStorage 封装 + schema 版本 + 异常兜底 + 写入节流
   依赖：无（经典脚本，暴露 Campus.storage / Campus.store）
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};

  var ROOT_KEY = 'campus.v1';
  var THEME_KEY = 'campus.theme';
  var SCHEMA = 1;
  var SAVE_DELAY = 180;

  var cache = null;
  var dirty = false;
  var timer = null;
  var memoryOnly = false;
  var lastError = '';
  var listeners = [];
  var bootstrapped = false;

  /* ---------------- 小工具 ---------------- */

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v, fb) {
    if (typeof v === 'string') return v;
    if (v == null) return fb || '';
    return String(v);
  }
  function num(v, fb) {
    var n = Number(v);
    return isFinite(n) ? n : (isFinite(Number(fb)) ? Number(fb) : 0);
  }
  function bool(v) {
    return v === true || v === 1 || v === 'true' || v === '1';
  }
  function dateStr(v, fb) {
    var s = str(v, '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : (fb || '');
  }
  function uid(prefix) {
    var tail;
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      tail = global.crypto.randomUUID().replace(/-/g, '').slice(0, 10);
    } else {
      tail = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    }
    return (prefix || 'id') + '_' + tail;
  }
  function clone(v) {
    if (v == null) return v;
    try {
      if (typeof global.structuredClone === 'function') return global.structuredClone(v);
      return JSON.parse(JSON.stringify(v));
    } catch (e) {
      return JSON.parse(JSON.stringify(v));
    }
  }
  function daysInMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }
  function parseWeeks(v) {
    if (Array.isArray(v)) {
      return v.map(Number).filter(function (n) { return isFinite(n) && n > 0 && n <= 30; })
        .filter(function (n, i, a) { return a.indexOf(n) === i; })
        .sort(function (a, b) { return a - b; });
    }
    if (typeof v === 'number') return isFinite(v) && v > 0 && v <= 30 ? [v] : [];
    if (typeof v !== 'string') return [];
    var out = [];
    v.split(/[,，、\s]+/).forEach(function (seg) {
      if (!seg) return;
      var m = seg.match(/^(\d+)\s*[-~至]\s*(\d+)/);
      if (m) {
        var a = Number(m[1]); var b = Number(m[2]);
        if (a > b) { var t = a; a = b; b = t; }
        for (var i = Math.max(1, a); i <= Math.min(30, b); i++) out.push(i);
      } else {
        var n = parseInt(seg, 10);
        if (isFinite(n) && n > 0 && n <= 30) out.push(n);
      }
    });
    return out.filter(function (n, i, a) { return a.indexOf(n) === i; })
      .sort(function (a, b) { return a - b; });
  }

  /* ---------------- 低层 localStorage 封装 ---------------- */

  var storage = {
    available: true,

    raw: function (key) {
      try { return global.localStorage.getItem(key); }
      catch (e) {
        storage.available = false;
        lastError = '浏览器禁止访问本地存储：' + (e && e.message ? e.message : e);
        return null;
      }
    },

    get: function (key, fallback) {
      var raw = storage.raw(key);
      if (raw == null) return fallback;
      try { return JSON.parse(raw); }
      catch (e) { return raw; } /* 非 JSON 的旧值原样返回 */
    },

    set: function (key, value) {
      var text;
      try { text = JSON.stringify(value); }
      catch (e) {
        lastError = '数据无法序列化：' + (e && e.message ? e.message : e);
        return false;
      }
      try {
        global.localStorage.setItem(key, text);
        storage.available = true;
        return true;
      } catch (e) {
        storage.available = false;
        memoryOnly = true;
        lastError = (e && e.name === 'QuotaExceededError')
          ? '浏览器存储已满（约 5MB），请先导出备份再清理'
          : '浏览器拒绝写入（隐私模式或存储被禁用）';
        return false;
      }
    },

    remove: function (key) {
      try { global.localStorage.removeItem(key); return true; }
      catch (e) {
        storage.available = false;
        lastError = '浏览器拒绝删除本地数据';
        return false;
      }
    },

    setRaw: function (key, text) {
      try { global.localStorage.setItem(key, text); return true; }
      catch (e) { memoryOnly = true; lastError = '浏览器拒绝写入'; return false; }
    }
  };

  /* ---------------- 数据形状 ---------------- */

  function blank() {
    return {
      schema: SCHEMA,
      updatedAt: 0,
      settings: {
        budget: 1200,
        termStart: '2026-08-24',
        semesterWeeks: 20,
        billRef: []
      },
      courses: [],
      tasks: [],
      expenses: [],
      gpa: [],
      parcels: [],
      foods: [],
      roommates: [],
      notes: [],
      moods: []
    };
  }

  function sanitize(raw) {
    var d = isObj(raw) ? raw : {};
    var out = blank();
    var s = isObj(d.settings) ? d.settings : {};

    out.schema = SCHEMA;
    out.updatedAt = num(d.updatedAt, 0);

    out.settings.budget = Math.max(0, num(s.budget, 1200));
    out.settings.termStart = dateStr(s.termStart, '2026-08-24');
    out.settings.semesterWeeks = Math.min(30, Math.max(1, num(s.semesterWeeks, 20)));
    out.settings.billRef = arr(s.billRef).filter(isObj).map(function (b) {
      return { ym: str(b.ym, ''), channel: str(b.channel, ''), amount: num(b.amount, 0) };
    });

    out.courses = arr(d.courses).filter(isObj).map(function (c, i) {
      return {
        id: str(c.id, '') || ('c' + (i + 1)),
        day: Math.min(7, Math.max(1, num(c.day, 1))),
        start: Math.min(10, Math.max(1, num(c.start, 1))),
        len: Math.min(4, Math.max(1, num(c.len, 1))),
        name: str(c.name, ''),
        teacher: str(c.teacher, ''),
        room: str(c.room, ''),
        weeks: parseWeeks(c.weeks)
      };
    }).filter(function (c) { return c.name; });

    out.tasks = arr(d.tasks).filter(isObj).map(function (t, i) {
      return {
        id: str(t.id, '') || ('t' + (i + 1)),
        title: str(t.title, ''),
        due: dateStr(t.due, ''),
        done: bool(t.done),
        note: str(t.note, ''),
        createdAt: num(t.createdAt, 0)
      };
    }).filter(function (t) { return t.title; });

    out.expenses = arr(d.expenses).filter(isObj).map(function (e, i) {
      return {
        id: str(e.id, '') || ('e' + (i + 1)),
        date: dateStr(e.date, ''),
        amount: Math.max(0, num(e.amount, 0)),
        cat: str(e.cat, '其他') || '其他',
        note: str(e.note, '')
      };
    });

    out.gpa = arr(d.gpa).filter(isObj).map(function (g, i) {
      return {
        id: str(g.id, '') || ('g' + (i + 1)),
        name: str(g.name, ''),
        credit: Math.max(0, num(g.credit, 0)),
        score: Math.max(0, num(g.score, 0)),
        point: Math.max(0, num(g.point, 0))
      };
    }).filter(function (g) { return g.name; });

    out.parcels = arr(d.parcels).filter(isObj).map(function (p) {
      return {
        id: str(p.id, '') || uid('p'),
        code: str(p.code, ''),
        carrier: str(p.carrier, ''),
        createdAt: num(p.createdAt, Date.now()),
        doneAt: p.doneAt ? num(p.doneAt, 0) : 0
      };
    }).filter(function (p) { return p.code; });

    out.foods = arr(d.foods).map(function (f) {
      if (typeof f === 'string') return { id: uid('f'), name: f.trim() };
      if (isObj(f)) return { id: str(f.id, '') || uid('f'), name: str(f.name, '').trim() };
      return null;
    }).filter(function (f) { return f && f.name; });

    out.roommates = arr(d.roommates).map(function (r) {
      if (typeof r === 'string') return { id: uid('r'), name: r.trim() };
      if (isObj(r)) return { id: str(r.id, '') || uid('r'), name: str(r.name, '').trim() };
      return null;
    }).filter(function (r) { return r && r.name; });

    out.notes = arr(d.notes).filter(isObj).map(function (n) {
      return {
        id: str(n.id, '') || uid('n'),
        text: str(n.text, ''),
        color: n.color === 'red' ? 'red' : 'yellow',
        pinned: bool(n.pinned),
        done: bool(n.done),
        createdAt: num(n.createdAt, Date.now())
      };
    }).filter(function (n) { return n.text; });

    out.moods = arr(d.moods).filter(isObj).map(function (m) {
      return {
        id: str(m.id, '') || uid('m'),
        date: dateStr(m.date, ''),
        emoji: str(m.emoji, ''),
        note: str(m.note, ''),
        createdAt: num(m.createdAt, 0)
      };
    }).filter(function (m) { return m.date && m.emoji; });

    return out;
  }

  /* ---------------- 通知 ---------------- */

  function emit(evt) {
    listeners.forEach(function (fn) {
      try { fn(evt); } catch (e) { /* 单个订阅者出错不能影响别人 */ }
    });
    try {
      global.dispatchEvent(new CustomEvent('campus:change', { detail: evt }));
    } catch (e) { /* 旧浏览器不支持 CustomEvent 时忽略 */ }
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  /* ---------------- 载入 / 保存 ---------------- */

  function load() {
    if (cache) return clone(cache);
    var raw = storage.raw(ROOT_KEY);
    if (raw == null) {
      cache = blank();
      return clone(cache);
    }
    try {
      var parsed = JSON.parse(raw);
      if (!isObj(parsed)) throw new Error('根数据不是对象');
      cache = sanitize(parsed);
    } catch (e) {
      /* 坏数据留档，不要直接覆盖用户原始串 */
      storage.setRaw(ROOT_KEY + '.corrupt.' + Date.now(), raw.slice(0, 200000));
      lastError = '本地数据损坏，已留档并重置为空数据';
      cache = blank();
      emit({ type: 'error', message: lastError });
    }
    return clone(cache);
  }

  function saveNow() {
    if (!cache) return true;
    cache.schema = SCHEMA;
    var ok = storage.set(ROOT_KEY, cache);
    if (ok) {
      dirty = false;
      memoryOnly = false;
      storage.available = true;
    } else {
      memoryOnly = true;
      emit({ type: 'error', message: lastError || '写入失败' });
    }
    return ok;
  }

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!dirty || !cache) return true;
    return saveNow();
  }

  function schedule() {
    dirty = true;
    if (timer) return;
    timer = setTimeout(function () {
      timer = null;
      if (dirty) saveNow();
    }, SAVE_DELAY);
  }

  function update(mutator) {
    if (typeof mutator !== 'function') return load();
    var current = load();
    var next = clone(current);
    var ret = mutator(next);
    if (isObj(ret)) next = ret;
    next.schema = SCHEMA;
    next.updatedAt = Date.now();
    cache = sanitize(next);
    schedule();
    emit({ type: 'change', data: clone(cache) });
    return clone(cache);
  }

  function get(path, fallback) {
    var parts = str(path, '').split('.').filter(Boolean);
    var cur = load();
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return fallback;
      cur = cur[parts[i]];
    }
    return cur == null ? fallback : cur;
  }

  function setPath(path, value) {
    return update(function (d) {
      var parts = str(path, '').split('.').filter(Boolean);
      if (!parts.length) return d;
      var cur = d;
      for (var i = 0; i < parts.length - 1; i++) {
        if (!isObj(cur[parts[i]])) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return d;
    });
  }

  function replace(next) {
    cache = sanitize(next);
    cache.updatedAt = Date.now();
    dirty = true;
    saveNow();
    emit({ type: 'replace', data: clone(cache) });
    return clone(cache);
  }

  function reset() {
    cache = blank();
    cache.updatedAt = Date.now();
    dirty = true;
    saveNow();
    emit({ type: 'reset', data: clone(cache) });
    return clone(cache);
  }

  function stats() {
    var d = load();
    return {
      bytes: (function () {
        try { return global.localStorage.getItem(ROOT_KEY).length; } catch (e) { return 0; }
      })(),
      counts: {
        courses: d.courses.length,
        tasks: d.tasks.length,
        expenses: d.expenses.length,
        gpa: d.gpa.length,
        parcels: d.parcels.length,
        foods: d.foods.length,
        roommates: d.roommates.length,
        notes: d.notes.length,
        moods: d.moods.length
      },
      updatedAt: d.updatedAt
    };
  }

  /* ---------------- 主题（裸字符串，配合 head 防闪烁脚本） ---------------- */

  var theme = {
    get: function () {
      var raw = storage.raw(THEME_KEY);
      if (!raw) return null;
      if (raw === 'dark' || raw === 'light') return raw;
      try {
        var p = JSON.parse(raw);
        return (p === 'dark' || p === 'light') ? p : null;
      } catch (e) {
        return null;
      }
    },
    set: function (value) {
      if (value !== 'dark' && value !== 'light') return false;
      return storage.setRaw(THEME_KEY, value);
    }
  };

  /* ---------------- 生命周期：关页/切后台强制落盘 ---------------- */

  function bootstrap() {
    if (bootstrapped) return;
    bootstrapped = true;
    load();
    global.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
    global.addEventListener('beforeunload', flush);
  }

  Campus.storage = storage;
  Campus.store = {
    SCHEMA: SCHEMA,
    KEY: ROOT_KEY,
    THEME_KEY: THEME_KEY,
    blank: blank,
    normalize: sanitize,
    load: load,
    data: load,
    get: get,
    set: setPath,
    update: update,
    replace: replace,
    reset: reset,
    flush: flush,
    stats: stats,
    onChange: onChange,
    theme: theme,
    bootstrap: bootstrap,
    isMemoryOnly: function () { return memoryOnly; },
    lastError: function () { return lastError; },
    uid: uid,
    parseWeeks: parseWeeks,
    daysInMonth: daysInMonth
  };
})(window);
