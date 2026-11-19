/* ==========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

const PRODUCTS_URL = "products.json";

const ORDER_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyUEDocvYYke14PhwP91G0s45R3nr229J-7R3-EEVS-OzHEpwi5utFc6neGOARJ5ZAh/exec";

const ORDERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRM_Nxfi4hPKCWjaJG2GB61JJ46XhhKl8eosKbeby30OkjK3pZrfWow7Gu9bsDpet-Kjou8IMQmV4qr/pub?gid=0&single=true&output=csv";

const MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" },
];

const TYPE_LABELS = {
  spray: "น้ำหอมฉีดตัว",
  rollon: "โรลออน",
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.getElementById("ordersTable")) initAdminPage();
});

/* ==========================================================
   1) หน้า product.html
   ========================================================== */
function initProductPage() {
  const filterBar = document.getElementById("filter-bar");
  const list = document.getElementById("product-list");
  let products = [];
  let currentMood = "all";

  // อ่าน ?mood=xxx (ถ้าไม่ถูกต้องให้แสดงทั้งหมด)
  const moodParam = (new URLSearchParams(window.location.search).get("mood") || "").toLowerCase();
  if (MOODS.some((m) => m.key === moodParam)) currentMood = moodParam;

  renderFilterBar();

  fetch(PRODUCTS_URL)
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      products = data;
      renderProducts();
    })
    .catch((error) => {
      console.error(error);
      list.textContent = "ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง";
    });

  function renderFilterBar() {
    if (!filterBar) return;
    filterBar.textContent = "";
    MOODS.forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-btn";
      btn.textContent = m.label;
      btn.dataset.mood = m.key;
      setActive(btn, m.key === currentMood);
      btn.addEventListener("click", () => {
        currentMood = m.key;
        filterBar.querySelectorAll(".filter-btn").forEach((b) => {
          setActive(b, b.dataset.mood === currentMood);
        });
        updateUrl();
        renderProducts();
      });
      filterBar.appendChild(btn);
    });
  }

  function setActive(btn, active) {
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    if (currentMood === "all") url.searchParams.delete("mood");
    else url.searchParams.set("mood", currentMood);
    window.history.replaceState(null, "", url);
  }

  function renderProducts() {
    list.textContent = "";
    const filtered =
      currentMood === "all" ? products : products.filter((p) => p.mood === currentMood);

    if (filtered.length === 0) {
      list.textContent = "ไม่พบสินค้าในหมวดนี้";
      return;
    }
    filtered.forEach((p) => list.appendChild(createProductCard(p)));
  }
}

function createProductCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.mood = p.mood;

  // รูป
  const imgWrap = document.createElement("div");
  imgWrap.className = "product-card__image";
  const img = document.createElement("img");
  img.src = p.image;
  img.alt = p.name;
  img.loading = "lazy";
  imgWrap.appendChild(img);

  // mood (จุดสีเล็กๆ + ชื่อ)
  const moodEl = document.createElement("p");
  moodEl.className = "product-card__mood";
  const dot = document.createElement("span");
  dot.className = "mood-dot";
  moodEl.appendChild(dot);
  moodEl.appendChild(document.createTextNode(capitalize(p.mood)));

  // ชื่อ
  const name = document.createElement("h3");
  name.className = "product-card__name";
  name.textContent = p.name;

  // ไซส์ (โรลออนที่ไม่มีไซส์ ให้แสดงเป็นประเภทสินค้าแทน)
  const meta = document.createElement("p");
  meta.className = "product-card__meta";
  meta.textContent = p.size ? p.size : TYPE_LABELS[p.type] || "";

  // ราคา
  const price = document.createElement("p");
  price.className = "product-card__price";
  price.textContent = Number(p.price).toLocaleString("th-TH") + " บาท";

  // ปุ่มสั่งซื้อ -> order.html?item=...&price=...
  const itemLabel = p.size ? p.name + " " + p.size : p.name;
  const params = new URLSearchParams({ item: itemLabel, price: p.price });
  const btn = document.createElement("a");
  btn.className = "btn btn--block";
  btn.href = "order.html?" + params.toString();
  btn.textContent = "สั่งซื้อ";

  card.append(imgWrap, moodEl, name, meta, price, btn);
  return card;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

/* ==========================================================
   2) หน้า order.html
   ========================================================== */
function initOrderPage() {
  const form = document.getElementById("orderForm");

  // เติม item และ price จาก URL ลงช่อง #items และ #total ทันทีที่โหลดหน้า
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item");
  const price = params.get("price");

  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");
  if (itemsInput && item !== null) itemsInput.value = item;
  if (totalInput && price !== null) totalInput.value = price;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: document.getElementById("items").value.trim(),
      total: document.getElementById("total").value.trim(),
      note: document.getElementById("note").value.trim(),
    };

    // กันกดซ้ำระหว่างส่ง
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(ORDER_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        if (submitBtn) submitBtn.disabled = false;
      });
  });
}

/* ==========================================================
   3) หน้า admin.html
   ========================================================== */
function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  showMessage(tbody, "กำลังโหลดข้อมูล...");

  fetch(ORDERS_CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then((text) => {
      let rows = parseCSV(text);

      // ตัดแถวว่าง
      rows = rows.filter((r) => r.some((cell) => cell.trim() !== ""));

      // ถ้าแถวแรกเป็นหัวตาราง (ช่องวันเวลาไม่มีตัวเลข) ให้ข้ามไป
      if (rows.length > 0 && !/\d/.test(rows[0][0])) rows.shift();

      // Apps Script เพิ่มแถวต่อท้ายตามลำดับเวลา จึงกลับลำดับให้ล่าสุดขึ้นก่อน
      rows.reverse();

      renderOrders(tbody, rows);
    })
    .catch((error) => {
      console.error(error);
      showMessage(tbody, "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    });
}

function renderOrders(tbody, rows) {
  tbody.textContent = "";
  if (rows.length === 0) {
    showMessage(tbody, "ยังไม่มีรายการสั่งซื้อ");
    return;
  }
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
    for (let i = 0; i < 6; i++) {
      const td = document.createElement("td");
      td.textContent = row[i] !== undefined ? row[i] : "";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}

function showMessage(tbody, message) {
  tbody.textContent = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 6;
  td.textContent = message;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

/* ---------- ตัวแปลง CSV (เขียนเอง ไม่ใช้ไลบรารี) ----------
   รองรับ: ข้อความใน "..." , "" แทน " ในข้อความ,
   คอมมาและขึ้นบรรทัดใหม่ภายในช่อง, บรรทัดแบบ \r\n และ BOM */
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // แถวสุดท้ายที่ไม่มีขึ้นบรรทัดใหม่ปิดท้าย
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
