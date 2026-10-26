/* ============================================================
 * js/class-skills.js — Gộp bộ skill 5 lớp (build 114) vào hệ skill cũ.
 * Nạp sau js/skills.js, js/lang.js, js/data.js; trước js/engine.js dùng lúc chạy.
 * Nguồn duy nhất: js/class-skills-<lop>.js (mỗi lớp 1 file data).
 * - SECT_SKILLS: thêm đòn đánh thường (kind 'basic') + skill chủ động từng lớp.
 * - PASSIVE_DEFS: thêm bị động (kèm effect + sp + realm).
 * - Manuals: thêm vào ITEMS (nếu có) và _MANUAL_FB (fallback node).
 * - LANG.vi/en: thêm key sk_/ps_/it_manual_.
 * - CLASS_SKILLS / CLASS_BASICS: tra cứu theo lớp cho engine.js và ui.js.
 * - Shop thương nhân: thêm bí tịch lớp vào stock (học qua bí tịch như hệ cũ;
 *   bí tịch vượt cảnh giới nằm túi chờ đủ cảnh giới mới học được).
 * Hành vi combat (đứng yên khi tung chiêu, auto áp sát rồi xả chiêu,
 * đổi hướng lật sprite tức thì) nằm sẵn trong engine.js, không sửa ở đây.
 * Node-safe: dùng được qua require (test-smoke) lẫn script thường (browser).
 * ============================================================ */
(function () {
  var packs = null;
  try { packs = (typeof globalThis !== 'undefined' && globalThis.CLASS_SKILL_PACKS) || null; } catch (e) {}
  if (!packs) return;

  var SK = null, LG = null, IT = null, NPC = null, SHOP = null;
  if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
    try { SK = require('./skills.js'); } catch (e) {}
    try { LG = require('./lang.js').LANG; } catch (e) {}
    try { var _d = require('./data.js'); IT = _d.ITEMS; NPC = _d.NPCS; SHOP = _d.SHOP_STOCK; } catch (e) {}
  }
  function _glob(name) {
    try {
      var g = (typeof globalThis !== 'undefined') ? globalThis : null;
      if (g && g[name] !== undefined) return g[name];
    } catch (e) {}
    /* Classic script dùng const (data.js: ITEMS/NPCS) không nằm trên window
     * mà nằm ở global lexical scope — chỉ indirect eval mới thấy. */
    try {
      var ev = (0, eval);
      var v = ev(name);
      if (v !== undefined) return v;
    } catch (e) {}
    return undefined;
  }
  var SECT = (SK && SK.SECT_SKILLS) || _glob('SECT_SKILLS');
  var PAS = (SK && SK.PASSIVE_DEFS) || _glob('PASSIVE_DEFS');
  var MANFB = (SK && SK._MANUAL_FB) || _glob('_MANUAL_FB');
  var LANG = LG || _glob('LANG');
  var ITEMS = IT || _glob('ITEMS');
  var NPCS = NPC || _glob('NPCS');

  var CLASS_SKILLS = {};
  var CLASS_BASICS = {};
  var DTYPE = { kiem_tu: 'kiem', phap_tu: 'phap', dao_tu: 'dao',
                cung_tu: 'cung', thuat_si: 'thuat' };

  Object.keys(packs).forEach(function (classId) {
    var p = packs[classId];
    if (!p) return;
    CLASS_SKILLS[classId] = p;
    if (p.basic) CLASS_BASICS[classId] = p.basic;
    var passiveIds = {};
    (p.passives || []).forEach(function (ps) { passiveIds[ps.id] = true; });

    /* Đòn đánh thường: kind 'basic', không tốn MP, hồi theo nhịp đánh (0.8s). */
    if (p.basic) {
      var b = p.basic;
      if (SECT) SECT[b.id] = {
        sect: classId, classId: classId, kind: 'basic', mult: b.mult || 1,
        mp: 0, focus: 0, cd: 0.8, range: b.range || 150, fx: p.color || '#fff',
        fxType: b.fxType || 'slash', icon: '', dtype: DTYPE[classId] || 'other',
        nameKey: 'sk_' + b.id, descKey: 'sk_' + b.id + '_desc'
      };
    }
    /* Skill chủ động: đăng ký như SECT_SKILLS để canCast/castSkill/skillPower/
     * skillbar/auto dùng chung, không sửa logic cũ. */
    (p.actives || []).forEach(function (a) {
      if (SECT) SECT[a.id] = {
        sect: classId, classId: classId, kind: a.kind, mult: a.mult || 0,
        mp: a.mp || 0, focus: a.focus || 0, cd: a.cd || 0, range: a.range || 0,
        fx: p.color || '#fff', fxType: a.fxType || 'slash', icon: '',
        dtype: DTYPE[classId] || 'other',
        nameKey: 'sk_' + a.id, descKey: 'sk_' + a.id + '_desc',
        dur: a.dur || 0, defMult: a.defMult || 0, atkMult: a.atkMult || 0,
        healPct: a.healPct || 0, stunDur: a.stunDur || 0
      };
    });
    /* Bị động: effect chỉ dùng atkPct/defPct/maxHpPct/maxMpPct (xem applyPassives). */
    (p.passives || []).forEach(function (ps) {
      if (PAS) PAS[ps.id] = {
        nameKey: 'ps_' + ps.id, descKey: 'ps_' + ps.id + '_desc', icon: '',
        perLevel: (function () {
          var e = ps.effect || {};
          var k = Object.keys(e)[0];
          return k ? (e[k] + '% ' + k) : '';
        })(),
        effect: ps.effect || {}, sp: ps.sp || 1, realm: ps.realm || 1
      };
    });
    /* Bí tịch: manual của bị động có thể dùng field 'skill' trỏ tới id bị động
     * (do schema) — nhận diện theo danh sách bị động của lớp. */
    (p.manuals || []).forEach(function (m) {
      var target = m.skill || m.passive || null;
      if (!target) return;
      var isPassive = !!m.passive || !!passiveIds[target];
      var entry = {
        kind: 'manual', tier: m.tier || 0, learnCost: m.learnCost || 0,
        realm: m.realm || 1, nameKey: 'it_' + m.id, descKey: 'it_' + m.id + '_desc',
        price: m.price || 0, sell: m.sell || 0
      };
      if (isPassive) entry.passive = target; else entry.skill = target;
      if (ITEMS) ITEMS[m.id] = entry;
      if (MANFB) MANFB[m.id] = {
        skill: isPassive ? undefined : target, passive: isPassive ? target : undefined,
        tier: entry.tier, learnCost: entry.learnCost, realm: entry.realm
      };
      /* Đưa bí tịch vào shop thương nhân để mua được trong game. */
      try {
        if (NPCS && NPCS.thuong_nhan && NPCS.thuong_nhan.stock &&
            NPCS.thuong_nhan.stock.indexOf(m.id) < 0) NPCS.thuong_nhan.stock.push(m.id);
      } catch (e) {}
    });
    /* Lang: key sk_/ps_/it_manual_ cho cả vi và en. */
    if (LANG) {
      ['vi', 'en'].forEach(function (lc) {
        if (!LANG[lc] || !p.lang || !p.lang[lc]) return;
        Object.keys(p.lang[lc]).forEach(function (k) { LANG[lc][k] = p.lang[lc][k]; });
      });
    }
  });

  var out = { CLASS_SKILLS: CLASS_SKILLS, CLASS_BASICS: CLASS_BASICS };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  try {
    var gg = (typeof globalThis !== 'undefined') ? globalThis : null;
    if (gg) { gg.CLASS_SKILLS = CLASS_SKILLS; gg.CLASS_BASICS = CLASS_BASICS; }
  } catch (e) {}
})();
