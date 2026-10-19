(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const input = $("#newsText");
  const toastEl = $("#toast");
  let toastTimer;
  let latestAnalysis = null;

  const rules = [
    { name: "Ngôn từ giật gân", weight: 18, terms: ["cực sốc", "chấn động", "kinh hoàng", "không thể tin nổi", "gây sốc", "sự thật động trời"], explain: "Tiêu đề hoặc câu chữ gây sốc có thể nhằm thu hút chú ý. Hãy đọc nội dung đầy đủ và kiểm tra nguồn." },
    { name: "Thúc giục chia sẻ gấp", weight: 20, terms: ["chia sẻ ngay", "share ngay", "gửi cho tất cả", "lan truyền ngay", "hãy chia sẻ", "chuyển tiếp ngay"], explain: "Lời thúc giục lan truyền nhanh có thể làm người đọc bỏ qua bước xác minh." },
    { name: "Khẳng định tuyệt đối", weight: 15, terms: ["100% sự thật", "chắc chắn đúng", "ai cũng biết", "không có bất kỳ ngoại lệ", "đảm bảo tuyệt đối"], explain: "Khẳng định tuyệt đối nhưng không kèm bằng chứng cần được xem xét cẩn thận." },
    { name: "Gây sợ hãi hoặc khẩn cấp", weight: 16, terms: ["trước khi quá muộn", "nguy hiểm chết người", "sắp bị cấm", "khẩn cấp", "hãy cảnh giác ngay"], explain: "Ngôn ngữ tạo cảm giác khẩn cấp có thể gây phản ứng vội vàng. Tìm thông báo chính thức." },
    { name: "Thiếu dẫn nguồn rõ ràng", weight: 14, terms: ["nghe nói rằng", "một người quen cho biết", "nguồn tin nội bộ", "có người nói", "theo tin đồn"], explain: "Nguồn không xác định khiến việc kiểm tra xuất xứ và trách nhiệm của thông tin khó hơn." },
    { name: "Hứa hẹn hoặc kết luận khó tin", weight: 17, terms: ["bí mật bị che giấu", "truyền thông không muốn bạn biết", "phép màu tức thì", "khỏi hoàn toàn", "làm giàu sau một đêm"], explain: "Lời hứa phi thường hoặc tuyên bố về âm mưu cần bằng chứng độc lập, đáng tin cậy." }
  ];

  function normalize(text) {
    return text.toLocaleLowerCase("vi").normalize("NFC").replace(/\s+/g, " ").trim();
  }

  function analyze(text) {
    const normalized = normalize(text);
    const hits = [];
    let rawScore = 0;
    for (const rule of rules) {
      const matches = rule.terms.filter(term => normalized.includes(normalize(term)));
      if (matches.length) {
        rawScore += rule.weight;
        hits.push({ name: rule.name, weight: rule.weight, matches, explain: rule.explain });
      }
    }
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length < 12) {
      hits.push({
        name: "Nội dung ngắn, có thể thiếu ngữ cảnh",
        weight: 0,
        matches: [],
        explain: "Đoạn văn ngắn không cung cấp đủ thông tin để đánh giá. Hãy tìm bài viết đầy đủ, tác giả và nguồn gốc."
      });
    }
    const score = Math.min(100, rawScore);
    let label = "Ít dấu hiệu được nhận diện";
    let sub = "Vẫn cần đối chiếu nguồn và bằng chứng.";
    if (score >= 50) {
      label = "Nhiều dấu hiệu cần chú ý";
      sub = "Ưu tiên kiểm chứng từ nguồn độc lập.";
    } else if (score >= 25) {
      label = "Có dấu hiệu cần xem xét";
      sub = "Đừng kết luận chỉ dựa vào điểm số.";
    }
    return { score, hits, label, sub, wordCount: words.length };
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  function renderAnalysis(text) {
    if (!text) {
      showToast("Hãy nhập nội dung trước khi phân tích.");
      input.focus();
      return;
    }
    const analysis = analyze(text);
    latestAnalysis = { text, ...analysis, date: new Date().toLocaleString("vi-VN") };
    $("#resultEmpty").classList.add("hidden");
    $("#resultContent").classList.remove("hidden");
    $("#scoreValue").textContent = String(analysis.score);
    $("#scoreRing").style.setProperty("--score", `${analysis.score}%`);
    $("#scoreLabel").textContent = analysis.label;
    $("#scoreSub").textContent = analysis.sub;
    $("#findingCount").textContent = `${analysis.hits.length} dấu hiệu`;
    const findings = $("#findings");
    findings.replaceChildren();

    if (!analysis.hits.length) {
      const item = document.createElement("article");
      item.className = "finding";
      const mark = document.createElement("span");
      mark.className = "finding-mark";
      mark.textContent = "✓";
      const body = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = "Chưa phát hiện dấu hiệu theo các quy tắc hiện có";
      const description = document.createElement("p");
      description.textContent = "Điều này không xác nhận thông tin là đúng. Hãy tiếp tục kiểm tra nguồn, thời điểm và bằng chứng.";
      body.append(title, description);
      item.append(mark, body);
      findings.append(item);
    } else {
      analysis.hits.forEach(hit => {
        const item = document.createElement("article");
        item.className = "finding";
        const mark = document.createElement("span");
        mark.className = "finding-mark";
        mark.textContent = "!";
        const body = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = hit.name;
        const description = document.createElement("p");
        const extra = hit.matches.length ? ` Cụm từ phát hiện: “${hit.matches.join("”, “")}”.` : "";
        description.textContent = hit.explain + extra;
        body.append(title, description);
        item.append(mark, body);
        findings.append(item);
      });
    }
    showToast("Đã phân tích dấu hiệu trong văn bản.");
    $("#resultContent").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  input.addEventListener("input", () => {
    $("#charCount").textContent = `${input.value.length} / 5000`;
  });
  $("#analyzeBtn").addEventListener("click", () => renderAnalysis(input.value.trim()));
  input.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") renderAnalysis(input.value.trim());
  });
  $("#clearBtn").addEventListener("click", () => {
    input.value = "";
    input.dispatchEvent(new Event("input"));
    latestAnalysis = null;
    $("#resultContent").classList.add("hidden");
    $("#resultEmpty").classList.remove("hidden");
    input.focus();
    showToast("Đã xóa nội dung.");
  });

  const samples = {
    urgent: "CHẤN ĐỘNG! Chia sẻ ngay trước khi quá muộn! Đây là 100% sự thật mà truyền thông không muốn bạn biết. Hãy gửi cho tất cả mọi người ngay lập tức!",
    neutral: "Theo thông báo đăng trên trang chính thức của cơ quan vào ngày 12 tháng 5, lịch tiếp nhận hồ sơ sẽ thay đổi từ tuần sau. Người đọc nên mở thông báo gốc để xem thời gian, đối tượng áp dụng và hướng dẫn chi tiết.",
    short: "Nghe nói ngày mai tất cả trường học đều đóng cửa."
  };
  $$(".sample-btn").forEach(button => {
    button.addEventListener("click", () => {
      input.value = samples[button.dataset.sample] || "";
      input.dispatchEvent(new Event("input"));
      input.focus();
    });
  });

  function getChecklist() {
    return $$("[data-check]").map(box => ({ id: box.dataset.check, checked: box.checked }));
  }
  function saveChecklist() {
    try { localStorage.setItem("fakecheck-checklist-v1", JSON.stringify(getChecklist())); } catch (_) {}
    updateChecklistProgress();
  }
  function updateChecklistProgress() {
    const boxes = $$("[data-check]");
    const checked = boxes.filter(box => box.checked).length;
    $("#checkProgressText").textContent = `${checked} / ${boxes.length} bước`;
    $("#checkProgress").style.width = `${boxes.length ? checked / boxes.length * 100 : 0}%`;
  }
  function restoreChecklist() {
    try {
      const saved = JSON.parse(localStorage.getItem("fakecheck-checklist-v1") || "null");
      if (Array.isArray(saved)) {
        const state = new Map(saved.map(item => [item.id, item.checked]));
        $$("[data-check]").forEach(box => { box.checked = state.get(box.dataset.check) === true; });
      }
    } catch (_) {}
    updateChecklistProgress();
  }
  $$("[data-check]").forEach(box => box.addEventListener("change", saveChecklist));
  $("#resetChecks").addEventListener("click", () => {
    $$("[data-check]").forEach(box => { box.checked = false; });
    saveChecklist();
    showToast("Đã đặt lại checklist.");
  });
  restoreChecklist();

  $("#exportBtn").addEventListener("click", () => {
    if (!latestAnalysis) {
      showToast("Hãy phân tích nội dung trước khi xuất phiếu.");
      return;
    }
    const checklist = $$("[data-check]").map(box => {
      const title = $("strong", box.parentElement);
      return `${box.checked ? "[x]" : "[ ]"} ${title ? title.textContent : box.dataset.check}`;
    });
    const hitText = latestAnalysis.hits.length
      ? latestAnalysis.hits.map(hit => `- ${hit.name}: ${hit.explain}${hit.matches.length ? ` Cụm từ: ${hit.matches.join(", ")}` : ""}`).join("\n")
      : "- Chưa phát hiện dấu hiệu theo các quy tắc hiện có.";
    const report = [
      "FAKECHECK — PHIẾU HỖ TRỢ KIỂM CHỨNG",
      `Thời điểm phân tích: ${latestAnalysis.date}`,
      "",
      "NỘI DUNG ĐÃ NHẬP",
      latestAnalysis.text,
      "",
      `ĐIỂM CẢNH BÁO THEO QUY TẮC: ${latestAnalysis.score}/100`,
      `Mô tả: ${latestAnalysis.label}`,
      "LƯU Ý: Điểm số không phải xác suất tin giả và không xác nhận nội dung đúng hoặc sai.",
      "",
      "DẤU HIỆU ĐƯỢC NHẬN DIỆN",
      hitText,
      "",
      "CHECKLIST KIỂM CHỨNG",
      ...checklist,
      "",
      "BƯỚC TIẾP THEO",
      "Đối chiếu nguồn gốc, ngày đăng, bằng chứng gốc và ít nhất một nguồn độc lập trước khi chia sẻ.",
      "",
      "Giới hạn: FakeCheck phân tích văn bản theo các quy tắc định sẵn; không tự truy cập hoặc xác minh bài viết trên Internet."
    ].join("\n");
    const blob = new Blob(["\uFEFF", report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "FakeCheck-phieu-kiem-chung.txt";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Đã xuất phiếu kiểm chứng.");
  });

  $("#themeToggle").addEventListener("click", () => {
    const dark = document.body.classList.toggle("dark");
    try { localStorage.setItem("fakecheck-theme", dark ? "dark" : "light"); } catch (_) {}
    $("#themeToggle").innerHTML = dark ? "☀ <span>Giao diện</span>" : "☾ <span>Giao diện</span>";
    $("#themeToggle").setAttribute("aria-label", dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối");
  });
  try {
    if (localStorage.getItem("fakecheck-theme") === "dark") {
      document.body.classList.add("dark");
      $("#themeToggle").innerHTML = "☀ <span>Giao diện</span>";
    }
  } catch (_) {}
  $("#year").textContent = String(new Date().getFullYear());
})();