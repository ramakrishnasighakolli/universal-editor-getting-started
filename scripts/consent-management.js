function waitForElm(selector) {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const foundElement = document.querySelector(selector);
      if (foundElement) {
        observer.disconnect();
        resolve(foundElement);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function oneTrustAddFont() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = 'https://fonts.googleapis.com/css?family=Montserrat';
  document.getElementsByTagName('HEAD')[0].appendChild(link);
}

function addMeta() {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0';
  document.getElementsByTagName('head')[0].appendChild(meta);
}

function oneTrustBannerFooterFix() {
  const divSelector = document.querySelector('#onetrust-button-group-parent');
  const elementDiv = document.createElement('div');
  elementDiv.className = 'ontrust_logo';
  elementDiv.innerHTML = "<div class='green-logo'> onetrust</div><div class='text-logo'>Powered by</div>";
  divSelector.parentNode.insertBefore(elementDiv, divSelector.nextSibling);

  document.getElementsByClassName('ot-pc-footer-logo')[0].children[0].removeAttribute('href');
}

function oneTrustBannerOtherFix() {
  const paragraphs = document.querySelectorAll('.ot-accordion-layout p');
  Array.prototype.forEach.call(paragraphs, (el) => {
    // eslint-disable-next-line no-param-reassign
    el.innerHTML = el.innerHTML.replace(/&nbsp;/gi, '');
  });

  let tabindex = 2;
  document.querySelectorAll('#onetrust-button-group button, #onetrust-button-group input').forEach((element) => {
    element.setAttribute('tabindex', String(tabindex));
    if (tabindex === 2) {
      tabindex = 1;
    } else if (tabindex === 1) {
      tabindex = 3;
    } else {
      tabindex += 1;
    }
  });
  document.querySelector('#onetrust-policy-text a').setAttribute('tabindex', 1);
}

function oneTrustSettingsButtonFix() {
  const acceptBtn = document.getElementById('accept-recommended-btn-handler');
  const rejectBtn = document.getElementsByClassName('ot-pc-refuse-all-handler')[0];
  const container = document.getElementsByClassName('ot-btn-container')[0];
  container.prepend(acceptBtn, rejectBtn);
}

function oneTrustSettingsOtherFix() {
  const modelElement = document.getElementById('onetrust-pc-sdk');
  document.addEventListener('focus', (e) => {
    const focusableElements = modelElement.querySelectorAll('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]');
    if (!Array.from(focusableElements).includes(e.target)) {
      Array.from(focusableElements)[0].focus();
    }
  }, true);
}

export default function initOneTrust() {
  oneTrustAddFont();
  addMeta();

  document.addEventListener('DOMContentLoaded', () => {
    waitForElm('#onetrust-banner-sdk').then(() => {
      oneTrustBannerFooterFix();
      oneTrustBannerOtherFix();
    });

    waitForElm('#onetrust-pc-sdk').then(() => {
      oneTrustSettingsButtonFix();
      oneTrustSettingsOtherFix();
    });
  });
}
