function showToast(msg, type) {
  var old = document.querySelector('.toast-message');
  if (old) old.remove();
  var t = document.createElement('div');
  t.className = 'toast-message' + (type === 'red' ? ' red' : '');
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 3200);
}

function checkAuth() {
  var loggedIn = localStorage.getItem('ck_logged_in') === 'true';
  var setupDone = localStorage.getItem('ck_setup_done') === 'true';
  if (!loggedIn) {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('main-app').style.display = 'none';
  } else if (!setupDone) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('setup-screen').classList.add('active');
    document.getElementById('main-app').style.display = 'none';
    loadSetupState();
  } else {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('main-app').style.display = 'block';
    initApp();
  }
}

function showSignup() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'block';
  document.getElementById('auth-title').innerText = 'Create Your Profile';
}
function showLogin() {
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('auth-title').innerText = 'Welcome to CK Auto';
}

function validatePassword(p) {
  if (!p || p.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(p)) return 'Password must contain a letter';
  if (!/[0-9]/.test(p)) return 'Password must contain a number';
  return null;
}

function login() {
  var id = document.getElementById('loginPhone').value.trim();
  var pass = document.getElementById('loginPassword').value;
  if (!id || !pass) return showToast('Please fill in all fields', 'red');
  var user = JSON.parse(localStorage.getItem('ck_user') || 'null');
  if (!user) return showToast('No account found. Please Sign Up first.', 'red');
  if (user.phone !== id && user.email !== id) return showToast('Account not found for that phone/email', 'red');
  if (user.password !== pass) return showToast('Incorrect password. Try again.', 'red');
  localStorage.setItem('ck_logged_in', 'true');
  showToast('Login successful! Welcome ' + user.name.split(' ')[0], 'green');
  setTimeout(checkAuth, 800);
}

function signup() {
  var name = document.getElementById('signupName').value.trim();
  var business = document.getElementById('signupBusiness').value.trim() || 'Not set';
  var phone = document.getElementById('signupPhone').value.trim();
  var email = document.getElementById('signupEmail').value.trim();
  var pass = document.getElementById('signupPassword').value;
  var confirm = document.getElementById('signupPasswordConfirm').value;

  if (!name || !phone || !email || !pass) return showToast('Please fill in all required fields', 'red');
  var pe = validatePassword(pass);
  if (pe) return showToast(pe, 'red');
  if (pass !== confirm) return showToast('Passwords do not match', 'red');
  if (!email.includes('@gmail.com') && !email.includes('@outlook.com')) return showToast('Email must end with @gmail.com or @outlook.com', 'red');
  if (phone.length < 10) return showToast('Please enter a valid phone number', 'red');

  localStorage.setItem('ck_user', JSON.stringify({ name: name, business: business, phone: phone, email: email, password: pass }));
  localStorage.setItem('ck_logged_in', 'true');
  showToast('Account created successfully! Welcome, ' + name + '!', 'green');
  setTimeout(checkAuth, 900);
}

function backToAuth() {
  localStorage.removeItem('ck_logged_in');
  checkAuth();
}
function confirmLogout() {
  if (confirm('Log out? Your data stays saved.')) {
    localStorage.removeItem('ck_logged_in');
    checkAuth();
  }
}

/* SETUP */
var setupState = { permissions: false, ussd: false, battery: false };
function loadSetupState() {
  setupState.permissions = localStorage.getItem('ck_setup_perms') === 'true';
  setupState.ussd = localStorage.getItem('ck_setup_ussd') === 'true';
  setupState.battery = localStorage.getItem('ck_setup_battery') === 'true';
  updateSetupUI();
}
function updateSetupUI() {
  var bp = document.getElementById('btn-permissions');
  var bu = document.getElementById('btn-ussd');
  var bb = document.getElementById('btn-battery');
  if (setupState.permissions) { bp.innerText = '✓ Done'; bp.classList.add('done'); } else { bp.innerText = 'Allow'; bp.classList.remove('done'); }
  if (setupState.ussd) { bu.innerText = '✓ Done'; bu.classList.add('done'); } else { bu.innerText = 'Allow'; bu.classList.remove('done'); }
  if (setupState.battery) { bb.innerText = '✓ Done'; bb.classList.add('done'); } else { bb.innerText = 'Allow'; bb.classList.remove('done'); }
  document.getElementById('continue-btn').disabled = !(setupState.permissions && setupState.ussd && setupState.battery);
}
function setupRequestPermissions() {
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications) {
      Capacitor.Plugins.LocalNotifications.requestPermissions();
    }
  } catch(e) { console.log(e); }
  setupState.permissions = true;
  localStorage.setItem('ck_setup_perms', 'true');
  updateSetupUI();
  showToast('Permissions granted', 'green');
}
function setupEnableUSSD() {
  setupState.ussd = true;
  localStorage.setItem('ck_setup_ussd', 'true');
  updateSetupUI();
  showToast('USSD service enabled', 'green');
}
function setupEnableBattery() {
  setupState.battery = true;
  localStorage.setItem('ck_setup_battery', 'true');
  updateSetupUI();
  showToast('Battery unrestricted', 'green');
}
function finishSetup() {
  if (!(setupState.permissions && setupState.ussd && setupState.battery)) return showToast('Complete all 3 first', 'red');
  localStorage.setItem('ck_setup_done', 'true');
  showToast('Setup complete! Welcome to CK Auto.', 'green');
  setTimeout(checkAuth, 900);
}

/* APP */
var CK = {
  automationPower: localStorage.getItem('ck_automation') === '1',
  currentSellTab: 'data',
  selectedOffer: null,
  offers: {
    data: [
      { id: 'd1', name: 'Sh20=1GB,1hr', price: 19 },
      { id: 'd2', name: 'Sh20=250MB,24hr', price: 20 },
      { id: 'd3', name: 'Sh50=750MB+50SMS,24hr', price: 50 },
      { id: 'd4', name: 'Sh50=400MB,7days', price: 50 },
      { id: 'd5', name: 'Sh99=1.5GB,24hr', price: 99 },
      { id: 'd6', name: 'Sh55=1GB till midnight', price: 55 }
    ], sms: [], advanced: []
  }
};

function initApp() {
  var user = JSON.parse(localStorage.getItem('ck_user') || '{}');
  if (user.name) {
    setText('profileName', user.name);
    setText('profileDetailName', user.name);
    setText('drawerUserName', user.name);
    setText('profileBusinessName', user.business || 'Not set');
    setText('profilePhone', user.phone || 'Not set');
    setText('profileEmail', user.email || 'Not set');
  }
  var toggle = document.getElementById('automationToggle');
  if (toggle) { toggle.checked = CK.automationPower; updateToggleUI(CK.automationPower); }
  renderOffers();
}
function setText(id, v) { var e = document.getElementById(id); if (e) e.innerText = v; }

function toggleDrawer() {
  document.getElementById('sideDrawer').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('active');
}
function switchTab(tabId, el) {
  document.querySelectorAll('.subpage').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var tab = document.getElementById('tab-' + tabId);
  if (tab) tab.classList.add('active');
  if (el) el.classList.add('active');
}
function openPage(pageId) {
  toggleDrawer();
  document.querySelectorAll('.subpage').forEach(function(p) { p.classList.remove('active'); });
  var p = document.getElementById(pageId);
  if (p) p.classList.add('active');
}
function closePage() {
  document.querySelectorAll('.subpage').forEach(function(p) { p.classList.remove('active'); });
}

function toggleAutomation(el) {
  CK.automationPower = el.checked;
  localStorage.setItem('ck_automation', CK.automationPower ? '1' : '0');
  updateToggleUI(CK.automationPower);
  showToast(CK.automationPower ? 'Automation ON (1)' : 'Automation OFF (0)', CK.automationPower ? 'green' : 'red');
}
function updateToggleUI(isOn) {
  var st = document.getElementById('automationStatus');
  var c = document.getElementById('mainContent');
  if (!st) return;
  if (isOn) { st.innerText = 'App is ON (1)'; st.classList.remove('off'); if (c) c.classList.remove('greyed-out'); }
  else { st.innerText = 'App is OFF (0)'; st.classList.add('off'); if (c) c.classList.add('greyed-out'); }
}

function toggleVisibility(id, iconEl) {
  var el = document.getElementById(id);
  if (!el) return;
  if (el.innerText.indexOf('****') !== -1) {
    iconEl.classList.remove('fa-eye');
    iconEl.classList.add('fa-eye-slash');
    el.innerText = id === 'tokenDisplay' ? '50' : 'Ksh 74.53';
  } else {
    iconEl.classList.remove('fa-eye-slash');
    iconEl.classList.add('fa-eye');
    el.innerText = id === 'tokenDisplay' ? '****' : 'Ksh ****';
  }
}

function switchSellTab(tab, el) {
  CK.currentSellTab = tab;
  document.querySelectorAll('#tab-sell .tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (el) el.classList.add('active');
  renderOffers();
}
function renderOffers() {
  var list = document.getElementById('offerList');
  if (!list) return;
  var offers = CK.offers[CK.currentSellTab] || [];
  if (!offers.length) { list.innerHTML = '<p style="color:#888;padding:10px">No offers yet.</p>'; return; }
  list.innerHTML = offers.map(function(o) {
    return '<div class="offer-item ' + (CK.selectedOffer === o.id ? 'selected' : '') + '" onclick="selectOffer(\'' + o.id + '\')"><span>' + o.name + '</span><b>Ksh ' + o.price + '</b></div>';
  }).join('');
}
function selectOffer(id) { CK.selectedOffer = id; renderOffers(); }
function confirmSale() {
  var phone = document.getElementById('customerNumber').value.trim();
  if (!phone) return showToast('Enter customer number', 'red');
  if (!CK.selectedOffer) return showToast('Select an offer first', 'red');
  var offer = (CK.offers[CK.currentSellTab] || []).find(function(o){ return o.id === CK.selectedOffer; });
  if (confirm('Confirm Sale:\n\n' + offer.name + '\nTo: ' + phone + '\nPrice: Ksh ' + offer.price)) {
    dialUSSD('*180*5*2*' + phone + '#');
  }
}
function executeSendMoney() {
  var amt = document.getElementById('sendAmount').value;
  var pin = document.getElementById('sendPin').value;
  if (!amt || !pin) return showToast('Fill amount and PIN', 'red');
  dialUSSD('*334#');
}
function buyTokens() {
  var amt = parseInt(document.getElementById('tokenAmount').value);
  if (!amt || amt < 10) return showToast('Minimum Ksh 10', 'red');
  var blocked = [10, 20, 30, 55];
  if (blocked.indexOf(amt) !== -1) amt++;
  dialUSSD('*334#');
  showToast('Buying tokens Ksh ' + amt, 'green');
}
function buyTime() {
  var d = parseInt(document.getElementById('timeDays').value);
  if (!d) return showToast('Enter days', 'red');
  dialUSSD('*334#');
  showToast('Buying ' + d + ' days', 'green');
}
function checkAirtime() {
  dialUSSD('*144#');
  showToast('Checking airtime...', 'green');
  setTimeout(function() {
    var el = document.getElementById('airtimePageBalance');
    if (el) el.innerText = 'Ksh 74.53';
  }, 1500);
}
function saveEmergency() { if (confirm('Save emergency settings?')) showToast('Saved', 'green'); }
function resetApp() { if (confirm('Reset all data?')) { localStorage.clear(); location.reload(); } }

function dialUSSD(code) {
  console.log('[USSD] Would dial:', code);
  showToast('Dialing ' + code + '...', 'green');
}

document.addEventListener('DOMContentLoaded', checkAuth);
