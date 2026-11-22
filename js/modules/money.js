/* ============================================================
   modules/money.js · 记账 + 月度预算
   数据：store.expenses = [{ id, date:'YYYY-MM-DD', amount:number, cat, note }]
        store.settings.budget
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};
  Campus.views = Campus.views || {};

  var bound = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function ym(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }
  function money(n) {
    var v = Number(n) || 0;
    return '¥' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function toast(msg) {
    if (Campus.app && Campus.app.toast) Campus.app.toast(msg);
  }
  function hint(msg, type) {
    var el = $('moneyHint');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', type === 'error');
    el.classList.toggle('is-ok', type === 'ok');
  }
  function formHint(msg, type) {
    var el = $('expenseHint');
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

  function expenses() {
    var list = Campus.store.get('expenses', []);
    return Array.isArray(list) ? list : [];
  }
  function currentMonth() {
    var key = ym();
    return expenses().filter(function (e) {
      return typeof e.date === 'string' && e.date.slice(0, 7) === key;
    }).sort(function (a, b) {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.id || '').localeCompare(a.id || '');
    });
  }
  function budget() {
    var s = Campus.store.get('settings', {}) || {};
    var n = Number(s.budget);
    return isFinite(n) && n >= 0 ? n : 1200;
  }

  function expenseRow(e) {
    return '<li class="expense-row" data-id="' + esc(e.id) + '">' +
      '<div class="expense-main">' +
        '<span class="expense-cat">' + esc(e.cat || '其他') + '</span>' +
        '<span class="expense-meta">' + esc((e.date || '').slice(5).replace('-', '/')) +
          (e.note ? ' · ' + esc(e.note) : '') + '</span>' +
      '</div>' +
      '<div class="expense-side">' +
        '<span class="expense-amount">' + money(e.amount) + '</span>' +
        '<button class="task-del" type="button" data-exp-del title="删除" aria-label="删除">×</button>' +
      '</div>' +
    '</li>';
  }

  function render() {
    var list = currentMonth();
    var spent = list.reduce(function (sum, e) { return sum + (Number(e.amount) || 0); }, 0);
    var b = budget();

    var month = $('moneyMonth');
    if (month) {
      var now = new Date();
      month.textContent = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月账本';
    }

    var input = $('budgetInput');
    if (input && document.activeElement !== input) input.value = String(b);

    var spentEl = $('moneySpent');
    if (spentEl) spentEl.textContent = money(spent);

    var bar = $('moneyBar');
    if (bar) {
      var pct = b > 0 ? Math.round((spent / b) * 100) : (spent > 0 ? 100 : 0);
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
      bar.classList.toggle('is-over', spent > b && b >= 0 && spent > 0);
    }

    if (b > 0) {
      var left = b - spent;
      if (left < 0) hint('已超支 ' + money(-left) + '，本月预算 ' + money(b) + '。', 'error');
      else hint('还剩 ' + money(left) + ' · 已用 ' + Math.round((spent / b) * 100) + '%', '');
    } else if (spent > 0) {
      hint('预算为 0，已花 ' + money(spent) + '；点上面的预算框设一个数。', 'error');
    } else {
      hint('预算为 0；点上面的预算框设一个数。', '');
    }

    var count = $('expenseCount');
    if (count) count.textContent = list.length + ' 笔';

    var listEl = $('expenseList');
    if (listEl) {
      listEl.innerHTML = list.length
        ? list.map(expenseRow).join('')
        : '<li class="empty">本月还没有支出</li>';
    }
  }

  function saveBudget() {
    var input = $('budgetInput');
    if (!input) return;
    if (input.value === '') {
      input.value = String(budget());
      hint('预算不能为空。', 'error');
      return;
    }
    var n = Number(input.value);
    if (!isFinite(n) || n < 0) {
      input.value = String(budget());
      hint('预算要填 0 或正数。', 'error');
      return;
    }
    n = Math.round(n);
    Campus.store.set('settings.budget', n);
    render();
    refreshHome();
    toast('月度预算已改为 ' + money(n));
  }

  function bind() {
    if (bound) return;
    bound = true;

    var dateEl = $('expDate');
    if (dateEl && !dateEl.value) dateEl.value = ymd();

    if ($('budgetInput')) {
      $('budgetInput').addEventListener('change', saveBudget);
      $('budgetInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); saveBudget(); }
      });
    }

    var form = $('expenseForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var amountEl = $('expAmount');
        var amount = Number(amountEl.value);
        if (!isFinite(amount) || amount <= 0) {
          formHint('金额要大于 0。', 'error');
          amountEl.focus();
          return;
        }
        amount = Math.round(amount * 100) / 100;

        var date = ($('expDate') && $('expDate').value) || ymd();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          formHint('日期格式不对。', 'error');
          return;
        }
        var cat = ($('expCat') && $('expCat').value) || '其他';
        var note = ($('expNote') && $('expNote').value || '').trim();

        Campus.store.update(function (d) {
          d.expenses = d.expenses || [];
          d.expenses.push({
            id: Campus.store.uid('e'),
            date: date,
            amount: amount,
            cat: cat,
            note: note
          });
          return d;
        });

        var isThisMonth = date.slice(0, 7) === ym();
        form.reset();
        if ($('expDate')) $('expDate').value = ymd();
        render();
        refreshHome();
        formHint('已记一笔 ' + money(amount) + '。', 'ok');
        toast(isThisMonth ? '已记入本月账本' : '已记到 ' + date.slice(5, 7) + ' 月，本月列表看不到');
        amountEl.focus();
      });
    }

    var listEl = $('expenseList');
    if (listEl) {
      listEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-exp-del]');
        if (!btn) return;
        var rowEl = e.target.closest('.expense-row');
        if (!rowEl) return;
        var id = rowEl.getAttribute('data-id');
        var item = expenses().filter(function (x) { return x.id === id; })[0];
        if (!item) return;
        if (!global.confirm('删除这笔 ' + money(item.amount) + ' 的支出？')) return;
        Campus.store.update(function (d) {
          d.expenses = (d.expenses || []).filter(function (x) { return x.id !== id; });
          return d;
        });
        render();
        refreshHome();
        formHint('已删除一笔支出。', '');
        toast('支出已删除');
      });
    }
  }

  function view() {
    bind();
    render();
  }

  Campus.views.money = view;
})(window);
