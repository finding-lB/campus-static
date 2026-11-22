/* ============================================================
   modules/parcel.js · 校园快递取件码速记板
   数据：store.parcels = [{ id, code, carrier, createdAt, doneAt }]
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
  function toast(msg, ms) {
    if (Campus.app && Campus.app.toast) Campus.app.toast(msg, ms);
  }
  function hint(msg, type) {
    var el = $('parcelHint');
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
  function when(ts) {
    var d = new Date(Number(ts) || Date.now());
    var now = new Date();
    var same = d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (same) return '今天 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    var y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate()) {
      return '昨天 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function all() { return Campus.store.get('parcels', []); }
  function pending() {
    return all().filter(function (p) { return !p.doneAt; })
      .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  }
  function doneList() {
    return all().filter(function (p) { return !!p.doneAt; })
      .sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
  }

  function card(p, isDone) {
    var actions = isDone
      ? '<button class="btn btn-ghost btn-sm" type="button" data-act="restore" data-id="' + esc(p.id) + '">恢复</button>' +
        '<button class="btn btn-danger btn-sm" type="button" data-act="del" data-id="' + esc(p.id) + '">删除</button>'
      : '<button class="btn btn-sm" type="button" data-act="copy" data-id="' + esc(p.id) +
        '" data-code="' + esc(p.code) + '">复制取件码</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-act="done" data-id="' + esc(p.id) + '">已取</button>';

    return '<li class="parcel-card' + (isDone ? ' is-done' : '') + '" data-id="' + esc(p.id) + '">' +
      '<div class="parcel-top">' +
        '<div>' +
          '<p class="parcel-code">' + esc(p.code) + '</p>' +
          (p.carrier ? '<p class="parcel-carrier">' + esc(p.carrier) + '</p>' : '') +
        '</div>' +
        '<span class="parcel-meta">' + esc(when(isDone ? p.doneAt : p.createdAt)) + '</span>' +
      '</div>' +
      '<div class="parcel-actions">' + actions + '</div>' +
    '</li>';
  }

  function render() {
    var list = $('parcelList');
    var done = $('parcelDoneList');
    var count = $('parcelCount');
    var ps = pending();
    var ds = doneList();

    if (count) count.textContent = ps.length ? (ps.length + ' 件待取') : '0 件待取';
    if (list) {
      list.innerHTML = ps.length
        ? ps.map(function (p) { return card(p, false); }).join('')
        : '<li class="empty">还没有待取快递，上面记一条取件码</li>';
    }
    if (done) {
      done.innerHTML = ds.length
        ? ds.map(function (p) { return card(p, true); }).join('')
        : '<li class="empty">取过的会沉到这里，随时能恢复</li>';
    }
    clearErrors();
    refreshHome();
  }

  function clearErrors() {
    var code = $('parcelCode');
    if (code) code.classList.remove('is-error');
  }

  function copyText(text) {
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    };

    if (global.navigator && navigator.clipboard && global.isSecureContext !== false) {
      return navigator.clipboard.writeText(text).then(function () { return true; })
        .catch(function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  function addParcel() {
    var codeEl = $('parcelCode');
    var carrierEl = $('parcelCarrier');
    var code = (codeEl.value || '').trim().replace(/\s+/g, ' ');
    var carrier = (carrierEl.value || '').trim();
    codeEl.classList.remove('is-error');

    if (!code) {
      codeEl.classList.add('is-error');
      codeEl.focus();
      hint('取件码不能空着', 'error');
      return;
    }
    if (code.length > 24) {
      codeEl.classList.add('is-error');
      hint('取件码最长 24 个字符', 'error');
      return;
    }

    var dup = pending().filter(function (p) {
      return p.code.toLowerCase() === code.toLowerCase();
    })[0];
    if (dup) {
      hint('「' + code + '」还没取，不用重复记', 'error');
      toast('这条已经在待取列表里');
      return;
    }

    Campus.store.update(function (d) {
      d.parcels.push({
        id: Campus.store.uid('p'),
        code: code,
        carrier: carrier,
        createdAt: Date.now(),
        doneAt: 0
      });
      return d;
    });

    codeEl.value = '';
    carrierEl.value = '';
    codeEl.focus();
    hint('已记下 ' + code, 'ok');
    render();
    toast('取件码已记下');
  }

  function setDone(id, done) {
    var found = false;
    Campus.store.update(function (d) {
      var p = d.parcels.filter(function (x) { return x.id === id; })[0];
      if (p) {
        found = true;
        p.doneAt = done ? Date.now() : 0;
      }
      return d;
    });
    render();
    if (found) toast(done ? '已取，沉到下面了' : '已恢复到待取');
  }

  function removeParcel(id) {
    var p = all().filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    if (!global.confirm('删除这条取件记录？\n\n' + p.code + (p.carrier ? (' · ' + p.carrier) : ''))) return;
    Campus.store.update(function (d) {
      d.parcels = d.parcels.filter(function (x) { return x.id !== id; });
      return d;
    });
    render();
    toast('已删除');
  }

  function bind() {
    if (bound) return;
    bound = true;

    var form = $('parcelForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        addParcel();
      });
    }

    var code = $('parcelCode');
    if (code) {
      code.addEventListener('input', function () {
        code.classList.remove('is-error');
        if ($('parcelHint').classList.contains('is-error')) hint('', '');
      });
    }

    ['parcelList', 'parcelDoneList'].forEach(function (listId) {
      var list = $(listId);
      if (!list) return;
      list.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!btn) return;
        var id = btn.getAttribute('data-id');
        var act = btn.getAttribute('data-act');

        if (act === 'copy') {
          var codeText = btn.getAttribute('data-code') || '';
          btn.disabled = true;
          copyText(codeText).then(function (ok) {
            btn.disabled = false;
            if (ok) {
              hint('已复制 ' + codeText, 'ok');
              toast('已复制 ' + codeText);
            } else {
              hint('浏览器不让自动复制，长按上面的取件码手动选', 'error');
              toast('复制失败，长按取件码手动复制');
            }
          });
          return;
        }
        if (act === 'done') setDone(id, true);
        if (act === 'restore') setDone(id, false);
        if (act === 'del') removeParcel(id);
      });
    });
  }

  function init() {
    bind();
    render();
    var hintEl = $('parcelHint');
    if (hintEl && !hintEl.textContent.trim()) {
      hint('复制后直接去驿站报码，取完点「已取」', '');
    }
  }

  Campus.views.parcel = render;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
