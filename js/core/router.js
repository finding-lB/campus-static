/* ============================================================
   core/router.js
   极简 Hash 路由：GitHub Pages 刷新不会 404
   路由表来自 DOM 里真实存在的 [data-view]，未知路由回首页
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};

  var TITLES = {
    home: '概览',
    schedule: '课表',
    tasks: 'DDL',
    money: '记账',
    parcel: '取件码',
    food: '今天吃什么',
    dorm: '宿舍小助手',
    notes: '便利贴',
    mood: '心情打卡',
    study: '学习资源',
    focus: '专注',
    gpa: '绩点',
    settings: '设置与备份'
  };

  var listeners = [];
  var current = '';
  var started = false;

  function views() {
    return Array.prototype.slice.call(document.querySelectorAll('.view[data-view]'));
  }

  function exists(name) {
    return !!document.getElementById('view-' + name);
  }

  function parse() {
    var raw = global.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0];
    return raw || 'home';
  }

  function emit(view) {
    listeners.forEach(function (fn) {
      try { fn(view); } catch (e) { /* 订阅者异常不影响路由 */ }
    });
    try {
      global.dispatchEvent(new CustomEvent('campus:route', { detail: { view: view } }));
    } catch (e) { /* noop */ }
  }

  function apply(name) {
    var view = exists(name) ? name : 'home';

    views().forEach(function (section) {
      var on = section.getAttribute('data-view') === view;
      section.classList.toggle('is-active', on);
      if (on) section.removeAttribute('hidden');
      else section.setAttribute('hidden', '');
    });

    Array.prototype.forEach.call(
      document.querySelectorAll('.tabbar .tab[data-tab]'),
      function (tab) {
        var on = tab.getAttribute('data-tab') === view;
        tab.classList.toggle('is-active', on);
        if (on) tab.setAttribute('aria-current', 'page');
        else tab.removeAttribute('aria-current');
      }
    );

    current = view;
    var title = TITLES[view] || '校园生活小站';
    document.title = view === 'home'
      ? '校园生活小站 · 课表 / DDL / 记账'
      : title + ' · 校园生活小站';

    /* 把 section 顶到可视区顶部，但不打断用户滚动位置 */
    var section = document.getElementById('view-' + view);
    if (section) section.setAttribute('tabindex', '-1');

    emit(view);
  }

  function go(name, replace) {
    var target = exists(name) ? name : 'home';
    if (parse() === target && current === target) return;
    var hash = '#/' + target;
    if (replace && global.history && global.history.replaceState) {
      global.history.replaceState(null, '', hash);
      apply(target);
    } else {
      global.location.hash = hash; /* 触发 hashchange */
    }
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function init() {
    if (started) return;
    started = true;

    var initial = parse();
    if (!exists(initial)) {
      /* 空 hash 或拼错：直接落到 home，且不新增历史记录 */
      if (global.history && global.history.replaceState) {
        global.history.replaceState(null, '', '#/home');
      } else {
        global.location.hash = '#/home';
      }
      initial = 'home';
    }
    apply(initial);

    global.addEventListener('hashchange', function () {
      var next = parse();
      if (!exists(next)) {
        go('home', true);
        return;
      }
      apply(next);
    });
  }

  Campus.router = {
    init: init,
    go: go,
    apply: apply,
    current: function () { return current; },
    onChange: onChange,
    views: function () { return views().map(function (v) { return v.getAttribute('data-view'); }); }
  };
})(window);
