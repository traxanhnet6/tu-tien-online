/* ============================================================
 * js/spiritbeast.js — Thần Thú Đồng Hành 3D (thuần logic, chạy được trên node)
 * - Sau khi trắc linh căn (9 hệ hiếm có ảnh thần thú), thần thú tương ứng
 *   xuất hiện bay lượn quanh nhân vật trên màn hình (dạng 3D: scale theo
 *   độ cao, bóng đổ, y-sort), tự động dùng skill tấn công quái.
 * - state.spiritBeast = {element, level, exp, enabled} | null
 *   (dùng key riêng, KHÔNG đụng state.pet của hệ thống trứng ấp)
 * - Skill mỗi hệ: Hỏa phun lửa (+burn), Băng băng tiễn (+slow),
 *   Lôi sét đánh (+stun), Phong lốc xoáy (AoE), Quang thánh quang
 *   (+heal), Ám ám ảnh (+fear), Độc độc vụ (+poison),
 *   Huyết huyết bạo (+lifesteal), Hỗn Độn hỗn độn bạo (dmg cao).
 * - Cooldown 3 giây mỗi skill. Tầm tấn công 300px.
 * ============================================================ */

var SB_ELEMENTS = {
  hoa:    { vi: "Cửu Thiên Phượng Hoàng", en: "Nine-Heaven Fire Phoenix",
            skillVi: "Phun Lửa", skillEn: "Flame Breath", color: "#ef5350",
            dmgMult: 1.6, debuff: "burn" },
  bang:   { vi: "Huyền Băng Phượng", en: "Mystic Ice Phoenix",
            skillVi: "Băng Tiễn", skillEn: "Ice Arrows", color: "#9be8ff",
            dmgMult: 1.4, debuff: "slow" },
  loi:    { vi: "Tử Tiêu Lôi Long", en: "Purple Heaven Thunder Dragon",
            skillVi: "Sét Đánh", skillEn: "Thunder Strike", color: "#b388ff",
            dmgMult: 1.7, debuff: "stun" },
  phong:  { vi: "Thanh Minh Phong Long", en: "Azure Wind Dragon",
            skillVi: "Lốc Xoáy", skillEn: "Tornado", color: "#b2ff59",
            dmgMult: 1.3, aoe: true },
  quang:  { vi: "Quang Minh Thánh Phượng", en: "Holy Light Phoenix",
            skillVi: "Thánh Quang", skillEn: "Holy Light", color: "#fff9c4",
            dmgMult: 1.2, heal: 0.5 },
  am:     { vi: "U Minh Ám Long", en: "Nether Dark Dragon",
            skillVi: "Ám Ảnh", skillEn: "Dark Terror", color: "#7b1fa2",
            dmgMult: 1.5, debuff: "fear" },
  doc:    { vi: "Vạn Độc Linh Xà", en: "Myriad Venom Serpent",
            skillVi: "Độc Vụ", skillEn: "Venom Mist", color: "#76ff03",
            dmgMult: 1.3, debuff: "poison" },
  huyet:  { vi: "Huyết Ngục Ma Long", en: "Blood Prison Demon Dragon",
            skillVi: "Huyết Bạo", skillEn: "Blood Burst", color: "#ff5252",
            dmgMult: 1.8, lifesteal: 0.3 },
  hondon: { vi: "Hỗn Độn Thần Long", en: "Chaos Divine Dragon",
            skillVi: "Hỗn Độn Bạo", skillEn: "Chaos Blast", color: "#8e8e93",
            dmgMult: 2.5 },
};
var SB_ELEMENT_IDS = Object.keys(SB_ELEMENTS);
var SB_MAX_LEVEL = 30;
var SB_SKILL_CD = 3;      /* giây */
var SB_RANGE = 300;       /* px */
var SB_ORBIT_R = 80;      /* bán kính quỹ đạo */

function _sbSave() { if (typeof saveGame === "function") { try { saveGame(); } catch (e) {} } }

function sbDef(element) { return SB_ELEMENTS[element] || null; }
function sbName(element, lang) {
  var d = sbDef(element);
  if (!d) return "";
  return (lang === "en" ? d.en : d.vi) || d.vi;
}
function sbSkillName(element, lang) {
  var d = sbDef(element);
  if (!d) return "";
  return (lang === "en" ? d.skillEn : d.skillVi) || d.skillVi;
}
/* Có thần thú đồng hành và đang bật? */
function sbActive(state) {
  return !!(state && state.spiritBeast && state.spiritBeast.enabled !== false &&
            SB_ELEMENTS[state.spiritBeast.element]);
}
/* Trắc linh căn xong → nhận thần thú (chỉ 9 hệ hiếm có ảnh) */
function sbAcquire(state, element) {
  if (!state || !SB_ELEMENTS[element]) return { ok: false, reason: "no_beast" };
  state.spiritBeast = { element: element, level: 1, exp: 0, enabled: true,
                        acquiredAt: Date.now() };
  _sbSave();
  return { ok: true, beast: state.spiritBeast };
}
/* Bật/tắt thần thú đồng hành */
function sbToggle(state) {
  if (!state || !state.spiritBeast) return { ok: false, reason: "no_beast" };
  state.spiritBeast.enabled = !state.spiritBeast.enabled;
  _sbSave();
  return { ok: true, enabled: state.spiritBeast.enabled };
}
/* Sát thương skill = atk người chơi × hệ số hệ × hệ số cấp */
function sbDmg(playerAtk, sb) {
  var d = sbDef(sb.element);
  if (!d) return 5;
  var lv = sb.level || 1;
  return Math.max(5, Math.round((playerAtk || 10) * d.dmgMult * (1 + (lv - 1) * 0.08)));
}
/* EXP: mỗi đòn trúng +1; đủ level*30 → lên cấp (+8% dmg/cấp) */
function sbExpNeed(sb) { return ((sb.level || 1) * 30); }
function sbAddExp(state, n) {
  var sb = state && state.spiritBeast;
  if (!sb) return { ok: false };
  sb.exp = (sb.exp || 0) + (n || 1);
  var ups = 0, need = sbExpNeed(sb);
  while (sb.exp >= need && (sb.level || 1) < SB_MAX_LEVEL) {
    sb.exp -= need;
    sb.level++;
    ups++;
    need = sbExpNeed(sb);
  }
  if (ups > 0) _sbSave();
  return { ok: true, level: sb.level, ups: ups };
}
/* Ảnh frame vỗ cánh: beast_<element>_up|mid|down.png */
function sbFrameImg(element, frame) {
  return "assets/linhcan/beast_" + element + "_" + (frame || "mid") + ".png";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SB_ELEMENTS: SB_ELEMENTS, SB_ELEMENT_IDS: SB_ELEMENT_IDS,
    SB_MAX_LEVEL: SB_MAX_LEVEL, SB_SKILL_CD: SB_SKILL_CD,
    SB_RANGE: SB_RANGE, SB_ORBIT_R: SB_ORBIT_R,
    sbDef: sbDef, sbName: sbName, sbSkillName: sbSkillName,
    sbActive: sbActive, sbAcquire: sbAcquire, sbToggle: sbToggle,
    sbDmg: sbDmg, sbExpNeed: sbExpNeed, sbAddExp: sbAddExp,
    sbFrameImg: sbFrameImg,
  };
}

/* Browser global (song song với module.exports cho node) */
(function () {
  if (typeof module !== "undefined" && module.exports) return;
  var _g = (typeof globalThis !== "undefined") ? globalThis :
    ((typeof window !== "undefined") ? window : null);
  if (!_g) return;
  _g.SpiritBeast = {
    SB_ELEMENTS: SB_ELEMENTS, SB_ELEMENT_IDS: SB_ELEMENT_IDS,
    SB_MAX_LEVEL: SB_MAX_LEVEL, SB_SKILL_CD: SB_SKILL_CD,
    SB_RANGE: SB_RANGE, SB_ORBIT_R: SB_ORBIT_R,
    sbDef: sbDef, sbName: sbName, sbSkillName: sbSkillName,
    sbActive: sbActive, sbAcquire: sbAcquire, sbToggle: sbToggle,
    sbDmg: sbDmg, sbExpNeed: sbExpNeed, sbAddExp: sbAddExp,
    sbFrameImg: sbFrameImg,
  };
})();
