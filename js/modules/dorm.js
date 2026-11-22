/* ============================================================
   modules/dorm.js · 宿舍值日轮值 + AA 算账
   数据：store.roommates = [{ id, name }]
   值日规则：按名单顺序，周一 → 周日依次轮；名单短就循环接上
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};
  Campus.views = Campus.views || {};

  var DAY_SHORT = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  var AA_IDLE = '填金额和人数，自动算人均';
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
  function roster() { return Campus.store.get('roommates', []); }
  function todayIdx() { return (new Date().getDay() + 6) % 7; } /* 0 = 周一 */

  function dutyOf(list) {
    if (!list.length) return null;
    return list[todayIdx() % list.length];
  }

  function renderDuty() {
    var list = roster();
    var d = new Date();
    var duty = dutyOf(list);

    var dateEl = $('dutyDate');
    if (dateEl) {
      dateEl.textContent = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + DAY_SHORT[todayIdx()];
    }
    var nameEl = $('dutyToday');
    if (nameEl) nameEl.textContent = duty ? duty.name : '还没录室友';

    var hintEl = $('dutyHint');
    if (hintEl) {
      hintEl.textContent = list.length
        ? ('共 ' + list.length + ' 人，按名单顺序从周一往下轮，周日接回第一个人')
        : '先把室友名字加进来，才会排出今天谁值日';
    }

    var sched = $('dutySchedule');
    if (sched) {
      if (!list.length) {
        sched.innerHTML = '<p class="hint">名单空着，暂时排不出值日表</p>';
      } else {
        sched.innerHTML = DAY_SHORT.map(function (label, i) {
          var person = list[i % list.length];
          var on = i === todayIdx();
          return '<span class="duty-cell' + (on ? ' is-today' : '') + '">' +
            '<b>' + label + '</b>' +
            '<i title="' + esc(person.name) + '">' + esc(person.name) + '</i>' +
          '</span>';
        }).join('');
      }
    }

    var quick = $('quickDuty');
    if (quick) quick.textContent = duty ? ('今日值日 ' + duty.name) : '今日值日 —';
  }

  function renderRoster() {
    var list = $('roommateList');
    if (!list) return;
    var items = roster();
    list.innerHTML = items.length
      ? items.map(function (r) {
        return '<li class="tag">' +
          '<span class="tag-name">' + esc(r.name) + '</span>' +
          '<button type="button" data-rm-del="' + esc(r.id) + '" aria-label="移除 ' + esc(r.name) + '">×</button>' +
        '</li>';
      }).join('')
      : '<li class="tag tag-empty">还没有室友名单</li>';
  }

  function render() {
    renderRoster();
    renderDuty();
  }

  function addRoommate() {
    var input = $('roommateName');
    var name = (input.value || '').trim().replace(/\s+/g, ' ');
    input.classList.remove('is-error');

    if (!name) {
      input.classList.add('is-error');
      input.focus();
      toast('名字不能空着');
      return;
    }
    if (name.length > 12) {
      input.classList.add('is-error');
      toast('名字最长 12 个字');
      return;
    }
    var items = roster();
    if (items.length >= 12) {
      toast('最多 12 人，够一个宿舍了');
      return;
    }
    if (items.some(function (r) { return r.name === name; })) {
      toast('「' + name + '」已经在名单里了');
      return;
    }

    Campus.store.update(function (d) {
      d.roommates.push({ id: Campus.store.uid('r'), name: name });
      return d;
    });
    input.value = '';
    input.focus();
    render();
    toast('已加入 ' + name);
  }

  function removeRoommate(id) {
    var item = roster().filter(function (r) { return r.id === id; })[0];
    if (!item) return;
    if (!global.confirm('把「' + item.name + '」移出值日名单？')) return;
    Campus.store.update(function (d) {
      d.roommates = d.roommates.filter(function (r) { return r.id !== id; });
      return d;
    });
    render();
    toast('已移除 ' + item.name);
  }

  function errorResult(message) {
    var el = $('aaResult');
    if (!el) return;
    el.classList.add('is-error');
    el.innerHTML = '<b>没法算</b><span>' + esc(message) + '</span>';
  }

  function clearAaError() {
    var el = $('aaResult');
    if (el && el.classList.contains('is-error')) {
      el.classList.remove('is-error');
      el.textContent = AA_IDLE;
    }
    ['aaTotal', 'aaPeople'].forEach(function (id) {
      var input = $(id);
      if (input) input.classList.remove('is-error');
    });
  }

  function calcAA() {
    var totalEl = $('aaTotal');
    var peopleEl = $('aaPeople');
    var result = $('aaResult');
    if (!totalEl || !peopleEl || !result) return;

    clearAaError();

    var rawTotal = totalEl.value.trim();
    var rawPeople = peopleEl.value.trim();

    if (!rawTotal) {
      totalEl.classList.add('is-error');
      errorResult('先填总金额');
      totalEl.focus();
      return;
    }
    if (!rawPeople) {
      peopleEl.classList.add('is-error');
      errorResult('人数不能空，至少 1 人（不能除以 0）');
      peopleEl.focus();
      return;
    }

    var total = Number(rawTotal);
    var people = Number(rawPeople);

    if (!isFinite(total) || total <= 0) {
      totalEl.classList.add('is-error');
      errorResult('总金额要大于 0');
      totalEl.focus();
      return;
    }
    if (!isFinite(people) || people <= 0) {
      peopleEl.classList.add('is-error');
      errorResult('人数至少 1 人，不能除以 0');
      peopleEl.focus();
      return;
    }
    if (Math.floor(people) !== people) {
      peopleEl.classList.add('is-error');
      errorResult('人数要填整数，不能是 ' + people + ' 个人');
      peopleEl.focus();
      return;
    }
    if (people > 1000) {
      peopleEl.classList.add('is-error');
      errorResult('人数上限 1000，先确认是不是多打了个 0');
      peopleEl.focus();
      return;
    }

    var per = total / people;
    var shown = Math.round(per * 100) / 100;
    var diff = Math.round((total - shown * people) * 100) / 100;

    result.classList.remove('is-error');
    result.innerHTML =
      '<b>¥' + shown.toFixed(2) + '</b>' +
      '<span>每人 · ' + people + ' 人 · 合计 ¥' + total.toFixed(2) + '</span>' +
      (Math.abs(diff) >= 0.01
        ? '<span class="muted">按整分收：' + people + ' × ¥' + shown.toFixed(2) +
          ' = ¥' + (shown * people).toFixed(2) + '，差 ¥' + Math.abs(diff).toFixed(2) +
          '，谁少给一点自己商量</span>'
        : '');
    toast('人均 ¥' + shown.toFixed(2));
  }

  function bind() {
    if (bound) return;
    bound = true;

    var rf = $('roommateForm');
    if (rf) {
      rf.addEventListener('submit', function (e) {
        e.preventDefault();
        addRoommate();
      });
    }
    var name = $('roommateName');
    if (name) {
      name.addEventListener('input', function () { name.classList.remove('is-error'); });
    }

    var rl = $('roommateList');
    if (rl) {
      rl.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-rm-del]') : null;
        if (btn) removeRoommate(btn.getAttribute('data-rm-del'));
      });
    }

    var aa = $('aaForm');
    if (aa) {
      aa.addEventListener('submit', function (e) {
        e.preventDefault();
        calcAA();
      });
    }
    ['aaTotal', 'aaPeople'].forEach(function (id) {
      var input = $(id);
      if (input) {
        input.addEventListener('input', function () {
          input.classList.remove('is-error');
          var result = $('aaResult');
          if (result && result.classList.contains('is-error')) clearAaError();
        });
      }
    });
  }

  function init() {
    bind();
    render();
    var result = $('aaResult');
    if (result && !result.textContent.trim()) result.textContent = AA_IDLE;
    /* 跨零点 / 跨星期自动换值日 */
    global.setInterval(renderDuty, 60000);
  }

  Campus.views.dorm = render;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
