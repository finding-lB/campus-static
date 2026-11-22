/* ============================================================
   modules/schedule.js · 静态课表
   数据：store.courses = [{ id, day:1-7, start:1-10, len:1-4, name, teacher, room, weeks:[] }]
   口径：settings.termStart 为第 1 周周一，settings.semesterWeeks 为学期周数。
   ============================================================ */
(function (global) {
  'use strict';

  var Campus = global.Campus = global.Campus || {};
  Campus.views = Campus.views || {};

  var DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  var PERIODS = ['08:00', '09:00', '10:10', '11:10', '14:00',
    '15:00', '16:10', '17:10', '19:00', '20:00'];

  var bound = false;
  var viewWeek = null;
  var editingId = null;

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
    var el = $('courseHint');
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

  function settings() {
    var s = Campus.store.get('settings', {}) || {};
    return {
      termStart: s.termStart || '2026-08-24',
      semesterWeeks: Math.min(30, Math.max(1, Number(s.semesterWeeks) || 20))
    };
  }
  function termStartDate() {
    var s = settings().termStart;
    var d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? new Date(2026, 7, 24) : d;
  }
  function currentWeek() {
    if (Campus.app && typeof Campus.app.currentWeek === 'function') {
      return Math.min(30, Math.max(1, Number(Campus.app.currentWeek()) || 1));
    }
    return 1;
  }
  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }
  function md(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
  function todayNum() { return (new Date().getDay() + 6) % 7 + 1; }

  function weekStart(w) {
    return addDays(termStartDate(), (w - 1) * 7);
  }
  function formatWeeks(weeks) {
    var list = Array.isArray(weeks) ? weeks : [];
    if (!list.length) return '';
    var sorted = list.slice().sort(function (a, b) { return a - b; });
    if (sorted.length > 1) {
      var contiguous = true;
      for (var i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) { contiguous = false; break; }
      }
      if (contiguous) return sorted[0] + '-' + sorted[sorted.length - 1];
    }
    return sorted.join(',');
  }

  function courses() {
    var list = Campus.store.get('courses', []);
    return Array.isArray(list) ? list : [];
  }

  function courseCard(c) {
    var row = c.start + 1;
    var span = Math.max(1, Math.min(c.len, 11 - row));
    var meta = c.room && c.teacher ? (c.room + ' · ' + c.teacher) : (c.room || c.teacher || '');
    return '<button class="sg-course" type="button" data-course="' + esc(c.id) + '" ' +
      'style="grid-row:' + row + ' / span ' + span + ';grid-column:' + (c.day + 1) + '" ' +
      'title="' + esc(c.name + (meta ? (' · ' + meta) : '')) + '">' +
      '<strong>' + esc(c.name) + '</strong>' +
      (meta ? '<small>' + esc(meta) + '</small>' : '') +
    '</button>';
  }

  function drawGrid(list) {
    var grid = $('scheduleGrid');
    if (!grid) return;
    var w = viewWeek;
    var start = weekStart(w);
    var isThisWeek = w === currentWeek();
    var td = todayNum();
    var html = '';

    html += '<div class="sg-corner" style="grid-row:1;grid-column:1">节</div>';
    for (var d = 1; d <= 7; d++) {
      var date = addDays(start, d - 1);
      var isToday = isThisWeek && d === td;
      html += '<div class="sg-day' + (isToday ? ' is-today' : '') + '" style="grid-row:1;grid-column:' + (d + 1) + '">' +
        '<b>' + DAY_NAMES[d - 1] + '</b><small>' + md(date) + '</small></div>';
    }

    for (var p = 1; p <= 10; p++) {
      html += '<div class="sg-time" style="grid-row:' + (p + 1) + ';grid-column:1">' +
        '<b>' + p + '</b><span>' + PERIODS[p - 1] + '</span></div>';
      for (var day = 1; day <= 7; day++) {
        var today = isThisWeek && day === td;
        html += '<div class="sg-cell' + (today ? ' is-today' : '') + '" style="grid-row:' + (p + 1) +
          ';grid-column:' + (day + 1) + '"></div>';
      }
    }

    list.filter(function (c) { return (c.weeks || []).indexOf(w) >= 0; })
      .forEach(function (c) { html += courseCard(c); });

    grid.innerHTML = html;
  }

  function render() {
    if (viewWeek === null) viewWeek = currentWeek();
    if (!isFinite(viewWeek) || viewWeek < 1) viewWeek = 1;
    if (viewWeek > 30) viewWeek = 30;

    var cfg = settings();
    var list = courses();
    var start = weekStart(viewWeek);
    var end = addDays(start, 6);

    var title = $('weekTitle');
    if (title) title.textContent = '第 ' + viewWeek + ' 周';
    var range = $('weekRange');
    if (range) {
      range.textContent = start.getFullYear() + '年 ' + md(start) + ' – ' + md(end) +
        (viewWeek === currentWeek() ? ' · 本周' : '');
    }

    drawGrid(list);

    var count = list.filter(function (c) { return (c.weeks || []).indexOf(viewWeek) >= 0; }).length;
    var weekHint = $('weekHint');
    if (weekHint) {
      if (viewWeek > cfg.semesterWeeks) {
        weekHint.textContent = '第 ' + viewWeek + ' 周超出设置的第 1–' + cfg.semesterWeeks +
          ' 周；如果课表有内容，检查课程的周次。';
      } else if (!count) {
        weekHint.textContent = '第 ' + viewWeek + ' 周没有排课。可以在下面手动添加，或到「设置」导入旧站备份里的 74 个时段。';
      } else {
        weekHint.textContent = '本周 ' + count + ' 门课；点课程可载入下方表单修改。';
      }
    }
  }

  function resetForm() {
    editingId = null;
    var form = $('courseForm');
    if (form) form.reset();
    var weeks = $('cWeeks');
    if (weeks) weeks.value = '1-20';
    var title = $('courseFormTitle');
    if (title) title.textContent = '添加课程';
    var submit = $('courseSubmit');
    if (submit) submit.textContent = '加入课表';
    var del = $('courseDelete');
    if (del) del.hidden = true;
    var cancel = $('courseCancel');
    if (cancel) cancel.hidden = true;
  }

  function fillForm(c) {
    editingId = c.id;
    if ($('cName')) $('cName').value = c.name || '';
    if ($('cDay')) $('cDay').value = String(c.day || 1);
    if ($('cStart')) $('cStart').value = String(c.start || 1);
    if ($('cLen')) $('cLen').value = String(c.len || 1);
    if ($('cRoom')) $('cRoom').value = c.room || '';
    if ($('cTeacher')) $('cTeacher').value = c.teacher || '';
    if ($('cWeeks')) $('cWeeks').value = formatWeeks(c.weeks);
    var title = $('courseFormTitle');
    if (title) title.textContent = '编辑课程';
    var submit = $('courseSubmit');
    if (submit) submit.textContent = '保存修改';
    var del = $('courseDelete');
    if (del) del.hidden = false;
    var cancel = $('courseCancel');
    if (cancel) cancel.hidden = false;
    hint('正在编辑「' + c.name + '」；改完点保存。', '');
  }

  function bind() {
    if (bound) return;
    bound = true;

    if ($('weekPrev')) {
      $('weekPrev').addEventListener('click', function () {
        viewWeek = Math.max(1, (viewWeek || currentWeek()) - 1);
        render();
      });
    }
    if ($('weekNext')) {
      $('weekNext').addEventListener('click', function () {
        viewWeek = Math.min(30, (viewWeek || currentWeek()) + 1);
        render();
      });
    }
    if ($('weekToday')) {
      $('weekToday').addEventListener('click', function () {
        viewWeek = currentWeek();
        render();
      });
    }

    var grid = $('scheduleGrid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var card = e.target.closest('[data-course]');
        if (!card) return;
        var id = card.getAttribute('data-course');
        var c = courses().filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        fillForm(c);
        var form = $('courseForm');
        if (form) {
          try {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (err) {
            form.scrollIntoView();
          }
        }
      });
    }

    var form = $('courseForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = ($('cName').value || '').trim();
        var day = Number($('cDay').value);
        var start = Number($('cStart').value);
        var len = Number($('cLen').value);
        var weeks = Campus.store.parseWeeks($('cWeeks').value);
        var room = ($('cRoom').value || '').trim();
        var teacher = ($('cTeacher').value || '').trim();

        if (!name) { hint('课程名不能为空。', 'error'); $('cName').focus(); return; }
        if (!weeks.length) { hint('周次写得不对，试试「3-19」或「1,3,5」。', 'error'); $('cWeeks').focus(); return; }
        if (start + len - 1 > 10) { hint('这门课会超出第 10 节，请减少节数或提前起始节。', 'error'); return; }

        var payload = {
          day: day, start: start, len: len, name: name,
          room: room, teacher: teacher, weeks: weeks
        };

        Campus.store.update(function (d) {
          d.courses = d.courses || [];
          if (editingId) {
            for (var i = 0; i < d.courses.length; i++) {
              if (d.courses[i].id === editingId) {
                payload.id = editingId;
                d.courses[i] = payload;
                break;
              }
            }
          } else {
            payload.id = Campus.store.uid('c');
            d.courses.push(payload);
          }
          return d;
        });

        var wasEditing = !!editingId;
        resetForm();
        render();
        refreshHome();
        hint(wasEditing ? '课程已更新。' : '已加入课表。', 'ok');
        toast(wasEditing ? '课程已更新' : '课程已加入');
      });
    }

    if ($('courseCancel')) {
      $('courseCancel').addEventListener('click', function () {
        resetForm();
        hint('已取消编辑。', '');
      });
    }

    if ($('courseDelete')) {
      $('courseDelete').addEventListener('click', function () {
        if (!editingId) return;
        var c = courses().filter(function (x) { return x.id === editingId; })[0];
        if (!global.confirm('从课表删除「' + (c ? c.name : '这门课') + '」？')) return;
        var id = editingId;
        Campus.store.update(function (d) {
          d.courses = (d.courses || []).filter(function (x) { return x.id !== id; });
          return d;
        });
        resetForm();
        render();
        refreshHome();
        hint('课程已删除。', 'ok');
        toast('已从课表删除');
      });
    }
  }

  function view() {
    bind();
    render();
  }

  Campus.views.schedule = view;
})(window);
