/**
 * AetherFlow Core Application Logic
 * Implements performance-isolated matrix-driven pricing,
 * Bento-to-Accordion context lock synchronization, and snappy entrance loader.
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================================================
  // Snappy Entrance Loader
  // ==========================================================================
  const loader = document.getElementById('loader');
  if (loader) {
    // Snappy loading sequence: fade out and remove within 200ms of DOM load
    setTimeout(() => {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.display = 'none';
      }, 400); // match CSS fade transition duration
    }, 100);
  }

  // ==========================================================================
  // Pricing State & Isolated Dynamic Matrix Computation
  // ==========================================================================
  const pricingMatrix = {
    tiers: {
      starter: { baseUSD: 19 },
      professional: { baseUSD: 49 },
      enterprise: { baseUSD: 99 }
    },
    currencies: {
      USD: { symbol: '$', rate: 1.0, factor: 1.0 },
      EUR: { symbol: '€', rate: 0.92, factor: 0.95 },
      INR: { symbol: '₹', rate: 83.5, factor: 0.40 } // PPP adjustment: 0.4x factor
    },
    billing: {
      monthly: { discount: 0.0, label: '/mo' },
      annual: { discount: 0.20, label: '/mo' } // 20% discount
    }
  };

  let currentCurrency = 'USD';
  let currentBilling = 'monthly'; // 'monthly' or 'annual'

  // DOM elements cache to isolate updates (no reflows)
  const priceStarter = document.getElementById('price-starter');
  const priceProfessional = document.getElementById('price-professional');
  const priceEnterprise = document.getElementById('price-enterprise');

  const symbolStarter = document.getElementById('symbol-starter');
  const symbolProfessional = document.getElementById('symbol-professional');
  const symbolEnterprise = document.getElementById('symbol-enterprise');

  const periodStarter = document.getElementById('period-starter');
  const periodProfessional = document.getElementById('period-professional');
  const periodEnterprise = document.getElementById('period-enterprise');

  const savingsStarter = document.getElementById('savings-starter');
  const savingsProfessional = document.getElementById('savings-professional');
  const savingsEnterprise = document.getElementById('savings-enterprise');

  const priceElements = [priceStarter, priceProfessional, priceEnterprise];

  function formatBilledNote(tierKey, baseUSD, discount, rate, factor, isAnnual) {
    const symbol = pricingMatrix.currencies[currentCurrency].symbol;
    if (!isAnnual) {
      return 'Billed monthly';
    }
    
    // Annual calculations
    const monthlyRate = baseUSD * discount * rate * factor;
    const annualTotal = Math.round(monthlyRate * 12);
    
    // Savings calculation
    const baseMonthlyUSD = baseUSD * rate * factor;
    const fullAnnualTotal = Math.round(baseMonthlyUSD * 12);
    const savings = fullAnnualTotal - annualTotal;

    return `Billed ${symbol}${annualTotal.toLocaleString()}/yr. Save ${symbol}${savings.toLocaleString()}`;
  }

  function updatePrices() {
    const currency = pricingMatrix.currencies[currentCurrency];
    const billing = pricingMatrix.billing[currentBilling];
    const discountFactor = 1 - billing.discount;
    const isAnnual = currentBilling === 'annual';

    // Add changing class for fade micro-interaction (150ms)
    priceElements.forEach(el => {
      if (el) el.classList.add('changing');
    });

    // Update nodes after short fade out
    setTimeout(() => {
      // Starter
      const starterPriceComputed = Math.round(pricingMatrix.tiers.starter.baseUSD * discountFactor * currency.rate * currency.factor);
      if (priceStarter) priceStarter.textContent = starterPriceComputed.toString();
      if (symbolStarter) symbolStarter.textContent = currency.symbol;
      if (periodStarter) periodStarter.textContent = billing.label;
      if (savingsStarter) savingsStarter.textContent = formatBilledNote('starter', pricingMatrix.tiers.starter.baseUSD, discountFactor, currency.rate, currency.factor, isAnnual);

      // Professional
      const profPriceComputed = Math.round(pricingMatrix.tiers.professional.baseUSD * discountFactor * currency.rate * currency.factor);
      if (priceProfessional) priceProfessional.textContent = profPriceComputed.toString();
      if (symbolProfessional) symbolProfessional.textContent = currency.symbol;
      if (periodProfessional) periodProfessional.textContent = billing.label;
      if (savingsProfessional) savingsProfessional.textContent = formatBilledNote('professional', pricingMatrix.tiers.professional.baseUSD, discountFactor, currency.rate, currency.factor, isAnnual);

      // Enterprise
      const enterprisePriceComputed = Math.round(pricingMatrix.tiers.enterprise.baseUSD * discountFactor * currency.rate * currency.factor);
      if (priceEnterprise) priceEnterprise.textContent = enterprisePriceComputed.toString();
      if (symbolEnterprise) symbolEnterprise.textContent = currency.symbol;
      if (periodEnterprise) periodEnterprise.textContent = billing.label;
      if (savingsEnterprise) savingsEnterprise.textContent = formatBilledNote('enterprise', pricingMatrix.tiers.enterprise.baseUSD, discountFactor, currency.rate, currency.factor, isAnnual);

      // Remove changing class to fade back in
      priceElements.forEach(el => {
        if (el) el.classList.remove('changing');
      });
    }, 120);
  }

  // Currency select listener
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.addEventListener('change', (e) => {
      currentCurrency = e.target.value;
      updatePrices();
    });
  }

  // Billing Toggle Switch listener
  const billingToggle = document.getElementById('billing-toggle');
  const labelMonthly = document.getElementById('label-monthly');
  const labelAnnual = document.getElementById('label-annual');

  if (billingToggle) {
    billingToggle.addEventListener('click', () => {
      const isAnnualActive = billingToggle.classList.toggle('annual-active');
      currentBilling = isAnnualActive ? 'annual' : 'monthly';
      billingToggle.setAttribute('aria-checked', isAnnualActive.toString());
      
      if (isAnnualActive) {
        labelAnnual.classList.add('active');
        labelMonthly.classList.remove('active');
      } else {
        labelMonthly.classList.add('active');
        labelAnnual.classList.remove('active');
      }
      
      updatePrices();
    });
  }

  // Initialize prices on load
  updatePrices();


  // ==========================================================================
  // Bento-to-Accordion Layout & Context Lock Sync
  // ==========================================================================
  let activeIndex = 0;
  let isMobile = window.innerWidth < 768;

  const featureCards = document.querySelectorAll('.feature-card');
  const accordionContentBodies = document.querySelectorAll('.feature-body');

  // Track hover state on desktop
  featureCards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
      if (!isMobile) {
        activeIndex = index;
        // Highlight active bento card visual cue (adding a class)
        featureCards.forEach((c, idx) => {
          if (idx === index) {
            c.style.borderColor = 'var(--color-accent-gold)';
            c.style.boxShadow = 'var(--shadow-glow-gold)';
          } else {
            c.style.borderColor = '';
            c.style.boxShadow = '';
          }
        });
      }
    });

    card.addEventListener('mouseleave', () => {
      if (!isMobile) {
        // Reset card borders
        card.style.borderColor = '';
        card.style.boxShadow = '';
      }
    });

    // Mobile click listener on accordion header
    const header = card.querySelector('.feature-header');
    if (header) {
      header.addEventListener('click', (e) => {
        if (isMobile) {
          // If clicking an already active accordion item, we keep it open (or close if toggle behavior is desired,
          // but problem brief states: "ensuring the corresponding panel is open smoothly")
          const clickedIndex = parseInt(card.getAttribute('data-index'), 10);
          activeIndex = clickedIndex;
          syncAccordionView();
        }
      });
    }
  });

  // Sync accordion panels height and classes
  function syncAccordionView() {
    accordionContentBodies.forEach((body, idx) => {
      const card = body.closest('.feature-card');
      if (idx === activeIndex) {
        card.classList.add('is-active');
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity = '1';
      } else {
        card.classList.remove('is-active');
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
      }
    });
  }

  // Clean styles when switching back to desktop
  function resetAccordionView() {
    accordionContentBodies.forEach(body => {
      const card = body.closest('.feature-card');
      card.classList.remove('is-active');
      body.style.maxHeight = '';
      body.style.opacity = '';
    });
  }

  // Listen for window resize to sync contexts
  window.addEventListener('resize', () => {
    const currentIsMobile = window.innerWidth < 768;
    
    // Check if we transitioned across the 768px mobile breakpoint
    if (currentIsMobile !== isMobile) {
      isMobile = currentIsMobile;
      
      if (isMobile) {
        // Transitioned to mobile Accordion view: sync index and open smoothly
        syncAccordionView();
      } else {
        // Transitioned to desktop Bento Grid view: clean mobile styles
        resetAccordionView();
        
        // Highlight corresponding desktop bento card
        featureCards.forEach((c, idx) => {
          if (idx === activeIndex) {
            c.style.borderColor = 'var(--color-accent-gold)';
            c.style.boxShadow = 'var(--shadow-glow-gold)';
            
            // Brief glow highlight animation using simple delay reset
            setTimeout(() => {
              c.style.borderColor = '';
              c.style.boxShadow = '';
            }, 1000);
          }
        });
      }
    }
    
    // Recalculate heights if already in mobile view and resized (e.g. device rotation)
    if (isMobile) {
      syncAccordionView();
    }
  });

  // Initialize mobile accordion view on start if loaded in mobile view
  if (isMobile) {
    syncAccordionView();
  }

});
