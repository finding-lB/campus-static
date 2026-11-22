/* ============================================================
   modules/tasks.js · DDL 待办
   数据：store.tasks = [{ id, title, due:'YYYY-MM-DD', done, note, createdAt }]
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};
  Campus.views = Campus.views || {};

  var bound = false;
  var filter = 'all';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function toast(msg) {
    if (Campus.app && Campus.app.toast) Campus.app.toast(msg);
  }
  function hint(msg, type) {
    var el = $('taskHint');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', type === 'error');
    el.classList.toggle('is-ok', type === 'ok');
  }
  function refreshHome() {
    if (Campus.app && Campus.app.refreshStats) {
      try { Campus.app.refreshStats(); } catch (e) { /* noop */ }
    }
  }

  function tasks() {
    var list = Campus.store.get('tasks', []);
    return Array.isArray(list) ? list : [];
  }
  function daysUntil(due) {
    if (!due) return null;
    var t = new Date(due + 'T00:00:00');
    if (isNaN(t.getTime())) return null;
    var now = new Date();
    var base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((t - base) / 86400000);
  }
  function dueMeta(task) {
    if (task.done) {
      return { text: task.due ? ('完成 · 原定 ' + task.due.slice(5).replace('-', '/')) : '已完成', cls: '' };
    }
    if (!task.due) return { text: '无截止日期', cls: '' };
    var n = daysUntil(task.due);
    var dateText = task.due.slice(5).replace('-', '/');
    if (n === null) return { text: dateText, cls: '' };
    if (n < 0) return { text: dateText + ' · 逾期 ' + (-n) + ' 天', cls: 'is-overdue' };
    if (n === 0) return { text: dateText + ' · 今天截止', cls: 'is-today' };
    if (n === 1) return { text: dateText + ' · 明天截止', cls: 'is-soon' };
    if (n <= 7) return { text: dateText + ' · 还有 ' + n + ' 天', cls: 'is-soon' };
    return { text: dateText, cls: '' };
  }

  function matchFilter(t) {
    var n = daysUntil(t.due);
    switch (filter) {
      case 'today': return !t.done && t.due === todayStr();
      case 'week': return !t.done && n !== null && n >= 0 && n <= 6;
      case 'overdue': return !t.done && n !== null && n < 0;
      case 'done': return !!t.done;
      default: return true;
    }
  }
  function sortTasks(list) {
    return list.slice().sort(function (a, b) {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      if (!a.due && b.due) return 1;
      if (a.due && !b.due) return -1;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function row(t) {
    var meta = dueMeta(t);
    return '<li class="task-row' + (t.done ? ' is-done' : '') + '" data-id="' + esc(t.id) + '">' +
      '<button class="task-check' + (t.done ? ' is-done' : '') + '" type="button" data-task-toggle ' +
        'aria-label="' + (t.done ? '标记为未完成' : '标记为已完成') + '" ' +
        'aria-pressed="' + (t.done ? 'true' : 'false') + '">✓</button>' +
      '<div class="task-main">' +
        '<span class="task-title">' + esc(t.title) + '</span>' +
        '<span class="task-meta"><span class="task-due ' + meta.cls + '">' + esc(meta.text) + '</span></span>' +
      '</div>' +
      '<button class="task-del" type="button" data-task-del title="删除" aria-label="删除">×</button>' +
    '</li>';
  }

  function emptyText() {
    var map = {
      all: '还没有待办。把最近要交的 DDL 写进来。',
      today: '今天没有截止的待办，松一口气。',
      week: '未来 7 天没有待办。',
      overdue: '没有逾期，节奏不错。',
      done: '还没有已完成的待办。'
    };
    return map[filter] || map.all;
  }

  function render() {
    var listEl = $('taskList');
    var countEl = $('taskCount');
    var all = tasks();
    var shown = sortTasks(all.filter(matchFilter));

    if (countEl) {
      var todo = all.filter(function (t) { return !t.done; }).length;
      var done = all.length - todo;
      countEl.textContent = todo + ' 条待办' + (done ? ' · ' + done + ' 条已完成' : '');
    }

    if (!listEl) return;
    if (!shown.length) {
      listEl.innerHTML = '<li class="empty">' + esc(emptyText()) + '</li>';
      return;
    }
    listEl.innerHTML = shown.map(row).join('');
  }

  function bind() {
    if (bound) return;
    bound = true;

    var due = $('taskDue');
    if (due && !due.value) due.value = todayStr();

    var form = $('taskForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var titleEl = $('taskTitle');
        var title = (titleEl.value || '').trim();
        if (!title) { hint('待办标题不能为空。', 'error'); titleEl.focus(); return; }
        var d = ($('taskDue') && $('taskDue').value) || todayStr();

        Campus.store.update(function (data) {
          data.tasks = data.tasks || [];
          data.tasks.push({
            id: Campus.store.uid('t'),
            title: title,
            due: d,
            done: false,
            note: '',
            createdAt: Date.now()
          });
          return data;
        });

        form.reset();
        if ($('taskDue')) $('taskDue').value = todayStr();
        render();
        refreshHome();
        hint('已加入待办。', 'ok');
        toast('DDL +1');
        titleEl.focus();
      });
    }

    var filters = $('taskFilters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-filter]');
        if (!btn) return;
        filter = btn.getAttribute('data-filter');
        Array.prototype.forEach.call(filters.querySelectorAll('[data-filter]'), function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        render();
      });
    }

    var listEl = $('taskList');
    if (listEl) {
      listEl.addEventListener('click', function (e) {
        var rowEl = e.target.closest('.task-row');
        if (!rowEl) return;
        var id = rowEl.getAttribute('data-id');
        var task = tasks().filter(function (t) { return t.id === id; })[0];
        if (!task) return;

        if (e.target.closest('[data-task-del]')) {
          if (!global.confirm('删除「' + task.title + '」？')) return;
          Campus.store.update(function (d) {
            d.tasks = (d.tasks || []).filter(function (t) { return t.id !== id; });
            return d;
          });
          render();
          refreshHome();
          hint('已删除。', '');
          toast('待办已删除');
          return;
        }

        if (e.target.closest('[data-task-toggle]')) {
          Campus.store.update(function (d) {
            (d.tasks || []).forEach(function (t) {
              if (t.id === id) t.done = !t.done;
            });
            return d;
          });
          render();
          refreshHome();
          toast(task.done ? '已恢复为未完成' : '完成，干得漂亮');
        }
      });
    }
  }

  function view() {
    bind();
    render();
  }

  Campus.views.tasks = view;
})(window);
