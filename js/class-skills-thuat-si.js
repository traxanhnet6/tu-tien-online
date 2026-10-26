(function () {
  var pack = {
    classId: "thuat_si", className: "Thuật Sĩ", color: "#ffd23f",
    basic: { id: "thuat_si_co_ban", name: "Kim Phù Chỉ", desc: "Phóng một lá bùa vàng thường, gây 90% sát thương trong tầm 300.", mult: 0.9, mp: 0, range: 300, fxType: "bolt" },
    actives: [
      { id: "thuat_si_kim_quang_phu", name: "Kim Quang Phù", desc: "Phóng bùa vàng chói lọi, gây 200% sát thương cho một mục tiêu trong tầm 300.", kind: "dmg", mult: 2.0, mp: 20, focus: 0, cd: 8, range: 300, fxType: "bolt", realm: 1, tier: 0, learnCost: 0, dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0 },
      { id: "thuat_si_cam_lo_hoi_xuan", name: "Cam Lộ Hồi Xuân Phù", desc: "Dán bùa cam lộ lên bản thân, hồi ngay 30% máu tối đa.", kind: "heal", mult: 0, mp: 25, focus: 0, cd: 12, range: 0, fxType: "circle", realm: 1, tier: 0, learnCost: 200, dur: 0, defMult: 0, atkMult: 0, healPct: 30, stunDur: 0 },
      { id: "thuat_si_kim_cang_tran_phu", name: "Kim Cương Trấn Phù", desc: "Dựng trận phù kim cương quanh bản thân, tăng 50% phòng ngự trong 15 giây.", kind: "buff", mult: 0, mp: 30, focus: 0, cd: 20, range: 0, fxType: "circle", realm: 1, tier: 1, learnCost: 500, dur: 15, defMult: 1.5, atkMult: 0, healPct: 0, stunDur: 0 },
      { id: "thuat_si_dinh_than_phu", name: "Định Thân Phù", desc: "Phóng bùa định thân, gây 100% sát thương và làm choáng mục tiêu trong 3 giây, tầm 300.", kind: "control", mult: 1.0, mp: 25, focus: 0, cd: 10, range: 300, fxType: "bolt", realm: 2, tier: 1, learnCost: 800, dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 3 },
      { id: "thuat_si_van_phu_thien_loi", name: "Vạn Phù Thiên Lôi Trận", desc: "Bày vạn phù dẫn thiên lôi giáng xuống một vùng, gây 350% sát thương diện rộng trong tầm 400.", kind: "aoe", mult: 3.5, mp: 40, focus: 0, cd: 30, range: 400, fxType: "lightning", realm: 3, tier: 2, learnCost: 1500, dur: 0, defMult: 0, atkMult: 0, healPct: 0, stunDur: 0 }
    ],
    passives: [
      { id: "thuat_si_cot_phu_the", name: "Cốt Phù Thể", desc: "Phù văn khắc vào thân thể, tăng 10% máu tối đa vĩnh viễn.", effect: { maxHpPct: 10 }, sp: 2, realm: 1 },
      { id: "thuat_si_linh_phu_duong", name: "Linh Phù Dưỡng", desc: "Phù văn nuôi dưỡng linh lực, tăng 12% linh lực tối đa vĩnh viễn.", effect: { maxMpPct: 12 }, sp: 2, realm: 1 }
    ],
    manuals: [
      { id: "manual_thuatsi_1", skill: "thuat_si_kim_quang_phu", tier: 0, learnCost: 0, realm: 1, price: 300, sell: 50 },
      { id: "manual_thuatsi_2", skill: "thuat_si_cam_lo_hoi_xuan", tier: 0, learnCost: 200, realm: 1, price: 300, sell: 50 },
      { id: "manual_thuatsi_3", skill: "thuat_si_kim_cang_tran_phu", tier: 1, learnCost: 500, realm: 1, price: 1200, sell: 300 },
      { id: "manual_thuatsi_4", skill: "thuat_si_dinh_than_phu", tier: 1, learnCost: 800, realm: 2, price: 1200, sell: 300 },
      { id: "manual_thuatsi_5", skill: "thuat_si_van_phu_thien_loi", tier: 2, learnCost: 1500, realm: 3, price: 3000, sell: 1500 },
      { id: "manual_thuatsi_6", skill: "thuat_si_cot_phu_the", tier: 0, learnCost: 300, realm: 1, price: 300, sell: 50 },
      { id: "manual_thuatsi_7", skill: "thuat_si_linh_phu_duong", tier: 1, learnCost: 600, realm: 1, price: 1200, sell: 300 }
    ],
    lang: {
      vi: {
        "sk_thuat_si_co_ban": "Kim Phù Chỉ",
        "sk_thuat_si_co_ban_desc": "Phóng một lá bùa vàng thường, gây 90% sát thương trong tầm 300.",
        "sk_thuat_si_kim_quang_phu": "Kim Quang Phù",
        "sk_thuat_si_kim_quang_phu_desc": "Phóng bùa vàng chói lọi, gây 200% sát thương cho một mục tiêu trong tầm 300.",
        "sk_thuat_si_cam_lo_hoi_xuan": "Cam Lộ Hồi Xuân Phù",
        "sk_thuat_si_cam_lo_hoi_xuan_desc": "Dán bùa cam lộ lên bản thân, hồi ngay 30% máu tối đa.",
        "sk_thuat_si_kim_cang_tran_phu": "Kim Cương Trấn Phù",
        "sk_thuat_si_kim_cang_tran_phu_desc": "Dựng trận phù kim cương quanh bản thân, tăng 50% phòng ngự trong 15 giây.",
        "sk_thuat_si_dinh_than_phu": "Định Thân Phù",
        "sk_thuat_si_dinh_than_phu_desc": "Phóng bùa định thân, gây 100% sát thương và làm choáng mục tiêu trong 3 giây, tầm 300.",
        "sk_thuat_si_van_phu_thien_loi": "Vạn Phù Thiên Lôi Trận",
        "sk_thuat_si_van_phu_thien_loi_desc": "Bày vạn phù dẫn thiên lôi giáng xuống một vùng, gây 350% sát thương diện rộng trong tầm 400.",
        "ps_thuat_si_cot_phu_the": "Cốt Phù Thể",
        "ps_thuat_si_cot_phu_the_desc": "Phù văn khắc vào thân thể, tăng 10% máu tối đa vĩnh viễn.",
        "ps_thuat_si_linh_phu_duong": "Linh Phù Dưỡng",
        "ps_thuat_si_linh_phu_duong_desc": "Phù văn nuôi dưỡng linh lực, tăng 12% linh lực tối đa vĩnh viễn.",
        "it_manual_thuatsi_1": "Bí tịch Kim Quang Phù",
        "it_manual_thuatsi_1_desc": "Bí tịch dạy chiêu Kim Quang Phù, gây 200% sát thương cho một mục tiêu.",
        "it_manual_thuatsi_2": "Bí tịch Cam Lộ Hồi Xuân Phù",
        "it_manual_thuatsi_2_desc": "Bí tịch dạy chiêu Cam Lộ Hồi Xuân Phù, hồi ngay 30% máu tối đa.",
        "it_manual_thuatsi_3": "Bí tịch Kim Cương Trấn Phù",
        "it_manual_thuatsi_3_desc": "Bí tịch dạy chiêu Kim Cương Trấn Phù, tăng 50% phòng ngự trong 15 giây.",
        "it_manual_thuatsi_4": "Bí tịch Định Thân Phù",
        "it_manual_thuatsi_4_desc": "Bí tịch dạy chiêu Định Thân Phù, gây 100% sát thương và choáng 3 giây.",
        "it_manual_thuatsi_5": "Bí tịch Vạn Phù Thiên Lôi Trận",
        "it_manual_thuatsi_5_desc": "Bí tịch dạy chiêu Vạn Phù Thiên Lôi Trận, gây 350% sát thương diện rộng.",
        "it_manual_thuatsi_6": "Bí tịch Cốt Phù Thể",
        "it_manual_thuatsi_6_desc": "Bí tịch bị động Cốt Phù Thể, tăng 10% máu tối đa vĩnh viễn.",
        "it_manual_thuatsi_7": "Bí tịch Linh Phù Dưỡng",
        "it_manual_thuatsi_7_desc": "Bí tịch bị động Linh Phù Dưỡng, tăng 12% linh lực tối đa vĩnh viễn."
      },
      en: {
        "sk_thuat_si_co_ban": "Golden Talisman Finger",
        "sk_thuat_si_co_ban_desc": "Fires a plain golden talisman, dealing 90% damage within range 300.",
        "sk_thuat_si_kim_quang_phu": "Golden Light Talisman",
        "sk_thuat_si_kim_quang_phu_desc": "Fires a radiant golden talisman, dealing 200% damage to one target within range 300.",
        "sk_thuat_si_cam_lo_hoi_xuan": "Sweet Dew Revival Talisman",
        "sk_thuat_si_cam_lo_hoi_xuan_desc": "Applies a dew talisman to yourself, instantly restoring 30% of max HP.",
        "sk_thuat_si_kim_cang_tran_phu": "Diamond Guard Formation Talisman",
        "sk_thuat_si_kim_cang_tran_phu_desc": "Raises a diamond talisman formation around yourself, increasing defense by 50% for 15 seconds.",
        "sk_thuat_si_dinh_than_phu": "Body-Fixing Talisman",
        "sk_thuat_si_dinh_than_phu_desc": "Fires a fixing talisman, dealing 100% damage and stunning the target for 3 seconds, range 300.",
        "sk_thuat_si_van_phu_thien_loi": "Myriad Talisman Heavenly Thunder Formation",
        "sk_thuat_si_van_phu_thien_loi_desc": "Sets myriad talismans to call down heavenly thunder over an area, dealing 350% area damage within range 400.",
        "ps_thuat_si_cot_phu_the": "Talisman Bone Body",
        "ps_thuat_si_cot_phu_the_desc": "Talisman runes carved into the body, permanently increasing max HP by 10%.",
        "ps_thuat_si_linh_phu_duong": "Spirit Talisman Nurturing",
        "ps_thuat_si_linh_phu_duong_desc": "Talisman runes nurture spirit power, permanently increasing max MP by 12%.",
        "it_manual_thuatsi_1": "Golden Light Talisman Manual",
        "it_manual_thuatsi_1_desc": "Manual teaching Golden Light Talisman, dealing 200% damage to one target.",
        "it_manual_thuatsi_2": "Sweet Dew Revival Talisman Manual",
        "it_manual_thuatsi_2_desc": "Manual teaching Sweet Dew Revival Talisman, instantly restoring 30% of max HP.",
        "it_manual_thuatsi_3": "Diamond Guard Formation Talisman Manual",
        "it_manual_thuatsi_3_desc": "Manual teaching Diamond Guard Formation Talisman, increasing defense by 50% for 15 seconds.",
        "it_manual_thuatsi_4": "Body-Fixing Talisman Manual",
        "it_manual_thuatsi_4_desc": "Manual teaching Body-Fixing Talisman, dealing 100% damage and stunning for 3 seconds.",
        "it_manual_thuatsi_5": "Myriad Talisman Heavenly Thunder Formation Manual",
        "it_manual_thuatsi_5_desc": "Manual teaching Myriad Talisman Heavenly Thunder Formation, dealing 350% area damage.",
        "it_manual_thuatsi_6": "Talisman Bone Body Manual",
        "it_manual_thuatsi_6_desc": "Passive manual Talisman Bone Body, permanently increasing max HP by 10%.",
        "it_manual_thuatsi_7": "Spirit Talisman Nurturing Manual",
        "it_manual_thuatsi_7_desc": "Passive manual Spirit Talisman Nurturing, permanently increasing max MP by 12%."
      }
    },
    skillbarOrder: ["thuat_si_kim_quang_phu", "thuat_si_cam_lo_hoi_xuan", "thuat_si_kim_cang_tran_phu", "thuat_si_dinh_than_phu", "thuat_si_van_phu_thien_loi"]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = pack;
  var g = (typeof globalThis !== "undefined") ? globalThis : this;
  g.CLASS_SKILL_PACKS = g.CLASS_SKILL_PACKS || {};
  g.CLASS_SKILL_PACKS[pack.classId] = pack;
})();
