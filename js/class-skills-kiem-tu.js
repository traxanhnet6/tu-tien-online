// class-skills-kiem-tu.js — Gói kỹ năng lớp Kiếm Tu, game Tu Tiên Online (v2).
// Node-safe, dạng data thuần (không require, không tham chiếu ảnh PNG).
// Id mới đều bắt đầu bằng "kiem_tu_", không trùng id trong js/skills.js
// (SECT_SKILLS, PASSIVE_DEFS) và js/skill-fx.js (SKILL_FX).
(function () {
  var pack = {
    classId: "kiem_tu",
    className: "Kiếm Tu",
    color: "#35c8ff",
    basic: {
      id: "kiem_tu_co_ban",
      name: "Kiếm Trảm Cơ Bản",
      desc: "Đòn chém thường bằng kiếm, gây sát thương bằng 1.0 lần công kích, tầm 150.",
      mult: 1.0,
      mp: 0,
      range: 150,
      fxType: "slash"
    },
    actives: [
      {
        id: "kiem_tu_thanh_quang_tram",
        name: "Thanh Quang Trảm",
        desc: "Chém ra một luồng kiếm quang xanh bay ngang, gây sát thương bằng 2.0 lần công kích lên một mục tiêu.",
        kind: "dmg",
        mult: 2.0, mp: 20, focus: 0, cd: 8, range: 300, fxType: "bolt",
        realm: 1, tier: 0, learnCost: 0,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0
      },
      {
        id: "kiem_tu_tam_kiem_tran",
        name: "Tam Kiếm Trận",
        desc: "Triệu hồi ba thanh kiếm xoay vòng quanh điểm chỉ định, gây sát thương bằng 2.0 lần công kích lên mọi kẻ địch trong vùng.",
        kind: "aoe",
        mult: 2.0, mp: 30, focus: 0, cd: 12, range: 300, fxType: "circle",
        realm: 1, tier: 1, learnCost: 500,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0
      },
      {
        id: "kiem_tu_kiem_y_cuong_chien",
        name: "Kiếm Ý Cuồng Chiến",
        desc: "Ngưng tụ kiếm ý quanh thân, tăng 40% công kích trong 15 giây.",
        kind: "buff",
        mult: 0, mp: 25, focus: 0, cd: 20, range: 200, fxType: "circle",
        realm: 2, tier: 1, learnCost: 600,
        dur: 15, defMult: 0, atkMult: 1.4, healPct: 0, stunDur: 0
      },
      {
        id: "kiem_tu_thien_kiem_giang_the",
        name: "Thiên Kiếm Giáng Thế",
        desc: "Chiêu tối thượng: gọi thiên kiếm giáng lôi xuống một vùng rộng, gây sát thương bằng 5.0 lần công kích lên mọi kẻ địch trong vùng.",
        kind: "aoe",
        mult: 5.0, mp: 50, focus: 0, cd: 35, range: 400, fxType: "lightning",
        realm: 3, tier: 2, learnCost: 1500,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0
      }
    ],
    passives: [
      {
        id: "kiem_tu_kiem_y_thong_huyen",
        name: "Kiếm Ý Thông Huyền",
        desc: "Lĩnh ngộ kiếm ý sâu hơn, tăng vĩnh viễn 10% công kích.",
        effect: { atkPct: 10 }, sp: 2, realm: 1
      },
      {
        id: "kiem_tu_kiem_cot",
        name: "Kiếm Cốt",
        desc: "Rèn luyện gân cốt như kiếm, tăng vĩnh viễn 10% phòng ngự.",
        effect: { defPct: 10 }, sp: 2, realm: 2
      }
    ],
    manuals: [
      { id: "manual_kiemtu_1", skill: "kiem_tu_thanh_quang_tram", tier: 0, learnCost: 0, realm: 1, price: 300, sell: 50 },
      { id: "manual_kiemtu_2", skill: "kiem_tu_tam_kiem_tran", tier: 1, learnCost: 500, realm: 1, price: 1200, sell: 300 },
      { id: "manual_kiemtu_3", skill: "kiem_tu_kiem_y_cuong_chien", tier: 1, learnCost: 600, realm: 2, price: 1200, sell: 300 },
      { id: "manual_kiemtu_4", skill: "kiem_tu_thien_kiem_giang_the", tier: 2, learnCost: 1500, realm: 3, price: 3000, sell: 1500 },
      { id: "manual_kiemtu_5", skill: "kiem_tu_kiem_y_thong_huyen", tier: 0, learnCost: 0, realm: 1, price: 300, sell: 50 },
      { id: "manual_kiemtu_6", skill: "kiem_tu_kiem_cot", tier: 1, learnCost: 500, realm: 2, price: 1200, sell: 300 }
    ],
    lang: {
      vi: {
        "sk_kiem_tu_co_ban": "Kiếm Trảm Cơ Bản",
        "sk_kiem_tu_co_ban_desc": "Đòn chém thường bằng kiếm, gây sát thương bằng 1.0 lần công kích, tầm 150.",
        "sk_kiem_tu_thanh_quang_tram": "Thanh Quang Trảm",
        "sk_kiem_tu_thanh_quang_tram_desc": "Chém ra một luồng kiếm quang xanh bay ngang, gây sát thương bằng 2.0 lần công kích lên một mục tiêu.",
        "sk_kiem_tu_tam_kiem_tran": "Tam Kiếm Trận",
        "sk_kiem_tu_tam_kiem_tran_desc": "Triệu hồi ba thanh kiếm xoay vòng quanh điểm chỉ định, gây sát thương bằng 2.0 lần công kích lên mọi kẻ địch trong vùng.",
        "sk_kiem_tu_kiem_y_cuong_chien": "Kiếm Ý Cuồng Chiến",
        "sk_kiem_tu_kiem_y_cuong_chien_desc": "Ngưng tụ kiếm ý quanh thân, tăng 40% công kích trong 15 giây.",
        "sk_kiem_tu_thien_kiem_giang_the": "Thiên Kiếm Giáng Thế",
        "sk_kiem_tu_thien_kiem_giang_the_desc": "Chiêu tối thượng: gọi thiên kiếm giáng lôi xuống một vùng rộng, gây sát thương bằng 5.0 lần công kích lên mọi kẻ địch trong vùng.",
        "ps_kiem_tu_kiem_y_thong_huyen": "Kiếm Ý Thông Huyền",
        "ps_kiem_tu_kiem_y_thong_huyen_desc": "Lĩnh ngộ kiếm ý sâu hơn, tăng vĩnh viễn 10% công kích.",
        "ps_kiem_tu_kiem_cot": "Kiếm Cốt",
        "ps_kiem_tu_kiem_cot_desc": "Rèn luyện gân cốt như kiếm, tăng vĩnh viễn 10% phòng ngự.",
        "it_manual_kiemtu_1": "Bí Tịch Thanh Quang Trảm",
        "it_manual_kiemtu_1_desc": "Bí tịch dạy chiêu Thanh Quang Trảm, sát thương 2.0 lần công kích lên một mục tiêu.",
        "it_manual_kiemtu_2": "Bí Tịch Tam Kiếm Trận",
        "it_manual_kiemtu_2_desc": "Bí tịch dạy chiêu Tam Kiếm Trận, sát thương 2.0 lần công kích lên mọi kẻ địch trong vùng.",
        "it_manual_kiemtu_3": "Bí Tịch Kiếm Ý Cuồng Chiến",
        "it_manual_kiemtu_3_desc": "Bí tịch dạy chiêu Kiếm Ý Cuồng Chiến, tăng 40% công kích trong 15 giây.",
        "it_manual_kiemtu_4": "Bí Tịch Thiên Kiếm Giáng Thế",
        "it_manual_kiemtu_4_desc": "Bí tịch dạy chiêu tối thượng Thiên Kiếm Giáng Thế, sát thương 5.0 lần công kích lên mọi kẻ địch trong vùng.",
        "it_manual_kiemtu_5": "Bí Tịch Kiếm Ý Thông Huyền",
        "it_manual_kiemtu_5_desc": "Bí tịch dạy bị động Kiếm Ý Thông Huyền, tăng vĩnh viễn 10% công kích.",
        "it_manual_kiemtu_6": "Bí Tịch Kiếm Cốt",
        "it_manual_kiemtu_6_desc": "Bí tịch dạy bị động Kiếm Cốt, tăng vĩnh viễn 10% phòng ngự."
      },
      en: {
        "sk_kiem_tu_co_ban": "Basic Sword Slash",
        "sk_kiem_tu_co_ban_desc": "A basic sword slash dealing damage equal to 1.0 times attack, range 150.",
        "sk_kiem_tu_thanh_quang_tram": "Azure Light Slash",
        "sk_kiem_tu_thanh_quang_tram_desc": "Fires a horizontal beam of azure sword light, dealing damage equal to 2.0 times attack to a single target.",
        "sk_kiem_tu_tam_kiem_tran": "Three Sword Formation",
        "sk_kiem_tu_tam_kiem_tran_desc": "Summons three swords spinning around a point, dealing damage equal to 2.0 times attack to all enemies in the area.",
        "sk_kiem_tu_kiem_y_cuong_chien": "Frenzied Sword Intent",
        "sk_kiem_tu_kiem_y_cuong_chien_desc": "Condenses sword intent around the body, increasing attack by 40% for 15 seconds.",
        "sk_kiem_tu_thien_kiem_giang_the": "Heavenly Sword Descent",
        "sk_kiem_tu_thien_kiem_giang_the_desc": "Ultimate skill: calls heavenly swords wreathed in lightning down over a wide area, dealing damage equal to 5.0 times attack to all enemies in the area.",
        "ps_kiem_tu_kiem_y_thong_huyen": "Profound Sword Intent",
        "ps_kiem_tu_kiem_y_thong_huyen_desc": "Deeper comprehension of sword intent, permanently increasing attack by 10%.",
        "ps_kiem_tu_kiem_cot": "Sword Bone",
        "ps_kiem_tu_kiem_cot_desc": "Tempered body like a sword, permanently increasing defense by 10%.",
        "it_manual_kiemtu_1": "Azure Light Slash Manual",
        "it_manual_kiemtu_1_desc": "Manual teaching Azure Light Slash, dealing 2.0 times attack damage to a single target.",
        "it_manual_kiemtu_2": "Three Sword Formation Manual",
        "it_manual_kiemtu_2_desc": "Manual teaching Three Sword Formation, dealing 2.0 times attack damage to all enemies in the area.",
        "it_manual_kiemtu_3": "Frenzied Sword Intent Manual",
        "it_manual_kiemtu_3_desc": "Manual teaching Frenzied Sword Intent, increasing attack by 40% for 15 seconds.",
        "it_manual_kiemtu_4": "Heavenly Sword Descent Manual",
        "it_manual_kiemtu_4_desc": "Manual teaching the ultimate Heavenly Sword Descent, dealing 5.0 times attack damage to all enemies in the area.",
        "it_manual_kiemtu_5": "Profound Sword Intent Manual",
        "it_manual_kiemtu_5_desc": "Manual teaching the passive Profound Sword Intent, permanently increasing attack by 10%.",
        "it_manual_kiemtu_6": "Sword Bone Manual",
        "it_manual_kiemtu_6_desc": "Manual teaching the passive Sword Bone, permanently increasing defense by 10%."
      }
    },
    skillbarOrder: [
      "kiem_tu_thanh_quang_tram",
      "kiem_tu_tam_kiem_tran",
      "kiem_tu_kiem_y_cuong_chien",
      "kiem_tu_thien_kiem_giang_the"
    ]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = pack;
  var g = (typeof globalThis !== "undefined") ? globalThis : this;
  g.CLASS_SKILL_PACKS = g.CLASS_SKILL_PACKS || {};
  g.CLASS_SKILL_PACKS[pack.classId] = pack;
})();
