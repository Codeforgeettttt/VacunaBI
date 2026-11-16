'use strict';
globalThis.VacunaEtapas = {
 connect(document) {
 const $ = id => document.getElementById(id);
  const steps = [...document.querySelectorAll('[data-step]')];
  function showStep(step, focus = false) {
    for (const button of steps) {
      if (button.dataset.step === step) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    }
    for (const panel of document.querySelectorAll('[data-decision-panel]')) panel.hidden = panel.dataset.decisionPanel !== step;
    $('decision-progress').value = Number(step);
    $('decision-progress-label').textContent = `Etapa ${step} de 4 · ${steps.find(button => button.dataset.step === step).textContent.replace(/^\d+\.\s*/, '')}`;
    if (focus) {
      const heading = document.querySelector('[data-decision-panel]:not([hidden]) h3');
      heading.tabIndex = -1;
      heading.focus();
    }
  }
  steps.forEach(button => button.addEventListener('click',() => showStep(button.dataset.step,true)));
  document.querySelectorAll('[data-next-step]').forEach(button =>
    button.addEventListener('click',() => showStep(button.dataset.nextStep,true)));
 }
};
