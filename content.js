const sleep = ms => new Promise(r => setTimeout(r, ms));

// ==========================================
// THE SURGICAL MODULE FINDER
// ==========================================
function findCheckboxByLabelText(moduleName) {
   const wrappers = document.querySelectorAll('.cs-input__field--exams');

   for (let wrapper of wrappers) {
       const textContent = wrapper.textContent.toLowerCase();

       if (textContent.includes(moduleName.toLowerCase())) {
           const checkbox = wrapper.querySelector('input[type="checkbox"]');

           if (!checkbox || checkbox.disabled) return null; 
           if (textContent.includes('fully booked') || textContent.includes('ausgebucht')) return null; 

           return checkbox;
       }
   }
   return null; 
}

// XPATH HELPER
function getElementByXPath(path) {
   try {
       return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
   } catch (e) {
       return null;
   }
}

// FORCE FILL: Deep native injection
async function forceFill(element, text) {
   element.focus();
   element.select(); 
   const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
   nativeInputValueSetter.call(element, text);
   element.dispatchEvent(new Event('input', { bubbles: true }));
   element.dispatchEvent(new Event('change', { bubbles: true }));
   element.blur();
}

// TYPE LIKE HUMAN: Bypass for masked fields
async function typeLikeHuman(element, text) {
   element.focus();
   const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
   setter.call(element, ''); 
   element.dispatchEvent(new Event('input', { bubbles: true }));
   await sleep(50);
   
   for (let char of text) {
       setter.call(element, element.value + char);
       element.dispatchEvent(new Event('input', { bubbles: true }));
       element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
       element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
       await sleep(30); 
   }
   element.dispatchEvent(new Event('change', { bubbles: true }));
   element.blur();
}

// MAXIMUM SPEED CLICK
function fastClick(element) {
   element.focus();
   element.click(); 
   ['mousedown', 'mouseup'].forEach(eventType => {
       element.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
   });
}

// HUMAN DELAY CLICK
async function humanClick(element) {
   element.scrollIntoView({ behavior: 'smooth', block: 'center' });
   await sleep(500 + Math.random() * 300);
   element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
   await sleep(200 + Math.random() * 200);
   element.click();
}

async function getBotState() {
   return new Promise((resolve) => {
       chrome.storage.local.get(null, function(result) { resolve(result); });
   });
}

// ==========================================
// MASTER LOOP 
// ==========================================
async function runAutomationCycle() {
   try {
       const state = await getBotState();
       if (!state.bot_active) return; 

       if (document.readyState !== 'complete') {
           setTimeout(runAutomationCycle, 500);
           return;
       }

       const currentUrl = window.location.href.toLowerCase();

       // ---------------------------------------------------------
       // DOM SNIFFER 1: CREDIT CARD FIELDS (Inner Iframe)
       // ---------------------------------------------------------
       const ccNumInput = document.querySelector('input[name="ccnumber"], input[name="pan"], input[type="tel"]');
       const ccCvvInput = document.querySelector('input[name="cvv"], input[name="cvc"]');
       
       if (ccNumInput && ccCvvInput) {
           // CRITICAL FIX: The window.isFillingCC lock prevents multiple loops from typing at once
           if (!state.iframe_filled && !window.isFillingCC) {
               window.isFillingCC = true; // LOCK THE DOOR
               console.log("💳 [CC Iframe] Ghost DOM detected! Locking sequence. Waiting 3s for UI paint...");
               
               // 🛑 VISUAL SETTLE DELAY: Force bot to wait for frontend to render
               await sleep(3000);
               
               // 🔄 Re-fetch the elements in case React replaced them
               const freshCcName = document.querySelector('input[name="chname"], input[name="cardholderName"], input[autocomplete="cc-name"]');
               const freshCcNum = document.querySelector('input[name="ccnumber"], input[name="pan"], input[type="tel"]');
               const freshCcCvv = document.querySelector('input[name="cvv"], input[name="cvc"]');
               const freshCcExp = document.querySelector('input[name="ccexp"], input[name="exp-date"], input[autocomplete="cc-exp"], input[name="expiry"], input[placeholder*="MM"]');
               
               if (freshCcNum && freshCcCvv) {
                   console.log("💳 [CC Iframe] UI Settled. Injecting data now...");
                   if (freshCcName && state.cc_name) await forceFill(freshCcName, state.cc_name);
                   if (freshCcNum && state.cc_num) await forceFill(freshCcNum, state.cc_num);
                   if (freshCcCvv && state.cc_cvv) await forceFill(freshCcCvv, state.cc_cvv);
                   if (freshCcExp && state.cc_exp) await typeLikeHuman(freshCcExp, state.cc_exp);
                   
                   await chrome.storage.local.set({ iframe_filled: true });
                   console.log("✅ [CC Iframe] Data injected securely. Outer iframe unlocked.");
               } else {
                   // If fields vanished, unlock so we can try again
                   window.isFillingCC = false; 
               }
           }
           setTimeout(runAutomationCycle, 1500);
           return; 
       }

       // ---------------------------------------------------------
       // DOM SNIFFER 2: THE PAY BUTTON (Outer Cashier Iframe)
       // ---------------------------------------------------------
       let payBtn = document.querySelector('button.submit-button') || 
                    document.querySelector('button.cashier-button') ||
                    getElementByXPath('/html/body/div/div/section/div[2]/div[3]/button');

       if (!payBtn) {
           const allBtns = Array.from(document.querySelectorAll('button'));
           payBtn = allBtns.find(b => b.textContent.trim().toLowerCase() === 'pay');
       }
       
       if (payBtn) {
           // CRITICAL FIX: Ensure the button isn't disabled by the gateway
           if (payBtn.disabled || payBtn.getAttribute('disabled') === 'disabled') {
               console.log("⏳ [Cashier Iframe] Pay button is disabled. Waiting for gateway...");
               setTimeout(runAutomationCycle, 1000);
               return;
           }

           // CRITICAL FIX: The window.isClickingPay lock prevents double-clicks
           if (state.iframe_filled && !state.pay_clicked && !window.isClickingPay) {
               window.isClickingPay = true; // LOCK THE DOOR
               console.log("✅ [Cashier Iframe] Bridge confirmed. Initiating final click sequence...");
               
               await chrome.storage.local.set({ pay_clicked: true });
               
               // Visual feedback on screen
               payBtn.style.border = "4px solid #2dd4bf";
               payBtn.style.backgroundColor = "#2dd4bf";
               payBtn.style.color = "black";
               payBtn.textContent = "BOT CLICKING!";
               
               // Give the UI a brief 1.5 seconds to register the CC data
               await sleep(1500); 
               
               payBtn.click(); 
               console.log("🚀 [Cashier Iframe] PAY BUTTON CLICKED VIA SCRIPT! System shutting down.");
               
               await chrome.storage.local.set({ bot_active: false }); 
               return; 
           } else if (!state.iframe_filled) {
               // Visual feedback that the bot is waiting
               payBtn.style.border = "2px dashed orange";
               console.log("⏳ [Cashier Iframe] Waiting for inner CC frame to finish filling details...");
               setTimeout(runAutomationCycle, 1000);
           }
           return;
       }

       // ---------------------------------------------------------
       // IFRAME KILL-SWITCH
       // ---------------------------------------------------------
       if (window.self !== window.top) {
           if (currentUrl.includes('paymentiq') || currentUrl.includes('cashier')) {
               setTimeout(runAutomationCycle, 1000);
           }
           return; 
       }

       // --- STATE: WICKET ---
       if (currentUrl.includes('wicket')) {
           console.log("🛑 [State: Wicket] Rate limiter hit! Retreating...");
           const penaltyWaitTime = 7000 + (Math.random() * 5000); 
           await chrome.storage.local.set({ wicket_timeout: Date.now() + penaltyWaitTime });
           window.location.href = state.config_mainUrl;
           return;
       }

       if (state.wicket_timeout && Date.now() < state.wicket_timeout) {
           const remainingSleep = state.wicket_timeout - Date.now();
           console.log(`⏳ [State: Penalty] Waiting ${Math.round(remainingSleep/1000)} seconds to evade ban...`);
           await sleep(remainingSleep);
           await chrome.storage.local.remove("wicket_timeout");
       }

       // --- STATE: EXAM ID (Landing Page) ---
       if (currentUrl.includes('examid') || currentUrl === state.config_mainUrl.toLowerCase()) {
           console.log("🏠 [State: Landing Page] Searching for booking button...");
           const firstBtn = document.querySelector("a[onclick='gotoExamDetail()']");
           if (firstBtn) {
               console.log("👉 [State: Landing Page] Button found! Clicking...");
               await humanClick(firstBtn);
               setTimeout(runAutomationCycle, 2000);
           } else {
               console.log("🔄 [State: Landing Page] No buttons available. Refreshing page...");
               await sleep(Math.random() * 3000);
               window.location.reload();
           }
           return;
       }

       // --- STATE: OPTIONS (MODULE CHECKBOXES) ---
       if (currentUrl.includes('options')) {
           console.log("🔍 [State: Options] Module selection page detected. Scanning availability...");
           const checkboxes = document.querySelectorAll('input[type="checkbox"]');
           const continueBtn = document.querySelector('button.cs-button--arrow_next');
           
           if (checkboxes.length > 0 && continueBtn) {
               const desiredModules = state.config_modules || []; 
               let foundCount = 0;
               let missingCount = 0;

               for (const module of desiredModules) {
                   if (findCheckboxByLabelText(module)) {
                       foundCount++;
                       console.log(`✅ [State: Options] FOUND: ${module.toUpperCase()}`);
                   } else {
                       missingCount++;
                       console.log(`❌ [State: Options] MISSING: ${module.toUpperCase()} (Sold out or disabled)`);
                   }
               }

               if (foundCount === 0) {
                   console.log(`🛑 [State: Options] FATAL: EXACTLY ZERO requested modules found. Killing bot.`);
                   chrome.storage.local.set({ bot_active: false });
                   return; 
               } else if (missingCount > 0) {
                   if (!state.partial_match) {
                       console.log(`🛑 [State: Options] FATAL: Missing ${missingCount} requested modules and Partial Booking is OFF. Killing bot.`);
                       chrome.storage.local.set({ bot_active: false });
                       return; 
                   } else {
                       console.log(`⚠️ [State: Options] WARNING: Proceeding with ${foundCount} available modules (Partial Booking ON).`);
                   }
               } else {
                   console.log(`✅ [State: Options] PERFECT MATCH: All ${foundCount} requested modules are available!`);
               }

               const allModules = ['reading', 'writing', 'speaking', 'listening'];
               for (const module of allModules) {
                   const checkbox = findCheckboxByLabelText(module);
                   if (checkbox) {
                       const isDesired = desiredModules.includes(module);
                       if (isDesired && !checkbox.checked) {
                           fastClick(checkbox);
                       } else if (!isDesired && checkbox.checked) {
                           fastClick(checkbox);
                       }
                   }
               }
               
               console.log("➡️ [State: Options] Pushing 'Continue' button...");
               fastClick(continueBtn);
               setTimeout(runAutomationCycle, 500); 
           } else {
               console.log("⏳ [State: Options] Checkboxes not fully rendered yet. Waiting...");
               setTimeout(runAutomationCycle, 500); 
           }
           return;
       }

       // --- STATE: SELECTION ---
       if (currentUrl.includes('selection') && !currentUrl.includes('psp-selection')) {
           const bookForMyselfBtn = Array.from(document.querySelectorAll('button, a, div[role="button"]'))
                                         .find(el => el.textContent.toLowerCase().includes('book for myself'));
           if (bookForMyselfBtn) {
               fastClick(bookForMyselfBtn);
               setTimeout(runAutomationCycle, 500);
           } else setTimeout(runAutomationCycle, 500);
           return;
       }

       // --- STATE: LOGIN ---
       if (currentUrl.includes('login')) {
           const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]');
           const passwordInput = document.querySelector('input[type="password"]');
           const loginBtn = document.querySelector('button[type="submit"]') || document.querySelector('input[type="submit"]');

           if (emailInput && passwordInput && loginBtn) {
               emailInput.value = state.config_email;
               emailInput.dispatchEvent(new Event("input", { bubbles: true }));
               passwordInput.value = state.config_password;
               passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
               
               fastClick(loginBtn);
               setTimeout(runAutomationCycle, 2000); 
           } else setTimeout(runAutomationCycle, 500);
           return;
       }

       // --- STATE: VOUCHER / PSP ---
       if (currentUrl.includes('voucher') || currentUrl.includes('psp-selection') || currentUrl.includes('oska-acc')) {
           const continueBtn = document.querySelector('button.cs-button--arrow_next');
           if (continueBtn) {
               fastClick(continueBtn);
               setTimeout(runAutomationCycle, 500);
           } else setTimeout(runAutomationCycle, 500);
           return;
       }

       // --- STATE: SUMMARY ---
       if (currentUrl.includes('summary')) {
           const orderBtn = Array.from(document.querySelectorAll('button.cs-button--arrow_next'))
                                 .find(b => b.textContent.includes('Order')) || document.querySelector('#GbOqxNTGvcLDigEGGERI');
           if (orderBtn) {
               fastClick(orderBtn);
               setTimeout(runAutomationCycle, 2000); 
           } else setTimeout(runAutomationCycle, 500);
           return;
       }

       // Fallback polling (Quiet state)
       setTimeout(runAutomationCycle, 1000);
       
   } catch (error) {
       console.error("⚠️ [Engine Alert] GoetheGrabber recovered from an error:", error);
       setTimeout(runAutomationCycle, 1000); 
   }
}

// --- INITIALIZATION ---
async function initializeBot() {
   const state = await getBotState();
   if (state.bot_active) {
       console.log("🚀 GoetheGrabber Engine Initialized!");
       runAutomationCycle(); 
   }
}

initializeBot();

chrome.runtime.onMessage.addListener((request) => {
   if (request.action === "START_CLICKING") {
       console.log("🚀 Sequence Started by User.");
       runAutomationCycle();
   }
   if (request.action === "STOP_CLICKING") {
       console.log("🛑 Sequence Halted by User.");
   }
});