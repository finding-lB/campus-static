/* ============================================================
   modules/food.js · 今天吃什么转盘
   数据：store.foods = [{ id, name }]
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};
  Campus.views = Campus.views || {};

  var bound = false;
  var spinning = false;
  var spinTimer = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg, ms) {
    if (Campus.app && Campus.app.toast) Campus.app.toast(msg, ms);
  }
  function msg(text, type) {
    var el = $('foodResult');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-error', type === 'error');
    el.classList.toggle('is-ok', type === 'ok');
  }
  function foods() { return Campus.store.get('foods', []); }

  function rnd() {
    try {
      if (global.crypto && global.crypto.getRandomValues) {
        var a = new Uint32Array(1);
        global.crypto.getRandomValues(a);
        return a[0] / 4294967296;
      }
    } catch (e) { /* 退回 Math.random */ }
    return Math.random();
  }

  function render() {
    var list = $('foodList');
    var items = foods();
    if (list) {
      list.innerHTML = items.length
        ? items.map(function (f) {
          return '<li class="tag">' +
            '<span class="tag-name">' + esc(f.name) + '</span>' +
            '<button type="button" data-food-del="' + esc(f.id) + '" aria-label="删掉 ' + esc(f.name) + '">×</button>' +
          '</li>';
        }).join('')
        : '<li class="tag tag-empty">还没加店，先录入食堂档口或外卖</li>';
    }

    if (!spinning && $('foodWheel') && !$('foodWheel').classList.contains('is-result')) {
      var txt = $('foodWheelText');
      if (txt) txt.textContent = items.length ? '准备好了就转一下' : '先加一家店';
    }
  }

  function addFood() {
    if (spinning) { toast('等这轮转完再加'); return; }
    var input = $('foodName');
    var name = (input.value || '').trim().replace(/\s+/g, ' ');
    input.classList.remove('is-error');

    if (!name) {
      input.classList.add('is-error');
      input.focus();
      msg('店名不能空着', 'error');
      return;
    }
    if (name.length > 20) {
      input.classList.add('is-error');
      msg('店名最长 20 个字', 'error');
      return;
    }
    var items = foods();
    if (items.length >= 30) {
      msg('最多 30 家，先删几个不常吃的', 'error');
      return;
    }
    if (items.some(function (f) { return f.name.toLowerCase() === name.toLowerCase(); })) {
      msg('「' + name + '」已经在转盘里了', 'error');
      toast('这家已经加过了');
      return;
    }

    Campus.store.update(function (d) {
      d.foods.push({ id: Campus.store.uid('f'), name: name });
      return d;
    });
    input.value = '';
    input.focus();
    msg('已加入「' + name + '」，现在有 ' + (items.length + 1) + ' 家', 'ok');
    render();
  }

  function removeFood(id) {
    if (spinning) { toast('等这轮转完再删'); return; }
    var item = foods().filter(function (f) { return f.id === id; })[0];
    if (!item) return;
    Campus.store.update(function (d) {
      d.foods = d.foods.filter(function (f) { return f.id !== id; });
      return d;
    });

    var wheel = $('foodWheel');
    var txt = $('foodWheelText');
    if (wheel && wheel.classList.contains('is-result') && txt && txt.textContent === item.name) {
      wheel.classList.remove('is-result');
      txt.textContent = foods().length ? '准备好了就转一下' : '先加一家店';
    }

    render();
    msg('已把「' + item.name + '」移出转盘', '');
    toast('已删掉 ' + item.name);
  }

  function finish(name) {
    spinning = false;
    if (spinTimer) { clearTimeout(spinTimer); spinTimer = null; }
    var wheel = $('foodWheel');
    var txt = $('foodWheelText');
    var btn = $('foodSpin');
    if (wheel) {
      wheel.classList.remove('is-spinning');
      wheel.classList.add('is-result');
    }
    if (txt) txt.textContent = name;
    if (btn) {
      btn.disabled = false;
      btn.textContent = '再转一次';
      btn.removeAttribute('aria-busy');
    }
    msg('今天就吃「' + name + '」', 'ok');
    toast('就吃「' + name + '」');
  }

  function spin() {
    if (spinning) return;
    var items = foods();
    if (!items.length) {
      msg('转盘是空的：先在下面加一家店', 'error');
      toast('先加一家店');
      var nameInput = $('foodName');
      if (nameInput) nameInput.focus();
      return;
    }

    var finalItem = items[Math.floor(rnd() * items.length)] || items[0];
    var btn = $('foodSpin');
    var wheel = $('foodWheel');
    var txt = $('foodWheelText');

    if (items.length === 1 && items[0].name === finalItem.name) {
      finish(finalItem.name);
      msg('只有一家，就它了：' + finalItem.name, 'ok');
      return;
    }

    var reduced = false;
    try {
      reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { reduced = false; }

    if (reduced) {
      finish(finalItem.name);
      return;
    }

    spinning = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = '转动中…';
      btn.setAttribute('aria-busy', 'true');
    }
    if (wheel) {
      wheel.classList.remove('is-result');
      wheel.classList.add('is-spinning');
    }
    msg('正在挑一家…', '');

    var i = 0;
    var start = (global.performance && performance.now) ? performance.now() : Date.now();
    var TOTAL = 2000;

    function step() {
      var now = (global.performance && performance.now) ? performance.now() : Date.now();
      var t = (now - start) / TOTAL;
      if (t >= 1) {
        finish(finalItem.name);
        return;
      }
      var item = items[i % items.length];
      if (txt) txt.textContent = item.name;
      i += 1;
      var delay = 45 + 260 * Math.pow(t, 3);
      spinTimer = setTimeout(step, delay);
    }

    step();
  }

  function bind() {
    if (bound) return;
    bound = true;

    var form = $('foodForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        addFood();
      });
    }

    var input = $('foodName');
    if (input) {
      input.addEventListener('input', function () {
        input.classList.remove('is-error');
        if ($('foodResult').classList.contains('is-error')) msg('', '');
      });
    }

    var spinBtn = $('foodSpin');
    if (spinBtn) spinBtn.addEventListener('click', spin);

    var list = $('foodList');
    if (list) {
      list.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-food-del]') : null;
        if (!btn) return;
        removeFood(btn.getAttribute('data-food-del'));
      });
    }
  }

  function init() {
    bind();
    render();
    var n = foods().length;
    msg(n ? ('已收录 ' + n + ' 家，点下面开始转') : '', '');
  }

  Campus.views.food = render;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
