
// Yves POS - full prototype with minimal UI and updated employee flow

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
const app = $("#app");
const year = $("#year");
if (year) year.textContent = new Date().getFullYear();

// Dropdown nav behaviour
const menuBtn = $("#menu");
const dropdown = $("#dropdown");
if (menuBtn && dropdown) {
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dropdown.style.display === "flex";
    dropdown.style.display = open ? "none" : "flex";
    menuBtn.setAttribute("aria-expanded", (!open).toString());
  });
  document.addEventListener("click", () => {
    dropdown.style.display = "none";
    menuBtn.setAttribute("aria-expanded","false");
  });
}

// ---- State & helpers ----
const STORAGE_KEY = "yves_data_full_v1";

const nowISO = () => new Date().toISOString();

function seedData() {
  return {
    businesses: [
      { id:"b_1", name:"Sample Bistro", percentCut:0.01 }
    ],
    users: [
      { id:"u_admin", email:"admin@yves.local", role:"admin", businessId:"b_1", password:"1234", name:"Store Admin" },
      { id:"u_mgr", email:"manager@yves.local", role:"manager", businessId:"b_1", password:"password", name:"Store Manager" },
      { id:"u_ceo", email:"ceo@yves.local", role:"ceo", businessId:null, password:"yvesrocks", name:"Yves CEO" },
      { id:"u_emp", email:"employee@yves.local", role:"employee", businessId:"b_1", password:"4321", name:"Alex Employee" }
    ],
    employeePins: {
      admin:"1234",
      employee:"4321"
    },
    employees: [
      { id:"e_1", businessId:"b_1", name:"Alex", active:false, lastClockIn:null, totalSeconds:0, tips:0, ordersTaken:0 }
    ],
    menu: {
      b_1: {
        items: [
          {
            id:"m_1",
            name:"Cheeseburger",
            price:8.99,
            category:"Main",
            options:[
              {
                type:"side",
                label:"Side",
                choices:[
                  { name:"Fries", price:0 },
                  { name:"Salad", price:1.50 },
                  { name:"Soup", price:2.00 }
                ]
              },
              {
                type:"addon",
                label:"Add-ons",
                multiple:true,
                choices:[
                  { name:"Bacon", price:1.50 },
                  { name:"Extra Cheese", price:1.00 },
                  { name:"Avocado", price:2.00 }
                ]
              },
              {
                type:"substitution",
                label:"Substitution",
                choices:[
                  { name:"Gluten-free bun", price:1.00 },
                  { name:"No onion", price:0 },
                  { name:"No tomato", price:0 }
                ]
              }
            ]
          },
          {
            id:"m_2",
            name:"Caesar Salad",
            price:7.25,
            category:"Main",
            options:[
              {
                type:"addon",
                label:"Add-ons",
                multiple:true,
                choices:[
                  { name:"Chicken", price:3.00 },
                  { name:"Croutons", price:0.50 },
                  { name:"Parmesan", price:0.75 }
                ]
              },
              {
                type:"substitution",
                label:"Dressing",
                choices:[
                  { name:"Ranch", price:0 },
                  { name:"Balsamic", price:0 },
                  { name:"No dressing", price:0 }
                ]
              }
            ]
          },
          {
            id:"m_3",
            name:"Iced Tea",
            price:2.50,
            category:"Drinks",
            options:[
              {
                type:"addon",
                label:"Sweetener",
                choices:[
                  { name:"Sugar", price:0 },
                  { name:"Honey", price:0.25 },
                  { name:"No sweetener", price:0 }
                ]
              }
            ]
          }
        ]
      }
    },
    orders: [],
    sessions: {
      currentUser:null,
      currentBusiness:"b_1"
    }
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const s = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    const s = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function money(n) {
  return "$" + (Math.round(n * 100) / 100).toFixed(2);
}

function toast(msg) {
  alert(msg);
}

function uid(prefix="id") {
  return prefix + "_" + Math.random().toString(36).slice(2,10);
}

function currentUser() {
  const s = state.sessions.currentUser;
  if (!s) return null;
  return state.users.find(u=>u.id===s.id) || s;
}

function currentBiz() {
  return state.sessions.currentBusiness || "b_1";
}

// ---- Router ----
const routes = {
  "/home": viewHome,
  "/accounts": viewAccounts,
  "/employee": viewEmployee,
  "/admin": viewAdminLogin,
  "/admin/dashboard": viewAdminDashboard,
  "/admin/menu": viewAdminMenu,
  "/admin/profits": viewAdminProfits,
  "/admin/users": viewAdminUsers,
  "/ceo": viewCeoLogin,
  "/ceo/dashboard": viewCeoDashboard
};

function router() {
  const hash = location.hash.replace("#","") || "/home";
  (routes[hash] || viewHome)();
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);

// ---- Views ----

// Home: login hub
function viewHome() {
  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h1>Welcome to Yves POS</h1>
          <p class="muted">Choose how you want to sign in.</p>
          <div class="grid">
            <a class="btn" href="#/accounts">Email Login (Employees / Managers / Admins)</a>
            <a class="btn secondary" href="#/admin">Admin PIN</a>
            <a class="btn secondary" href="#/employee">Employee PIN & Clock-In</a>
            <a class="btn secondary" href="#/ceo">CEO Login</a>
          </div>
        </div>
        <div class="card">
          <h2>About Yves</h2>
          <p class="muted">Speech-first ordering. Minimal screens. Flexible menu rules per restaurant. Prototype only.</p>
        </div>
      </div>
    </section>
  `;
}

// Accounts (email login & user mgmt)
function viewAccounts() {
  const bizId = currentBiz();
  const users = state.users.filter(u => u.role !== "ceo");

  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Email Login</h2>
          <form id="loginForm" class="grid">
            <label>Email
              <input name="email" type="email" required placeholder="you@business.com" />
            </label>
            <label>Password
              <input name="password" type="password" required placeholder="••••••" />
            </label>
            <button class="btn">Sign in</button>
            <small class="muted">
              Demo: admin@yves.local / 1234, manager@yves.local / password, employee@yves.local / 4321
            </small>
          </form>
        </div>
        <div class="card">
          <h2>Manage Users (Local Demo)</h2>
          <form id="userForm" class="grid grid-2">
            <label>Name
              <input name="name" required />
            </label>
            <label>Email
              <input name="email" type="email" required />
            </label>
            <label>Password
              <input name="password" required />
            </label>
            <label>Role
              <select name="role">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button class="btn">Add User</button>
          </form>

          <table class="table" style="margin-top:12px;">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
            </thead>
            <tbody id="userRows"></tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  const tbody = $("#userRows");
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td><button data-id="${u.id}" class="btn ghost">Remove</button></td>
    </tr>
  `).join("");

  tbody.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    state.users = state.users.filter(u => u.id !== id);
    save(state);
    viewAccounts();
  });

  $("#userForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = Object.fromEntries(fd.entries());
    state.users.push({
      id: uid("u"),
      email: user.email,
      password: user.password,
      role: user.role,
      name: user.name,
      businessId: bizId
    });
    save(state);
    alert("User added");
    viewAccounts();
  });

  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email");
    const pw = fd.get("password");
    const user = state.users.find(u=>u.email===email && u.password===pw) ||
                 state.users.find(u=>u.role==="ceo" && u.email===email && u.password===pw);
    if (!user) {
      toast("Invalid credentials");
      return;
    }
    state.sessions.currentUser = { id:user.id, role:user.role, name:user.name, businessId:user.businessId };
    state.sessions.currentBusiness = user.businessId || "b_1";
    save(state);
    if (user.role === "ceo") location.hash = "/ceo/dashboard";
    else location.hash = "/admin/dashboard";
  });
}

// Employee: clock-in screen -> voice order screen
function viewEmployee() {
  const pinAdmin = state.employeePins.admin;
  const pinEmp = state.employeePins.employee;

  const activeEmp = state.employees.find(e => e.active);
  if (!activeEmp) {
    renderClockIn();
  } else {
    renderOrderScreen(activeEmp);
  }

  function renderClockIn() {
    app.innerHTML = `
      <section class="section employee-full">
        <div class="card employee-card">
          <h2>Clock In</h2>
          <p class="muted" style="margin-bottom:8px;">Enter your name and PIN to start your shift.</p>
          <form id="pinForm" class="grid">
            <label>Your Name
              <input name="name" required placeholder="Your name" />
            </label>
            <label>PIN
              <input name="pin" required placeholder="${pinEmp}" />
            </label>
            <button class="btn">Clock In</button>
            <small class="muted">Use PIN: ${pinEmp}</small>
          </form>
        </div>
      </section>
    `;

    $("#pinForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = fd.get("name");
      const pin = fd.get("pin");

      if (pin !== state.employeePins.employee) {
        return toast("Invalid PIN");
      }

      let emp = state.employees.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!emp) {
        emp = {
          id: uid("e"),
          businessId: currentBiz(),
          name,
          active: false,
          lastClockIn: null,
          totalSeconds: 0,
          tips: 0,
          ordersTaken: 0
        };
        state.employees.push(emp);
      }

      emp.active = true;
      emp.lastClockIn = new Date().toISOString();
      save(state);
      toast(`Clocked in as ${name}`);
      renderOrderScreen(emp);
    });
  }

  function renderOrderScreen(emp) {
    app.innerHTML = `
      <section class="section employee-full">
        <div class="employee-order-layout">
          <div class="card">
            <div class="flex" style="justify-content:space-between; align-items:center;">
              <div>
                <small class="muted">Logged in as</small><br />
                <strong>${emp.name}</strong>
              </div>
              <button id="clockOutBtn" class="btn secondary">Clock Out</button>
            </div>
          </div>

          <div class="card">
            <div class="order-header">
              <p class="muted">Current order</p>
              <textarea
                id="transcript"
                class="order-textarea"
                rows="2"
                placeholder="Order text will appear here in the middle…"></textarea>
            </div>

            <div class="employee-order-main">
              <p class="muted" style="margin-bottom:8px;">Speak your order to Yves</p>
              <button id="hotdogTrigger" class="hotdog-btn" type="button">
<pre id="hotdogArt" class="hotdog">
   ╭────────╮
   │  ████  │
   │  ████  │
   │  ████  │
   ╰────────╯
</pre>
              </button>

              <div class="employee-controls">
                <button id="clearBtn" class="btn secondary">Clear</button>
                <button id="detailsBtn" class="btn secondary">Chat / Details</button>
                <button id="payBtn" class="btn">Process Payment</button>
              </div>
            </div>

            <div id="detailsPanel" class="card order-details hidden">
              <h3>Order details</h3>
              <div id="details"></div>
            </div>
          </div>
        </div>
      </section>
    `;

    $("#clockOutBtn").onclick = () => {
      emp.active = false;
      if (emp.lastClockIn) {
        const worked = (Date.now() - new Date(emp.lastClockIn).getTime()) / 1000;
        emp.totalSeconds += Math.max(0, worked);
        emp.lastClockIn = null;
      }
      save(state);
      toast("Clocked out");
      renderClockIn();
    };

    setupOrderLogic(emp);
  }

  function setupOrderLogic(emp) {
    const menu = state.menu[currentBiz()] || { items: [] };
    const transcriptEl = $("#transcript");
    const detailsContainer = $("#details");
    const detailsPanel = $("#detailsPanel");
    const hotdogArt = $("#hotdogArt");
    const hotdogTrigger = $("#hotdogTrigger");
    const clearBtn = $("#clearBtn");
    const detailsBtn = $("#detailsBtn");
    const payBtn = $("#payBtn");

    const cart = { items: [], tip: 0 };

    function renderDetails() {
      const subtotal = cart.items.reduce((s, i) => s + i.lineTotal, 0);
      const total = subtotal + cart.tip;
      detailsContainer.innerHTML = `
        ${cart.items.length === 0
          ? '<p class="muted">No items yet.</p>'
          : `
            <ul>
              ${cart.items.map(i =>
                `<li>${i.name} — ${i.mods.map(m => m.name).join(", ") || "-"} (${money(i.lineTotal)})</li>`
              ).join("")}
            </ul>
          `
        }
        <div class="flex right" style="margin-top:8px;">
          <strong>Total: ${money(total)}</strong>
        </div>
      `;
    }

    renderDetails();

    clearBtn.onclick = () => {
      transcriptEl.value = "";
      cart.items = [];
      cart.tip = 0;
      renderDetails();
    };

    detailsBtn.onclick = () => {
      detailsPanel.classList.toggle("hidden");
    };

    payBtn.onclick = () => {
      if (cart.items.length === 0) {
        return toast("No items to pay for");
      }
      const subtotal = cart.items.reduce((s, i) => s + i.lineTotal, 0);
      const total = subtotal + cart.tip;
      const order = {
        id: uid("o"),
        businessId: currentBiz(),
        employeeId: emp ? emp.id : null,
        items: cart.items,
        tip: cart.tip,
        total,
        paid: true,
        ts: nowISO()
      };
      state.orders.push(order);
      emp.ordersTaken += 1;
      save(state);
      toast("Payment processed (demo).");
      cart.items = [];
      cart.tip = 0;
      transcriptEl.value = "";
      renderDetails();
    };

    // Speech recognition + hotdog animation
    let rec = null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    function startListening() {
      if (!SR) {
        alert("Speech Recognition not supported. Try Chrome.");
        return;
      }
      if (!rec) {
        rec = new SR();
        rec.lang = "en-US";
        rec.interimResults = false;
        rec.continuous = false;
        rec.onresult = (ev) => {
          const text = ev.results[0][0].transcript;
          transcriptEl.value = text;
          parseOrder(text, menu.items, cart);
          renderDetails();
          stopHotdogAnimation();
        };
        rec.onerror = (e) => {
          transcriptEl.value = "Speech error: " + e.error;
          stopHotdogAnimation();
        };
        rec.onend = () => {
          stopHotdogAnimation();
        };
      }
      try {
        startHotdogAnimation();
        rec.start();
      } catch (e) {
        // ignore double start
      }
    }

    function startHotdogAnimation() {
      if (hotdogArt) hotdogArt.classList.add("listening");
    }

    function stopHotdogAnimation() {
      if (hotdogArt) hotdogArt.classList.remove("listening");
    }

    if (hotdogTrigger) {
      hotdogTrigger.onclick = () => {
        startListening();
      };
    }

    function parseOrder(text, items, cart) {
      const t = text.toLowerCase();
      const qtyMatch = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine)\b/);
      const wordToNum = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9};
      const qty = qtyMatch ? (isNaN(qtyMatch[1]) ? wordToNum[qtyMatch[1]] : parseInt(qtyMatch[1])) : 1;
      const found = items.find(m => t.includes(m.name.toLowerCase()));
      if (!found) {
        toast("Couldn’t find a matching menu item");
        return;
      }
      const mods = [];
      const afterWith = t.split("with")[1] || "";
      for (const opt of (found.options || [])) {
        for (const ch of opt.choices) {
          const key = ch.name.toLowerCase();
          if (t.includes("no " + key)) {
            mods.push({ name:"No " + ch.name, price:0 });
            continue;
          }
          if (afterWith.includes(key)) {
            mods.push({ name:ch.name, price:ch.price || 0 });
          }
        }
      }
      if (t.includes("fries"))  mods.push({name:"Fries", price:0});
      if (t.includes("salad"))  mods.push({name:"Salad", price:1.50});
      if (t.includes("bacon"))  mods.push({name:"Bacon", price:1.50});
      const line = {
        menuId: found.id,
        name: found.name,
        basePrice: found.price,
        mods,
        lineTotal: qty * (found.price + mods.reduce((s,m)=>s + (m.price || 0), 0))
      };
      cart.items.push(line);
    }
  }
}

// Admin login (email + PIN)
function viewAdminLogin() {
  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Admin / Manager Login</h2>
          <form id="adminLogin" class="grid">
            <label>Email
              <input name="email" type="email" required value="admin@yves.local" />
            </label>
            <label>Password
              <input name="password" type="password" required value="1234" />
            </label>
            <button class="btn">Sign in</button>
          </form>
          <small class="muted">Admins/Managers can manage menu, deals, and view profits.</small>
        </div>
        <div class="card">
          <h2>Quick PIN Access</h2>
          <form id="pinLogin" class="grid">
            <label>Admin PIN
              <input name="pin" maxlength="4" placeholder="1234" required />
            </label>
            <button class="btn">Enter</button>
          </form>
          <small class="muted">Demo PIN: ${state.employeePins.admin}</small>
        </div>
      </div>
    </section>
  `;

  $("#adminLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email");
    const pw = fd.get("password");
    const user = state.users.find(u=>u.email===email && u.password===pw && (u.role==="admin"||u.role==="manager"));
    if (!user) {
      toast("Invalid credentials");
      return;
    }
    state.sessions.currentUser = { id:user.id, role:user.role, name:user.name, businessId:user.businessId };
    state.sessions.currentBusiness = user.businessId || "b_1";
    save(state);
    location.hash = "/admin/dashboard";
  });

  $("#pinLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pin = fd.get("pin");
    if (pin !== state.employeePins.admin) {
      toast("Wrong PIN");
      return;
    }
    state.sessions.currentUser = { id:"pin_admin", role:"admin", name:"Admin (PIN)", businessId:currentBiz() };
    save(state);
    location.hash = "/admin/dashboard";
  });
}

// Admin dashboard
function viewAdminDashboard() {
  const bizId = currentBiz();
  const biz = state.businesses.find(b=>b.id===bizId) || state.businesses[0];
  const orders = state.orders.filter(o=>o.businessId===biz.id);
  const todayStr = new Date().toISOString().slice(0,10);
  const todays = orders.filter(o=>o.ts.slice(0,10)===todayStr);
  const gross = todays.reduce((s,o)=>s+o.total,0);
  const myCut = gross * (biz.percentCut ?? 0.01);

  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Admin Dashboard — ${biz.name}</h2>
          <p>Today: Orders ${todays.length} | Gross ${money(gross)} | Our cut ${money(myCut)}</p>
          <div class="grid">
            <a class="btn" href="#/admin/menu">Menu Management</a>
            <a class="btn secondary" href="#/admin/profits">Profits</a>
            <a class="btn secondary" href="#/admin/users">Employees</a>
          </div>
        </div>
        <div class="card">
          <h2>Recent Orders (Today)</h2>
          <table class="table">
            <thead>
              <tr><th>Time</th><th>Total</th><th>Items</th></tr>
            </thead>
            <tbody>
              ${
                todays.slice(-8).reverse().map(o=>`
                  <tr>
                    <td>${new Date(o.ts).toLocaleTimeString()}</td>
                    <td>${money(o.total)}</td>
                    <td><small>${o.items.map(i=>i.name).join(", ")}</small></td>
                  </tr>
                `).join("") || `
                  <tr><td colspan="3"><small class="muted">No orders yet today.</small></td></tr>
                `
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

// Admin menu management
function viewAdminMenu() {
  const bizId = currentBiz();
  const menu = state.menu[bizId] ||= { items:[] };

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>Menu Management</h2>
        <form id="itemForm" class="grid grid-2">
          <label>Item Name
            <input name="name" required />
          </label>
          <label>Base Price
            <input name="price" type="number" step="0.01" required />
          </label>
          <label>Category
            <input name="category" placeholder="Main, Drink, Dessert…" />
          </label>
          <button class="btn">Add Item</button>
        </form>
      </div>

      <div class="card">
        <h2>Scan Existing Menu with AI (Prototype)</h2>
        <p class="muted" style="margin-bottom:8px;">
          Upload a picture or PDF of a menu, and Yves will try to extract items and prices.
          In a real product, this would call an AI / OCR service. Here we simulate the result.
        </p>
        <form id="scanForm" class="grid">
          <label>Upload Menu Image (JPEG, PNG, PDF)
            <input type="file" id="menuImage" accept=".jpg,.jpeg,.png,.webp,.gif,.pdf" />
          </label>
          <button class="btn" type="submit">Scan Menu with AI</button>
          <small class="muted" id="scanStatus"></small>
        </form>
      </div>

      <div class="card">
        <h2>Items</h2>
        <table class="table">
          <thead>
            <tr><th>Item</th><th>Price</th><th>Options (Sides / Add-ons / Subs)</th><th></th></tr>
          </thead>
          <tbody id="itemRows"></tbody>
        </table>
      </div>
    </section>
  `;

  const tbody = $("#itemRows");

  function renderRows() {
    if (!menu.items.length) {
      tbody.innerHTML = `<tr><td colspan="4"><small class="muted">No items yet.</small></td></tr>`;
      return;
    }
    tbody.innerHTML = menu.items.map(it => `
      <tr>
        <td>
          <strong>${it.name}</strong><br />
          <small class="muted">${it.category || ""}</small>
        </td>
        <td>${money(it.price)}</td>
        <td>
          ${
            (it.options||[]).map(opt=>`
              <div>
                <strong>${opt.label}</strong>
                <small class="muted">(${opt.type}${opt.multiple ? ", multiple" : ""})</small><br />
                <small>${opt.choices.map(c=>`${c.name}${c.price ? " " + money(c.price) : ""}`).join(", ") || "-"}</small>
              </div>
            `).join("") || "<small class='muted'>No options yet</small>"
          }
          <details style="margin-top:8px;">
            <summary>Add / Update Option</summary>
            <form data-id="${it.id}" class="optForm grid">
              <label>Type
                <select name="type">
                  <option value="side">Side</option>
                  <option value="substitution">Substitution</option>
                  <option value="addon">Add-on</option>
                </select>
              </label>
              <label>Label
                <input name="label" placeholder="e.g., Side, Add-ons, Dressing" />
              </label>
              <label>Allow Multiple?
                <select name="multiple">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>
              <label>Choices (name:price, comma separated)
                <input name="choices" placeholder="Fries:0, Salad:1.50, Soup:2" />
              </label>
              <button class="btn">Save Option</button>
            </form>
          </details>
        </td>
        <td>
          <button class="btn ghost" data-del="${it.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    $$("[data-del]").forEach(btn => {
      btn.onclick = () => {
        menu.items = menu.items.filter(x => x.id !== btn.dataset.del);
        save(state);
        renderRows();
      };
    });

    $$(".optForm").forEach(form => {
      form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const it = menu.items.find(x => x.id === form.dataset.id);
        if (!it) return;
        const opt = {
          type: fd.get("type"),
          label: fd.get("label") || fd.get("type"),
          multiple: fd.get("multiple") === "true",
          choices: (fd.get("choices") || "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
            .map(chunk => {
              const [name, price] = chunk.split(":").map(x => x.trim());
              if (!name) return null;
              return { name, price: price ? parseFloat(price) : 0 };
            })
            .filter(Boolean)
        };
        it.options ||= [];
        const idx = it.options.findIndex(o => o.type===opt.type && o.label===opt.label);
        if (idx >= 0) it.options[idx] = opt;
        else it.options.push(opt);
        save(state);
        renderRows();
      };
    });
  }


  renderRows();

  // AI menu scan prototype
  const scanForm = $("#scanForm");
  const scanStatus = $("#scanStatus");
  if (scanForm && scanStatus) {
    scanForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fileInput = $("#menuImage");
      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        scanStatus.textContent = "Please choose an image or PDF first.";
        return;
      }
      const file = fileInput.files[0];
      scanStatus.textContent = "Analyzing " + file.name + " with AI (demo)…";

      // Simulate AI / OCR by adding some example items
      setTimeout(() => {
        const demoItems = [
          { name: "House Burger", price: 11.99, category: "Main" },
          { name: "Fries", price: 3.50, category: "Side" },
          { name: "Lemonade", price: 2.99, category: "Drink" }
        ];
        demoItems.forEach(d => {
          menu.items.push({
            id: uid("m"),
            name: d.name,
            price: d.price,
            category: d.category,
            options: []
          });
        });
        save(state);
        renderRows();
        scanStatus.textContent = "AI scan complete (demo): added " + demoItems.length + " items from the uploaded menu.";
      }, 800);
    });
  }

  $("#itemForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: uid("m"),
      name: fd.get("name"),
      price: parseFloat(fd.get("price")),
      category: fd.get("category") || "",
      options: []
    };
    menu.items.push(item);
    save(state);
    e.target.reset();
    renderRows();
  });
}

// Admin profits
function viewAdminProfits() {
  const bizId = currentBiz();
  const biz = state.businesses.find(b=>b.id===bizId) || state.businesses[0];
  const orders = state.orders.filter(o=>o.businessId===biz.id);

  const daily = {};
  for (const o of orders) {
    const d = o.ts.slice(0,10);
    daily[d] = (daily[d] || 0) + o.total;
  }
  const days = Object.keys(daily).sort().slice(-7);
  const totals = days.map(d => daily[d]);

  const gross = orders.reduce((s,o)=>s+o.total,0);
  const cut = gross * (biz.percentCut ?? 0.01);

  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Profits — ${biz.name}</h2>
          <p>All-time gross: <strong>${money(gross)}</strong> |
             Our cut (1¢ per $1): <strong>${money(cut)}</strong></p>
          <canvas id="grossChart" width="600" height="320"></canvas>
          <small class="muted">Daily gross (last 7 days)</small>
        </div>
        <div class="card">
          <h2>Today’s Orders</h2>
          <table class="table">
            <thead>
              <tr><th>Time</th><th>Total</th><th>Tip</th></tr>
            </thead>
            <tbody>
              ${
                orders.filter(o=>o.ts.slice(0,10)===new Date().toISOString().slice(0,10))
                .map(o=>`
                  <tr>
                    <td>${new Date(o.ts).toLocaleTimeString()}</td>
                    <td>${money(o.total)}</td>
                    <td>${money(o.tip)}</td>
                  </tr>
                `).join("") || `
                  <tr><td colspan="3"><small class="muted">No orders yet today.</small></td></tr>
                `
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  const canvas = $("#grossChart");
  if (!canvas) return;
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const pad = 32;
  c.clearRect(0,0,W,H);
  c.strokeStyle = "#e5e7eb";
  c.beginPath();
  c.moveTo(pad, pad);
  c.lineTo(pad, H-pad);
  c.lineTo(W-pad, H-pad);
  c.stroke();

  const max = Math.max(10, ...totals, 10);
  const bw = (W - 2*pad) / Math.max(1, days.length) - 10;

  days.forEach((d, i) => {
    const x = pad + i * ((W-2*pad)/Math.max(1, days.length)) + 5;
    const h = (H-2*pad) * (totals[i] / max);
    c.fillStyle = "#111827";
    c.fillRect(x, H-pad-h, bw, h);
    c.fillStyle = "#9ca3af";
    c.fillText(d.slice(5), x, H-pad+12);
  });
}

// Admin users (employees overview)
function viewAdminUsers() {
  const bizId = currentBiz();
  const emps = state.employees.filter(e=>e.businessId===bizId);

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>Employees</h2>
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Status</th><th>Hours</th><th>Orders</th><th>Tips</th></tr>
          </thead>
          <tbody>
            ${
              emps.map(e=>`
                <tr>
                  <td>${e.name}</td>
                  <td>${e.active ? '<span class="badge">On shift</span>' : '<small class="muted">Off</small>'}</td>
                  <td>${(e.totalSeconds/3600).toFixed(2)}</td>
                  <td>${e.ordersTaken}</td>
                  <td>${money(e.tips)}</td>
                </tr>
              `).join("") || `
                <tr><td colspan="5"><small class="muted">No employees yet.</small></td></tr>
              `
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// CEO login & dashboard
function viewCeoLogin() {
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>CEO Login</h2>
        <form id="ceoLogin" class="grid">
          <label>Email
            <input name="email" type="email" required value="ceo@yves.local" />
          </label>
          <label>Password
            <input name="password" type="password" required value="yvesrocks" />
          </label>
          <button class="btn">Sign in</button>
        </form>
      </div>
    </section>
  `;

  $("#ceoLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email");
    const pw = fd.get("password");
    const user = state.users.find(u=>u.role==="ceo" && u.email===email && u.password===pw);
    if (!user) {
      toast("Invalid credentials");
      return;
    }
    state.sessions.currentUser = { id:user.id, role:user.role, name:user.name, businessId:null };
    save(state);
    location.hash = "/ceo/dashboard";
  });
}

function viewCeoDashboard() {
  const rows = state.businesses.map(b => {
    const orders = state.orders.filter(o=>o.businessId===b.id);
    const gross = orders.reduce((s,o)=>s+o.total,0);
    const cut = gross * (b.percentCut ?? 0.01);
    return {
      id:b.id,
      name:b.name,
      gross,
      cut,
      orders:orders.length
    };
  });

  const totalGross = rows.reduce((s,r)=>s+r.gross,0);
  const totalCut = rows.reduce((s,r)=>s+r.cut,0);

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>CEO Dashboard</h2>
        <p>Businesses: ${rows.length} | Total Gross ${money(totalGross)} | Our Revenue ${money(totalCut)}</p>
        <table class="table">
          <thead>
            <tr><th>Business</th><th>Orders</th><th>Gross</th><th>Our Cut</th></tr>
          </thead>
          <tbody>
            ${
              rows.map(r=>`
                <tr>
                  <td>${r.name}</td>
                  <td>${r.orders}</td>
                  <td>${money(r.gross)}</td>
                  <td>${money(r.cut)}</td>
                </tr>
              `).join("")
            }
          </tbody>
        </table>
        <canvas id="ceoChart" width="600" height="320"></canvas>
      </div>
      <div class="card">
        <h2>Add Business</h2>
        <form id="bizForm" class="grid grid-2">
          <label>Name
            <input name="name" required placeholder="e.g., Moonlight Cafe" />
          </label>
          <label>Cut (e.g., 0.01)
            <input name="cut" type="number" step="0.001" value="0.01" />
          </label>
          <button class="btn">Add</button>
        </form>
      </div>
    </section>
  `;

  const canvas = $("#ceoChart");
  if (canvas) {
    const c = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const pad = 32;
    c.clearRect(0,0,W,H);
    c.strokeStyle = "#e5e7eb";
    c.beginPath();
    c.moveTo(pad, pad);
    c.lineTo(pad, H-pad);
    c.lineTo(W-pad, H-pad);
    c.stroke();

    const max = Math.max(10, ...rows.map(r=>r.gross), 10);
    const bw = (W - 2*pad) / Math.max(1, rows.length) - 10;

    rows.forEach((r, i) => {
      const x = pad + i * ((W-2*pad) / Math.max(1, rows.length)) + 5;
      const h = (H-2*pad) * (r.gross / max);
      c.fillStyle = "#22c55e";
      c.fillRect(x, H-pad-h, bw, h);
      c.fillStyle = "#9ca3af";
      c.fillText(r.name.slice(0,10), x, H-pad+12);
    });
  }

  $("#bizForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const b = {
      id: uid("b"),
      name: fd.get("name"),
      percentCut: parseFloat(fd.get("cut") || "0.01")
    };
    state.businesses.push(b);
    state.menu[b.id] = { items:[] };
    save(state);
    alert("Business added");
    viewCeoDashboard();
  });
}
