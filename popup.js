document.addEventListener('DOMContentLoaded', () => {
   chrome.storage.local.get([
       'config_email', 'config_mainUrl', 'bot_active',
       'cc_name', 'cc_num', 'cc_exp', 'cc_cvv', 'partial_match',
       'schedule_enabled', 'schedule_time'
   ], (data) => {
       if (data.config_email) document.getElementById('email').value = data.config_email;
       if (data.config_mainUrl) document.getElementById('mainUrl').value = data.config_mainUrl;
       if (data.cc_name) document.getElementById('ccName').value = data.cc_name;
       if (data.cc_num) document.getElementById('ccNum').value = data.cc_num;
       if (data.cc_exp) document.getElementById('ccExp').value = data.cc_exp;
       if (data.cc_cvv) document.getElementById('ccCvv').value = data.cc_cvv;
       if (data.partial_match !== undefined) document.getElementById('partialMatch').checked = data.partial_match;
       if (data.schedule_enabled !== undefined) document.getElementById('scheduleEnabled').checked = data.schedule_enabled;
       if (data.schedule_time) document.getElementById('scheduleTime').value = data.schedule_time;

       updateStatus(data.bot_active);
   });
});

// Show/Hide Password Logic
document.getElementById('togglePassword').addEventListener('click', function () {
   const passwordInput = document.getElementById('password');
   const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
   passwordInput.setAttribute('type', type);
   this.textContent = type === 'password' ? '👁️' : '🙈';
});

function updateStatus(isActive) {
   const badge = document.getElementById('statusBadge');
   const dot = document.getElementById('statusIndicator');
   
   if (isActive) {
       badge.textContent = "Bot is Running"; 
       badge.style.color = "#2dd4bf"; 
       dot.classList.add('active');
   } else {
       badge.textContent = "Ready to Start";
       badge.style.color = "#94a3b8"; 
       dot.classList.remove('active');
   }
}

document.getElementById('startBtn').addEventListener('click', () => {
   // --- Schedule: compute exact start timestamp (epoch ms, second-accurate) ---
   const scheduleEnabled = document.getElementById('scheduleEnabled').checked;
   const scheduleTime = document.getElementById('scheduleTime').value; // "YYYY-MM-DDTHH:MM:SS"
   let scheduledStartTs = null;
   if (scheduleEnabled && scheduleTime) {
       const ts = new Date(scheduleTime).getTime(); // parsed in local time
       if (!isNaN(ts)) scheduledStartTs = ts;
   }

   const config = {
       bot_active: true,
       iframe_filled: false,
       pay_clicked: false,
       config_email: document.getElementById('email').value.trim(),
       config_password: document.getElementById('password').value,
       config_mainUrl: document.getElementById('mainUrl').value.trim(),
       cc_name: document.getElementById('ccName').value.trim(),
       cc_num: document.getElementById('ccNum').value.trim(),
       cc_exp: document.getElementById('ccExp').value.trim(),
       cc_cvv: document.getElementById('ccCvv').value.trim(),
       partial_match: document.getElementById('partialMatch').checked,
       schedule_enabled: scheduleEnabled,
       schedule_time: scheduleTime,
       scheduled_start_ts: scheduledStartTs,
       booking_link: null,
       config_modules: []
   };

   if (document.getElementById('mod-reading').checked) config.config_modules.push('reading');
   if (document.getElementById('mod-writing').checked) config.config_modules.push('writing');
   if (document.getElementById('mod-speaking').checked) config.config_modules.push('speaking');
   if (document.getElementById('mod-listening').checked) config.config_modules.push('listening');

   chrome.storage.local.set(config, () => {
       if (scheduledStartTs && scheduledStartTs > Date.now()) {
           const badge = document.getElementById('statusBadge');
           const dot = document.getElementById('statusIndicator');
           badge.textContent = "Scheduled · " + new Date(scheduledStartTs).toLocaleTimeString();
           badge.style.color = "#2dd4bf";
           dot.classList.add('active');
       } else {
           updateStatus(true);
       }
       chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
           if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {action: "START_CLICKING"});
       });
   });
});

document.getElementById('stopBtn').addEventListener('click', () => {
   chrome.storage.local.set({ bot_active: false }, () => {
       updateStatus(false);
       chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
           if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {action: "STOP_CLICKING"});
       });
   });
});