/* global OneTrust, OnetrustActiveGroups */
/* eslint-disable camelcase */
import consentSettings from '../config/consent-settings.js';

/**
 * Streamlined consent management for video block only.
 * Removed: iframe embeds, Buzzsprout, Orbita, React Player, thumbnail
 * generation, player API loading.
 */
const OtsukaPCM = Object.create({
  cmpPlatform: 'onetrust',

  providers: {
    VIMEO: 'vimeo',
    YOUTUBE: 'youtube',
  },

  settings: consentSettings.privacy_compliant_media_settings,

  overlayImageClassname: 'otsuka-pcm-img-overlay',
  thumbnailOverlayClassname: 'otsuka-pcm-img-overlay__transparent',
  thumbnailOverlayDefaultClassname: 'with-default-video-overlay',
  thumbnailOverlayCustomClassname: 'with-custom-video-overlay',
  overlayClassname: 'otsuka-pcm-consent-overlay',
  modalClassname: 'otsuka-pcm-consent-modal',

  getProviderSettings(provider) {
    switch (provider) {
      case this.providers.VIMEO:
        return this.settings.vimeo;
      case this.providers.YOUTUBE:
        return this.settings.youtube;
      default:
        return null;
    }
  },

  printError(message) {
    // eslint-disable-next-line no-console
    console.error(this.formatErrorMessage(message));
  },

  throwError(message) {
    throw new Error(this.formatErrorMessage(message));
  },

  formatErrorMessage(message) {
    return `OtsukaPCM: ${message}`;
  },

  createElementFromText(text, tagName = 'div', strip = true) {
    const element = document.createElement(tagName);
    element.innerHTML = text ?? '';
    return strip ? element.firstChild : element;
  },

  awaitOneTrust() {
    return new Promise((resolve, reject) => {
      if (typeof OneTrust === 'object') {
        resolve(OneTrust);
      }

      let attempt = 0;
      const maxAttempts = 50;
      const interval = setInterval(() => {
        if (typeof OneTrust === 'object') {
          clearInterval(interval);
          resolve(OneTrust);
        }
        attempt += 1;
        if (attempt >= maxAttempts) {
          clearInterval(interval);
          reject(
            OtsukaPCM.formatErrorMessage(
              'awaitOneTrust: OneTrust not found within allotted time',
            ),
          );
        }
      }, 100);
    });
  },

  awaitCMP() {
    switch (this.cmpPlatform) {
      case 'onetrust':
        return this.awaitOneTrust();
      default:
        return Promise.reject();
    }
  },

  async isConsentedToCategoryOneTrust(category_id) {
    await this.awaitOneTrust();
    return OnetrustActiveGroups?.split(',').includes(category_id);
  },

  async isConsentedToCategory(category_id) {
    switch (this.cmpPlatform) {
      case 'onetrust': {
        const isConsented = await this.isConsentedToCategoryOneTrust(
          category_id,
        );
        return isConsented;
      }
      default:
        return false;
    }
  },

  async consentToCategoryOneTrust(category_id) {
    try {
      await this.awaitOneTrust();
    } catch (e) {
      this.throwError(
        'consentToCategoryOneTrust: Error consenting to OneTrust category',
      );
      return false;
    }

    OneTrust.UpdateConsent('Category', `${category_id}:1`);
    return true;
  },

  async consentToCategory(category_id) {
    let result = false;
    switch (this.cmpPlatform) {
      case 'onetrust':
        result = await this.consentToCategoryOneTrust(category_id);
        break;
      default:
        break;
    }
    return result;
  },

  getConsentCategoryForProvider(provider) {
    return this.getProviderSettings(provider)?.cat_id;
  },

  genUID(p) {
    let c = 0;
    let i;
    const prefix = typeof p === 'string' ? p : '';
    do {
      i = prefix + c;
      c += 1;
    } while (document.getElementById(i) !== null);
    return i;
  },

  getConsentOverlay(target) {
    const id = target.getAttribute('id');
    return id
      ? document.querySelector(`#${id} > .${this.overlayClassname}`)
      : null;
  },

  removeConsentOverlay(target) {
    this.getConsentOverlay(target)?.remove();
  },

  consentModalResizeObserver: new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.borderBoxSize[0].inlineSize > 600) {
        setTimeout(() => entry.target.classList.add('wide'), 0);
      } else {
        setTimeout(() => entry.target.classList.remove('wide'), 0);
      }
    });
  }),

  videoOverlayResizeObserver: new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.borderBoxSize[0].inlineSize > 600) {
        entry.target.classList.add('wide');
      } else {
        entry.target.classList.remove('wide');
      }
    });
  }),

  getConsentModal({
    target,
    provider,
    consentCallback = null,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const consent_category = this.getConsentCategoryForProvider(provider);
    const providerSettings = this.getProviderSettings(provider);
    const dialogTitleId = this.genUID('otsuka-pcm-dialogTitle-id-');
    const dialogDescId = this.genUID('otsuka-pcm-dialogDesc-id-');

    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', dialogTitleId);
    modal.setAttribute('aria-describedby', dialogDescId);
    modal.classList.add(this.modalClassname);
    modal.classList.add(provider);

    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    let closeButton;

    if (withCloseButton) {
      closeButton = document.createElement('div');
      closeButton.className = 'otsuka-pcm-consent-close';
      closeButton.innerHTML = '&#10005;';
      closeButton.setAttribute('role', 'button');
      closeButton.setAttribute('aria-label', 'Close');
      closeButton.setAttribute('tabindex', '0');
      closeButton.addEventListener('click', () => {
        this.removeConsentOverlay(target);
        if (cancelCallback) {
          cancelCallback();
        }
      });
      closeButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.target.click();
        }
      });
    }

    const dialogTitle = document.createElement('h2');
    dialogTitle.setAttribute('id', dialogTitleId);
    dialogTitle.setAttribute('hidden', 'hidden');
    dialogTitle.setAttribute('aria-hidden', true);
    dialogTitle.innerHTML = 'Consent request';
    const content = document.createElement('div');
    content.setAttribute('id', dialogDescId);
    content.className = 'otsuka-pcm-consent-content';
    content.innerHTML = providerSettings.modal.description;

    const consentButton = document.createElement('button');
    consentButton.className = 'otsuka-pcm-consent-button';
    consentButton.innerHTML = providerSettings.modal.consent_label;
    consentButton.addEventListener('click', async () => {
      consentButton.setAttribute('disabled', '');
      if (await this.consentToCategory(consent_category)) {
        modal.parentNode.remove();
        if (consentCallback) {
          consentCallback();
        }
      }
      consentButton.removeAttribute('disabled');
    });

    let moreLink;
    const moreLinkLabel = providerSettings.modal.morelink_label;
    const moreLinkUrl = providerSettings.modal.morelink_url;

    if (moreLinkLabel && moreLinkUrl) {
      moreLink = document.createElement('a');
      moreLink.className = 'otsuka-pcm-consent-link';
      moreLink.href = moreLinkUrl;
      moreLink.innerHTML = moreLinkLabel;
      moreLink.setAttribute('role', 'button');
      moreLink.setAttribute('aria-label', moreLinkLabel);
    }

    if (closeButton) {
      modal.append(closeButton);
    }
    modal.append(dialogTitle, content, consentButton);
    if (moreLink) {
      modal.append(moreLink);
    }

    this.consentModalResizeObserver.observe(modal);

    return modal;
  },

  getErrorModal({
    target,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const dialogTitleId = this.genUID('otsuka-pcm-dialogTitle-id-');
    const dialogDescId = this.genUID('otsuka-pcm-dialogDesc-id-');

    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', dialogTitleId);
    modal.setAttribute('aria-describedby', dialogDescId);
    modal.classList.add(this.modalClassname);

    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    let closeButton;

    if (withCloseButton) {
      closeButton = document.createElement('div');
      closeButton.className = 'otsuka-pcm-consent-close';
      closeButton.innerHTML = '&#10005;';
      closeButton.setAttribute('role', 'button');
      closeButton.setAttribute('aria-label', 'Close');
      closeButton.addEventListener('click', () => {
        this.removeConsentOverlay(target);
        if (cancelCallback) {
          cancelCallback();
        }
      });
    }

    const dialogTitle = document.createElement('h2');
    dialogTitle.setAttribute('id', dialogTitleId);
    dialogTitle.setAttribute('hidden', 'hidden');
    dialogTitle.setAttribute('aria-hidden', true);
    dialogTitle.innerHTML = 'Error message';
    const content = document.createElement('div');
    content.setAttribute('id', dialogDescId);
    content.className = 'otsuka-pcm-error-content';
    content.innerHTML = this.settings.general.error_cmp_not_found;

    if (closeButton) {
      modal.append(closeButton);
    }
    modal.append(dialogTitle, content);

    this.consentModalResizeObserver.observe(modal);

    return modal;
  },

  createConsentOverlay({
    target,
    provider,
    consentCallback = null,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const overlay = document.createElement('div');
    overlay.classList.add(this.overlayClassname);
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const providerSettings = this.getProviderSettings(provider);
    if (providerSettings.modal.description !== '') {
      const modal = this.getConsentModal({
        target,
        provider,
        consentCallback,
        cancelCallback,
        withCloseButton,
      });
      overlay.append(modal);
    }
    return overlay;
  },

  createErrorOverlay({
    target,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const overlay = document.createElement('div');
    overlay.classList.add(this.overlayClassname);
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const modal = this.getErrorModal({
      target,
      cancelCallback,
      withCloseButton,
    });
    overlay.append(modal);
    return overlay;
  },

  isManagedSrc(src) {
    let matcher = /(youtu\.be|youtube\.com|youtube-nocookie\.com)\/(embed\/|watch\?v=)?([^?&]+)/;
    let match = src?.match(matcher);
    if (match && match[3]) {
      return {
        domain: match[1],
        video_id: match[3],
        provider: this.getProviderByDomain(match[1]),
      };
    }
    matcher = /(vimeo\.com)\/(video\/)?([0-9]+)/;
    match = src?.match(matcher);
    if (match && match[3]) {
      return {
        domain: match[1],
        video_id: match[3],
        provider: this.getProviderByDomain(match[1]),
      };
    }
    return false;
  },

  getProviderByDomain(domain) {
    switch (domain) {
      case 'vimeo.com':
        return this.providers.VIMEO;
      case 'youtube.com':
      case 'youtu.be':
      case 'youtube-nocookie.com':
        return this.providers.YOUTUBE;
      default:
        return false;
    }
  },

  isProviderEnabled(provider) {
    return this.getProviderSettings(provider)?.enabled || false;
  },

  getOverlayImageSrc(provider) {
    return this.getProviderSettings(provider)?.overlay_image || false;
  },

  getOverlayImage(provider) {
    const imgOverlaySrc = this.getOverlayImageSrc(provider);

    if (!imgOverlaySrc) {
      return false;
    }

    const imgOverlay = document.createElement('img');
    imgOverlay.src = imgOverlaySrc;
    imgOverlay.setAttribute('class', this.overlayImageClassname);
    return imgOverlay;
  },

  doErrorModal({
    target,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    const hasOverlay = this.getConsentOverlay(target);
    if (hasOverlay) {
      return;
    }

    if (!target.getAttribute('id')) {
      const id = this.genUID('otsuka-pcm-overlay-id-');
      target.setAttribute('id', id);
    }

    const overlay = this.createErrorOverlay({
      target,
      cancelCallback,
      withCloseButton,
    });

    target.append(overlay);
  },

  async doConsentModal({
    target,
    provider,
    consentCallback = null,
    cancelCallback = null,
    withCloseButton = true,
  }) {
    if (!this.isProviderEnabled(provider)) {
      if (consentCallback) {
        consentCallback();
      }
      return;
    }

    const consent_category = this.getConsentCategoryForProvider(provider);
    const hasOverlay = this.getConsentOverlay(target);
    const providerSettings = this.getProviderSettings(provider);

    const isConsented = await this.isConsentedToCategory(consent_category);

    if (isConsented) {
      if (consentCallback) {
        consentCallback();
      }
    } else {
      if (hasOverlay) {
        return;
      }

      if (!target.getAttribute('id')) {
        const id = this.genUID('otsuka-pcm-overlay-id-');
        target.setAttribute('id', id);
      }

      const overlayConsentCallback = () => {
        if (consentCallback) {
          consentCallback();
        }
      };

      const overlay = this.createConsentOverlay({
        target,
        provider,
        consentCallback: overlayConsentCallback,
        cancelCallback,
        withCloseButton,
      });

      const previousOverlay = document.querySelector('.otsuka-pcm-consent-overlay');
      if (previousOverlay) {
        previousOverlay.remove();
      }
      if (providerSettings.modal.description !== '') {
        target.append(overlay);
      }

      // Listen for OneTrust consent changes
      const thisContext = this;
      thisContext.callback = consentCallback;
      thisContext.provider = provider;
      thisContext.target = target;
      OneTrust.OnConsentChanged(() => {
        const isConsentedPromise = OtsukaPCM.isConsentedToCategory(consent_category);
        isConsentedPromise.then((isConsentedResult) => {
          const overlayExists = OtsukaPCM.getConsentOverlay(thisContext.target);
          if (isConsentedResult && overlayExists) {
            thisContext.target.querySelector('.otsuka-pcm-consent-overlay')?.remove();
            if (thisContext.callback) {
              thisContext.callback();
            }
          }
        });
      });
    }
  },

  /**
   * Initializes the target video block for use with consent management.
   * @param {Element} videoContainer The video container element.
   * @param {string} videoUrl The URL of the video to load.
   * @param {object} passedOptions An object containing additional options.
   */
  async initVideoBlock(videoContainer, videoUrl, passedOptions = {}) {
    const options = {
      showModal: false,
      withCloseButton: true,
      withDefaultOverlay: true,
      displayErrorModal: true,
      ...passedOptions,
    };

    const { domain, video_id, provider } = this.isManagedSrc(videoUrl);
    if (!domain || !video_id) {
      return; // Not a managed provider, skip consent
    }

    const placeholder = videoContainer.querySelector('.video-placeholder');

    const imgOverlay = this.getOverlayImage(provider);
    if (imgOverlay) {
      imgOverlay.classList.add(this.thumbnailOverlayClassname);
      videoContainer.classList.add(this.thumbnailOverlayCustomClassname);
      if (placeholder) {
        placeholder.append(imgOverlay);
      } else {
        videoContainer.append(imgOverlay);
      }
    } else if (options.withDefaultOverlay) {
      videoContainer.classList.add(this.thumbnailOverlayDefaultClassname);
      this.videoOverlayResizeObserver.observe(videoContainer);
    }

    const clickTarget = placeholder || videoContainer;

    const videoClickListener = async () => {
      try {
        const consentCallback = () => {
          videoContainer.classList.remove(
            this.thumbnailOverlayCustomClassname,
            this.thumbnailOverlayDefaultClassname,
          );
          if (imgOverlay) {
            imgOverlay.remove();
          }

          // Dispatch custom event that video.js listens for
          const e = new CustomEvent('loadVideoWithConsent', {
            detail: { url: videoUrl, autoplay: options.autoplay },
          });
          videoContainer.dispatchEvent(e);
        };

        await this.doConsentModal({
          target: videoContainer,
          provider,
          consentCallback,
          ...options,
        });
      } catch (e) {
        this.printError(`initVideoBlock: caught error: ${e}`);
        if (options.displayErrorModal) {
          this.doErrorModal({
            target: videoContainer,
            ...options,
          });
        }
      }
    };

    clickTarget.addEventListener('click', videoClickListener);
    clickTarget.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') clickTarget.click();
    });
    clickTarget.setAttribute('role', 'button');
    clickTarget.setAttribute('tabindex', '0');
  },
});

window.OtsukaPCM = OtsukaPCM;

export default OtsukaPCM;
