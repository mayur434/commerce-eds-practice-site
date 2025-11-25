import { loadFragment } from '../fragment/fragment.js';
import { getMetadata } from '../../scripts/aem.js';
// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');
import createModal from '../modal/modal.js';
import { checkPincode } from '../location-modal/postload.js';
import { createCustomer, generateCustomerToken } from './customerToken.js';

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const hoverContainerPath = '/home-appliances';
  const fragment = await loadFragment(navPath);
  const subNav = await loadFragment(hoverContainerPath);
  const subNavString = subNav instanceof Element ? subNav.outerHTML : subNav;
  let navContent = fragment;

  // ✅ REPLACE your existing generateSubNav with this
  async function generateSubNav(pathname, hoverInnerDiv, activeSlug = '') {
    // 1) Load fragment
    const subNavLocal = await loadFragment(pathname);
    const subNavLocalString = subNavLocal instanceof Element ? subNavLocal.outerHTML : subNavLocal;

    // 2) Transform HTML (merge ULs, arrows, active states, etc.)
    const finalHTML = transformSubNav(subNavLocalString, activeSlug);

    // 3) Inject into hover container
    hoverInnerDiv.innerHTML = finalHTML;

    // 4) Re-init category hover logic (second column + activeInside)
    initCategoryHover(hoverInnerDiv);
  }

  // ✅ ADD this helper (or replace the old global .categories.block > ... forEach block)
  function initCategoryHover(root) {
    const categoryBlock = root.querySelector('.categories.block');
    if (!categoryBlock) {
      console.warn('⚠️ No .categories.block found in sub-nav');
      return;
    }

    const secondDiv = categoryBlock.querySelector(':scope > div:nth-child(2)');
    if (!secondDiv) {
      console.warn('⚠️ Second column (.categories.block > div:nth-child(2)) not found');
      return;
    }

    const topLevelItems = categoryBlock.querySelectorAll(
      ':scope > div > div > ul > li'
    );

    topLevelItems.forEach((item, index) => {
      const storing = item.querySelector('ul');
      if (!storing) return;

      // 🔽 Add down-arrow icon to inner button containers (once)
      const addIcon = storing.querySelectorAll('li > p.button-container');
      const baseSpan = document.createElement('span');
      baseSpan.className = 'icon icon-down-arrow';
      const img = document.createElement('img');
      img.dataset.iconName = 'down-arrow';
      img.src = '/icons/right-arrow.svg';
      img.alt = '';
      img.loading = 'lazy';
      baseSpan.appendChild(img);

      addIcon.forEach(container => {
        if (!container.querySelector('.icon-down-arrow')) {
          container.appendChild(baseSpan.cloneNode(true));
        }
      });

      // 🖱 Hover on left-side category → fill second column
      item.addEventListener('mouseenter', () => {
        removeArrowFromAll();          // your existing helper
        secondDiv.innerHTML = '';

        if (storing) {
          secondDiv.appendChild(storing.cloneNode(true));
        }
        item.setAttribute('active', 'true');

        // inner items activeInside behaviour
        setTimeout(() => {
          secondDiv.querySelectorAll('li').forEach(li => {
            li.setAttribute('activeInside', 'false');
            li.addEventListener('mouseenter', () => {
              li.setAttribute('activeInside', 'true');
            });
            li.addEventListener('mouseleave', () => {
              li.setAttribute('activeInside', 'false');
            });
          });
        }, 0);
      });

      // ✅ OPTIONAL: pre-fill second column with the first item
      if (index === 0 && !secondDiv.querySelector('ul')) {
        secondDiv.innerHTML = '';
        secondDiv.appendChild(storing.cloneNode(true));
        item.setAttribute('active', 'true');
      }
    });
  }

  if (fragment.firstElementChild?.classList.contains('section')) {
    navContent = fragment.firstElementChild.querySelector('.default-content-wrapper');
  }
  const headerNewSection = fragment.querySelector('.header-new-container');
  if (headerNewSection) {
    // Select both <ul> elements
    const ulLists = headerNewSection.querySelectorAll('ul');
    // Ensure there are at least two <ul> elements
    if (ulLists.length >= 2) {
      const displayList = ulLists[0].querySelectorAll('li'); // first UL
      const slugList = ulLists[1].querySelectorAll('li');    // second UL

      displayList.forEach((item, index) => {
        const slugItem = slugList[index];
        if (slugItem) {
          // debugger
          const slugValue = slugItem.textContent.trim().toLowerCase();
          // Add as attribute to first <ul> li
          item.setAttribute('sub-nav', slugValue);
        }
      });
      ulLists[1].remove();
      console.log('✅ Added sub-nav attributes to header items:', displayList);
    } else {
      console.warn('⚠️ Not enough <ul> elements found inside header-new-container');
    }
  }


  const hoverContainer = fragment.querySelector('.sub-nav-container');
  hoverContainer.setAttribute('expanded', 'false');
  let updatedSubNav = subNavString.replace('<main>', '<div>').replace('</main>', '</div>');
  const hoverInnerDiv = hoverContainer.querySelector('div');
  // ---------------------------------------------------
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = updatedSubNav;

  const airConditionerLink = tempDiv.querySelectorAll('li');

  if (airConditionerLink) {
    airConditionerLink.forEach(link => link.setAttribute('active', 'false'));
    console.log('✅ Added sub-nav attribute to Air Conditioner');
  } else {
    console.warn('⚠️ Air Conditioner link not found');
  }

  // ✅ Merge top-level ULs inside categories
  const categoryBlock = tempDiv.querySelector('.categories.block');

  if (categoryBlock) {
    // Find all top-level <ul> elements under the first .categories.block
    const topLevelULs = categoryBlock.querySelectorAll(':scope > div > div > ul');

    if (topLevelULs.length > 1) {
      const firstUL = topLevelULs[0];
      // Move all <li> from the 2nd, 3rd, etc. ULs into the first one
      for (let i = 1; i < topLevelULs.length; i++) {
        const currentUL = topLevelULs[i];
        const lis = Array.from(currentUL.children);
        lis.forEach(li => firstUL.appendChild(li));
        currentUL.remove(); // remove the now-empty UL
      }
      // console.log('✅ Merged all top-level ULs into one:', firstUL);
    } else {
      console.warn('⚠️ Only one UL found — no merge needed.');
    }
  }

  const topCategoryParas = tempDiv.querySelectorAll('.categories.block > div > div > ul > li > p.button-container');

  topCategoryParas.forEach(p => {
    const a = p.querySelector('a');
    if (a) {
      const span = document.createElement('span');
      span.className = 'icon icon-right-arrow';

      const img = document.createElement('img');
      img.dataset.iconName = 'right-arrow';
      img.src = '/icons/right-arrow.svg';
      img.alt = '';
      img.loading = 'lazy';
      img.width = 6;
      img.height = 11;

      span.appendChild(img);
      p.appendChild(span);
    }
  });

  // Update the variable to include our change
  updatedSubNav = tempDiv.innerHTML;
  // -------------------------------------------------
  hoverInnerDiv.innerHTML = updatedSubNav;
  // 🔁 Make sure initial sub-nav also has hover behaviour
  initCategoryHover(hoverInnerDiv);

  block.append(navContent);
  block.append(headerNewSection);
  console.log("asdhausdbuas", hoverContainer);
  block.append(hoverContainer);

  const main = document.querySelector('main');
  if (main) {
    main.querySelectorAll('.section').forEach((section) => {
      const wrapper = section.querySelector('.default-content-wrapper');
      const newWrapper = fragment.querySelector('.header-new-container');
    });
  }
  let hoverTimeout;

  let modal;

  const showModal = async (content) => {
    modal = await createModal([content]);
    modal.showModal();
  };

  const toggleExpanded = (isExpanded) => {
    hoverContainer.setAttribute('expanded', isExpanded ? 'true' : 'false');
    const hoverInnerDivLocal = hoverContainer.querySelector(':scope > div');
    if (hoverInnerDivLocal) {
      hoverInnerDivLocal.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    }
  };

  function removeApplyBorderFromAll() {
    const liItems = headerNewSection.querySelectorAll('ul > li');
    liItems.forEach(li => {
      li.classList.remove('applyBorderOnHover');
    });
  }

  function transformSubNav(htmlString, activeSlug = '') {

    const temp = document.createElement('div');
    temp.innerHTML = (htmlString || '')
      .replace('<main>', '<div>')
      .replace('</main>', '</div>');

    temp.querySelectorAll('li').forEach(li => li.setAttribute('active', 'false'));

    // 2) Merge or other manipulations (if you do that)
    const categoryBlockLocal = temp.querySelector('.categories.block');
    if (categoryBlockLocal) {
      const topULs = categoryBlockLocal.querySelectorAll(':scope > div > div > ul');
      if (topULs.length > 1) {
        const firstUL = topULs[0];
        for (let i = 1; i < topULs.length; i++) {
          Array.from(topULs[i].children).forEach(childLi => firstUL.appendChild(childLi));
          topULs[i].remove();
        }
      }
    }

    // 3) add right-arrow to level-1 button containers using createElement (preserve dataset)
    const level1Ps = temp.querySelectorAll('.categories.block > div > div > ul > li > p.button-container');
    level1Ps.forEach(p => {
      // avoid double-inserting
      if (!p.querySelector('.icon-right-arrow')) {
        const span = document.createElement('span');
        span.className = 'icon icon-right-arrow';

        const img = document.createElement('img');
        img.dataset.iconName = 'right-arrow';
        img.src = '/icons/right-arrow.svg';
        img.alt = '';
        img.loading = 'lazy';
        img.width = 6;
        img.height = 11;

        span.appendChild(img);
        p.appendChild(span);
      }
    });

    // 4) add down-arrow for inner button containers (createElement)
    const innerPs = temp.querySelectorAll('.categories.block li > ul > li > p.button-container');
    innerPs.forEach(p => {
      if (!p.querySelector('.icon-down-arrow')) {
        const span = document.createElement('span');
        span.className = 'icon icon-down-arrow';

        const img = document.createElement('img');
        img.dataset.iconName = 'down-arrow';
        img.src = '/icons/right-arrow.svg';
        img.alt = '';
        img.loading = 'lazy';
        // set size only if needed, don't break layout
        span.appendChild(img);
        p.appendChild(span);
      }
    });

    // 5) ensure nested ULs that should be expanded have display:block (you can tighten selectors)
    temp.querySelectorAll('.categories.block ul').forEach(ul => {
      // If this UL contains child <li>, keep visible — mimic original behavior
      // You can adjust conditions to only set for specific levels
      ul.style.display = 'block';
    });

    // 6) set active="true" for the top-level li that corresponds to activeSlug (if provided)
    if (activeSlug) {
      // find top-level links and match by slug string in their 'a' href or text
      temp.querySelectorAll('.categories.block > div > div > ul > li').forEach(li => {
        const a = li.querySelector('p.button-container > a');
        if (a) {
          const href = a.getAttribute('href') || '';
          const txt = (a.textContent || '').trim().toLowerCase();
          if (href.includes(activeSlug) || txt.includes(activeSlug.replace('-', ' '))) {
            li.setAttribute('active', 'true');
          }
        }
      });
    }

    // return final innerHTML
    return temp.innerHTML;
  }

  // Apply dynamic replace logic
  const headerItems = document.querySelectorAll(
    '.header-new-wrapper > div > div > div > ul > li'
  );

  headerItems.forEach((item, index) => {
    item.addEventListener('mouseenter', async () => {

      const slug = item.getAttribute('sub-nav');
      if (!slug) return;
      await generateSubNav(`/fragment/${slug}`, hoverInnerDiv, slug);
      removeApplyBorderFromAll();
      arrowDragger(index);
      item.classList.add('applyBorderOnHover');
      toggleExpanded(true);

    });

    item.addEventListener('mouseleave', () => {
      removeApplyBorderFromAll();
      arrowDragger(index);
      item.classList.remove('applyBorderOnHover');
      toggleExpanded(false);
    });
  });



  function loadBorderBottom(index) {
    document.querySelectorAll('.header-new-wrapper > div > div > div > ul > li')
      .forEach((item, i) => {
        if (i == index) {
          item.classList.add('applyBorderOnHover');
        } else {
          item.classList.remove('applyBorderOnHover');
        }
      });
  }

  function showSubNav(index) {
    clearTimeout(hoverTimeout);
    toggleExpanded(true);
    loadBorderBottom(index);
  }

  function hideSubNav(index) {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      toggleExpanded(false);
      removeApplyBorderFromAll();
    }, 200); // delay 200ms to prevent flicker
  }

  function arrowDragger(index) {
    document.querySelectorAll('.sub-nav-container > div > div')
      .forEach(item => {
        item.addEventListener('mouseenter', () => {
          showSubNav(index);
        });
        item.addEventListener('mouseleave', () => {
          hideSubNav(index);
        });
      });
  }


  function removeArrowFromAll() {
    const liItems = document.querySelectorAll('li[active="true"]');
    liItems.forEach(li => {
      li.setAttribute('active', 'false');
    });
  }


  document.querySelectorAll(".header.block>div:nth-child(2)>ul:first-child").forEach(item => {
    item.addEventListener('click', () => {
      showModal(item);
      fetchToken();
    });
  });


  // ================= Location Modal Specific Code =====================
  const locationLi = document.querySelector('.header-wrapper ul li')

  if (locationLi) {
    locationLi.style.cursor = 'pointer'; // Optional: show pointer cursor on hover
    const hoverContainerPathLoc = '/modal/location';
    const fragmentLoc = await loadFragment(hoverContainerPathLoc);
    locationLi.addEventListener('click', async () => {
      console.log('📍 Mumbai location clicked!');
      // 👉 Add your custom action here:
      await showModal(fragmentLoc);
      const modalDialog = document.querySelector('dialog');
      console.log("assbasa", modalDialog);
      modalDialog.style.width = '340px';

      modalDialog.style.setProperty('width', '340px', 'important');
      setTimeout(() => {
        const modal = document.querySelector('.location-modal');
        if (!modal) return console.warn('⚠️ .location-modal not found');

        const inputPincode = modal.querySelector('#floatingInput');
        const applyButton = modal.querySelector('div:nth-child(5) > div > p');

        if (!inputPincode || !applyButton) {
          console.warn('⚠️ Missing input or Apply element');
          return;
        }

        // 🟢 Initial disabled styling
        applyButton.style.cssText = `
          background: #ccc;
          color: #fff;
          text-align: center;
          border-radius: 25px;
          pointer-events: auto;
          opacity: 0.5;
          transition: all 0.3s ease;
          cursor: not-allowed;
        `;

        // 🧩 Activate button when 6-digit pincode entered
        inputPincode.addEventListener('input', () => {
          const pincode = inputPincode.value.trim();
          const isValid = /^\d{6}$/.test(pincode);

          if (isValid) {
            applyButton.style.background = '#000';
            applyButton.style.opacity = '1';
            applyButton.style.pointerEvents = 'auto';
            applyButton.style.cursor = 'pointer';
            // applyButton.style.cursor = 'none';

          } else {
            applyButton.style.background = '#ccc';
            applyButton.style.opacity = '0.5';
            applyButton.style.pointerEvents = 'none';
            applyButton.style.cursor = 'not-allowed';
            applyButton.style.pointerEvents = 'none';
          }
        });

        // 🖱 Handle Apply click
        applyButton.addEventListener('click', async e => {
          const pincode = inputPincode.value.trim();
          if (!/^\d{6}$/.test(pincode)) {
            e.preventDefault();
            console.warn('⚠️ Invalid pincode entered');
            return;
          }
          const result = await checkPincode(pincode);
          if (result.body.Master[0]?.pincode == undefined) {
            document.querySelector('dialog')?.close(); // optional: close modal
            console.warn('⚠️ Invalid pincode entered');
            alert('❌ Invalid Pincode. Please try again.');
            return;
          }
          const pincodeToSet = result.body.Master[0]?.cityname + " " + result.body.Master[0]?.pincode;
          // // const decoded = atob(result);
          // console.log("decoded",decoded);
          const locationIcon = document.querySelector('.icon-location');
          const locationContainer = locationIcon?.closest('li');

          if (locationContainer) {
            const locationTextLi = locationContainer.querySelector('ul li:first-child');
            if (locationTextLi) {
              locationTextLi.textContent = pincodeToSet;
              console.log('📍 Updated header location:', pincodeToSet);
            }

          }
          document.querySelector('dialog')?.close(); // optional: close modal
        });
      }, 1000);
    });
  } else {
    console.warn('⚠️ Location <li> with "Mumbai 400067" not found');
  }


  // ================= Location Modal Specific Code Ends =====================


  // ================= Microsoft Sign-In (MSAL) Configuration =====================

  const msalConfig = {
    auth: {
      clientId: "39b13792-0415-43d5-81c7-80962a7a3285",
      authority: "https://login.microsoftonline.com/44a6c9d1-014f-4db6-8e72-af6ebeaac182",
      redirectUri: window.location.origin
    },
    cache: { cacheLocation: "localStorage" }
  };

  let msalInstance;

  // Function to initialize MSAL (called when needed)
  async function initMSAL() {
    if (msalInstance) return msalInstance; // Already initialized

    // Wait for MSAL library to load
    let attempts = 0;
    while (typeof window.msal === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof window.msal === 'undefined') {
      console.error("❌ MSAL library failed to load after 5 seconds");
      throw new Error("MSAL library not available");
    }

    try {
      msalInstance = new window.msal.PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      console.log("✅ MSAL initialized successfully");
      return msalInstance;
    } catch (error) {
      console.error("❌ MSAL initialization failed:", error);
      throw error;
    }
  }

  // Function to handle Microsoft Sign-In
  function attachMicrosoftSignIn(button) {
    button.onclick = async () => {
      try {
        console.log("🔐 Initializing MSAL...");

        // Initialize MSAL first
        const msal = await initMSAL();

        console.log("🔐 Attempting Microsoft Sign-In...");

        const loginResponse = await msal.loginPopup({
          scopes: ["openid", "profile", "email"]
        });

        const account = loginResponse.account;
        const tokenResponse = await msal.acquireTokenSilent({
          scopes: ["openid", "profile", "email"],
          account
        });
        const claims = tokenResponse.idTokenClaims;
        console.log("NEwwwwwwwwwwww", JSON.stringify(tokenResponse, null, 5));

        const ssoPayloadJsonString = JSON.stringify(tokenResponse);

        // 🔹 Derive email from claims
        const email =
          claims.preferred_username ||
          claims.email ||
          tokenResponse.account?.username ||
          "";

        // GraphQL mutation
        const mutation = `
  mutation SsoLogin($payload: String!, $email: String!) {
    ssoLogin(ssoPayloadJsonString: $payload, email: $email) {
      firstName
      lastName
      email
      commerce_customer_token
      is_customer_exists
    }
  }
`;

        // Call your API Mesh GraphQL endpoint
        const response = await fetch(
          "https://edge-sandbox-graph.adobe.io/api/d79af252-509e-4a97-b99c-824f0a08c271/graphql",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // if you really don't want this, remove it later, but it's not related to the current error
              "Authorization": `Bearer ${tokenResponse.accessToken}`
            },
            body: JSON.stringify({
              query: mutation,
              variables: {
                payload: ssoPayloadJsonString,
                email // 🔹 pass email here
              }
            })
          }
        );

        const result = await response.json();
        console.log("ssoLogin result:", result);


        const userInfo = {
          given_name: claims.given_name,
          family_name: claims.family_name,
          email: claims.email,
          oid: claims.oid,
          idToken: tokenResponse.idToken
        };

        console.log(claims, "✅ Microsoft Login success:", userInfo);
        console.log("ashysaybvsa", JSON.stringify(userInfo.idToken, null, 5));
        console.log(userInfo.idToken);
        console.log(String(userInfo.idToken));
        alert(`Welcome, ${userInfo}! You have successfully logged in.`);
        // Store user info in localStorage for persistence
        localStorage.setItem('ms_user_info', JSON.stringify({
          firstName: claims.given_name,
          lastName: claims.family_name,
          email: claims.email
        }));

        // Update UI to show user name
        const loginButton = document.querySelector('.nav-dropdown-button');
        if (loginButton) {
          loginButton.textContent = `Hi, ${claims.given_name}`;
        }

        // Show authenticated menu
        const authDropDownMenuList = document.querySelector('.authenticated-user-menu');
        const authDropinContainer = document.querySelector('#auth-dropin-container');

        if (authDropDownMenuList) authDropDownMenuList.style.display = 'block';
        if (authDropinContainer) authDropinContainer.style.display = 'none';

        // Close the modal/dropdown
        const modal = document.querySelector('dialog');
        if (modal) modal.close();

        const authPanel = document.querySelector('.nav-auth-menu-panel');
        if (authPanel) {
          authPanel.classList.remove('nav-tools-panel--show');
        }

      } catch (err) {
        console.error("❌ Microsoft Login error:", err);
        alert(`Login failed: ${err.message || 'Unknown error occurred'}`);
      }
    };
  }

  // ================= Microsoft Sign-In Configuration Ends =====================

  // ================= Seacrh Modal Specific Code Starts =====================

  const navSections = document.querySelector('.default-content-wrapper');

  if (navSections) {
    navSections.querySelectorAll(':scope > ul > li').forEach((navSection, index) => {
      navSection.addEventListener('click', async () => {
        if (index === 1) {
          const hoverContainerPathSearch = '/modal/search-modal';
          const fragmentSearch = await loadFragment(hoverContainerPathSearch);
          await showModal(fragmentSearch);
          const modalDialog = document.querySelector('dialog');
          modalDialog.style.width = '500px';
          modalDialog.style.marginTop = '34px';

          modalDialog.style.setProperty('width', '500px', 'important');
        }



        if (index === 5) {
          console.log('Clicked on login icon');

          let host = navSection.nextElementSibling;
          if (!host || !host.classList.contains('dropdown-host')) {
            host = document.createElement('div');
            host.className = 'dropdown-host';
            host.style.position = 'relative';
            navSection.after(host); // 🔥 IMPORTANT FIX
          }

          // Toggle only if already initialized
          if (host.dataset.initialized === 'true') {
            const btn = host.querySelector('.nav-dropdown-button');
            btn?.click();
            return;
          }

          // First time rendering
          const module = await import('../header/renderAuthDropdown.js');
          const { renderAuthDropdown } = module;

          renderAuthDropdown(host);
          host.dataset.initialized = 'true';

          const btn = host.querySelector('.nav-dropdown-button');
          const panel = host.querySelector('.nav-auth-menu-panel');

          // Open dropdown
          btn?.click();

          // Close on outside click — only once
          if (!host.dataset.listenerAdded) {
            document.addEventListener('click', (e) => {
              if (!host.contains(e.target) && !navSection.contains(e.target)) {
                panel?.classList.remove('nav-tools-panel--show');
              }
            });
            host.dataset.listenerAdded = 'true';
          }
          setTimeout(() => appendMicrosoftButton(), 300);
          return;
        }

        navSection.setAttribute('aria-expanded', 'true');
      });
      navSection.addEventListener('mouseleave', () => {
        navSection.setAttribute('aria-expanded', 'false');
      });
    });
  }


  function appendMicrosoftButton() {
    const buttonContainer = document.querySelector('.auth-sign-in-form__form__buttons');
    if (!buttonContainer) {
      console.warn("⚠️ Button container not found");
      return;
    }

    // Create Microsoft Button
    const msBtn = document.createElement('button');
    msBtn.role = "button";
    msBtn.type = "button";
    msBtn.id = "signInWithMicrosoft"; // ✅ Add ID for event listener
    msBtn.setAttribute('data-testid', 'signInWithMicrosoft');
    msBtn.className =
      "dropin-button dropin-button--medium dropin-button--primary auth-button auth-sign-in-form__button auth-sign-in-form__button--submit auth-sign-in-form__button--microsoft";

    // Text inside button
    const span = document.createElement('span');
    span.className = "auth-button__text";
    span.textContent = "Sign in with Microsoft";

    msBtn.appendChild(span);

    // Append below Sign In button
    buttonContainer.appendChild(msBtn);

    // ✅ Attach MSAL click handler RIGHT AFTER creating the button
    attachMicrosoftSignIn(msBtn);

    console.log("✅ Microsoft Sign-In button added");
  }


  // ================= Seacrh Modal Specific Code ENds =====================




  async function fetchToken() {
    const url = 'https://108480-jayeshappbuilder-stage.adobeio-static.net/api/v1/web/ceat-api-mesh/token-generator';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any required headers such as Authorization if needed
        },
        body: JSON.stringify({
          // Include any required request payload parameters here
          // e.g. clientId: 'YOUR_CLIENT_ID', clientSecret: 'YOUR_CLIENT_SECRET'
        })
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Token data:', data);

      // Example: store it or attach to subsequent requests
      const token = data.token || data.id_token || data.accessToken;
      // e.g. window.myAppToken = token;

      return token;
    } catch (err) {
      console.error('❌ Error fetching token:', err);
      return null;
    }
  }

  const request = {
    firstname: "Jayesh",
    lastname: "Gupta",
    email: "aditi@example.com",
    password: "StrongPassword@123",
    is_subscribed: true
  }

  // createCustomer({});
  const response = await createCustomer({
    firstname: request.firstname,
    lastname: request.lastname,
    email: request.email,
    password: request.password,
    is_subscribed: request.is_subscribed
  });
  const token = await generateCustomerToken({
    email: request.email,
    password: request.password
  });
  console.log("createCustomer", response);

  console.log("generateCustomerToken", token.token);



  // code for eds sso 

  async function commerceQuery(query, variables) {
    const meshEndpoint = 'https://edge-sandbox-graph.adobe.io/api/d79af252-509e-4a97-b99c-824f0a08c271/graphql';
    const customerToken = localStorage.getItem('commerce_customer_token');

    const res = await fetch(meshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: customerToken ? `Bearer ${customerToken}` : `Bearer ${token.token}`
      },
      body: JSON.stringify({ query, variables })
    });

    return res.json();
  }

  // Example: fetch current customer
  const query = `
  query {
    customer {
      email
      firstname
      lastname
    }
  }
`;

  const customerData = await commerceQuery(query);
  console.log("customerData", customerData);


}