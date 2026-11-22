/* ============================================================
   app.js
   入口：主题切换 / Hash 路由 / 更多弹层 / 概览摘要 / 设置备份
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};
  var doc = document;

  var PERIODS = ['08:00', '09:00', '10:10', '11:10', '14:00',
    '15:00', '16:10', '17:10', '19:00', '20:00'];
  var DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  var toastTimer = null;
  var sheetOpen = false;

  function $(id) { return doc.getElementById(id); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    return '¥' + Number(n || 0).toFixed(2);
  }
  function ymd(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function diffDays(a, b) {
    var ms = new Date(b.getFullYear(), b.getMonth(), b.getDate()) -
      new Date(a.getFullYear(), a.getMonth(), a.getDate());
    return Math.round(ms / 86400000);
  }
  function data() { return Campus.store.load(); }

  /* ---------------- 轻提示 ---------------- */

  function toast(message, ms) {
    var el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { if (!el.classList.contains('show')) el.hidden = true; }, 240);
    }, ms || 2600);
  }

  /* ---------------- 主题 ---------------- */

  function applyTheme(theme, persist) {
    var root = doc.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    var meta = $('metaTheme');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1c1917' : '#f6f5f4');
    var btn = $('themeBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    }
    if (persist && Campus.store && Campus.store.theme) {
      Campus.store.theme.set(theme);
    }
  }

  function initTheme() {
    var btn = $('themeBtn');
    var current = doc.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(current, false);

    if (btn) {
      btn.addEventListener('click', function () {
        var next = doc.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    }

    /* 用户没手动选过：跟随系统变化 */
    try {
      var mq = global.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        var saved = Campus.store.theme.get();
        if (saved !== 'dark' && saved !== 'light') {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) { /* noop */ }
  }

  /* ---------------- 周次 / 日期 ---------------- */

  function termStart() {
    var s = (data().settings || {}).termStart || '2026-08-24';
    var d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? new Date(2026, 7, 24) : d;
  }

  function currentWeek() {
    var today = new Date();
    var start = termStart();
    var n = Math.floor(diffDays(start, today) / 7) + 1;
    if (!isFinite(n) || n < 1) return 1;
    return n;
  }

  function todayNum() { return (new Date().getDay() + 6) % 7 + 1; }

  function refreshClockLabels() {
    var now = new Date();
    var week = currentWeek();
    var day = DAY_NAMES[(now.getDay() + 6) % 7];
    var label = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + day + ' · 第 ' + week + ' 周';
    var top = $('todayLabel');
    if (top) top.textContent = label;
    var hw = $('homeWeek');
    if (hw) hw.textContent = '第 ' + week + ' 周 · ' + day;

    var h = now.getHours();
    var greet = '晚上好';
    if (h < 5) greet = '凌晨好';
    else if (h < 11) greet = '早上好';
    else if (h < 13) greet = '中午好';
    else if (h < 18) greet = '下午好';
    var g = $('homeGreeting');
    if (g) g.textContent = greet;
  }

  /* ---------------- 概览摘要 ---------------- */

  function todayCourses(d) {
    var week = currentWeek();
    var day = todayNum();
    return (d.courses || []).filter(function (c) {
      return c.day === day && (c.weeks || []).indexOf(week) >= 0;
    }).sort(function (a, b) { return a.start - b.start; });
  }

  function refreshStats() {
    var d = data();
    var t = todayCourses(d);
    var tasks = (d.tasks || []).filter(function (x) { return !x.done; });
    var parcels = (d.parcels || []).filter(function (x) { return !x.doneAt; });
    var notes = (d.notes || []).filter(function (x) { return !x.done; });

    var now = new Date();
    var prefix = now.getFullYear() + '-' + pad(now.getMonth() + 1);
    var spent = (d.expenses || []).reduce(function (sum, e) {
      return (e.date || '').slice(0, 7) === prefix ? sum + Number(e.amount || 0) : sum;
    }, 0);

    var so = $('statToday'); if (so) so.textContent = String(t.length);
    var st = $('statTasks'); if (st) st.textContent = String(tasks.length);
    var ss = $('statSpent'); if (ss) ss.textContent = money(spent);
    var sp = $('statParcels'); if (sp) sp.textContent = String(parcels.length);

    var qp = $('quickParcel'); if (qp) qp.textContent = parcels.length ? (parcels.length + ' 件待取') : '暂无快递';
    var qn = $('quickNotes'); if (qn) qn.textContent = notes.length ? (notes.length + ' 张没打勾') : '空白墙';

    var soon = tasks.filter(function (x) {
      if (!x.due) return false;
      var due = new Date(x.due + 'T23:59:59');
      var gap = diffDays(now, due);
      return gap >= 0 && gap <= 7;
    }).length;
    var sub = $('homeSub');
    if (sub) {
      sub.textContent = t.length
        ? '今天 ' + t.length + ' 节课，' + soon + ' 个 DDL 在 7 天内到期。'
        : '今天没有课，' + soon + ' 个 DDL 在 7 天内到期。';
    }

    var list = $('homeToday');
    if (list) {
      if (!t.length) {
        list.innerHTML = '<li class="empty">今天没有课，可以做点自己的事</li>';
      } else {
        list.innerHTML = t.map(function (c) {
          var end = c.start + (c.len || 1) - 1;
          return '<li class="row"><b>' + esc(c.name) + '</b>' +
            '<small class="muted">第 ' + c.start + (end > c.start ? ('–' + end) : '') +
            ' 节 · ' + PERIODS[c.start - 1] + (c.room ? (' · ' + esc(c.room)) : '') + '</small></li>';
        }).join('');
      }
    }

    refreshStorageChip();
  }

  function refreshStorageChip() {
    var chip = $('storageChip');
    if (!chip) return;
    var mem = Campus.store.isMemoryOnly();
    chip.textContent = mem ? '内存模式' : '本地存储';
    chip.title = mem
      ? '浏览器拒绝写入，改动只在当前页面有效，请先导出备份'
      : '数据只存在这台设备，换设备请导出 JSON';

    var info = $('storageInfo');
    if (info) {
      var s = Campus.store.stats();
      var kb = (s.bytes / 1024).toFixed(1);
      info.textContent = kb + ' KB · 课程 ' + s.counts.courses + ' · DDL ' + s.counts.tasks +
        ' · 账目 ' + s.counts.expenses;
    }
  }

  /* ---------------- 更多弹层 ---------------- */

  function openSheet() {
    var sheet = $('moreSheet');
    if (!sheet) return;
    sheet.hidden = false;
    sheetOpen = true;
    doc.body.style.overflow = 'hidden';
    var btn = $('tabMore');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    var close = $('moreClose');
    if (close) close.focus({ preventScroll: true });
  }

  function closeSheet() {
    var sheet = $('moreSheet');
    if (!sheet || !sheetOpen) return;
    sheet.hidden = true;
    sheetOpen = false;
    doc.body.style.overflow = '';
    var btn = $('tabMore');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.focus({ preventScroll: true });
    }
  }

  function initSheet() {
    var btn = $('tabMore');
    var sheet = $('moreSheet');
    if (btn) {
      btn.addEventListener('click', function () {
        if (sheetOpen) closeSheet(); else openSheet();
      });
    }
    if (!sheet) return;
    var close = $('moreClose');
    if (close) close.addEventListener('click', closeSheet);
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) closeSheet();
      var link = e.target.closest ? e.target.closest('a[href^="#/"]') : null;
      if (link) closeSheet();
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheetOpen) closeSheet();
    });
  }

  /* ---------------- 设置 / 备份 ---------------- */

  function currentSummaryText() {
    var d = data();
    return '课程 ' + (d.courses || []).length + ' · DDL ' + (d.tasks || []).length +
      ' · 账目 ' + (d.expenses || []).length + ' · 便利贴 ' + (d.notes || []).length;
  }

  function initSettings() {
    var exportBtn = $('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        try {
          var res = Campus.backup.exportFile();
          toast('已导出 ' + res.filename);
        } catch (e) {
          toast('导出失败：' + (e.message || '浏览器不允许下载'));
        }
      });
    }

    var input = $('importInput');
    if (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) { toast('文件超过 8MB，拒绝导入'); return; }

        var reader = new FileReader();
        reader.onerror = function () { toast('读不到这个文件'); };
        reader.onload = function () {
          var result;
          try {
            result = Campus.backup.parseImport(String(reader.result || ''));
          } catch (e) {
            toast('导入失败：' + (e.message || '结构不合法'));
            return;
          }

          var warn = result.warnings.length
            ? '\n\n注意：\n· ' + result.warnings.slice(0, 4).join('\n· ')
            : '';
          var ok = global.confirm(
            '导入会覆盖当前数据（' + currentSummaryText() + '）。\n\n' +
            '这份备份：' + result.summaryText + (result.legacy ? '（旧站结构已迁移）' : '') +
            warn + '\n\n继续？'
          );
          if (!ok) return;

          try {
            Campus.store.replace(result.data);
            if (Campus.store.isMemoryOnly()) {
              toast('导入成功，但浏览器拒绝写入本地存储：这份数据只在当前页面有效，请换浏览器或关闭无痕模式', 5200);
              return;
            }
            toast('导入完成，正在刷新…');
            setTimeout(function () { global.location.reload(); }, 700);
          } catch (e) {
            toast('写入失败：' + (e.message || '浏览器拒绝写入'));
          }
        };
        reader.readAsText(file);
      });
    }

    var resetBtn = $('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        var sure = global.confirm(
          '确定清空全部数据？\n\n当前：' + currentSummaryText() +
          '\n\n清空后无法恢复，建议先导出备份。'
        );
        if (!sure) return;
        if (!global.confirm('再确认一次：真的要清空吗？')) return;
        Campus.store.reset();
        if (Campus.store.isMemoryOnly()) {
          toast('已清空当前页面数据，但浏览器拒绝写入，刷新后可能还原', 4800);
          return;
        }
        toast('已清空，正在刷新…');
        setTimeout(function () { global.location.reload(); }, 600);
      });
    }
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    initTheme();

    try {
      Campus.store.bootstrap();
    } catch (e) {
      toast('本地存储不可用：' + (e.message || '未知错误'));
    }

    var bootError = Campus.store.lastError();
    if (bootError) toast(bootError, 4200);

    Campus.store.onChange(function (evt) {
      if (evt && evt.type === 'error') toast(evt.message);
      refreshStorageChip();
    });

    refreshClockLabels();
    refreshStats();
    initSheet();
    initSettings();

    Campus.router.init();
    Campus.router.onChange(function (view) {
      if (sheetOpen) closeSheet();
      refreshClockLabels();
      refreshStats();
      var render = Campus.views && Campus.views[view];
      if (typeof render === 'function') {
        try { render(); } catch (e) { /* 模块异常不拖垮路由 */ }
      }
    });

    /* 每分钟刷新「今天 / 下一节」，跨零点也能自动换 */
    setInterval(function () {
      refreshClockLabels();
      refreshStats();
    }, 60000);

    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'visible') {
        refreshClockLabels();
        refreshStats();
      }
    });
  }

  Campus.app = {
    init: init,
    toast: toast,
    refreshStats: refreshStats,
    currentWeek: currentWeek,
    periodAt: function (i) { return PERIODS[i - 1] || ''; }
  };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
