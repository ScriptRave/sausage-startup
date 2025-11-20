// Yves POS Prototype
// Simple hash router + in-memory/localStorage data. No backend needed.

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
const app = $("#app");
const year = $("#year"); if (year) year.textContent = new Date().getFullYear();
// Dropdown navigation for Menu ▾
const menu = $("#menu");
const dropdown = $("#dropdown");
if (menu && dropdown) {
  menu.addEventListener("click", (e)=>{
    e.stopPropagation();
    const open = dropdown.style.display === "flex";
    dropdown.style.display = open ? "none" : "flex";
    menu.setAttribute("aria-expanded", (!open).toString());
  });
  document.addEventListener("click", ()=>{
    dropdown.style.display = "none";
    menu.setAttribute("aria-expanded","false");
  });
}

// ---- Seed Data (localStorage) ----
const STORAGE_KEY = "yves_data_v1";
const nowISO = ()=>new Date().toISOString();

function seedData(){
  return {
    businesses: [
      { id: "b_1", name: "Sample Bistro", cardReaderConnected: false, percentCut: 0.01 }
    ],
    users: [
      { id:"u_admin", email:"admin@yves.local", role:"admin", businessId:"b_1", password:"1234", name:"Store Admin" },
      { id:"u_mgr", email:"manager@yves.local", role:"manager", businessId:"b_1", password:"password", name:"Store Manager" },
      { id:"u_ceo", email:"ceo@yves.local", role:"ceo", businessId:null, password:"yvesrocks", name:"Yves CEO" },
      { id:"u_emp", email:"employee@yves.local", role:"employee", businessId:"b_1", password:"4321", name:"Alex Employee" },
    ],
    employeePins: { admin:"1234", employee:"4321" },
    employees: [
      { id:"e_1", businessId:"b_1", name:"Alex", active:false, lastClockIn:null, totalSeconds:0, tips:0, ordersTaken:0 }
    ],
    menu: {
      b_1: {
        items: [
          { id:"m_1", name:"Cheeseburger", price:8.99, category:"Main",
            options:[
              { type:"side", label:"Side", choices:[
                { name:"Fries", price:0 }, { name:"Salad", price:1.50 }, { name:"Soup", price:2.00 }
              ]},
              { type:"addon", label:"Add-ons", multiple:true, choices:[
                { name:"Bacon", price:1.50 }, { name:"Extra Cheese", price:1.00 }, { name:"Avocado", price:2.00 }
              ]},
              { type:"substitution", label:"Substitution", choices:[
                { name:"Gluten-free bun", price:1.00 }, { name:"No onion", price:0 }, { name:"No tomato", price:0 }
              ]}
            ]
          },
          { id:"m_2", name:"Caesar Salad", price:7.25, category:"Main",
            options:[
              { type:"addon", label:"Add-ons", multiple:true, choices:[
                { name:"Chicken", price:3.00 }, { name:"Croutons", price:0.50 }, { name:"Parmesan", price:0.75 }
              ]},
              { type:"substitution", label:"Dressing", choices:[
                { name:"Ranch", price:0 }, { name:"Balsamic", price:0 }, { name:"No dressing", price:0 }
              ]}
            ]
          },
          { id:"m_3", name:"Iced Tea", price:2.50, category:"Drinks",
            options:[
              { type:"addon", label:"Sweetener", choices:[
                { name:"Sugar", price:0 }, { name:"Honey", price:0.25 }, { name:"No sweetener", price:0 }
              ]}
            ]
          }
        ]
      }
    },
    orders: [], // {id, businessId, employeeId, items:[{menuId, name, basePrice, mods:[] , lineTotal}], tip, total, paid, ts}
    sessions: { currentUser:null, currentBusiness:"b_1" }
  };
}

function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData())); return seedData(); }
  try { return JSON.parse(raw); } catch(e){ localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData())); return seedData(); }
}
function save(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = load();

// ---- Router ----
const routes = {
  "/home": viewHome,
  "/employee": viewEmployee,
  "/admin": viewAdminLogin,
  "/admin/dashboard": viewAdminDashboard,
  "/admin/menu": viewAdminMenu,
  "/admin/profits": viewAdminProfits,
  "/admin/users": viewAdminUsers,
  "/accounts": viewAccounts,
  "/ceo": viewCeoLogin,
  "/ceo/dashboard": viewCeoDashboard,
};
function router(){
  const hash = location.hash.replace("#","") || "/home";
  const view = routes[hash] || viewHome;
  view();
}
window.addEventListener("hashchange", router);
window.addEventListener("load", router);

// ---- Utils ----
function money(n){ return "$" + (Math.round(n*100)/100).toFixed(2); }
function toast(msg){ alert(msg); }
function uid(prefix="id"){ return prefix + "_" + Math.random().toString(36).slice(2,9); }
function currentBiz(){ return state.sessions.currentBusiness || "b_1"; }
function currentUser(){ return state.sessions.currentUser; }

// ---- Home ----
function viewHome(){
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h1>Yves — AI POS Prototype</h1>
        <p class="muted">Speech-first ordering for fast, simple checkout. Choose a portal:</p>
        <div class="flex">
          <a class="btn" href="#/employee">Employee (PIN & clock-in)</a>
          <a class="btn secondary" href="#/admin">Admin / Manager</a>
          <a class="btn secondary" href="#/accounts">Accounts</a>
          <a class="btn secondary" href="#/ceo">CEO</a>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <h2>Voice Ordering</h2>
          <p>Tap the microphone, speak the order: “one cheeseburger with fries and bacon, one iced tea no sweetener.”
          You can correct items before payment.</p>
        </div>
        <div class="card">
          <h2>Card Reader (Prototype)</h2>
          <p>Simulated “Process Payment” button stands in for a real card reader or Apple Pay device connection.</p>
        </div>
      </div>
    </section>
  `;
}

// ---- Accounts (email login examples & management) ----
function viewAccounts(){
  const bizId = currentBiz();
  const users = state.users.filter(u=>u.role!=="ceo");
  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Email Login (Admin/Manager/Employee)</h2>
          <form id="loginForm" class="grid">
            <label>Email <input name="email" required placeholder="you@business.com"></label>
            <label>Password <input name="password" required type="password" placeholder="••••••"></label>
            <button class="btn">Sign in</button>
            <small class="muted">Default accounts: admin@yves.local/1234, manager@yves.local/password, employee@yves.local/4321</small>
          </form>
        </div>
        <div class="card">
          <h2>Manage Users (this device)</h2>
          <form id="userForm" class="grid">
            <label>Name <input name="name" required></label>
            <label>Email <input name="email" type="email" required></label>
            <label>Password <input name="password" required></label>
            <label>Role
              <select name="role">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button class="btn">Add User</button>
          </form>
          <table class="table" style="margin-top:12px">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody id="userRows"></tbody>
          </table>
        </div>
      </div>
    </section>
  `;
  // populate users
  const tbody = $("#userRows");
  tbody.innerHTML = users.map(u=>`<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td><button data-id="${u.id}" class="btn ghost">Remove</button></td></tr>`).join("");
  tbody.addEventListener("click", e=>{
    const id = e.target.dataset.id;
    if(!id) return;
    state.users = state.users.filter(u=>u.id!==id);
    save(state); viewAccounts();
  });

  $("#userForm").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = Object.fromEntries(fd.entries());
    state.users.push({ id:uid("u"), email:user.email, password:user.password, role:user.role, name:user.name, businessId:bizId });
    save(state); toast("User added"); viewAccounts();
  });
  $("#loginForm").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email"); const pw = fd.get("password");
    const user = state.users.find(u=>u.email===email && u.password===pw) || state.users.find(u=>u.role==="ceo" && u.email===email && u.password===pw);
    if(!user) return toast("Invalid credentials");
    state.sessions.currentUser = { id:user.id, role:user.role, name:user.name, businessId:user.businessId };
    save(state);
    if(user.role==="ceo") location.hash = "/ceo/dashboard";
    else location.hash = "/admin/dashboard";
  });
}

// ---- Employee (PIN + Name, clock-in/out, voice orders) ----
function viewEmployee(){
  const pinAdmin = state.employeePins.admin;
  const pinEmp = state.employeePins.employee;
  const user = currentUser();
  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Clock In</h2>
          <form id="pinForm" class="grid">
            <label>Your Name <input name="name" required placeholder="e.g., Alex"></label>
            <label>4-digit PIN <input name="pin" required maxlength="4" pattern="\\d{4}" placeholder="4321"></label>
            <button class="btn">Clock In</button>
            <small class="muted">Employee PIN: ${pinEmp}. (Admin PIN: ${pinAdmin})</small>
          </form>
          <div id="shiftStatus"></div>
        </div>
        <div class="card">
          <h2>Voice Order</h2>
          <div id="orderUI"></div>
        </div>
      </div>
    </section>
  `;

  const shiftStatus = $("#shiftStatus");
  function renderShift(name){
    const emp = state.employees.find(e=>e.name.toLowerCase()===name.toLowerCase());
    if(!emp) return shiftStatus.innerHTML = "";
    const hours = (emp.totalSeconds/3600).toFixed(2);
    shiftStatus.innerHTML = `
      <p>Worker: <strong>${emp.name}</strong> ${emp.active?'<span class="badge">On shift</span>':'<span class="badge">Off shift</span>'}</p>
      <p>Hours: ${hours} | Orders: ${emp.ordersTaken} | Tips: ${money(emp.tips)}</p>
      ${emp.active ? '<button id="clockOut" class="btn secondary">Clock Out</button>' : ''}
    `;
    const clockOut = $("#clockOut");
    if(clockOut){
      clockOut.onclick = ()=>{
        emp.active = false;
        if(emp.lastClockIn){
          const secs = (Date.now() - new Date(emp.lastClockIn).getTime())/1000;
          emp.totalSeconds += Math.max(0, secs);
          emp.lastClockIn = null;
        }
        save(state); renderShift(emp.name); toast("Clocked out");
      };
    }
  }

  $("#pinForm").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get("name");
    const pin = fd.get("pin");
    if(pin !== state.employeePins.employee && pin !== state.employeePins.admin){
      return toast("Invalid PIN");
    }
    let emp = state.employees.find(x=>x.name.toLowerCase()===name.toLowerCase());
    if(!emp){
      emp = { id:uid("e"), businessId:currentBiz(), name, active:false, lastClockIn:null, totalSeconds:0, tips:0, ordersTaken:0 };
      state.employees.push(emp);
    }
    emp.active = true;
    emp.lastClockIn = new Date().toISOString();
    save(state);
    toast(`Clocked in as ${name}`);
    renderShift(name);
  });

  // Order UI
  renderOrderUI();
  function renderOrderUI(){
    const menu = state.menu[currentBiz()] || { items:[] };
    $("#orderUI").innerHTML = `
      <div class="grid">
        <div class="flex">
          <button id="micBtn" class="btn">🎤 Start Listening</button>
          <button id="clearBtn" class="btn secondary">Clear</button>
        </div>
        <textarea id="transcript" rows="2" placeholder="Recognized speech will appear here..."></textarea>
        <div class="card" id="cart"></div>
      </div>
    `;
    const cart = { items:[], tip:0 };
    function renderCart(){
      const subtotal = cart.items.reduce((s,i)=>s+i.lineTotal,0);
      const total = subtotal + cart.tip;
      $("#cart").innerHTML = `
        <h3>Cart</h3>
        ${cart.items.length===0 ? '<p class="muted">No items yet.</p>' : `
          <table class="table">
            <thead><tr><th>Item</th><th>Mods</th><th>Price</th><th></th></tr></thead>
            <tbody>
              ${cart.items.map((it,idx)=>`
                <tr>
                  <td>${it.name}</td>
                  <td><small>${it.mods.map(m=>m.name + (m.price?` (${money(m.price)})`:"")).join(", ") || "-"}</small></td>
                  <td>${money(it.lineTotal)}</td>
                  <td><button data-idx="${idx}" class="btn ghost">Remove</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `}
        <div class="flex right"><strong>Subtotal: ${money(subtotal)}</strong></div>
        <div class="flex right">
          <label>Tip <input id="tipInput" type="number" step="0.01" value="${cart.tip.toFixed(2)}" style="max-width:120px"></label>
        </div>
        <div class="flex right"><strong>Total: ${money(total)}</strong></div>
        <div class="flex right">
          <button id="payBtn" class="btn">Process Payment</button>
        </div>
      `;
      $("#cart").addEventListener("click", e=>{
        const idx = e.target.dataset.idx;
        if(idx!==undefined){
          cart.items.splice(Number(idx),1); renderCart();
        }
      });
      $("#tipInput").addEventListener("input", e=>{
        cart.tip = parseFloat(e.target.value||"0");
        renderCart();
      });
      $("#payBtn").onclick = ()=>{
        if(cart.items.length===0) return toast("Cart is empty");
        const emp = state.employees.find(e=>e.active);
        const subtotal = cart.items.reduce((s,i)=>s+i.lineTotal,0);
        const total = subtotal + cart.tip;
        const order = {
          id:uid("o"), businessId: currentBiz(), employeeId: emp?emp.id:null, items:cart.items, tip:cart.tip, total, paid:true, ts: nowISO()
        };
        state.orders.push(order);
        if(emp){ emp.ordersTaken += 1; emp.tips += cart.tip; }
        save(state);
        toast("Payment processed (demo).");
        renderOrderUI();
      };
    }
    renderCart();

    $("#clearBtn").onclick = ()=>{ $("#transcript").value=""; cart.items=[]; cart.tip=0; renderCart(); };

    // Speech recognition (Web Speech API)
    let rec;
    $("#micBtn").onclick = async ()=>{
      if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Speech Recognition not supported in this browser. Try Chrome.");
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      rec = new SR();
      rec.lang = "en-US"; rec.interimResults = false; rec.continuous = false;
      rec.onresult = (ev)=>{
        const text = ev.results[0][0].transcript;
        $("#transcript").value = text;
        parseOrder(text, menu.items, cart); renderCart();
      };
      rec.onerror = (e)=> alert("Speech error: " + e.error);
      rec.start();
    };
  }

  // Parse simple phrases into items: "one cheeseburger with fries and bacon"
  function parseOrder(text, items, cart){
    const t = text.toLowerCase();
    const qtyMatch = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine)\b/);
    const wordToNum = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9};
    const qty = qtyMatch ? (isNaN(qtyMatch[1]) ? wordToNum[qtyMatch[1]] : parseInt(qtyMatch[1])) : 1;

    // find item by name keyword
    const found = items.find(m=> t.includes(m.name.toLowerCase()));
    if(!found) { toast("Couldn’t find a matching menu item"); return; }

    // mods via keywords after 'with' or 'no' or 'substitute'
    const mods = [];
    function addMod(name, price){ mods.push({ name, price }); }
    const afterWith = t.split("with")[1] || "";
    const tokens = afterWith.split(/[ ,]+/).filter(Boolean);

    // scan all option choices for mentions
    for(const opt of (found.options||[])){
      for(const ch of opt.choices){
        const key = ch.name.toLowerCase();
        if(t.includes("no "+key)){ addMod("No "+ch.name, 0); continue; }
        if(t.includes("substitute "+key) || t.includes("swap "+key)){ addMod("Sub "+ch.name, ch.price||0); continue; }
        if(afterWith.includes(key)){ addMod(ch.name, ch.price||0); }
      }
    }

    // Also common sides words
    if(t.includes("fries")) addMod("Fries", 0);
    if(t.includes("salad")) addMod("Salad", 1.50);
    if(t.includes("bacon")) addMod("Bacon", 1.50);
    if(t.includes("no onion")) addMod("No onion", 0);

    const line = {
      menuId: found.id,
      name: found.name,
      basePrice: found.price,
      mods,
      lineTotal: qty * (found.price + mods.reduce((s,m)=>s+(m.price||0),0))
    };
    cart.items.push(line);
  }
}

// ---- Admin Login ----
function viewAdminLogin(){
  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Admin / Manager Login</h2>
          <form id="adminLogin" class="grid">
            <label>Email <input name="email" required value="admin@yves.local"></label>
            <label>Password <input name="password" required type="password" value="1234"></label>
            <button class="btn">Sign in</button>
          </form>
          <small class="muted">Admins/Managers manage menu, prices, specials, and view profits.</small>
        </div>
        <div class="card">
          <h2>PIN (Quick Access)</h2>
          <form id="pinLogin" class="grid">
            <label>Admin PIN <input name="pin" required maxlength="4" placeholder="1234"></label>
            <button class="btn">Enter</button>
          </form>
        </div>
      </div>
    </section>
  `;
  $("#adminLogin").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email"), pw = fd.get("password");
    const user = state.users.find(u=>u.email===email && u.password===pw && (u.role==="admin"||u.role==="manager"));
    if(!user) return toast("Invalid credentials");
    state.sessions.currentUser = { id:user.id, role:user.role, name:user.name, businessId:user.businessId };
    save(state); location.hash="/admin/dashboard";
  });
  $("#pinLogin").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    if(fd.get("pin") !== state.employeePins.admin) return toast("Wrong PIN");
    state.sessions.currentUser = { id:"pin_admin", role:"admin", name:"Admin (PIN)", businessId:currentBiz() };
    save(state); location.hash="/admin/dashboard";
  });
}

// ---- Admin Dashboard ----
function viewAdminDashboard(){
  const bizId = currentBiz();
  const orders = state.orders.filter(o=>o.businessId===bizId);
  const today = new Date().toISOString().slice(0,10);
  const todaysOrders = orders.filter(o=>o.ts.slice(0,10)===today);
  const gross = todaysOrders.reduce((s,o)=>s+o.total,0);
  const cut = gross * (state.businesses.find(b=>b.id===bizId)?.percentCut || 0.01);
  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Admin Dashboard — ${state.businesses.find(b=>b.id===bizId)?.name || ""}</h2>
          <p>Today: Orders ${todaysOrders.length} | Gross ${money(gross)} | Our cut ${money(cut)}</p>
          <div class="flex">
            <a class="btn" href="#/admin/menu">Menu Management</a>
            <a class="btn secondary" href="#/admin/profits">Profits</a>
            <a class="btn secondary" href="#/admin/users">Users</a>
          </div>
        </div>
        <div class="card">
          <h2>Recent Orders</h2>
          <table class="table">
            <thead><tr><th>Time</th><th>Total</th><th>Items</th></tr></thead>
            <tbody>
              ${todaysOrders.slice(-6).reverse().map(o=>`
                <tr>
                  <td>${new Date(o.ts).toLocaleTimeString()}</td>
                  <td>${money(o.total)}</td>
                  <td><small>${o.items.map(i=>i.name).join(", ")}</small></td>
                </tr>`).join("") || `<tr><td colspan="3"><small class="muted">No orders yet today.</small></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

// ---- Admin Menu Management (items + sides/subs/addons) ----
function viewAdminMenu(){
  const bizId = currentBiz();
  const menu = state.menu[bizId] ||= { items:[] };
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>Menu Management</h2>
        <form id="itemForm" class="grid grid-2">
          <label>Item name <input name="name" required></label>
          <label>Base price <input name="price" type="number" step="0.01" required></label>
          <label>Category <input name="category" placeholder="Main, Drinks, Dessert"></label>
          <button class="btn">Add Item</button>
        </form>
      </div>
      <div class="card">
        <h2>Items</h2>
        <table class="table">
          <thead><tr><th>Item</th><th>Price</th><th>Options</th><th></th></tr></thead>
          <tbody id="itemRows"></tbody>
        </table>
      </div>
    </section>
  `;
  const tbody = $("#itemRows");
  function renderRows(){
    const rows = menu.items.map(it=>`
      <tr>
        <td><strong>${it.name}</strong><br><small class="muted">${it.category||""}</small></td>
        <td>${money(it.price)}</td>
        <td>
          ${(it.options||[]).map(opt=>`
            <div><strong>${opt.label}</strong> <small class="muted">(${opt.type}${opt.multiple?" multiple":""})</small>
              <div><small>${opt.choices.map(c=>`${c.name} ${c.price?money(c.price):""}`).join(", ")||"-"}</small></div>
            </div>
          `).join("") || "<small class='muted'>No options</small>"}
          <details style="margin-top:8px"><summary>Add/Update Option</summary>
            <form data-id="${it.id}" class="optForm grid">
              <label>Type
                <select name="type">
                  <option value="side">side</option>
                  <option value="substitution">substitution</option>
                  <option value="addon">addon</option>
                </select>
              </label>
              <label>Label <input name="label" placeholder="e.g., Side, Add-ons, Dressing"></label>
              <label>Allow multiple? <select name="multiple"><option value="false">No</option><option value="true">Yes</option></select></label>
              <label>Choices (name:price, comma-separated)
                <input name="choices" placeholder="Fries:0, Salad:1.50, Soup:2">
              </label>
              <button class="btn">Save Option</button>
            </form>
          </details>
        </td>
        <td><button class="btn ghost" data-del="${it.id}">Delete</button></td>
      </tr>
    `).join("");
    tbody.innerHTML = rows || `<tr><td colspan="4"><small class="muted">No items yet.</small></td></tr>`;
    // bind delete
    tbody.querySelectorAll("[data-del]").forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.dataset.del;
        menu.items = menu.items.filter(x=>x.id!==id);
        save(state); renderRows();
      };
    });
    // bind option forms
    tbody.querySelectorAll(".optForm").forEach(f=>{
      f.addEventListener("submit", e=>{
        e.preventDefault();
        const fd = new FormData(f);
        const it = menu.items.find(x=>x.id===f.dataset.id);
        const opt = {
          type: fd.get("type"),
          label: fd.get("label") || fd.get("type"),
          multiple: fd.get("multiple")==="true",
          choices: (fd.get("choices")||"").split(",").map(s=>{
            const [n,p] = s.split(":").map(x=>x.trim());
            if(!n) return null;
            return { name:n, price: p? parseFloat(p): 0 };
          }).filter(Boolean)
        };
        it.options ||= [];
        // replace same-type/label if exists
        const idx = it.options.findIndex(o=>o.type===opt.type && o.label===opt.label);
        if(idx>=0) it.options[idx]=opt; else it.options.push(opt);
        save(state); renderRows();
      });
    });
  }
  renderRows();

  $("#itemForm").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = { id:uid("m"), name:fd.get("name"), price:parseFloat(fd.get("price")), category:fd.get("category")||"", options:[] };
    menu.items.push(item); save(state); e.target.reset(); renderRows();
  });
}

// ---- Admin Profits ----
function viewAdminProfits(){
  const bizId = currentBiz();
  const orders = state.orders.filter(o=>o.businessId===bizId);
  // simple daily totals (last 7 days)
  const buckets = {};
  for(const o of orders){
    const d = o.ts.slice(0,10); buckets[d] = (buckets[d]||0) + o.total;
  }
  const days = Object.keys(buckets).sort().slice(-7);
  const totals = days.map(d=>buckets[d]);
  const gross = orders.reduce((s,o)=>s+o.total,0);
  const cut = gross * (state.businesses.find(b=>b.id===bizId)?.percentCut || 0.01);
  app.innerHTML = `
    <section class="section">
      <div class="grid grid-2">
        <div class="card">
          <h2>Profits (All Time)</h2>
          <p>Gross: <strong>${money(gross)}</strong> | Our cut (1¢ per $1): <strong>${money(cut)}</strong></p>
          <canvas id="grossChart" width="600" height="300"></canvas>
          <small class="muted">Daily gross (last 7 days)</small>
        </div>
        <div class="card">
          <h2>Breakdown (Today)</h2>
          <table class="table">
            <thead><tr><th>Time</th><th>Total</th><th>Tip</th></tr></thead>
            <tbody>
              ${state.orders.filter(o=>o.ts.slice(0,10)===new Date().toISOString().slice(0,10)).map(o=>`
                <tr><td>${new Date(o.ts).toLocaleTimeString()}</td><td>${money(o.total)}</td><td>${money(o.tip)}</td></tr>
              `).join("") || `<tr><td colspan="3"><small class="muted">No orders yet today.</small></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
  // draw chart
  const c = $("#grossChart").getContext("2d");
  const W = 600, H = 300; c.clearRect(0,0,W,H);
  const pad = 30;
  const max = Math.max(10, ...totals, 10);
  // axes
  c.strokeStyle = "#334155"; c.beginPath(); c.moveTo(pad, pad); c.lineTo(pad, H-pad); c.lineTo(W-pad, H-pad); c.stroke();
  if(days.length){
    const bw = (W-2*pad)/days.length - 10;
    days.forEach((d,i)=>{
      const x = pad + i*((W-2*pad)/days.length) + 5;
      const h = (H-2*pad) * (totals[i]/max);
      c.fillStyle = "#7c3aed";
      c.fillRect(x, H-pad-h, bw, h);
      c.fillStyle = "#9ca3af";
      c.fillText(d.slice(5), x, H-pad+12);
    });
  }
}

// ---- Admin Users (quick overview of employees) ----
function viewAdminUsers(){
  const emp = state.employees.filter(e=>e.businessId===currentBiz());
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>Employees</h2>
        <table class="table">
          <thead><tr><th>Name</th><th>Status</th><th>Hours</th><th>Orders</th><th>Tips</th></tr></thead>
          <tbody>
            ${emp.map(e=>`
              <tr>
                <td>${e.name}</td>
                <td>${e.active?'<span class="badge">On shift</span>':'<small class="muted">Off</small>'}</td>
                <td>${(e.totalSeconds/3600).toFixed(2)}</td>
                <td>${e.ordersTaken}</td>
                <td>${money(e.tips)}</td>
              </tr>
            `).join("") || `<tr><td colspan="5"><small class="muted">No employees yet.</small></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// ---- CEO Login ----
function viewCeoLogin(){
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>CEO Login</h2>
        <form id="ceoLogin" class="grid">
          <label>Email <input name="email" required value="ceo@yves.local"></label>
          <label>Password <input name="password" required type="password" value="yvesrocks"></label>
          <button class="btn">Sign in</button>
        </form>
      </div>
    </section>
  `;
  $("#ceoLogin").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const u = state.users.find(u=>u.role==="ceo" && u.email===fd.get("email") && u.password===fd.get("password"));
    if(!u) return toast("Invalid credentials");
    state.sessions.currentUser = { id:u.id, role:u.role, name:u.name, businessId:null };
    save(state); location.hash="/ceo/dashboard";
  });
}

// ---- CEO Dashboard (all businesses, revenue & our cut) ----
function viewCeoDashboard(){
  const biz = state.businesses;
  const rows = biz.map(b=>{
    const orders = state.orders.filter(o=>o.businessId===b.id);
    const gross = orders.reduce((s,o)=>s+o.total,0);
    const cut = gross * (b.percentCut || 0.01);
    return { id:b.id, name:b.name, gross, cut, orders:orders.length };
  });
  const totalGross = rows.reduce((s,r)=>s+r.gross,0);
  const totalCut = rows.reduce((s,r)=>s+r.cut,0);
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>CEO Dashboard</h2>
        <p>Businesses: ${rows.length} | Total Gross ${money(totalGross)} | Our Revenue ${money(totalCut)}</p>
        <table class="table">
          <thead><tr><th>Business</th><th>Orders</th><th>Gross</th><th>Our Cut</th></tr></thead>
          <tbody>
            ${rows.map(r=>`<tr><td>${r.name}</td><td>${r.orders}</td><td>${money(r.gross)}</td><td>${money(r.cut)}</td></tr>`).join("")}
          </tbody>
        </table>
        <canvas id="ceoChart" width="600" height="300"></canvas>
      </div>
      <div class="card">
        <h2>Add Business</h2>
        <form id="bizForm" class="grid grid-2">
          <label>Name <input name="name" required placeholder="e.g., Moonlight Cafe"></label>
          <label>Cut (e.g., 0.01) <input name="cut" type="number" step="0.001" value="0.01"></label>
          <button class="btn">Add</button>
        </form>
      </div>
    </section>
  `;
  // chart
  const c = $("#ceoChart").getContext("2d");
  const W=600,H=300, pad=30; c.clearRect(0,0,W,H);
  c.strokeStyle="#334155"; c.beginPath(); c.moveTo(pad,pad); c.lineTo(pad,H-pad); c.lineTo(W-pad,H-pad); c.stroke();
  const max = Math.max(10, ...rows.map(r=>r.gross));
  const bw = (W-2*pad)/Math.max(1, rows.length)-10;
  rows.forEach((r,i)=>{
    const x = pad + i*((W-2*pad)/Math.max(1,rows.length)) + 5;
    const h = (H-2*pad) * (r.gross/max);
    c.fillStyle="#22c55e"; c.fillRect(x, H-pad-h, bw, h);
    c.fillStyle="#9ca3af"; c.fillText(r.name.slice(0,10), x, H-pad+12);
  });

  $("#bizForm").addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const b = { id:uid("b"), name:fd.get("name"), cardReaderConnected:false, percentCut: parseFloat(fd.get("cut")||"0.01") };
    state.businesses.push(b);
    // create empty menu bucket
    state.menu[b.id] = { items:[] };
    save(state);
    alert("Business added"); viewCeoDashboard();
  });
}

