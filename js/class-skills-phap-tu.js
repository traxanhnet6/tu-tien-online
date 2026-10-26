(function () {
  var pack = {
    classId: "phap_tu", className: "Pháp Tu", color: "#b45cff",
    basic: { id: "phap_tu_co_ban", name: "Linh Quang Chỉ", desc: "Đòn đánh thường pháp thuật tầm xa: bắn một tia linh quang tím gây sát thương bằng 1.0 lần công kích, không tốn linh lực, tầm 300.", mult: 1.0, mp: 0, range: 300, fxType: "bolt" },
    actives: [
      { id: "phap_tu_tu_quang_tien", name: "Tử Quang Tiễn", desc: "Bắn một mũi tên linh quang tím xuyên thẳng vào một mục tiêu, gây sát thương bằng 2.0 lần công kích.", kind: "dmg",
        mult: 2.0, mp: 20, focus: 0, cd: 8, range: 400, fxType: "bolt",
        realm: 1, tier: 0, learnCost: 0,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0 },
      { id: "phap_tu_tu_dien_tran", name: "Tử Điện Trận", desc: "Dựng một trận điện tím tại vị trí chỉ định, gây sát thương bằng 2.0 lần công kích cho mọi địch trong vùng ảnh hưởng.", kind: "aoe",
        mult: 2.0, mp: 25, focus: 0, cd: 12, range: 300, fxType: "circle",
        realm: 1, tier: 1, learnCost: 500,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0 },
      { id: "phap_tu_thanh_linh_gia_tri", name: "Thanh Linh Gia Trì", desc: "Gia trì linh lực lên bản thân trong 15 giây, tăng 30% công kích trong thời gian hiệu lực.", kind: "buff",
        mult: 0, mp: 25, focus: 0, cd: 20, range: 200, fxType: "circle",
        realm: 1, tier: 1, learnCost: 600,
        dur: 15, defMult: 0, atkMult: 1.3, healPct: 0, stunDur: 0 },
      { id: "phap_tu_tu_tieu_than_loi", name: "Tử Tiêu Thần Lôi", desc: "Triệu hồi một đạo thần lôi tím khổng lồ giáng thẳng xuống một mục tiêu, gây sát thương bằng 5.0 lần công kích. Chiêu tối thượng của Pháp Tu.", kind: "dmg",
        mult: 5.0, mp: 50, focus: 0, cd: 35, range: 500, fxType: "lightning",
        realm: 3, tier: 2, learnCost: 1500,
        dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0 }
    ],
    passives: [
      { id: "phap_tu_tu_phu_linh_can", name: "Tử Phủ Linh Căn", desc: "Linh căn Tử Phủ mở rộng đan điền, tăng 10% linh lực tối đa vĩnh viễn.",
        effect: { maxMpPct: 10 }, sp: 2, realm: 1 },
      { id: "phap_tu_phap_luc_ngung_tu", name: "Pháp Lực Ngưng Tụ", desc: "Pháp lực ngưng tụ càng lúc càng thuần khiết, tăng 10% công kích pháp thuật vĩnh viễn.",
        effect: { atkPct: 10 }, sp: 3, realm: 2 }
    ],
    manuals: [
      { id: "manual_phaptu_1", skill: "phap_tu_tu_quang_tien", tier: 0, learnCost: 0, realm: 1, price: 300, sell: 50 },
      { id: "manual_phaptu_2", skill: "phap_tu_tu_dien_tran", tier: 1, learnCost: 500, realm: 1, price: 1200, sell: 300 },
      { id: "manual_phaptu_3", skill: "phap_tu_thanh_linh_gia_tri", tier: 1, learnCost: 600, realm: 1, price: 1200, sell: 300 },
      { id: "manual_phaptu_4", skill: "phap_tu_tu_tieu_than_loi", tier: 2, learnCost: 1500, realm: 3, price: 3000, sell: 1500 },
      { id: "manual_phaptu_5", passive: "phap_tu_tu_phu_linh_can", tier: 0, learnCost: 300, realm: 1, price: 300, sell: 50 },
      { id: "manual_phaptu_6", passive: "phap_tu_phap_luc_ngung_tu", tier: 1, learnCost: 800, realm: 2, price: 1200, sell: 300 }
    ],
    lang: {
      vi: {
        "sk_phap_tu_co_ban": "Linh Quang Chỉ",
        "sk_phap_tu_co_ban_desc": "Đòn đánh thường pháp thuật tầm xa: bắn một tia linh quang tím gây sát thương bằng 1.0 lần công kích, không tốn linh lực, tầm 300.",
        "sk_phap_tu_tu_quang_tien": "Tử Quang Tiễn",
        "sk_phap_tu_tu_quang_tien_desc": "Bắn một mũi tên linh quang tím xuyên thẳng vào một mục tiêu, gây sát thương bằng 2.0 lần công kích, tốn 20 linh lực, hồi chiêu 8 giây, tầm 400.",
        "sk_phap_tu_tu_dien_tran": "Tử Điện Trận",
        "sk_phap_tu_tu_dien_tran_desc": "Dựng một trận điện tím tại vị trí chỉ định, gây sát thương bằng 2.0 lần công kích cho mọi địch trong vùng ảnh hưởng, tốn 25 linh lực, hồi chiêu 12 giây, tầm 300.",
        "sk_phap_tu_thanh_linh_gia_tri": "Thanh Linh Gia Trì",
        "sk_phap_tu_thanh_linh_gia_tri_desc": "Gia trì linh lực lên bản thân trong 15 giây, tăng 30% công kích trong thời gian hiệu lực, tốn 25 linh lực, hồi chiêu 20 giây.",
        "sk_phap_tu_tu_tieu_than_loi": "Tử Tiêu Thần Lôi",
        "sk_phap_tu_tu_tieu_than_loi_desc": "Triệu hồi một đạo thần lôi tím khổng lồ giáng thẳng xuống một mục tiêu, gây sát thương bằng 5.0 lần công kích, tốn 50 linh lực, hồi chiêu 35 giây, tầm 500. Yêu cầu cảnh giới Kim Đan.",
        "ps_phap_tu_tu_phu_linh_can": "Tử Phủ Linh Căn",
        "ps_phap_tu_tu_phu_linh_can_desc": "Linh căn Tử Phủ mở rộng đan điền, tăng 10% linh lực tối đa vĩnh viễn.",
        "ps_phap_tu_phap_luc_ngung_tu": "Pháp Lực Ngưng Tụ",
        "ps_phap_tu_phap_luc_ngung_tu_desc": "Pháp lực ngưng tụ càng lúc càng thuần khiết, tăng 10% công kích pháp thuật vĩnh viễn.",
        "it_manual_phaptu_1": "Bí Tịch Tử Quang Tiễn",
        "it_manual_phaptu_1_desc": "Bí tịch ghi chép chiêu Tử Quang Tiễn của Pháp Tu. Học để dùng chiêu gây sát thương bằng 2.0 lần công kích lên một mục tiêu.",
        "it_manual_phaptu_2": "Bí Tịch Tử Điện Trận",
        "it_manual_phaptu_2_desc": "Bí tịch ghi chép chiêu Tử Điện Trận của Pháp Tu. Học để dùng chiêu gây sát thương diện rộng bằng 2.0 lần công kích.",
        "it_manual_phaptu_3": "Bí Tịch Thanh Linh Gia Trì",
        "it_manual_phaptu_3_desc": "Bí tịch ghi chép chiêu Thanh Linh Gia Trì của Pháp Tu. Học để dùng chiêu tăng 30% công kích bản thân trong 15 giây.",
        "it_manual_phaptu_4": "Bí Tịch Tử Tiêu Thần Lôi",
        "it_manual_phaptu_4_desc": "Bí tịch ghi chép chiêu tối thượng Tử Tiêu Thần Lôi của Pháp Tu. Học để dùng chiêu gây sát thương bằng 5.0 lần công kích lên một mục tiêu. Yêu cầu cảnh giới Kim Đan.",
        "it_manual_phaptu_5": "Bí Tịch Tử Phủ Linh Căn",
        "it_manual_phaptu_5_desc": "Bí tịch ghi chép tâm pháp Tử Phủ Linh Căn của Pháp Tu. Học để tăng 10% linh lực tối đa vĩnh viễn.",
        "it_manual_phaptu_6": "Bí Tịch Pháp Lực Ngưng Tụ",
        "it_manual_phaptu_6_desc": "Bí tịch ghi chép tâm pháp Pháp Lực Ngưng Tụ của Pháp Tu. Học để tăng 10% công kích pháp thuật vĩnh viễn."
      },
      en: {
        "sk_phap_tu_co_ban": "Spirit Light Finger",
        "sk_phap_tu_co_ban_desc": "Basic ranged spell attack: fires a violet spirit-light bolt dealing damage equal to 1.0x attack, costing no mana, range 300.",
        "sk_phap_tu_tu_quang_tien": "Violet Light Arrow",
        "sk_phap_tu_tu_quang_tien_desc": "Fires a violet spirit-light arrow straight at one target, dealing damage equal to 2.0x attack, costing 20 mana, cooldown 8 seconds, range 400.",
        "sk_phap_tu_tu_dien_tran": "Violet Lightning Array",
        "sk_phap_tu_tu_dien_tran_desc": "Raises a violet lightning array at the chosen spot, dealing damage equal to 2.0x attack to all enemies in the area, costing 25 mana, cooldown 12 seconds, range 300.",
        "sk_phap_tu_thanh_linh_gia_tri": "Clear Spirit Blessing",
        "sk_phap_tu_thanh_linh_gia_tri_desc": "Blesses yourself with spirit power for 15 seconds, increasing attack by 30% while active, costing 25 mana, cooldown 20 seconds.",
        "sk_phap_tu_tu_tieu_than_loi": "Violet Firmament Divine Thunder",
        "sk_phap_tu_tu_tieu_than_loi_desc": "Summons a massive violet divine thunderbolt crashing onto one target, dealing damage equal to 5.0x attack, costing 50 mana, cooldown 35 seconds, range 500. Requires Golden Core realm.",
        "ps_phap_tu_tu_phu_linh_can": "Violet Palace Spirit Root",
        "ps_phap_tu_tu_phu_linh_can_desc": "The Violet Palace spirit root expands the dantian, permanently increasing maximum mana by 10%.",
        "ps_phap_tu_phap_luc_ngung_tu": "Condensed Spell Power",
        "ps_phap_tu_phap_luc_ngung_tu_desc": "Spell power condenses ever purer, permanently increasing spell attack by 10%.",
        "it_manual_phaptu_1": "Violet Light Arrow Manual",
        "it_manual_phaptu_1_desc": "Manual recording the Pháp Tu technique Violet Light Arrow. Learn it to deal damage equal to 2.0x attack to one target.",
        "it_manual_phaptu_2": "Violet Lightning Array Manual",
        "it_manual_phaptu_2_desc": "Manual recording the Pháp Tu technique Violet Lightning Array. Learn it to deal area damage equal to 2.0x attack.",
        "it_manual_phaptu_3": "Clear Spirit Blessing Manual",
        "it_manual_phaptu_3_desc": "Manual recording the Pháp Tu technique Clear Spirit Blessing. Learn it to increase your own attack by 30% for 15 seconds.",
        "it_manual_phaptu_4": "Violet Firmament Divine Thunder Manual",
        "it_manual_phaptu_4_desc": "Manual recording the ultimate Pháp Tu technique Violet Firmament Divine Thunder. Learn it to deal damage equal to 5.0x attack to one target. Requires Golden Core realm.",
        "it_manual_phaptu_5": "Violet Palace Spirit Root Manual",
        "it_manual_phaptu_5_desc": "Manual recording the Pháp Tu art Violet Palace Spirit Root. Learn it to permanently increase maximum mana by 10%.",
        "it_manual_phaptu_6": "Condensed Spell Power Manual",
        "it_manual_phaptu_6_desc": "Manual recording the Pháp Tu art Condensed Spell Power. Learn it to permanently increase spell attack by 10%."
      }
    },
    skillbarOrder: ["phap_tu_tu_quang_tien", "phap_tu_tu_dien_tran", "phap_tu_thanh_linh_gia_tri", "phap_tu_tu_tieu_than_loi"]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = pack;
  var g = (typeof globalThis !== "undefined") ? globalThis : this;
  g.CLASS_SKILL_PACKS = g.CLASS_SKILL_PACKS || {};
  g.CLASS_SKILL_PACKS[pack.classId] = pack;
})();
