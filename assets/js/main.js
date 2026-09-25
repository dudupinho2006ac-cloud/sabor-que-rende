document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.nav-list');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  const recipeMeta = document.querySelector('.recipe-meta');
  const ingredients = document.querySelector('#ingredientes');

  if (recipeMeta && ingredients && !document.querySelector('.jump-to-recipe')) {
    const jumpLink = document.createElement('a');
    jumpLink.className = 'jump-to-recipe';
    jumpLink.href = '#ingredientes';
    jumpLink.textContent = '↓ Ir para a receita';
    recipeMeta.insertAdjacentElement('afterend', jumpLink);
  }

  const form = document.querySelector('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const feedback = form.querySelector('[data-form-feedback]');
      feedback.textContent = 'Este formulário é uma demonstração local. Ao publicar o site, conecte-o a um serviço seguro de envio.';
      feedback.focus();
    });
  }
});
