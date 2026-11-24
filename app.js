/* 校园生活小站 · 前端
   结构：常量与数据 → 日期/周次 → 状态与同步 → 渲染各板块 → 事件绑定 → 启动。
   静态版由 js/static-adapter.js 接管 /api/*，数据落在 localStorage；
   学习通代取走 Cloudflare Worker（地址由 window.CAMPUS_WORKER_URL 提供）。 */
('use strict');

/* ==================== 常量 ==================== */
// 部署 Worker 后，可以直接改这里的地址；index.html 里的 CAMPUS_WORKER_URL 优先。
const WORKER_URL = '';
if (typeof window !== 'undefined') window.CAMPUS_WORKER_URL = window.CAMPUS_WORKER_URL || WORKER_URL;
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
// 潍坊理工学院真实作息：10 节，每节 50 分钟（[开始分钟, 结束分钟]）
const PERIODS = [
  [480, 530], [540, 590], [610, 660], [670, 720], [840, 890],
  [900, 950], [970, 1020], [1030, 1080], [1140, 1190], [1200, 1250],
];
const COLORS = [
  ['#e6f2ec', '#2b6f61'], ['#fdeede', '#a85f21'], ['#e9eff7', '#33608f'], ['#f6ece2', '#8a5a3b'],
  ['#eef1e1', '#5f7233'], ['#fbe7e3', '#a5453a'], ['#ece9f5', '#5a4b8a'], ['#e3f0f3', '#2c6c78'],
];
const PRESET = [
  [1,1,2,"大学美育","史文力","D楼S301",3992],
  [1,3,2,"数据库原理及实用技术","赵立平","B楼0102",256],
  [1,3,2,"数据库原理及实用技术","赵立平","B楼107",152],
  [1,3,2,"数据库原理及实用技术","赵立平","B楼302",261632],
  [1,3,2,"数据采集与数据处理技术","魏静","B楼107",262144],
  [1,5,2,"数据库原理及实用技术","赵立平","B楼107",262040],
  [1,7,2,"Java程序设计","王潇","B楼107",1024],
  [1,7,2,"Python程序设计","韩昱帆","C楼C120",24],
  [1,9,2,"Java程序设计","王潇","",4096],
  [1,9,2,"Python程序设计","韩昱帆","C楼0113",384],
  [1,9,2,"Python程序设计","韩昱帆","C楼C120",8],
  [1,9,2,"Web前端开发技术","史峰峰","B楼107",16],
  [2,1,2,"数据采集与数据处理技术","魏静","思远大厦C403",524184],
  [2,3,2,"逻辑学","刘文文","实验楼S205",4096],
  [2,3,2,"逻辑学","刘文文","实验楼S205",3992],
  [2,5,3,"马克思主义基本原理","王传军","C楼0221",523784],
  [2,5,3,"马克思主义基本原理","王传军","C楼0223",384],
  [2,5,3,"马克思主义基本原理","王传军","C楼0301",16],
  [2,8,1,"马克思主义基本原理","王传军","C楼0221",458752],
  [2,9,2,"Java程序设计","王潇","",128],
  [2,9,2,"数据结构","侯国家","B楼107",130584],
  [3,1,2,"Python程序设计","韩昱帆","C楼0113",4],
  [3,1,2,"中国近现代史纲要","倪菲","B楼0103",131072],
  [3,1,2,"机器学习与应用","张鲁江","B楼301",28672],
  [3,1,2,"机器学习与应用","张鲁江","C楼0106",16],
  [3,1,2,"机器学习与应用","张鲁江","C楼0106",3968],
  [3,3,2,"数据结构","侯国家","A楼S204",130584],
  [3,5,2,"中国近现代史纲要","倪菲","B楼0103",436872],
  [3,5,2,"数据采集与数据处理技术","魏静","B楼107",87316],
  [3,7,2,"Java程序设计","王潇","C楼C119",8192],
  [3,7,2,"Java程序设计","王潇","C楼C119",65536],
  [3,7,2,"Python程序设计","韩昱帆","C楼C119",412],
  [3,9,2,"Java程序设计","王潇","B楼107",16],
  [3,9,2,"Web前端开发技术","史峰峰","B楼107",16264],
  [4,1,2,"Java程序设计","王潇","B楼107",3072],
  [4,1,4,"Python程序设计","韩昱帆","C楼C119",412],
  [4,3,2,"Java程序设计","王潇","B楼107",32768],
  [4,3,2,"数据库原理及实用技术","赵立平","B楼201",1536],
  [4,5,2,"数据库原理及实用技术","赵立平","C楼0113",1536],
  [4,5,2,"数据采集与数据处理技术","魏静","B楼107",136],
  [4,7,2,"Java程序设计","王潇","",65536],
  [4,7,2,"Java程序设计","王潇","C楼0113",196300],
  [4,7,2,"Python程序设计","韩昱帆","C楼0113",16],
  [4,7,2,"中国近现代史纲要","倪菲","B楼0103",262144],
  [4,9,2,"Java程序设计","王潇","",2048],
  [5,1,2,"机器学习与应用","张鲁江","思远大厦C403",262092],
  [5,3,2,"Java程序设计","王潇","",53248],
  [5,3,2,"Java程序设计","王潇","思远大厦C403",131072],
  [5,3,2,"Java程序设计","王潇","思远大厦C403",200],
  [5,5,4,"Python程序设计","韩昱帆","思远大厦C403",64],
  [5,5,2,"中国近现代史纲要","倪菲","B楼0103",16392],
  [5,5,2,"中国近现代史纲要","倪菲","B楼203",4],
  [5,7,2,"Java程序设计","王潇","B楼107",8],
  [5,7,2,"中国近现代史纲要","倪菲","B楼0103",262016],
  [5,7,2,"数据结构","侯国家","B楼201",4],
  [5,9,2,"机器学习与应用","张鲁江","C楼0117",64],
  [6,1,4,"Web前端开发技术","史峰峰","B楼107",4],
  [6,1,2,"Web前端开发技术","史峰峰","思远大厦C403",128904],
  [6,1,2,"数据采集与数据处理技术","魏静","思远大厦C403",64],
  [6,3,2,"Web前端开发技术","史峰峰","思远大厦C403",124288],
  [6,3,2,"数据结构","侯国家","B楼0103",6144],
  [6,5,2,"Java程序设计","王潇","",128],
  [6,5,2,"Web前端开发技术","史峰峰","B楼107",2048],
  [6,5,2,"数据结构","侯国家","B楼0103",16396],
  [6,5,3,"马克思主义基本原理","王传军","C楼0223",64],
  [6,7,2,"数据结构","侯国家","B楼0103",16392],
  [6,7,2,"数据结构","侯国家","B楼107",6144],
  [6,9,2,"数据结构","侯国家","B楼107",64],
  [7,1,4,"Web前端开发技术","史峰峰","思远大厦C403",64],
  [7,1,2,"大学美育","史文力","D楼S301",8],
  [7,3,2,"数据库原理及实用技术","赵立平","B楼301",8],
  [7,5,2,"数据库原理及实用技术","赵立平","B楼107",8],
  [7,7,2,"数据结构","侯国家","A楼S204",64],
  [7,9,2,"Web前端开发技术","史峰峰","B楼107",8]
];

const HUBS = [
  { name: '教务系统', desc: '查课表 / 成绩', url: 'https://cxxxt.wfit.edu.cn/admin' },
  { name: '学习通', desc: '作业 / 考试', url: 'http://wfit.fanya.chaoxing.com/portal' },
  { name: '图书馆', desc: '馆藏 / 续借', url: 'http://wflgxytsg.portal.chaoxing.com/' },
  { name: '通知公告', desc: '校级通知', url: 'https://www.wfit.edu.cn/html/cn/xueyuanxinwen/tongzhigonggao/' },
  { name: '学院要闻', desc: '校园动态', url: 'https://www.wfit.edu.cn/html/cn/xueyuanxinwen/lishanyaowen/' },
  { name: '学校地图', desc: '校内导航', url: 'https://www.wfit.edu.cn/html/cn/jiaotongzhinan/xuexiaoditu/' },
  { name: '来校路线', desc: '火车 / 汽车', url: 'https://www.wfit.edu.cn/html/cn/jiaotongzhinan/lishanxiaoli/' },
  { name: '招生网', desc: '招生信息', url: 'https://zsb.wfit.edu.cn/' },
  { name: '就业网', desc: '招聘 / 实习', url: 'https://school.gxjy.sdei.edu.cn/wfit' },
  { name: '学校官网', desc: 'wfit.edu.cn', url: 'https://www.wfit.edu.cn/' },
];

const DEFAULT_KV = {
  termStart: '2026-08-24',
  week: 0,
  budget: 1200,
  focus: { total: 0, signals: 0, day: '', dayMin: 0, sessions: 0 },
  gpaGoal: { target: 3.6, credits: 160 },
  food: ['兰州拉面', '爆二爷把子肉饭', '饭点小厨', '烤鸭拌饭', '潍坊肉火烧', '烤肉拌饭', '南京小笼包',
    '羊杂面', '龙门花甲粉', '掉渣饼', '擂椒拌饭', '众悦麻辣烫', '初味自选餐', '牛肉板面', '自选水饺'],
  billRef: [],
  presetDone: false,
  migratedAt: null,
};

/* ==================== 小工具 ==================== */
const el = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d) ? null : d;
};
const dayNum = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const need = Math.abs(v % 1) > 0.0001 ? 2 : 0;
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: need, maximumFractionDigits: need });
};
const fmtTime = (min) => pad(Math.floor(min / 60)) + ':' + pad(min % 60);
const uid = () => 'x' + Math.random().toString(36).slice(2, 9);
const debounce = (fn, ms) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
let toastTimer = null;
function toast(msg, kind) {
  const box = el('toast');
  if (!box) return;
  box.textContent = msg;
  box.classList.toggle('alert', kind === 'alert');
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show', 'alert'), kind === 'alert' ? 5200 : 2400);
}

/* ==================== 日期与周次 ==================== */
function termStart() {
  const d = parseYmd(state.kv.termStart);
  return d || parseYmd(DEFAULT_KV.termStart);
}
/** 只按日期算的自动周次，不做任何手动覆盖。 */
function weekOf(date) {
  return Math.floor((dayNum(date) - dayNum(termStart())) / 7) + 1;
}
function autoWeek() {
  return Math.max(1, Math.min(30, weekOf(new Date())));
}
/** 手动设定的周次：存在 state.kv.week 里，0 表示跟随日期自动算。 */
function manualWeek() {
  const w = Number(state.kv.week);
  return Number.isFinite(w) && w >= 1 && w <= 30 ? Math.round(w) : 0;
}
/** 全站统一的“当前周”：手动优先，否则按开学日期自动算。 */
function currentWeek() {
  return manualWeek() || autoWeek();
}
/** 兼容旧调用名，方便以后查这个函数。 */
function getCurrentWeek() {
  return currentWeek();
}
/** 手动设周时，用“今天所在的周”反推一个日期锚点，保证课表日期不跑偏。 */
function effectiveTermStart() {
  const m = manualWeek();
  if (!m) return termStart();
  const today = new Date();
  const thisMonday = addDays(today, -((today.getDay() + 6) % 7));
  return addDays(thisMonday, -(m - 1) * 7);
}
/** 某个日期落在“当前生效周”体系下的第几周（跨周时自动 +1）。 */
function weekForDate(date) {
  const m = manualWeek();
  if (!m) return weekOf(date);
  const today = new Date();
  const thisMonday = addDays(today, -((today.getDay() + 6) % 7));
  const dateMonday = addDays(date, -((date.getDay() + 6) % 7));
  const delta = Math.round((dayNum(dateMonday) - dayNum(thisMonday)) / 7);
  return Math.max(1, Math.min(30, m + delta));
}
function displayWeek() {
  return currentWeek();
}
function weekMonday(w) {
  return addDays(effectiveTermStart(), (w - 1) * 7);
}
function weekRangeText(w) {
  const a = weekMonday(w), b = addDays(a, 6);
  return `${pad(a.getMonth() + 1)}/${pad(a.getDate())} – ${pad(b.getMonth() + 1)}/${pad(b.getDate())}`;
}
function inWeek(course, w) {
  return !Array.isArray(course.weeks) || course.weeks.length === 0 || course.weeks.includes(w);
}
function maskToWeeks(mask) {
  const out = [];
  for (let i = 0; i < 30; i++) if (mask & (1 << i)) out.push(i + 1);
  return out;
}
function weeksFromText(txt) {
  if (!txt || !txt.trim()) return [];
  const out = new Set();
  for (let part of txt.replace(/（/g, '(').replace(/）/g, ')').replace(/周/g, '').split(/[,，]/)) {
    part = part.trim();
    if (!part) continue;
    const odd = /\(单\)/.test(part), even = /\(双\)/.test(part);
    part = part.replace(/\(单\)|\(双\)/g, '');
    if (/-/.test(part)) {
      const [a, b] = part.split('-').map((x) => parseInt(x, 10));
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
      for (let w = a; w <= b; w++) {
        if (odd && w % 2 === 0) continue;
        if (even && w % 2 === 1) continue;
        if (w >= 1 && w <= 30) out.add(w);
      }
    } else {
      const n = parseInt(part, 10);
      if (n >= 1 && n <= 30) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}
function weeksText(weeks) {
  if (!weeks || !weeks.length) return '每周';
  const parts = [];
  let start = weeks[0], prev = weeks[0];
  for (let i = 1; i <= weeks.length; i++) {
    if (weeks[i] === prev + 1) { prev = weeks[i]; continue; }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = weeks[i]; prev = weeks[i];
  }
  return parts.join(',') + ' 周';
}

/* ==================== 状态与同步 ==================== */
let state = { courses: [], tasks: [], expenses: [], gpa: [], kv: { ...DEFAULT_KV } };
let online = false;
let newsItems = { yaowen: [], tongzhi: [] };
let newsAt = null;
let cxPreviewItems = [];
let syncTimer = null;

const BASE = location.protocol === 'file:' ? 'http://127.0.0.1:8787' : '';
// GitHub Pages 没有共享后端，所有数据都在各自浏览器；不再按访客降级为只读
const GUEST = false;
let studyLib = null;
let netInfo = null;
let lastDayKey = ymd(new Date());

async function api(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(BASE + path, {
      ...options,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { throw new Error('返回内容不是 JSON'); }
    if (!body.ok) throw new Error(body.error?.message || '请求失败');
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function snapshot() {
  return { courses: state.courses, tasks: state.tasks, expenses: state.expenses, gpa: state.gpa, kv: state.kv };
}

function saveLocal() {
  try { localStorage.setItem('campusLife.v3', JSON.stringify(snapshot())); } catch { /* 隐私模式下忽略 */ }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem('campusLife.v3') || localStorage.getItem('campusLife.v2');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** kv 可能来自旧版本或被清空过，统一补齐默认值并丢掉 null */
function normalizeKv(raw) {
  const kv = { ...DEFAULT_KV };
  for (const [k, v] of Object.entries(raw || {})) {
    if (v !== null && v !== undefined) kv[k] = v;
  }
  kv.week = Number.isFinite(+kv.week) ? Math.max(0, Math.min(30, Math.round(+kv.week))) : 0;
  kv.budget = Math.max(0, Number(kv.budget) || 0);
  kv.termStart = parseYmd(kv.termStart) ? kv.termStart : DEFAULT_KV.termStart;
  kv.focus = { ...DEFAULT_KV.focus, ...(typeof kv.focus === 'object' && kv.focus ? kv.focus : {}) };
  kv.gpaGoal = { ...DEFAULT_KV.gpaGoal, ...(typeof kv.gpaGoal === 'object' && kv.gpaGoal ? kv.gpaGoal : {}) };
  kv.food = Array.isArray(kv.food) && kv.food.length ? kv.food.slice(0, 24) : DEFAULT_KV.food.slice();
  kv.billRef = Array.isArray(kv.billRef) ? kv.billRef.filter((r) => r && r.src && Number.isFinite(+r.total)).slice(0, 12) : [];
  kv.presetDone = !!kv.presetDone;
  return kv;
}

const flush = debounce(async () => {
  if (!online) return;
  try {
    await api('/api/state', { method: 'PUT', body: JSON.stringify(snapshot()) });
  } catch {
    online = false;
    renderStatus();
    showBanner('和本地服务的连接断了，改动先存在浏览器里，恢复后会自动补写。');
  }
}, 400);

function persist() {
  saveLocal();
  if (GUEST) return; // 共享只读：只镜像到本机浏览器缓存，不回写服务端
  flush();
}

/* ==================== 渲染：顶部状态与封面 ==================== */
function renderStatus() {
  const pill = el('statusPill');
  pill.classList.toggle('online', online);
  pill.classList.toggle('offline', !online);
  el('statusText').textContent = online ? '静态版 · 已保存在本机' : '离线缓存模式';
}

function showBanner(text) {
  const b = el('banner');
  if (!text) { b.classList.remove('show'); b.textContent = ''; return; }
  b.textContent = text;
  b.classList.add('show');
}

// 外部访客一进页面就标出只读，不用等数据加载完（隧道冷启动可能要好几秒）
if (GUEST) {
  document.body.classList.add('guest');
  showBanner('共享只读模式：这是同学分享的地址，课表、DDL、学习资料都能看；改动只留在你自己的浏览器里，不会写回站主的数据。要用完整功能，请在自己电脑上打开 127.0.0.1 的地址。');
}

function tickClock() {
  const now = new Date();
  const t = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (el('clock').textContent !== t) el('clock').textContent = t;
  // 跨零点自动切到新的一天 / 新的一周，周日变周一不用手动刷新
  if (ymd(now) !== lastDayKey) {
    lastDayKey = ymd(now);
    renderAll();
    toast(`新的一天：${DAY_NAMES[(now.getDay() + 6) % 7]} · 第 ${currentWeek()} 周`);
  }
}

function renderCover() {
  const w = currentWeek();
  const manual = !!manualWeek();
  const today = todayCourses();
  const open = state.tasks.filter((t) => !t.done).length;
  const spent = monthSpent();
  el('coverSub').textContent = `第 ${w} 周${manual ? '（手动）' : ''} · ${DAY_NAMES[(new Date().getDay() + 6) % 7]} · 今天 ${today.length} 节课`;
  el('chipToday').textContent = today.length + ' 节';
  el('chipWeek').textContent = `第 ${w} 周${manual ? ' · 手动' : ''}`;
  el('chipDdl').textContent = open + ' 条';
  el('chipMoney').textContent = money(spent);
}

/* ==================== 渲染：概览 ==================== */
function todayCourses(date = new Date()) {
  const w = weekForDate(date);
  const day = ((date.getDay() + 6) % 7) + 1;
  return state.courses
    .filter((c) => c.day === day && inWeek(c, w))
    .sort((a, b) => a.start - b.start);
}

function periodNow() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < PERIODS.length; i++) {
    if (mins >= PERIODS[i][0] && mins < PERIODS[i][1]) return i + 1;
  }
  for (let i = 0; i < PERIODS.length; i++) if (mins < PERIODS[i][0]) return i + 1;
  return PERIODS.length + 1;
}

function nextCourse() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const ongoing = todayCourses(now).find((c) => {
    const from = PERIODS[c.start - 1][0];
    const to = PERIODS[c.start + c.len - 2][1];
    return mins >= from && mins < to;
  });
  if (ongoing) return { course: ongoing, date: now, today: true, ongoing: true };
  const today = todayCourses(now).filter((c) => PERIODS[c.start - 1][0] > mins);
  if (today.length) return { course: today[0], date: now, today: true, ongoing: false };
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, i);
    const list = todayCourses(d);
    if (list.length) return { course: list[0], date: d, today: false, ongoing: false };
  }
  return null;
}

function freeSlots() {
  const list = todayCourses();
  const used = new Set();
  list.forEach((c) => { for (let p = c.start; p < c.start + c.len; p++) used.add(p); });
  const gaps = [];
  let run = 0;
  for (let p = 1; p <= PERIODS.length; p++) {
    if (used.has(p)) { if (run) { gaps.push([p - run, p - 1]); run = 0; } }
    else run++;
  }
  if (run) gaps.push([PERIODS.length - run + 1, PERIODS.length]);
  return { gaps, used: used.size, free: PERIODS.length - used.size, courses: list.length };
}

function renderHome() {
  const nx = nextCourse();
  el('homeNextK').textContent = nx ? (nx.ongoing ? '正在上' : '下一节') : '今天';
  el('homeNext').textContent = nx ? nx.course.name : '没课了';
  el('homeNextSub').textContent = nx
    ? `${nx.ongoing ? '到 ' + fmtTime(PERIODS[nx.course.start + nx.course.len - 2][1]) + ' 下课' : (nx.today ? '今天' : DAY_NAMES[nx.course.day - 1]) + ' ' + fmtTime(PERIODS[nx.course.start - 1][0])} · ${nx.course.room || '教室待定'}`
    : '可以安心安排了';

  const open = state.tasks.filter((t) => !t.done);
  const soon = open.filter((t) => {
    const d = parseYmd(t.due);
    return d && dayNum(d) - dayNum(new Date()) <= 3;
  });
  el('homeDdl').textContent = open.length;
  const sorted = open.slice().sort((a, b) => String(a.due || '9999-12-31').localeCompare(String(b.due || '9999-12-31')));
  const nearest = sorted[0];
  el('homeDdlSub').textContent = soon.length
    ? `${soon.length} 条 3 天内到期`
    : nearest
      ? `最近 ${nearest.due ? nearest.due.slice(5).replace('-', '/') : '未定'} · ${String(nearest.title || '').slice(0, 14)}`
      : '暂无待办';

  const spent = monthSpent();
  el('homeMoney').textContent = money(spent);
  const budget = Number(state.kv.budget) || 0;
  const ymNow = ymd(new Date()).slice(0, 7);
  const billNow = (state.kv.billRef || [])
    .filter((r) => String(r.month) === ymNow && r.src !== '花呗')
    .reduce((s, r) => s + Number(r.total || 0), 0);
  el('homeMoneySub').textContent = billNow
    ? `预算 ${money(budget)} · 账单口径 ${money(billNow)}${billNow > budget ? `（超 ${money(billNow - budget)}）` : ''}`
    : budget ? `预算 ${money(budget)} · 剩 ${money(Math.max(0, budget - spent))}` : '还没设置预算';

  const f = state.kv.focus || DEFAULT_KV.focus;
  const dayMin = f.day === ymd(new Date()) ? f.dayMin : 0;
  el('homeFocus').textContent = dayMin + ' 分钟';
  el('homeFocusSub').textContent = `${f.day === ymd(new Date()) ? f.sessions : 0} 个番茄`;

  el('homeDate').textContent = `${pad(new Date().getMonth() + 1)}/${pad(new Date().getDate())} · 第 ${currentWeek()} 周${manualWeek() ? '（手动）' : ''}`;

  const box = el('homeToday');
  const list = todayCourses();
  if (!list.length) {
    box.innerHTML = '<div class="empty">今天没有课，安排点自己的事吧</div>';
  } else {
    box.innerHTML = list.map((c) => `
      <div class="today-row">
        <span class="today-time">${fmtTime(PERIODS[c.start - 1][0])}<br>${fmtTime(PERIODS[c.start + c.len - 2][1])}</span>
        <span class="today-name">${esc(c.name)}</span>
        <span class="today-room">${esc(c.room || '')}${c.teacher ? ' · ' + esc(c.teacher) : ''}</span>
      </div>`).join('');
  }
  const s = freeSlots();
  el('homeFree').textContent = s.courses
    ? (s.gaps.length
      ? `空档：${s.gaps.map(([a, b]) => (a === b ? `第 ${a} 节` : `第 ${a}–${b} 节`)).join(' · ')}，共 ${s.free} 节空着${s.gaps.length > 1 ? '，最长 ' + Math.max(...s.gaps.map(([a, b]) => b - a + 1)) + ' 节' : ''}`
      : '今天 10 节排满，注意休息')
    : '今天没有课，10 节全部空着';

  const w = currentWeek();
  const wk = state.courses.filter((c) => inWeek(c, w));
  const perDay = [0, 0, 0, 0, 0, 0, 0];
  wk.forEach((c) => { perDay[c.day - 1] += c.len; });
  const busiest = perDay.indexOf(Math.max(...perDay));
  el('homeWeekHint').textContent = weekRangeText(w);
  el('homeWeek').innerHTML = `
    <div class="stat"><span class="stat-k">本周时段</span><b>${wk.length}</b><span class="stat-sub">跨 ${new Set(wk.map((c) => c.name)).size} 门课</span></div>
    <div class="stat"><span class="stat-k">最忙的一天</span><b>${perDay[busiest] ? DAY_NAMES[busiest] : '—'}</b><span class="stat-sub">${perDay[busiest]} 节</span></div>
    <div class="stat"><span class="stat-k">本周总课时</span><b>${perDay.reduce((a, b) => a + b, 0)}</b><span class="stat-sub">节 · 每节 50 分钟</span></div>
    <div class="stat"><span class="stat-k">本周 DDL</span><b>${state.tasks.filter((t) => !t.done && weekForDate(parseYmd(t.due) || new Date()) === w).length}</b><span class="stat-sub">条待办</span></div>`;

  const nw = state.courses.filter((c) => inWeek(c, w + 1)).length;
  el('homeNextWeek').textContent = `第 ${w + 1} 周（${weekRangeText(w + 1)}）有 ${nw} 个时段`;
}

/* ==================== 渲染：课表 ==================== */
function isNowBlock(c, w) {
  if (w !== currentWeek()) return false;
  const day = ((new Date().getDay() + 6) % 7) + 1;
  if (c.day !== day) return false;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const from = PERIODS[c.start - 1][0];
  const to = PERIODS[c.start + c.len - 2][1];
  return mins >= from && mins < to;
}

function renderSchedule() {
  const w = displayWeek();
  const wk = state.courses.filter((c) => inWeek(c, w)).sort((a, b) => a.day - b.day || a.start - b.start);
  el('wkTitle').textContent = `第 ${w} 周课表`;
  el('wkLabel').textContent = `第 ${w} 周`;
  el('wkRange').textContent = `${weekRangeText(w)} · ${wk.length} 个时段`;
  el('termStart').value = state.kv.termStart;
  const m = manualWeek();
  if (el('weekManual')) el('weekManual').value = m || '';
  if (el('weekModeHint')) {
    el('weekModeHint').textContent = m ? `当前：手动第 ${m} 周` : `当前：自动第 ${currentWeek()} 周`;
    el('weekModeHint').classList.toggle('manual', !!m);
  }

  const grid = el('ttGrid');
  const curW = currentWeek();
  const todayIdx = (new Date().getDay() + 6) % 7 + 1;
  const monday = weekMonday(w);
  let html = '<div class="tt-corner" style="grid-column:1;grid-row:1">节次</div>';
  for (let d = 1; d <= 7; d++) {
    const dt = addDays(monday, d - 1);
    const isToday = w === curW && d === todayIdx;
    html += `<div class="tt-day ${isToday ? 'today' : ''}" style="grid-column:${d + 1};grid-row:1">${DAY_NAMES[d - 1]}<small>${pad(dt.getMonth() + 1)}/${pad(dt.getDate())}</small></div>`;
  }
  for (let p = 1; p <= PERIODS.length; p++) {
    html += `<div class="tt-time" style="grid-column:1;grid-row:${p + 1}"><b>${p}</b>${fmtTime(PERIODS[p - 1][0])}</div>`;
  }
  for (const c of wk) {
    const [bg, fg] = COLORS[state.courses.indexOf(c) % COLORS.length];
    const now = isNowBlock(c, w);
    html += `<div class="tt-block ${now ? 'now' : ''}" data-len="${c.len}" style="grid-column:${c.day + 1};grid-row:${c.start + 1} / span ${c.len};background:${bg};color:${fg}" title="${esc(c.name)} · ${esc(c.room || '教室待定')}${c.teacher ? ' · ' + esc(c.teacher) : ''}">
      <b>${esc(c.name)}</b>
      <span>${esc(c.room || '教室待定')}${c.teacher ? ' · ' + esc(c.teacher) : ''}</span>
      <button class="tt-del" data-del="${c.id}" title="删除这节课">×</button>
    </div>`;
  }
  if (!wk.length) {
    html += `<div class="tt-empty" style="grid-row:2 / span 10">第 ${w} 周没有排课${w === 6 ? ' —— 大概率是国庆假期' : '，可以休息或自习'}</div>`;
  }
  grid.innerHTML = html;
  el('scheduleEmpty').hidden = true;
}

/* ==================== 渲染：DDL ==================== */
let taskFilter = 'all';

function taskBadge(t) {
  if (t.done) return '<span class="badge ok">已完成</span>';
  const d = parseYmd(t.due);
  if (!d) return '<span class="badge">无日期</span>';
  const diff = dayNum(d) - dayNum(new Date());
  if (diff < 0) return `<span class="badge danger">逾期 ${-diff} 天</span>`;
  if (diff === 0) return '<span class="badge warn">今天截止</span>';
  if (diff === 1) return '<span class="badge soon">明天截止</span>';
  if (diff <= 3) return `<span class="badge soon">${diff} 天后</span>`;
  return `<span class="badge">${t.due.slice(5)}</span>`;
}

function filteredTasks() {
  const today = ymd(new Date());
  const w = currentWeek();
  let list = state.tasks.slice();
  if (taskFilter === 'done') list = list.filter((t) => t.done);
  else {
    list = list.filter((t) => !t.done);
    if (taskFilter === 'today') list = list.filter((t) => t.due === today);
    if (taskFilter === 'week') list = list.filter((t) => weekForDate(parseYmd(t.due) || new Date()) === w && t.due >= today);
    if (taskFilter === 'overdue') list = list.filter((t) => t.due < today);
  }
  return list.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title));
}

function renderTasks() {
  const list = filteredTasks();
  el('taskCount').textContent = `${state.tasks.filter((t) => !t.done).length} 条未完成 / 共 ${state.tasks.length} 条`;
  const box = el('taskList');
  if (!list.length) {
    box.innerHTML = '<div class="empty">这里空着 —— 加一条，或者从学习通导入</div>';
    return;
  }
  box.innerHTML = list.map((t) => `
    <div class="row ${t.done ? 'done' : ''}">
      <input class="check" type="checkbox" data-task="${t.id}" ${t.done ? 'checked' : ''} aria-label="完成">
      <div class="row-main">
        <div class="row-title">${esc(t.title)}</div>
        <div class="row-meta">${esc(t.course || '未分类')} · 截止 ${esc(t.due)}${t.prio === 'high' ? ' · 重要' : ''}${t.source === 'chaoxing' ? ' · 学习通' : ''}${t.note ? ` · ${esc(t.note)}` : ''}</div>
      </div>
      ${taskBadge(t)}
      <button class="icon-btn" data-deltask="${t.id}" title="删除">删除</button>
    </div>`).join('');
}

/* ---------- DDL 分级提醒（72h / 24h / 3h） ---------- */
const DDL_REMIND_LEVELS = [
  { key: 'reminded_72h', hours: 72 },
  { key: 'reminded_24h', hours: 24 },
  { key: 'reminded_3h', hours: 3 },
];
let ddlReminderTimer = null;

/** 只有日期的 DDL 默认当天 23:59 截止；已带 HH:mm 的也能识别。 */
function dueTimestamp(task) {
  const raw = String(task && task.due || '').trim();
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(raw);
  if (!m) return NaN;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  const hh = m[4] === undefined ? 23 : Math.min(23, Math.max(0, +m[4]));
  const mm = m[5] === undefined ? 59 : Math.min(59, Math.max(0, +m[5]));
  return new Date(y, mo, d, hh, mm, m[4] === undefined ? 59 : 0, 0).getTime();
}

function notificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function refreshNotifyUi() {
  const btn = el('notifyBtn');
  const hint = el('notifyHint');
  if (!btn || !hint) return;
  const keepHint = '为了确保不漏掉 DDL，请保持网页在后台打开，或将其添加到手机桌面。（只有日期时按当天 23:59 计算）';
  if (!notificationSupported()) {
    btn.disabled = true;
    btn.textContent = '当前浏览器不支持系统通知';
    hint.textContent = `${keepHint}（页面内红色提醒仍会正常工作）`;
    return;
  }
  if (Notification.permission === 'granted') {
    btn.disabled = true;
    btn.textContent = '系统通知已开启';
    hint.textContent = `系统通知已开启。${keepHint}`;
    return;
  }
  if (Notification.permission === 'denied') {
    btn.disabled = true;
    btn.textContent = '系统通知已被拒绝';
    hint.textContent = `系统通知被浏览器拒绝，可在地址栏的网站权限里重新允许。${keepHint}`;
    return;
  }
  btn.disabled = false;
  btn.textContent = '开启系统通知';
  hint.textContent = `点「开启系统通知」授权后，网页切到后台也能收到提醒。${keepHint}`;
}

function requestNotifyPermission() {
  if (!notificationSupported()) return;
  let handled = false;
  const done = (permission) => {
    if (handled) return;
    handled = true;
    refreshNotifyUi();
    toast(permission === 'granted' ? '系统通知已开启' : '没有拿到系统通知权限，页面内提醒仍会正常显示');
  };
  try {
    const ret = Notification.requestPermission(done);
    if (ret && typeof ret.then === 'function') ret.then(done).catch(() => refreshNotifyUi());
  } catch {
    refreshNotifyUi();
  }
}

function sendSystemNotification(task, level, message) {
  if (!notificationSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(`DDL 提醒 · 还剩 ${level.hours} 小时`, {
      body: message.replace(/^⚠️ 紧急：/, ''),
      tag: `ddl-${task.id}-${level.key}`,
      renotify: true,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {
    /* 部分手机浏览器不支持构造 Notification，页面内 Toast 仍然有效 */
  }
}

function checkDdlReminders() {
  const now = Date.now();
  const alerts = [];
  let changed = false;
  for (const t of state.tasks) {
    if (!t || t.done || !t.due) continue;
    const due = dueTimestamp(t);
    if (!Number.isFinite(due)) continue;
    const hours = (due - now) / 3600000;
    if (hours < 0) continue;
    const applicable = DDL_REMIND_LEVELS.filter((l) => hours <= l.hours);
    const pending = applicable.filter((l) => !t[l.key]);
    if (!pending.length) continue;
    // 打开页面时如果已经进入更晚的节点，只提醒最紧急的一档，并把已经错过的档位标记掉，避免连环弹窗
    applicable.forEach((l) => { t[l.key] = true; });
    changed = true;
    const level = pending[pending.length - 1];
    const message = `⚠️ 紧急：『${t.title}』还剩不到 ${level.hours} 小时截止！${t.course ? `（${t.course}）` : ''}`;
    alerts.push(message);
    sendSystemNotification(t, level, message);
  }
  if (changed) persist();
  if (!alerts.length) return;
  if (alerts.length === 1) toast(alerts[0], 'alert');
  else toast(`${alerts[0]} 另外还有 ${alerts.length - 1} 条 DDL 进入提醒`, 'alert');
}

function initDdlReminders() {
  refreshNotifyUi();
  checkDdlReminders();
  if (ddlReminderTimer) clearInterval(ddlReminderTimer);
  ddlReminderTimer = setInterval(checkDdlReminders, 60 * 1000);
}

/* ==================== 渲染：记账 ==================== */
function monthSpent() {
  const ym = ymd(new Date()).slice(0, 7);
  return state.expenses.filter((e) => String(e.date).startsWith(ym)).reduce((s, e) => s + Number(e.amount || 0), 0);
}

function renderMoney() {
  const ym = ymd(new Date()).slice(0, 7);
  const list = state.expenses.filter((e) => String(e.date).startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));
  const spent = list.reduce((s, e) => s + Number(e.amount || 0), 0);
  const budget = Number(state.kv.budget) || 0;
  const refs = (state.kv.billRef || []).filter((r) => String(r.month) === ym);
  // 花呗多数情况下已含在支付宝支出里，只做单列提示，不参与相加
  const billSum = refs.filter((r) => r.src !== '花呗').reduce((s, r) => s + Number(r.total || 0), 0);
  const left = budget - spent;
  const days = new Date().getDate();
  el('moneyMonth').textContent = `${new Date().getFullYear()} 年 ${new Date().getMonth() + 1} 月记账`;
  el('moneySpent').textContent = money(spent);
  el('moneyBudget').textContent = money(budget);
  el('moneyLeft').textContent = money(left);
  el('moneyDaily').textContent = money(spent / Math.max(1, days));
  el('budgetInput').value = budget || '';
  const pct = budget ? Math.min(100, spent / budget * 100) : 0;
  const bar = el('moneyBar');
  bar.style.width = pct + '%';
  bar.classList.toggle('over', spent > budget);
  el('moneyBarHint').textContent = budget
    ? (spent > budget ? `已超支 ${money(spent - budget)}` : `预算还剩 ${money(left)}，日均可用 ${money(left / Math.max(1, 30 - days + 1))}`)
    : '设置一个月度预算，才能看到进度条';

  const billBox = el('moneyBill');
  if (billBox) {
    const hb = refs.filter((r) => r.src === '花呗').reduce((s, r) => s + Number(r.total || 0), 0);
    const over = billSum > budget && budget > 0;
    billBox.textContent = billSum
      ? `账单口径 ${money(billSum)}（微信 + 支付宝${hb ? `；花呗 ${money(hb)} 单列，不叠加` : ''}）`
        + `，明细已录 ${list.length} 笔 / ${money(spent)}（覆盖 ${(spent / billSum * 100).toFixed(0)}%）`
        + (over ? `，按账单已超预算 ${money(billSum - budget)}` : '')
      : '';
    billBox.style.color = over ? 'var(--warn, #d4622a)' : '';
  }

  const cats = {};
  list.forEach((e) => { cats[e.cat || '其他'] = (cats[e.cat || '其他'] || 0) + Number(e.amount || 0); });
  const max = Math.max(1, ...Object.values(cats));
  el('catList').innerHTML = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
    <div class="cat-row"><span class="cat-name">${esc(k)}</span>
    <span class="cat-bar"><i style="width:${v / max * 100}%"></i></span>
    <span class="cat-val">${money(v)}</span></div>`).join('') || '<div class="hint">这个月还没记账</div>';

  el('expCount').textContent = `${list.length} 笔`;
  el('expSource').textContent = refs.length
    ? `账单口径：${refs.map((r) => `${r.src} ${money(r.total)}`).join(' · ')}；已逐笔录入 ${list.length} 笔、合计 ${money(spent)}。花呗和支付宝常有重叠，别把三个数直接相加；截图没拍全的部分需要导出 CSV 再补。`
    : `本月已逐笔录入 ${list.length} 笔、合计 ${money(spent)} —— 把微信 / 支付宝月账单总额告诉我也能记成口径对照`;
  el('expList').innerHTML = list.map((e) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(e.note || e.cat)}</div>
        <div class="row-meta">${esc(e.date)} · ${esc(e.cat)}</div>
      </div>
      <div class="row-amt">${money(e.amount)}</div>
      <button class="icon-btn" data-delexp="${e.id}" title="删除">删除</button>
    </div>`).join('') || '<div class="empty">这个月还没有记录</div>';
}

/* ==================== 渲染：绩点 ==================== */
function scoreToGpa(score) {
  const s = Number(score);
  if (!Number.isFinite(s) || s < 60) return 0;
  if (s >= 90) return 4.0;
  if (s >= 85) return 3.7;
  if (s >= 80) return 3.3;
  if (s >= 75) return 3.0;
  if (s >= 70) return 2.7;
  if (s >= 65) return 2.3;
  return 2.0;
}

function gpaStats() {
  let credits = 0, weightedScore = 0, weightedPoint = 0;
  for (const g of state.gpa) {
    const c = Number(g.credit) || 0;
    const s = Number(g.score);
    if (!c || !Number.isFinite(s)) continue;
    credits += c;
    weightedScore += c * s;
    weightedPoint += c * scoreToGpa(s);
  }
  return {
    credits,
    avg: credits ? weightedScore / credits : NaN,
    point: credits ? weightedPoint / credits : NaN,
  };
}

function renderGpa() {
  el('gpaRows').innerHTML = state.gpa.map((g) => `
    <div class="gpa-row">
      <input type="text" value="${esc(g.name)}" data-gname="${g.id}" maxlength="30" aria-label="课程名">
      <input type="number" value="${g.credit}" step="0.5" min="0" data-gcredit="${g.id}" aria-label="学分">
      <input type="number" value="${Number.isFinite(Number(g.score)) ? g.score : ''}" step="1" min="0" max="100" data-gscore="${g.id}" aria-label="成绩">
      <button class="icon-btn" data-delgpa="${g.id}" title="删除">×</button>
    </div>`).join('') || '<div class="empty">按你的要求没有导入成绩单；想估算绩点可以在下面手填，不填也不影响其他页面</div>';
  const s = gpaStats();
  el('gpaAvg').textContent = Number.isNaN(s.avg) ? '—' : s.avg.toFixed(1);
  el('gpaPoint').textContent = Number.isNaN(s.point) ? '—' : s.point.toFixed(2);
  el('gpaCredits').textContent = s.credits;
  const goal = state.kv.gpaGoal || DEFAULT_KV.gpaGoal;
  el('gpaTarget').value = goal.target;
  el('gpaGoalCredit').value = goal.credits;
  const target = Number(goal.target), total = Number(goal.credits);
  if (target && total) {
    if (!s.credits) el('gpaGoalOut').textContent = '先在上面填几门课的成绩，才能反推后面每门要考多少分。';
    else if (s.credits >= total) el('gpaGoalOut').textContent = '已修满毕业学分，目标达成情况按最终成绩算。';
    else {
      const need = (target * total - s.point * s.credits) / (total - s.credits);
      el('gpaGoalOut').textContent = need <= 0
        ? `当前加权绩点 ${s.point.toFixed(2)} 已经高于目标 ${target.toFixed(2)}，把剩下的学分稳住就行。`
        : `要拿到 ${target.toFixed(2)} 的加权绩点，剩余 ${(total - s.credits).toFixed(0)} 学分平均需要 ${need.toFixed(2)} 绩点（约 ${Math.ceil(need >= 3.7 ? 85 : need >= 3.3 ? 80 : need >= 3.0 ? 75 : need >= 2.7 ? 70 : need >= 2.3 ? 65 : 60)} 分）。`;
    }
  } else el('gpaGoalOut').textContent = '填目标绩点和毕业总学分，可以反推后面要考多少分。';
}

/* ==================== 渲染：学习 ==================== */
const FREE_SITES = [
  { n: '中国大学MOOC', u: 'https://www.icourse163.org/', t: '高校课程 · 免费', d: '和你课表里的专业课最对得上，很多课能免费看完' },
  { n: '学堂在线', u: 'https://www.xuetangx.com/', t: '清华等高校课', d: '计算机、数学基础课齐全，讲义可下载' },
  { n: '网易公开课', u: 'https://open.163.com/', t: '公开课合集', d: 'TED、名校讲座，通识课和思政课都能用' },
  { n: 'B 站', u: 'https://www.bilibili.com/', t: '免费视频', d: '课程名 + “王道 / 尚硅谷 / 黑马” 命中率最高' },
  { n: 'MIT OCW', u: 'https://ocw.mit.edu/', t: '英文 · 免费', d: 'CS 原版讲义与视频，配合字幕看' },
  { n: 'CS50', u: 'https://cs50.harvard.edu/x/', t: '哈佛 · 免费', d: '计算机入门神课，有中文字幕版本' },
  { n: 'Khan Academy', u: 'https://zh.khanacademy.org/', t: '中文 · 免费', d: '高数、统计、线代概念补漏' },
  { n: 'Hello 算法', u: 'https://www.hello-algo.com/', t: '开源书', d: '数据结构 / 算法，动画图解，适合入门' },
  { n: 'CS 自学指南', u: 'https://csdiy.wiki/', t: '路线图', d: '按方向挑课，少走弯路' },
  { n: '菜鸟教程', u: 'https://www.runoob.com/', t: '速查', d: '语法忘了就查一页，不用从头看' },
  { n: 'MDN', u: 'https://developer.mozilla.org/zh-CN/', t: '前端权威', d: 'Web 前端课的标准参考文档' },
  { n: 'Python 官方教程', u: 'https://docs.python.org/zh-cn/3/tutorial/', t: '官方 · 免费', d: '中文版，比二手教程准' },
  { n: 'SQLBolt', u: 'https://sqlbolt.com/', t: '交互练习', d: '数据库课边学边写 SQL，浏览器里直接跑' },
  { n: 'Kaggle Learn', u: 'https://www.kaggle.com/learn', t: '数据科学', d: 'Pandas / 机器学习短课，带在线练习' },
  { n: 'LeetCode 题库', u: 'https://leetcode.cn/problemset/', t: '刷题', d: '免费题库，按标签从简单题开始' },
  { n: 'freeCodeCamp', u: 'https://www.freecodecamp.org/chinese/', t: '中文 · 免费', d: '前端 / 后端项目式课程，适合 Web 课' },
];

const enc = encodeURIComponent;
const moocSearch = (q) => `https://www.icourse163.org/search.htm?search=${enc(q)}`;
const biliSearch = (q) => `https://search.bilibili.com/all?keyword=${enc(q)}`;

const COURSE_LINKS = {
  '数据结构': [
    { t: 'Hello 算法（站内 PDF）', read: '/library/hello-algo-zh-python.pdf', local: true },
    { t: 'Hello 算法在线', u: 'https://www.hello-algo.com/' },
    { t: '王道数据结构（B站）', u: biliSearch('王道 数据结构') },
  ],
  '数据库原理及实用技术': [
    { t: 'SQLBolt 交互练习', u: 'https://sqlbolt.com/' },
    { t: '数据库系统概论（MOOC）', u: moocSearch('数据库系统概论') },
    { t: 'MySQL 教程（菜鸟）', u: 'https://www.runoob.com/mysql/mysql-tutorial.html' },
  ],
  'Python程序设计': [
    { t: 'Python 官方中文教程', u: 'https://docs.python.org/zh-cn/3/tutorial/' },
    { t: 'Kaggle · Python 短课', u: 'https://www.kaggle.com/learn/python' },
    { t: '菜鸟 Python3', u: 'https://www.runoob.com/python3/python3-tutorial.html' },
  ],
  'Java程序设计': [
    { t: '廖雪峰 Java 教程', u: 'https://liaoxuefeng.com/books/java/introduction/index.html' },
    { t: '菜鸟 Java', u: 'https://www.runoob.com/java/java-tutorial.html' },
    { t: 'Java 基础（B站）', u: biliSearch('Java 零基础 尚硅谷') },
  ],
  'Web前端开发技术': [
    { t: 'MDN Web 文档', u: 'https://developer.mozilla.org/zh-CN/' },
    { t: 'freeCodeCamp 前端', u: 'https://www.freecodecamp.org/chinese/learn/front-end-development-libraries/' },
    { t: '菜鸟 HTML/CSS', u: 'https://www.runoob.com/html/html-tutorial.html' },
  ],
  '数据采集与数据处理技术': [
    { t: 'Requests 中文文档', u: 'https://requests.readthedocs.io/zh-cn/latest/' },
    { t: 'Kaggle · Pandas', u: 'https://www.kaggle.com/learn/pandas' },
    { t: '爬虫入门（B站）', u: biliSearch('Python 爬虫 入门') },
  ],
  '机器学习与应用': [
    { t: 'Kaggle · 机器学习入门', u: 'https://www.kaggle.com/learn/intro-to-machine-learning' },
    { t: 'scikit-learn 中文', u: 'https://scikit-learn.org.cn/' },
    { t: '李宏毅机器学习（B站）', u: biliSearch('李宏毅 机器学习') },
  ],
  '逻辑学': [
    { t: '慕课 · 逻辑学导论', u: moocSearch('逻辑学导论') },
    { t: '逻辑学（B站）', u: biliSearch('逻辑学 大学 课程') },
  ],
  '马克思主义基本原理': [
    { t: '慕课 · 马原', u: moocSearch('马克思主义基本原理') },
    { t: '马原复习（B站）', u: biliSearch('马原 期末 复习') },
  ],
  '中国近现代史纲要': [
    { t: '慕课 · 史纲', u: moocSearch('中国近现代史纲要') },
    { t: '史纲时间线（B站）', u: biliSearch('史纲 时间线 复习') },
  ],
  '大学美育': [
    { t: '慕课 · 大学美育', u: moocSearch('大学美育') },
    { t: '艺术史（B站）', u: biliSearch('艺术史 公开课') },
  ],
};

function linksForCourse(name) {
  const base = (COURSE_LINKS[name] || []).slice();
  if (!base.some((l) => l.u && l.u.includes('icourse163'))) base.push({ t: `慕课搜「${name}」`, u: moocSearch(name) });
  base.push({ t: `B站搜「${name}」`, u: biliSearch(name) });
  return base;
}

function fmtSize(bytes) {
  if (!bytes) return '—';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

async function loadLibrary(force = false) {
  if (studyLib && !force) return studyLib;
  try { studyLib = (await api('/api/library')).data; } catch { studyLib = { files: [], total: 0, error: true }; }
  renderLibrary();
  return studyLib;
}

function renderLibrary() {
  const box = el('studyLibrary');
  if (!box) return;
  if (!studyLib) {
    box.innerHTML = '<div class="empty">正在读取本地资料…</div>';
    loadLibrary();
    return;
  }
  const files = studyLib.files || [];
  el('libCount').textContent = studyLib.error ? '读取失败' : `${studyLib.total} 份可离线看`;
  el('libHint').textContent = studyLib.error
    ? '本地资料接口没连上，检查服务是否在跑；外链资源仍然可用。'
    : '文件就在这台电脑的 library 目录里，断网也能读；点击「站内阅读」不用装 PDF 软件。';
  box.innerHTML = files.map((f) => `
    <div class="lib-card">
      <h3>${esc(f.title || f.file)} <span class="lib-badge">${f.exists ? '离线' : '缺失'}</span></h3>
      <div class="lib-meta">${esc((f.subjects || []).join(' · '))} · ${fmtSize(f.size)} · ${esc(f.license || '')}</div>
      <p class="hint" style="margin:0 0 10px">${esc(f.desc || '')}</p>
      <div class="lib-actions">
        <button class="btn" type="button" data-read="${esc(f.url)}" data-title="${esc(f.title || f.file)}" ${f.exists ? '' : 'disabled'}>站内阅读</button>
        <a class="btn" href="${esc(f.url)}" download>下载</a>
        ${f.source ? `<a class="res-link" href="${esc(f.source)}" target="_blank" rel="noopener">来源</a>` : ''}
      </div>
    </div>`).join('') || '<div class="empty">library 目录里还没有资料</div>';
}

async function loadNet(force = false) {
  if (netInfo && !force) return netInfo;
  try { netInfo = (await api('/api/net')).data; } catch { netInfo = { urls: [], port: 8787, error: true }; }
  renderShare();
  return netInfo;
}

let shareUrlValue = '';

function renderShare() {
  const box = el('shareUrl');
  if (!box) return;
  if (!netInfo) {
    box.textContent = '正在读取本机地址…';
    loadNet();
    return;
  }
  const cur = location.hostname;
  const pick = (netInfo.urls || []).find((u) => u.url.includes(cur)) || (netInfo.urls || [])[0];
  const fallback = location.protocol === 'file:' ? `http://127.0.0.1:${netInfo.port}/` : location.href.split('?')[0];
  const pub = netInfo.publicUrl || '';
  shareUrlValue = pub || (pick ? pick.url : fallback);
  box.textContent = shareUrlValue;
  const lanUrl = pick ? pick.url : '';
  el('shareHint').textContent = netInfo.static
    ? '这是当前静态站地址，直接发给同学即可；每个人打开的页面互相独立，数据只存在各自的浏览器里。'
    : netInfo.error
      ? '读不到地址：确认服务已启动。'
      : pub
        ? `公网链接是临时隧道（Cloudflare），这台电脑或隧道进程一关就失效；任何人打开都是只读。${lanUrl ? ` 同一 Wi‑Fi 也可以直接用 ${lanUrl}` : ''}`
        : (netInfo.urls && netInfo.urls.length)
          ? '手机连同一个 Wi‑Fi，浏览器输入这个地址；同学看到的是只读版，改不了你的数据。'
          : '这台电脑没检测到局域网地址（可能只连了手机热点或系统限制），先用 127.0.0.1 自己用。';
  el('openShare').href = shareUrlValue;
  const qr = el('shareQr');
  qr.innerHTML = '';
  if (window.QRCode) {
    new QRCode(qr, { text: shareUrlValue, width: 158, height: 158, correctLevel: QRCode.CorrectLevel.M });
  } else {
    qr.innerHTML = '<span class="hint" style="text-align:center">二维码库没加载<br>直接复制链接</span>';
  }
}

const MINI_NAME = '赛博鸡蛋篮';
const MINI_PATH = '#小程序://赛博鸡蛋篮/tQI6TXsNXaYiKqr';

function renderMini() {
  const box = el('miniQr');
  if (!box) return;
  let saved = null;
  try { saved = localStorage.getItem('campus.miniCode'); } catch { /* 隐私模式忽略 */ }
  box.innerHTML = saved
    ? `<img src="${saved}" alt="${MINI_NAME} 小程序码">`
    : '<span class="hint" style="text-align:center;line-height:1.5">上传小程序码<br>手机扫码直达</span>';
}

/** 某门课在一次具体排课里对应的真实日期（termStart + 第几周 + 星期几） */
function dateOfSession(c, week) {
  const start = effectiveTermStart();
  return addDays(start, (week - 1) * 7 + (c.day - 1));
}

/** 从今天起还没上的课：先本周剩余，再下周，按日期排 */
function courseSessions(name, w) {
  const today = new Date();
  const out = [];
  for (const week of [w, w + 1]) {
    for (const c of state.courses.filter((x) => x.name === name && inWeek(x, week))) {
      const d = dateOfSession(c, week);
      if (week === w && dayNum(d) < dayNum(today)) continue;
      out.push({ c, d, week });
    }
  }
  out.sort((a, b) => dayNum(a.d) - dayNum(b.d) || a.c.start - b.c.start);
  return out;
}

function renderStudy() {
  if (!el('studyCourses')) return;
  const w = currentWeek();
  const manual = !!manualWeek();
  const wk = state.courses.filter((c) => inWeek(c, w));
  const todayIdx = (new Date().getDay() + 6) % 7 + 1;
  const todayList = wk
    .filter((c) => c.day === todayIdx)
    .sort((a, b) => a.start - b.start);
  const todayNames = [...new Set(todayList.map((c) => c.name))];
  const otherNames = [...new Set(wk.map((c) => c.name))].filter((n) => !todayNames.includes(n));
  // 今天有课就先列今天，再把本周其余课程排在后面
  const names = [...todayNames, ...otherNames];

  const intro = names.length
    ? `第 ${w} 周${manual ? '（手动）' : ''}有 ${names.length} 门课、${wk.length} 个时段。今天（${DAY_NAMES[todayIdx - 1]}）${todayList.length
      ? `有 ${todayList.length} 个时段：${todayNames.join('、')}，已按课名匹配下面的免费资源。`
      : '没有排课，可以先看下面的免费站或自习。'}`
    : `第 ${w} 周${manual ? '（手动）' : ''}没有排课（空周），可以从下面的免费站点自己找方向。`;
  el('studyIntro').textContent = intro;
  el('studyStats').innerHTML = `
    <div class="sstat"><b>${names.length}</b><span>门本周课程</span></div>
    <div class="sstat"><b>${todayList.length}</b><span>个今天时段</span></div>
    <div class="sstat"><b>${studyLib && !studyLib.error ? studyLib.total : '—'}</b><span>份离线资料</span></div>`;

  el('studyCourses').innerHTML = names.map((name) => {
    const occ = wk.filter((c) => c.name === name).sort((a, b) => a.day - b.day || a.start - b.start);
    const upcoming = courseSessions(name, w);
    const next = upcoming[0];
    const todayStr = ymd(new Date());
    const isToday = upcoming.some((s) => ymd(s.d) === todayStr);
    const isTomorrow = upcoming.some((s) => dayNum(s.d) - dayNum(new Date()) === 1);
    const restThisWeek = upcoming.filter((s) => s.week === w).length;
    const pills = [
      isToday ? '<span class="pill today">今天有课</span>' : '',
      !isToday && isTomorrow ? '<span class="pill tomorrow">明天有课</span>' : '',
      next ? `<span class="pill">${esc(next.c.room || '')}</span>` : '',
    ].join('');
    const meta = next
      ? `下次 ${pad(next.d.getMonth() + 1)}/${pad(next.d.getDate())} ${DAY_NAMES[next.c.day - 1]} 第 ${next.c.start}${next.c.len > 1 ? `–${next.c.start + next.c.len - 1}` : ''} 节${next.week > w ? '（下周）' : ''} · 本周还剩 ${restThisWeek} 次`
      : `本周排课已结束（共 ${occ.length} 次）`;
    const links = linksForCourse(name).map((l) => (l.read
      ? `<button class="res-link local" type="button" data-read="${esc(l.read)}" data-title="${esc(name)} · 本地资料">📄 <span>${esc(l.t)}</span></button>`
      : `<a class="res-link" href="${esc(l.u)}" target="_blank" rel="noopener">↗ <span>${esc(l.t)}</span></a>`)).join('');
    return `<div class="course-card${isToday ? ' today-card' : ''}">
      <h3>${esc(name)}${pills}</h3>
      <p class="course-meta">${esc(meta)}</p>
      <div class="res-row">${links}</div>
    </div>`;
  }).join('') || '<div class="empty">本周没有课，去下面的站点自己挑一门</div>';

  el('studySites').innerHTML = FREE_SITES.map((s) => `
    <a class="site-card" href="${esc(s.u)}" target="_blank" rel="noopener">
      <b>${esc(s.n)}</b>
      <small>${esc(s.t)}</small>
      <small>${esc(s.d)}</small>
      <span class="free">免费</span>
    </a>`).join('');

  renderLibrary();
  renderMini();
  renderShare();
}

/* ---------- 阅读器 / 分享 ---------- */
function openReader(url, title) {
  el('readerTitle').textContent = title || '资料';
  const dl = el('readerDownload');
  dl.href = url;
  dl.download = decodeURIComponent(url.split('/').pop() || 'document.pdf');
  el('readerFrame').src = url;
  el('readerModal').classList.add('show');
  el('readerModal').setAttribute('aria-hidden', 'false');
}

function closeReader() {
  el('readerModal').classList.remove('show');
  el('readerModal').setAttribute('aria-hidden', 'true');
  el('readerFrame').src = '';
}

function bindStudy() {
  el('studyCourses').addEventListener('click', (e) => {
    const b = e.target.closest('[data-read]');
    if (b) openReader(b.dataset.read, b.dataset.title || '资料');
  });
  el('studyLibrary').addEventListener('click', (e) => {
    const b = e.target.closest('[data-read]');
    if (b) openReader(b.dataset.read, b.dataset.title);
  });
  el('readerClose').addEventListener('click', closeReader);
  el('readerModal').addEventListener('click', (e) => { if (e.target === el('readerModal')) closeReader(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el('readerModal').classList.contains('show')) closeReader(); });

  const copy = async (text, okMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch { toast('复制失败，手动选中上面的地址'); }
      ta.remove();
    }
  };
  el('copyShare').addEventListener('click', () => copy(shareUrlValue, '分享链接已复制'));
  el('copyGuest').addEventListener('click', () => copy(shareUrlValue, '分享链接已复制'));

  el('copyMini').addEventListener('click', () => copy(MINI_PATH, '小程序路径已复制，粘贴到微信聊天里点开'));
  el('miniUploadBtn').addEventListener('click', () => el('miniFile').click());
  el('miniFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast('图片超过 3MB，先压缩一下'); e.target.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => {
      try {
        localStorage.setItem('campus.miniCode', fr.result);
        renderMini();
        el('miniHint').textContent = `已保存「${MINI_NAME}」小程序码，只存在这台电脑；拿手机微信扫它就能进。`;
        toast('小程序码已保存');
      } catch {
        toast('浏览器存储已满，换张小一点的图');
      }
    };
    fr.readAsDataURL(f);
    e.target.value = '';
  });
  el('shareBtn').addEventListener('click', () => {
    showTab('study');
    setTimeout(() => el('shareCard').scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  });
  loadNet();
}

/* ==================== 渲染：趣味 ==================== */
const FORTUNE = {
  good: ['适合推进难啃的课', '效率在线，别浪费', '会有意外的小收获', '适合把拖延的事收尾'],
  normal: ['按部就班就好', '稳一点，别熬夜', '普通但顺的一天', '做完该做的就行'],
  bad: ['容易分心，先把手机放远', '别硬撑，早点休息', '计划留点余量', '少刷短视频，多睡半小时'],
};
const LUCKY = ['红烧肉', '一杯冰美式', '操场走两圈', '给家里打个电话', '午睡 20 分钟', '买本旧书', '早点洗澡', '听完一整首歌'];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

function renderFun() {
  const key = ymd(new Date());
  const h = hash(key);
  const mood = h % 7 === 0 ? 'bad' : h % 3 === 0 ? 'good' : 'normal';
  el('fortuneDate').textContent = key;
  el('fortuneBox').innerHTML = `
    <div class="fortune-line"><span class="k">状态</span><span class="v">${FORTUNE[mood][h % FORTUNE[mood].length]}</span></div>
    <div class="fortune-line"><span class="k">宜</span><span class="v">${LUCKY[h % LUCKY.length]}</span></div>
    <div class="fortune-line"><span class="k">忌</span><span class="v">${LUCKY[(h >> 3) % LUCKY.length]}、熬到两点</span></div>
    <div class="fortune-line"><span class="k">一句话</span><span class="v">课表已经排好了，剩下的看你自己。</span></div>`;
}

/* ---- 今天吃什么：店铺池 + 滚动抽取 ---- */
let foodTimer = null;

function foodOptions() {
  const list = Array.isArray(state.kv.food)
    ? state.kv.food.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  return list.length ? list : DEFAULT_KV.food.slice();
}

function renderFoodPool() {
  const pool = el('foodPool');
  if (!pool) return;
  const opts = foodOptions();
  pool.innerHTML = opts.map((n) =>
    `<button type="button" class="food-chip" data-food="${esc(n)}">${esc(n)}</button>`).join('');
  el('foodMeta').textContent = `共 ${opts.length} 家 · 西校区 / 中心校区周边`;
  const cur = el('foodBox').textContent.trim();
  pool.querySelectorAll('.food-chip').forEach((c) => c.classList.toggle('on', cur === c.dataset.food));
}

function pickFood(target) {
  const box = el('foodBox');
  const opts = foodOptions();
  if (!box || !opts.length) return;
  const chosen = target || opts[Math.floor(Math.random() * opts.length)];
  clearInterval(foodTimer);
  const settle = () => {
    box.textContent = chosen;
    box.classList.remove('spin');
    renderFoodPool();
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { settle(); return; }
  let step = 0;
  box.classList.add('spin');
  foodTimer = setInterval(() => {
    box.textContent = opts[Math.floor(Math.random() * opts.length)];
    if (++step >= 9) { clearInterval(foodTimer); settle(); }
  }, 55);
}

/* ==================== 渲染：官网入口与动态 ==================== */
function renderHub() {
  el('hubGrid').innerHTML = HUBS.map((h) => `
    <a class="hub-item" href="${h.url}" target="_blank" rel="noopener">
      <b>${h.name}</b><span>${h.desc}</span></a>`).join('');
}

function renderNews() {
  const chan = el('newsSeg').querySelector('button.active')?.dataset.news || 'yaowen';
  const items = newsItems[chan] || [];
  const box = el('newsList');
  if (!items.length) {
    box.innerHTML = '<div class="empty">官网快照还没生成，等 Actions 跑一次；联网后也可以手动刷新。</div>';
  } else {
    box.innerHTML = items.map((n) => `
      <div class="news-item">
        <span class="news-date">${esc(n.date)}</span>
        <a class="news-title" href="${esc(n.href)}" target="_blank" rel="noopener">${esc(n.title)}</a>
        <button class="news-add" data-newsadd="${esc(n.title)}" data-newsdue="${esc(n.date)}" title="加进 DDL">＋</button>
      </div>`).join('');
  }
  el('newsFoot').textContent = newsAt
    ? `${online ? '已同步' : '离线缓存'} · ${new Date(newsAt).toLocaleString('zh-CN', { hour12: false })}`
    : '来源：潍坊理工学院官网';
}

async function loadNews(refresh = false) {
  try {
    const res = await fetch('./data/news.json' + (refresh ? '?t=' + Date.now() : ''), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    newsItems = data.items || { yaowen: [], tongzhi: [] };
    newsAt = data.at || null;
  } catch {
    const cached = localStorage.getItem('campusNews');
    if (cached) { const c = JSON.parse(cached); newsItems = c.items; newsAt = c.at; }
  }
  try { localStorage.setItem('campusNews', JSON.stringify({ items: newsItems, at: newsAt })); } catch { }
  renderNews();
}

/* ==================== 渲染总控 ==================== */
function renderAll() {
  renderCover();
  renderHome();
  renderSchedule();
  renderTasks();
  renderMoney();
  renderGpa();
  renderStudy();
  renderFun();
  renderFoodPool();
  renderFocus();
  renderHub();
  renderNews();
  renderFoot();
  renderStatus();
}

function renderFoot() {
  el('footCounts').textContent = `课表 ${state.courses.length} · 待办 ${state.tasks.filter((t) => !t.done).length} · 账目 ${state.expenses.length} · 成绩 ${state.gpa.length}`;
  el('footVersion').textContent = online ? '静态版 · 数据存在浏览器 localStorage' : '离线缓存版 · 数据存在浏览器';
}

/* ==================== 课表操作 ==================== */
function applyPreset() {
  state.courses = PRESET.map((r, i) => ({
    id: 'c' + (i + 1), day: r[0], start: r[1], len: r[2],
    name: r[3], teacher: r[4], room: r[5], weeks: maskToWeeks(r[6]),
  }));
  state.kv.presetDone = true;
  persist();
  renderAll();
}

function addCourse() {
  const name = el('cName').value.trim();
  if (!name) return toast('先填课程名');
  const day = Number(el('cDay').value);
  const start = Number(el('cStart').value);
  const len = Number(el('cLen').value);
  const weeks = weeksFromText(el('cWeeks').value);
  const w = displayWeek();
  if (!weeks.length || weeks.includes(w)) {
    const clash = state.courses.find((c) => c.day === day
      && start < c.start + c.len && c.start < start + len
      && inWeek(c, w));
    if (clash) return toast(`这一周这个时段已经有课了：${clash.name}`);
  }
  state.courses.push({
    id: uid(), day, start, len, name,
    teacher: el('cTeacher').value.trim(),
    room: el('cRoom').value.trim(),
    weeks: weeks.length ? weeks : [w],
  });
  persist();
  el('cName').value = ''; el('cTeacher').value = ''; el('cRoom').value = ''; el('cWeeks').value = '';
  renderAll();
  toast('已加入第 ' + w + ' 周课表');
}

function buildIcs() {
  const w = displayWeek();
  const monday = weekMonday(w);
  const events = state.courses.filter((c) => inWeek(c, w));
  const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//campus-life//CN', 'CALSCALE:GREGORIAN'];
  for (const c of events) {
    const d = addDays(monday, c.day - 1);
    const s = addDays(d, 0); s.setHours(Math.floor(PERIODS[c.start - 1][0] / 60), PERIODS[c.start - 1][0] % 60, 0, 0);
    const e = addDays(d, 0); e.setHours(Math.floor(PERIODS[c.start + c.len - 2][1] / 60), PERIODS[c.start + c.len - 2][1] % 60, 0, 0);
    lines.push('BEGIN:VEVENT', `UID:${c.id}-w${w}@campus`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(s)}`, `DTEND:${stamp(e)}`, `SUMMARY:${c.name}`,
      `LOCATION:${c.room || ''}`, `DESCRIPTION:${c.teacher || ''} · 第 ${w} 周`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n') + '\r\n', count: events.length };
}

function exportIcs() {
  const { text, count } = buildIcs();
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `课表-第${displayWeek()}周.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`已导出第 ${displayWeek()} 周 ${count} 节课`);
}

/* ==================== 学习通导入 ==================== */
function parseCxText(text) {
  const raw = String(text || '').replace(/\r/g, '\n').replace(/\u00a0/g, ' ');
  const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
  const items = [];
  const isMeta = (s) => /^(截止|结束|剩余|状态|提交|未提交|已提交|待批阅|已批阅|已完成|查看|进入|去完成|课程[:：]?|来源)/.test(s)
    || /^20\d{2}[-/年.]\d{1,2}[-/月.]\d{1,2}/.test(s)
    || /^\d{1,2}:\d{2}/.test(s)
    || /^\d+\s*(天|小时)$/.test(s);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = /(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/.exec(line);
    if (!dateMatch) continue;
    const due = `${dateMatch[1]}-${pad(+dateMatch[2])}-${pad(+dateMatch[3])}`;
    let title = '';
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const cand = lines[j].replace(/^[-·•]\s*/, '').replace(/^标题[:：]\s*/, '');
      if (!cand || isMeta(cand)) continue;
      title = cand;
      break;
    }
    if (!title) continue;
    let course = '';
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const m = /^课程[:：]\s*(.+)$/.exec(lines[j]) || /^《(.+)》$/.exec(lines[j]);
      if (m) { course = m[1].trim(); break; }
    }
    const conv = /已提交|待批阅|已批阅|已完成/.test(lines.slice(i, i + 3).join(' '));
    items.push({ title: title.slice(0, 60), due, course, done: conv, source: 'chaoxing', externalId: `${course}|${title}|${due}` });
  }
  // 去重（标题 + 日期）
  const seen = new Set();
  return items.filter((i) => {
    const k = i.title + '|' + i.due;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function renderCxPreview(items, note) {
  cxPreviewItems = items;
  const box = el('cxPreview');
  if (!items.length) {
    box.innerHTML = `<div class="empty">没解析到条目。换一段文本，或确认复制的是作业/考试列表。</div>`;
    return;
  }
  box.innerHTML = `
    <div class="hint" style="margin-bottom:6px">${esc(note || '')} 共解析 ${items.length} 条，确认后写入 DDL：</div>
    <div class="list">${items.map((it, i) => `
      <div class="row">
        <input class="check" type="checkbox" data-cx="${i}" checked aria-label="选择">
        <div class="row-main">
          <div class="row-title">${esc(it.title)}</div>
          <div class="row-meta">${esc(it.course || '未分类')} · 截止 ${esc(it.due)}${it.done ? ' · 已提交' : ''}</div>
        </div>
      </div>`).join('')}</div>
    <div class="form-row"><button class="btn btn-primary" id="cxImport">导入选中的</button></div>`;
}

async function importCx(items) {
  const chosen = items.filter((it) => it._checked !== false);
  if (!chosen.length) return toast('没有选中条目');
  if (online) {
    try {
      const r = await api('/api/chaoxing/import', { method: 'POST', body: JSON.stringify({ items: chosen }) });
      const d = r.data;
      await pullState();
      toast(`新增 ${d.added} 条，更新 ${d.updated} 条，跳过 ${d.skipped} 条`);
      renderAll();
      return;
    } catch (e) { toast('导入失败：' + e.message); return; }
  }
  // 离线：直接写本地，按标题+日期去重
  let added = 0;
  for (const it of chosen) {
    if (state.tasks.some((t) => t.title === it.title && t.due === it.due)) continue;
    state.tasks.push({ id: uid(), title: it.title, course: it.course, due: it.due, prio: 'normal', done: !!it.done, source: 'chaoxing' });
    added++;
  }
  persist(); renderAll();
  toast(`离线导入 ${added} 条`);
}

/* ==================== 数据操作 ==================== */
async function pullState() {
  const r = await api('/api/state');
  const d = r.data;
  state = { courses: d.courses, tasks: d.tasks, expenses: d.expenses, gpa: d.gpa, kv: normalizeKv(d.kv) };
  online = true;
}

async function migrateLocal(local) {
  try {
    await api('/api/migrate/legacy', { method: 'POST', body: JSON.stringify({ data: local }) });
    await pullState();
    showBanner('');
    toast('已把浏览器里的旧数据迁到本地数据库');
  } catch (e) {
    showBanner('旧数据迁移失败：' + e.message);
  }
}

/* ==================== 事件绑定 ==================== */
function showTab(tab) {
  const buttons = [...document.querySelectorAll('[data-tab]')];
  buttons.forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + tab));
  if (tab === 'schedule') renderSchedule();
  if (tab === 'home') loadNews();
  if (tab === 'study') renderStudy();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindTabs() {
  [...document.querySelectorAll('[data-tab]')].forEach((b) => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  });
}

function bindSchedule() {
  // 填充下拉选项：星期 / 节次 / 连上几节
  el('cDay').innerHTML = DAY_NAMES.map((d, i) => `<option value="${i + 1}">${d}</option>`).join('');
  el('cStart').innerHTML = PERIODS.map((p, i) => `<option value="${i + 1}">第 ${i + 1} 节 · ${fmtTime(p[0])}</option>`).join('');
  el('cLen').innerHTML = [1, 2, 3, 4].map((n) => `<option value="${n}" ${n === 2 ? 'selected' : ''}>${n} 节</option>`).join('');
  el('cDay').value = '1'; el('cStart').value = '1';

  el('wkPrev').addEventListener('click', () => { state.kv.week = Math.max(1, displayWeek() - 1); persist(); renderAll(); });
  el('wkNext').addEventListener('click', () => { state.kv.week = Math.min(30, displayWeek() + 1); persist(); renderAll(); });
  el('wkReset').addEventListener('click', () => {
    state.kv.week = 0;
    persist(); renderAll();
    toast('已恢复自动计算：第 ' + currentWeek() + ' 周');
  });
  const applyManualWeek = () => {
    const raw = el('weekManual')?.value.trim();
    const w = Number(raw);
    if (!raw || !Number.isFinite(w) || w < 1 || w > 30) return toast('请输入 1–30 之间的周次');
    state.kv.week = Math.round(w);
    persist(); renderAll();
    toast('已锁定第 ' + state.kv.week + ' 周，首页和学习页同步更新');
  };
  el('weekApply')?.addEventListener('click', applyManualWeek);
  el('weekManual')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyManualWeek(); }
  });
  el('weekAuto')?.addEventListener('click', () => {
    state.kv.week = 0;
    persist(); renderAll();
    toast('已恢复自动计算：第 ' + currentWeek() + ' 周');
  });
  el('termStart').addEventListener('change', (e) => {
    const v = e.target.value;
    if (!parseYmd(v)) return toast('日期不合法');
    state.kv.termStart = v;
    persist(); renderAll();
    toast('学期起始已更新，当前第 ' + currentWeek() + ' 周');
  });
  el('icsBtn').addEventListener('click', exportIcs);
  el('printBtn').addEventListener('click', () => window.print());
  el('importBtn').addEventListener('click', () => {
    if (state.courses.length && !confirm('导入会覆盖当前课表（' + state.courses.length + ' 个时段），继续？')) return;
    applyPreset();
    toast('已载入你的课表 · 现在第 ' + currentWeek() + ' 周');
  });
  el('cAdd').addEventListener('click', addCourse);
  el('ttGrid').addEventListener('click', (e) => {
    const id = e.target.closest('[data-del]')?.dataset.del;
    if (!id) return;
    state.courses = state.courses.filter((c) => c.id !== id);
    persist(); renderAll();
    toast('课程已删除');
  });
}

function bindTasks() {
  el('notifyBtn')?.addEventListener('click', requestNotifyPermission);
  refreshNotifyUi();
  el('taskSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    taskFilter = btn.dataset.filter;
    el('taskSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    renderTasks();
  });
  el('tAdd').addEventListener('click', () => {
    const title = el('tTitle').value.trim();
    const due = el('tDue').value || ymd(addDays(new Date(), 1));
    if (!title) return toast('先填要做的事');
    state.tasks.push({
      id: uid(), title, course: el('tCourse').value.trim(), due,
      prio: el('tPrio').value, done: false, source: 'manual',
    });
    persist(); el('tTitle').value = ''; el('tDue').value = '';
    renderAll(); toast('已加入 DDL');
  });
  el('taskList').addEventListener('change', (e) => {
    const id = e.target.dataset.task;
    if (!id) return;
    const t = state.tasks.find((x) => x.id === id);
    t.done = e.target.checked;
    persist(); renderAll();
  });
  el('taskList').addEventListener('click', (e) => {
    const id = e.target.closest('[data-deltask]')?.dataset.deltask;
    if (!id) return;
    state.tasks = state.tasks.filter((t) => t.id !== id);
    persist(); renderAll(); toast('已删除');
  });
  el('newsList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-newsadd]');
    if (!btn) return;
    const title = btn.dataset.newsadd;
    const due = ymd(addDays(new Date(), 3));
    state.tasks.push({ id: uid(), title: '关注：' + title, course: '校务通知', due, prio: 'normal', done: false, source: 'news' });
    persist(); renderAll(); toast('已加入 DDL（3 天后提醒）');
  });
  el('newsSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-news]');
    if (!btn) return;
    el('newsSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    renderNews();
  });

  // 学习通：粘贴解析
  el('cxParse').addEventListener('click', () => {
    const items = parseCxText(el('cxText').value);
    renderCxPreview(items, '粘贴文本解析');
  });
  el('cxExample').addEventListener('click', () => {
    el('cxText').value = `高等数学 第三章作业\n课程：高等数学\n截止时间：2026-12-01 23:59\n未提交\n\n数据结构 实验四\n课程：数据结构\n截止时间：2026-11-28 18:00\n已提交`;
  });
  el('cxPreview').addEventListener('change', (e) => {
    const idx = Number(e.target.dataset.cx);
    if (Number.isInteger(idx) && cxPreviewItems[idx]) cxPreviewItems[idx]._checked = e.target.checked;
  });
  el('cxPreview').addEventListener('click', (e) => {
    if (e.target.id === 'cxImport') importCx(cxPreviewItems.filter((it) => it._checked !== false));
  });

  // 学习通：Cookie 代取
  el('cxSaveCookie').addEventListener('click', async () => {
    if (!online) return toast('需要本地服务才能保存 Cookie');
    try {
      await api('/api/chaoxing/cookie', { method: 'POST', body: JSON.stringify({ cookie: el('cxCookie').value }) });
      el('cxCookie').value = '';
      await refreshCxStatus();
      toast('Cookie 已保存到本机');
    } catch (e) { toast(e.message); }
  });
  el('cxClearCookie').addEventListener('click', async () => {
    if (!online) return toast('需要本地服务');
    try { await api('/api/chaoxing/cookie', { method: 'DELETE' }); await refreshCxStatus(); toast('已清除'); } catch (e) { toast(e.message); }
  });
  el('cxSync').addEventListener('click', async () => {
    if (!online) return toast('抓取需要本地服务运行');
    const url = el('cxUrl').value.trim();
    if (!url) return toast('先填作业列表页地址');
    try {
      const r = await api('/api/chaoxing/sync', { method: 'POST', body: JSON.stringify({ url }) });
      renderCxPreview(r.data.items, '页面抓取预览 ·');
      toast(`抓取到 ${r.data.items.length} 条，确认后导入`);
    } catch (e) { toast('抓取失败：' + e.message); }
  });
}

async function refreshCxStatus() {
  if (!online) { el('cxStatus').textContent = '离线：只能用粘贴导入'; return; }
  try {
    const r = await api('/api/chaoxing/status');
    const d = r.data;
    el('cxStatus').textContent = d.hasCookie
      ? `已保存 Cookie（${d.masked}）${d.lastSync ? ' · 上次抓取 ' + new Date(d.lastSync.finished_at).toLocaleString('zh-CN', { hour12: false }) : ''}`
      : '还没连接学习通：可粘贴导入，或保存 Cookie 代取';
  } catch { el('cxStatus').textContent = '状态读取失败'; }
}

function bindMoney() {
  el('eAdd').addEventListener('click', () => {
    const amount = Number(el('eAmount').value);
    if (!(amount > 0)) return toast('金额要大于 0');
    state.expenses.push({
      id: uid(), amount, cat: el('eCat').value,
      note: el('eNote').value.trim(), date: el('eDate').value || ymd(new Date()),
    });
    el('eAmount').value = ''; el('eNote').value = '';
    persist(); renderAll(); toast('已记一笔');
  });
  el('eDate').value = ymd(new Date());
  el('budgetInput').addEventListener('change', (e) => {
    state.kv.budget = Math.max(0, Number(e.target.value) || 0);
    persist(); renderAll();
  });
  el('expList').addEventListener('click', (e) => {
    const id = e.target.closest('[data-delexp]')?.dataset.delexp;
    if (!id) return;
    state.expenses = state.expenses.filter((x) => x.id !== id);
    persist(); renderAll(); toast('已删除');
  });
}

/* ---- 专注计时 ---- */
let focusTotal = 25 * 60;
let focusLeft = focusTotal;
let focusRunning = false;
let focusTimer = null;

function renderFocus() {
  const m = Math.floor(focusLeft / 60), s = focusLeft % 60;
  el('focusTime').textContent = `${pad(m)}:${pad(s)}`;
  const ring = el('ringFg');
  const C = 2 * Math.PI * 82;
  ring.style.strokeDasharray = C;
  ring.style.strokeDashoffset = C * (1 - focusLeft / focusTotal);
  el('focusPhase').textContent = focusRunning ? '专注中…' : (focusLeft === focusTotal ? '准备开始' : '已暂停');
  const f = state.kv.focus || DEFAULT_KV.focus;
  const isToday = f.day === ymd(new Date());
  el('focusSessions').textContent = isToday ? f.sessions : 0;
  el('focusToday').textContent = (isToday ? f.dayMin : 0) + ' 分钟';
  el('focusTotal').textContent = ((f.total || 0) / 60).toFixed(1) + ' 小时';
}

function completeFocus() {
  clearInterval(focusTimer);
  focusTimer = null;
  focusRunning = false;
  const f = { ...(state.kv.focus || DEFAULT_KV.focus) };
  const today = ymd(new Date());
  if (f.day !== today) { f.day = today; f.dayMin = 0; f.sessions = 0; }
  f.dayMin += Math.round(focusTotal / 60);
  f.sessions += 1;
  f.total = (f.total || 0) + Math.round(focusTotal / 60);
  state.kv.focus = f;
  focusLeft = focusTotal;
  persist(); renderAll();
  toast('专注完成，记下 ' + Math.round(focusTotal / 60) + ' 分钟');
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); o.frequency.value = 660; o.connect(ctx.destination);
    o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 220);
  } catch { /* 无音频权限时静默 */ }
}

function bindFocus() {
  el('focusModes').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-min]');
    if (!btn || focusRunning) return;
    el('focusModes').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    focusTotal = Number(btn.dataset.min) * 60;
    focusLeft = focusTotal;
    renderFocus();
  });
  el('focusStart').addEventListener('click', () => {
    if (focusRunning) {
      clearInterval(focusTimer); focusTimer = null; focusRunning = false;
      el('focusStart').textContent = '继续';
      renderFocus();
      return;
    }
    focusRunning = true;
    el('focusStart').textContent = '暂停';
    renderFocus();
    focusTimer = setInterval(() => {
      focusLeft -= 1;
      if (focusLeft <= 0) { focusLeft = 0; renderFocus(); completeFocus(); el('focusStart').textContent = '开始'; return; }
      renderFocus();
    }, 1000);
  });
  el('focusReset').addEventListener('click', () => {
    clearInterval(focusTimer); focusTimer = null; focusRunning = false;
    focusLeft = focusTotal;
    el('focusStart').textContent = '开始';
    renderFocus();
  });
}

function bindGpa() {
  el('gAdd').addEventListener('click', () => {
    const name = el('gName').value.trim();
    const credit = Number(el('gCredit').value);
    const score = Number(el('gScore').value);
    if (!name || !(credit > 0) || !Number.isFinite(score)) return toast('课程、学分、成绩都要填');
    state.gpa.push({ id: uid(), name, credit, score });
    el('gName').value = ''; el('gCredit').value = ''; el('gScore').value = '';
    persist(); renderAll();
  });
  el('gpaRows').addEventListener('change', (e) => {
    const t = e.target;
    const id = t.dataset.gname || t.dataset.gcredit || t.dataset.gscore;
    if (!id) return;
    const row = state.gpa.find((g) => g.id === id);
    if (!row) return;
    if (t.dataset.gname) row.name = t.value.trim();
    if (t.dataset.gcredit) row.credit = Number(t.value) || 0;
    if (t.dataset.gscore) row.score = Number(t.value);
    persist(); renderGpa(); renderCover();
  });
  el('gpaRows').addEventListener('click', (e) => {
    const id = e.target.closest('[data-delgpa]')?.dataset.delgpa;
    if (!id) return;
    state.gpa = state.gpa.filter((g) => g.id !== id);
    persist(); renderAll();
  });
  el('gpaTarget').addEventListener('change', () => {
    state.kv.gpaGoal = { ...(state.kv.gpaGoal || DEFAULT_KV.gpaGoal), target: Number(el('gpaTarget').value) || 0 };
    persist(); renderGpa();
  });
  el('gpaGoalCredit').addEventListener('change', () => {
    state.kv.gpaGoal = { ...(state.kv.gpaGoal || DEFAULT_KV.gpaGoal), credits: Number(el('gpaGoalCredit').value) || 0 };
    persist(); renderGpa();
  });
}

function bindFun() {
  renderFoodPool();
  el('foodPick').addEventListener('click', () => pickFood());
  el('foodBox').addEventListener('click', () => pickFood());
  el('foodPool').addEventListener('click', (ev) => {
    const chip = ev.target.closest('.food-chip');
    if (chip) pickFood(chip.dataset.food);
  });
  el('foodAdd').addEventListener('click', () => {
    const v = prompt('加一个选项（最多 24 个）');
    if (!v || !v.trim()) return;
    state.kv.food = [...foodOptions(), v.trim()].slice(0, 24);
    persist(); renderFoodPool(); toast('已加入选项');
  });
  el('foodReset').addEventListener('click', () => {
    state.kv.food = DEFAULT_KV.food.slice();
    el('foodBox').textContent = '点一下开始抽';
    persist(); renderFoodPool(); toast('已恢复为周边 15 家');
  });
}

function bindData() {
  el('backupBtn').addEventListener('click', async () => {
    let blob;
    try {
      if (online) {
        const res = await fetch(BASE + '/api/backup');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        blob = await res.blob();
      } else throw new Error('offline');
    } catch {
      blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...snapshot() }, null, 2)], { type: 'application/json' });
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `校园小站备份-${ymd(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('备份已导出');
  });
  el('restoreBtn').addEventListener('click', () => el('restoreFile').click());
  el('restoreFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (online) await api('/api/restore', { method: 'POST', body: JSON.stringify(data) });
      else {
        state = {
          courses: data.courses || [], tasks: data.tasks || [], expenses: data.expenses || [],
          gpa: data.gpa || [], kv: normalizeKv(data.kv),
        };
        saveLocal();
      }
      if (online) await pullState();
      renderAll();
      toast('备份已导入');
    } catch (err) { toast('导入失败：' + err.message); }
    e.target.value = '';
  });
  el('clearBtn').addEventListener('click', async () => {
    if (!confirm('会清空课表、待办、账目、成绩，确定？')) return;
    if (!confirm('再确认一次：清空后只能用备份恢复。')) return;
    try {
      if (online) await api('/api/state', { method: 'DELETE' });
      state = { courses: [], tasks: [], expenses: [], gpa: [], kv: { ...DEFAULT_KV, presetDone: true } };
      saveLocal(); renderAll(); toast('已清空');
    } catch (e) { toast(e.message); }
  });
}

/* ==================== 启动 ==================== */
function bindCover() {
  const cover = el('cover');
  cover?.addEventListener('pointermove', (e) => {
    const r = cover.getBoundingClientRect();
    const spot = el('cvSpot');
    spot.style.left = ((e.clientX - r.left) / r.width) * 100 + '%';
    spot.style.top = ((e.clientY - r.top) / r.height) * 100 + '%';
  });
}

async function boot() {
  const local = loadLocal();
  if (local && Array.isArray(local.courses)) {
    state = {
      courses: local.courses || [], tasks: local.tasks || [], expenses: local.expenses || [],
      gpa: local.gpa || [], kv: normalizeKv(local.kv),
    };
  }

  try {
    const r = await api('/api/state');
    const d = r.data;
    online = true;
    const serverEmpty = !d.courses.length && !d.tasks.length && !d.expenses.length && !d.gpa.length;
    if (serverEmpty && local && (local.courses?.length || local.tasks?.length)) {
      await migrateLocal(local);
    } else {
      state = { courses: d.courses, tasks: d.tasks, expenses: d.expenses, gpa: d.gpa, kv: normalizeKv(d.kv) };
    }
  } catch {
    online = false;
    showBanner('本地服务没启动：双击 start.bat 后刷新，就能把数据存进数据库。现在是离线缓存模式，改动只存在浏览器里。');
  }

  if (!state.kv.presetDone && !state.courses.length) {
    state.courses = PRESET.map((r, i) => ({
      id: 'c' + (i + 1), day: r[0], start: r[1], len: r[2],
      name: r[3], teacher: r[4], room: r[5], weeks: maskToWeeks(r[6]),
    }));
    state.kv.presetDone = true;
    saveLocal();
    if (online) await api('/api/state', { method: 'PUT', body: JSON.stringify(snapshot()) }).catch(() => { });
    setTimeout(() => toast(`已载入你的课表 · 现在第 ${currentWeek()} 周`), 700);
  }

  renderAll();
  refreshCxStatus();
  loadNews();
  loadLibrary();
  tickClock();
  setInterval(tickClock, 1000);
  initDdlReminders();
  // 每分钟刷新「下一节 / 当前课」的高亮，不重建整块 DOM
  setInterval(() => { renderHome(); renderSchedule(); }, 60000);
}

bindTabs();
bindSchedule();
bindTasks();
bindMoney();
bindFocus();
bindGpa();
bindFun();
bindStudy();
bindData();
bindCover();
boot();
