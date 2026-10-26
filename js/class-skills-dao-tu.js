(function () {
  var pack = {
    classId: "dao_tu", className: "Đao Tu", color: "#ff4a2a",
    basic: { id: "dao_tu_co_ban", name: "Trọng Đao Thường", desc: "Một nhát đao nặng, chậm mà mạnh, gây 115% sát thương tấn công trong tầm 150.", mult: 1.15, mp: 0, range: 150, fxType: "slash" },
    actives: [
      { id: "dao_tu_liet_diem_tram", name: "Liệt Diệm Trảm", desc: "Chém một nhát đao lửa vào một mục tiêu, gây 200% sát thương tấn công.", kind: "dmg",
        mult: 2.0, mp: 20, focus: 0, cd: 8, range: 200, fxType: "slash",
        realm: 1, tier: 0, learnCost: 0,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0 },
      { id: "dao_tu_hoa_hai_dao_khi", name: "Hỏa Hải Đao Khí", desc: "Phóng đao khí lửa lan rộng, gây 250% sát thương tấn công cho mọi địch trong vùng.", kind: "aoe",
        mult: 2.5, mp: 25, focus: 0, cd: 12, range: 300, fxType: "fire",
        realm: 2, tier: 1, learnCost: 600,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0 },
      { id: "dao_tu_thiet_huyet_chien_y", name: "Thiết Huyết Chiến Ý", desc: "Bùng cháy chiến ý, tăng 30% tấn công trong 15 giây.", kind: "buff",
        mult: 0, mp: 25, focus: 0, cd: 20, range: 150, fxType: "circle",
        realm: 2, tier: 1, learnCost: 500,
        dur: 15, defMult: 0, atkMult: 1.3, healPct: 0, stunDur: 0 },
      { id: "dao_tu_diem_ma_diet_the", name: "Diệm Ma Diệt Thế", desc: "Chiêu tối thượng: giáng một đao lửa hủy diệt vào một mục tiêu, gây 500% sát thương tấn công.", kind: "dmg",
        mult: 5.0, mp: 50, focus: 0, cd: 30, range: 300, fxType: "fire",
        realm: 3, tier: 2, learnCost: 1500,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0 }
    ],
    passives: [
      { id: "dao_tu_huyet_chien", name: "Huyết Chiến", desc: "Tăng 10% tấn công vĩnh viễn.",
        effect: { atkPct: 10 }, sp: 2, realm: 1 },
      { id: "dao_tu_thiet_co", name: "Thiết Cốt", desc: "Tăng 10% sinh lực tối đa vĩnh viễn.",
        effect: { maxHpPct: 10 }, sp: 3, realm: 2 }
    ],
    manuals: [
      { id: "manual_daotu_1", skill: "dao_tu_liet_diem_tram", tier: 0, learnCost: 0, realm: 1, price: 300, sell: 50 },
      { id: "manual_daotu_2", skill: "dao_tu_hoa_hai_dao_khi", tier: 1, learnCost: 600, realm: 2, price: 1200, sell: 200 },
      { id: "manual_daotu_3", skill: "dao_tu_thiet_huyet_chien_y", tier: 1, learnCost: 500, realm: 2, price: 1200, sell: 200 },
      { id: "manual_daotu_4", skill: "dao_tu_diem_ma_diet_the", tier: 2, learnCost: 1500, realm: 3, price: 3000, sell: 500 },
      { id: "manual_daotu_5", skill: "dao_tu_huyet_chien", tier: 0, learnCost: 0, realm: 1, price: 300, sell: 50 },
      { id: "manual_daotu_6", skill: "dao_tu_thiet_co", tier: 1, learnCost: 500, realm: 2, price: 1200, sell: 200 }
    ],
    lang: {
      vi: {
        "sk_dao_tu_liet_diem_tram": "Liệt Diệm Trảm",
        "sk_dao_tu_liet_diem_tram_desc": "Chém một nhát đao lửa vào một mục tiêu, gây 200% sát thương tấn công.",
        "sk_dao_tu_hoa_hai_dao_khi": "Hỏa Hải Đao Khí",
        "sk_dao_tu_hoa_hai_dao_khi_desc": "Phóng đao khí lửa lan rộng, gây 250% sát thương tấn công cho mọi địch trong vùng.",
        "sk_dao_tu_thiet_huyet_chien_y": "Thiết Huyết Chiến Ý",
        "sk_dao_tu_thiet_huyet_chien_y_desc": "Bùng cháy chiến ý, tăng 30% tấn công trong 15 giây.",
        "sk_dao_tu_diem_ma_diet_the": "Diệm Ma Diệt Thế",
        "sk_dao_tu_diem_ma_diet_the_desc": "Chiêu tối thượng: giáng một đao lửa hủy diệt vào một mục tiêu, gây 500% sát thương tấn công.",
        "ps_dao_tu_huyet_chien": "Huyết Chiến",
        "ps_dao_tu_huyet_chien_desc": "Tăng 10% tấn công vĩnh viễn.",
        "ps_dao_tu_thiet_co": "Thiết Cốt",
        "ps_dao_tu_thiet_co_desc": "Tăng 10% sinh lực tối đa vĩnh viễn.",
        "it_manual_daotu_1": "Bí Tịch: Liệt Diệm Trảm",
        "it_manual_daotu_1_desc": "Bí tịch dạy chiêu Liệt Diệm Trảm, gây 200% sát thương tấn công cho một mục tiêu.",
        "it_manual_daotu_2": "Bí Tịch: Hỏa Hải Đao Khí",
        "it_manual_daotu_2_desc": "Bí tịch dạy chiêu Hỏa Hải Đao Khí, gây 250% sát thương tấn công cho mọi địch trong vùng.",
        "it_manual_daotu_3": "Bí Tịch: Thiết Huyết Chiến Ý",
        "it_manual_daotu_3_desc": "Bí tịch dạy chiêu Thiết Huyết Chiến Ý, tăng 30% tấn công trong 15 giây.",
        "it_manual_daotu_4": "Bí Tịch: Diệm Ma Diệt Thế",
        "it_manual_daotu_4_desc": "Bí tịch dạy chiêu tối thượng Diệm Ma Diệt Thế, gây 500% sát thương tấn công cho một mục tiêu.",
        "it_manual_daotu_5": "Bí Tịch: Huyết Chiến",
        "it_manual_daotu_5_desc": "Bí tịch dạy bị động Huyết Chiến, tăng 10% tấn công vĩnh viễn.",
        "it_manual_daotu_6": "Bí Tịch: Thiết Cốt",
        "it_manual_daotu_6_desc": "Bí tịch dạy bị động Thiết Cốt, tăng 10% sinh lực tối đa vĩnh viễn."
      },
      en: {
        "sk_dao_tu_liet_diem_tram": "Blazing Flame Slash",
        "sk_dao_tu_liet_diem_tram_desc": "Slash one target with a flaming blade, dealing 200% attack damage.",
        "sk_dao_tu_hoa_hai_dao_khi": "Sea of Fire Blade Aura",
        "sk_dao_tu_hoa_hai_dao_khi_desc": "Unleash spreading fire blade aura, dealing 250% attack damage to all enemies in the area.",
        "sk_dao_tu_thiet_huyet_chien_y": "Iron Blood Battle Will",
        "sk_dao_tu_thiet_huyet_chien_y_desc": "Ignite battle will, increasing attack by 30% for 15 seconds.",
        "sk_dao_tu_diem_ma_diet_the": "Flame Demon World Ender",
        "sk_dao_tu_diem_ma_diet_the_desc": "Ultimate move: bring down a devastating fire blade on one target, dealing 500% attack damage.",
        "ps_dao_tu_huyet_chien": "Blood Battle",
        "ps_dao_tu_huyet_chien_desc": "Permanently increase attack by 10%.",
        "ps_dao_tu_thiet_co": "Iron Bones",
        "ps_dao_tu_thiet_co_desc": "Permanently increase maximum HP by 10%.",
        "it_manual_daotu_1": "Manual: Blazing Flame Slash",
        "it_manual_daotu_1_desc": "Manual teaching Blazing Flame Slash, dealing 200% attack damage to one target.",
        "it_manual_daotu_2": "Manual: Sea of Fire Blade Aura",
        "it_manual_daotu_2_desc": "Manual teaching Sea of Fire Blade Aura, dealing 250% attack damage to all enemies in the area.",
        "it_manual_daotu_3": "Manual: Iron Blood Battle Will",
        "it_manual_daotu_3_desc": "Manual teaching Iron Blood Battle Will, increasing attack by 30% for 15 seconds.",
        "it_manual_daotu_4": "Manual: Flame Demon World Ender",
        "it_manual_daotu_4_desc": "Manual teaching the ultimate Flame Demon World Ender, dealing 500% attack damage to one target.",
        "it_manual_daotu_5": "Manual: Blood Battle",
        "it_manual_daotu_5_desc": "Manual teaching the passive Blood Battle, permanently increasing attack by 10%.",
        "it_manual_daotu_6": "Manual: Iron Bones",
        "it_manual_daotu_6_desc": "Manual teaching the passive Iron Bones, permanently increasing maximum HP by 10%."
      }
    },
    skillbarOrder: ["dao_tu_liet_diem_tram", "dao_tu_hoa_hai_dao_khi", "dao_tu_thiet_huyet_chien_y", "dao_tu_diem_ma_diet_the"]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = pack;
  var g = (typeof globalThis !== "undefined") ? globalThis : this;
  g.CLASS_SKILL_PACKS = g.CLASS_SKILL_PACKS || {};
  g.CLASS_SKILL_PACKS[pack.classId] = pack;
})();
