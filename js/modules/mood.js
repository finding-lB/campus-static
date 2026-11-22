/* ============================================================
   modules/mood.js · 每日心情打卡
   数据：store.moods = [{ id, date:'YYYY-MM-DD', emoji, note, createdAt }]
   同一天只保留一条，再存覆盖。
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};
  Campus.views = Campus.views || {};

  var bound = false;
  var selected = '';

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
  function toast(msg) {
    if (Campus.app && Campus.app.toast) Campus.app.toast(msg);
  }
  function hint(msg, type) {
    var el = $('moodHint');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', type === 'error');
    el.classList.toggle('is-ok', type === 'ok');
  }
  function moods() {
    var list = Campus.store.get('moods', []);
    return Array.isArray(list) ? list : [];
  }
  function findToday() {
    var today = ymd();
    return moods().filter(function (m) { return m.date === today; })[0] || null;
  }
  function setSelected(emoji) {
    selected = emoji || '';
    var buttons = document.querySelectorAll('#moodPicker .emoji');
    Array.prototype.forEach.call(buttons, function (b) {
      var on = b.getAttribute('data-emoji') === selected;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function dateLabel(dateStr) {
    var today = ymd();
    var y = new Date();
    y.setDate(y.getDate() - 1);
    if (dateStr === today) return '今天';
    if (dateStr === ymd(y)) return '昨天';
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + week;
  }

  function renderTimeline() {
    var list = $('moodTimeline');
    if (!list) return;
    var recent = moods().slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    }).slice(0, 14);

    if (!recent.length) {
      list.innerHTML = '<li class="empty">还没有记录。选个表情，写下今天。</li>';
      return;
    }

    var today = ymd();
    list.innerHTML = recent.map(function (m) {
      return '<li class="mood-item' + (m.date === today ? ' is-today' : '') + '">' +
        '<span class="mood-emoji" aria-hidden="true">' + esc(m.emoji) + '</span>' +
        '<div class="mood-main">' +
          '<span class="mood-date">' + esc(dateLabel(m.date)) + '</span>' +
          (m.note ? '<span class="mood-note">' + esc(m.note) + '</span>' : '') +
        '</div>' +
      '</li>';
    }).join('');
  }

  function loadToday() {
    var m = findToday();
    if (m) {
      setSelected(m.emoji);
      var note = $('moodNote');
      if (note) note.value = m.note || '';
      hint('今天已经打过卡了；再点「打卡」会覆盖今天的记录。', '');
    } else {
      setSelected('');
      var note2 = $('moodNote');
      if (note2) note2.value = '';
      hint('同一天只留一条。选个表情，写一句就好。', '');
    }
  }

  function bind() {
    if (bound) return;
    bound = true;

    var picker = $('moodPicker');
    if (picker) {
      picker.addEventListener('click', function (e) {
        var b = e.target.closest('.emoji');
        if (!b) return;
        setSelected(b.getAttribute('data-emoji'));
        hint('', '');
      });
    }

    var save = $('moodSave');
    if (save) {
      save.addEventListener('click', function () {
        if (!selected) {
          hint('先选一个表情，再打卡。', 'error');
          return;
        }
        var noteEl = $('moodNote');
        var note = (noteEl.value || '').trim();
        var today = ymd();
        var existed = !!findToday();

        Campus.store.update(function (d) {
          d.moods = d.moods || [];
          d.moods = d.moods.filter(function (m) { return m.date !== today; });
          d.moods.push({
            id: Campus.store.uid('m'),
            date: today,
            emoji: selected,
            note: note,
            createdAt: Date.now()
          });
          return d;
        });

        renderTimeline();
        hint(existed ? '已覆盖今天的心情记录。' : '今天已打卡，明天见。', 'ok');
        toast(existed ? '今天的心情已更新' : '打卡成功');
      });
    }
  }

  function view() {
    bind();
    loadToday();
    renderTimeline();
  }

  Campus.views.mood = view;
})(window);
