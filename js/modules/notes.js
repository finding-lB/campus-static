/* ============================================================
   modules/notes.js · 便利贴墙
   数据：store.notes = [{ id, text, color:'yellow'|'red', pinned, done, createdAt }]
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
  function toast(msg) {
    if (Campus.app && Campus.app.toast) Campus.app.toast(msg);
  }
  function hint(msg, type) {
    var el = $('noteHint');
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
  function dayLabel(ts) {
    var d = new Date(Number(ts) || Date.now());
    var now = new Date();
    var same = d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (same) return '今天';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function notes() {
    var list = Campus.store.get('notes', []);
    return Array.isArray(list) ? list : [];
  }
  function sorted() {
    return notes().slice().sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function card(n) {
    var cls = 'note-card' +
      (n.color === 'red' ? ' is-red' : '') +
      (n.pinned ? ' is-pinned' : '') +
      (n.done ? ' is-done' : '');
    return '<article class="' + cls + '" data-id="' + esc(n.id) + '">' +
      '<div class="note-actions">' +
        '<button type="button" class="' + (n.pinned ? 'is-on' : '') + '" data-note-pin title="' +
          (n.pinned ? '取消置顶' : '置顶') + '" aria-label="' + (n.pinned ? '取消置顶' : '置顶') + '">' +
          (n.pinned ? '★' : '☆') + '</button>' +
        '<button class="note-del" type="button" data-note-del title="删除" aria-label="删除">×</button>' +
      '</div>' +
      '<p class="note-text">' + esc(n.text) + '</p>' +
      '<div class="note-meta"><span>' + esc(dayLabel(n.createdAt)) + '</span>' +
        (n.pinned ? '<span>· 置顶</span>' : '') +
        (n.done ? '<span>· 已完成</span>' : '') +
      '</div>' +
    '</article>';
  }

  function render() {
    var wall = $('noteWall');
    if (!wall) return;
    var list = sorted();
    if (!list.length) {
      wall.innerHTML = '<p class="empty">墙还是空的，写一张贴上去吧。</p>';
      return;
    }
    wall.innerHTML = list.map(card).join('');
  }

  function update(id, mutate) {
    Campus.store.update(function (d) {
      var list = d.notes || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          mutate(list[i]);
          break;
        }
      }
      return d;
    });
  }

  function bind() {
    if (bound) return;
    bound = true;

    var form = $('noteForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var textEl = $('noteText');
        var text = (textEl.value || '').trim();
        if (!text) {
          hint('先写点什么再贴上去。', 'error');
          textEl.focus();
          return;
        }

        var color = 'yellow';
        var picked = form.querySelector('input[name="noteColor"]:checked');
        if (picked) color = picked.value === 'red' ? 'red' : 'yellow';
        var pinned = !!($('notePin') && $('notePin').checked);

        Campus.store.update(function (d) {
          d.notes = d.notes || [];
          d.notes.push({
            id: Campus.store.uid('n'),
            text: text,
            color: color,
            pinned: pinned,
            done: false,
            createdAt: Date.now()
          });
          return d;
        });

        form.reset();
        render();
        refreshHome();
        hint('已贴上。点卡片可以打勾，再点一下可恢复。', 'ok');
        toast('便利贴 +1');
        textEl.focus();
      });
    }

    var wall = $('noteWall');
    if (wall) {
      wall.addEventListener('click', function (e) {
        var pinBtn = e.target.closest('[data-note-pin]');
        var delBtn = e.target.closest('[data-note-del]');
        var cardEl = e.target.closest('.note-card');
        if (!cardEl) return;

        var id = cardEl.getAttribute('data-id');

        if (pinBtn) {
          e.stopPropagation();
          update(id, function (n) { n.pinned = !n.pinned; });
          render();
          refreshHome();
          toast(pinBtn.getAttribute('title') === '置顶' ? '已置顶' : '已取消置顶');
          return;
        }

        if (delBtn) {
          e.stopPropagation();
          if (!global.confirm('删除这张便利贴？删除后不能恢复。')) return;
          Campus.store.update(function (d) {
            d.notes = (d.notes || []).filter(function (n) { return n.id !== id; });
            return d;
          });
          render();
          refreshHome();
          hint('已删除。', '');
          toast('已删除');
          return;
        }

        update(id, function (n) { n.done = !n.done; });
        render();
        refreshHome();
        var nowDone = !!notes().filter(function (n) { return n.id === id; })[0].done;
        toast(nowDone ? '完成，已划线沉底' : '已恢复');
      });
    }
  }

  function view() {
    bind();
    render();
  }

  Campus.views.notes = view;
})(window);
