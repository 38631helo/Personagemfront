/**
 * Slider de Cartas Colecionáveis com Efeito Blur Misterioso
 * Suporta navegação por botões, indicadores (dots), arrasto (drag/swipe),
 * suporte a touch/mobile e acessibilidade para teclado/leitores de tela.
 */

class CardSlider {
  constructor(options = {}) {
    this.viewport = document.querySelector(options.viewportSelector || '#sliderViewport');
    this.track = document.querySelector(options.trackSelector || '#sliderTrack');
    this.prevBtn = document.querySelector(options.prevBtnSelector || '#sliderPrevBtn');
    this.nextBtn = document.querySelector(options.nextBtnSelector || '#sliderNextBtn');
    this.dotsContainer = document.querySelector(options.dotsSelector || '#sliderDots');
    this.statusContainer = document.querySelector(options.statusSelector || '#sliderStatus');

    this.characters = [];
    this.currentIndex = 0;
    this.cardWidth = 320;
    this.cardGap = 32;

    // Controle de toque e arrasto
    this.isDragging = false;
    this.startX = 0;
    this.currentTranslate = 0;
    this.prevTranslate = 0;
    this.animationID = 0;

    this.init();
  }

  init() {
    if (!this.viewport || !this.track) return;

    this.bindEvents();
    this.loadCards();
  }

  bindEvents() {
    // Botões de navegação
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prev());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.next());
    }

    // Navegação pelo teclado nas setas esquerda/direita
    window.addEventListener('keydown', (e) => {
      // Se não estiver digitando em um input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') {
        this.prev();
      } else if (e.key === 'ArrowRight') {
        this.next();
      }
    });

    // Eventos de Touch / Arraste
    this.track.addEventListener('touchstart', (e) => this.touchStart(e), { passive: true });
    this.track.addEventListener('touchmove', (e) => this.touchMove(e), { passive: true });
    this.track.addEventListener('touchend', () => this.touchEnd());

    this.track.addEventListener('mousedown', (e) => this.dragStart(e));
    window.addEventListener('mousemove', (e) => this.dragMove(e));
    window.addEventListener('mouseup', () => this.dragEnd());

    // Recálculo ao redimensionar tela
    window.addEventListener('resize', () => {
      this.updateCardDimensions();
      this.updatePosition();
    });
  }

  updateCardDimensions() {
    const firstCard = this.track.querySelector('.game-card');
    if (firstCard) {
      this.cardWidth = firstCard.offsetWidth;
      const computedGap = parseInt(window.getComputedStyle(this.track).gap, 10);
      this.cardGap = isNaN(computedGap) ? 32 : computedGap;
    }
  }

  async loadCards() {
    this.renderLoading();

    try {
      const response = await window.apiService.getCharacters();
      this.characters = (response && response.data) || [];

      if (this.characters.length === 0) {
        this.renderEmpty();
        return;
      }

      this.renderCards();
      this.renderDots();
      this.currentIndex = 0;
      this.updateCardDimensions();
      this.updatePosition();
    } catch (error) {
      this.renderError(error.message);
    }
  }

  renderLoading() {
    this.track.innerHTML = '';
    if (this.dotsContainer) this.dotsContainer.innerHTML = '';
    if (this.statusContainer) {
      this.statusContainer.innerHTML = `
        <div class="state-container">
          <div class="spinner"></div>
          <p class="state-title">Carregando cartas da coleção...</p>
          <p class="state-desc">Conectando à API REST para obter os personagens.</p>
        </div>
      `;
      this.statusContainer.style.display = 'block';
    }
    if (this.viewport) this.viewport.style.display = 'none';
  }

  renderEmpty() {
    if (this.statusContainer) {
      this.statusContainer.innerHTML = `
        <div class="state-container">
          <div class="state-icon">🎴</div>
          <h3 class="state-title">Nenhuma carta encontrada</h3>
          <p class="state-desc">A coleção está vazia no momento. Cadastre novos personagens ou execute o script de seed para iniciar.</p>
          <a href="characters.html" class="btn btn-primary" style="margin-top: 1rem;">
            <span>➕</span> Gerenciar / Cadastrar Personagem
          </a>
        </div>
      `;
      this.statusContainer.style.display = 'block';
    }
    if (this.viewport) this.viewport.style.display = 'none';
  }

  renderError(message) {
    if (this.statusContainer) {
      this.statusContainer.innerHTML = `
        <div class="state-container">
          <div class="state-icon">⚠️</div>
          <h3 class="state-title">Não foi possível carregar as cartas</h3>
          <p class="state-desc">${this.escapeHtml(message)}</p>
          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="btn btn-primary" onclick="window.cardSlider.loadCards()">
              <span>🔄</span> Tentar Novamente
            </button>
            <a href="characters.html" class="btn btn-secondary">
              Ver Configurações
            </a>
          </div>
        </div>
      `;
      this.statusContainer.style.display = 'block';
    }
    if (this.viewport) this.viewport.style.display = 'none';
  }

  renderCards() {
    if (this.statusContainer) {
      this.statusContainer.style.display = 'none';
    }
    if (this.viewport) {
      this.viewport.style.display = 'block';
    }

    this.track.innerHTML = this.characters.map((char, index) => this.createCardHTML(char, index)).join('');

    // Adiciona listener para toques em dispositivos móveis (revelar sem hover)
    const cards = this.track.querySelectorAll('.game-card');
    cards.forEach((card) => {
      // Toggle blur ao tocar na carta no mobile/tablet
      card.addEventListener('click', () => {
        // Remove de outras cartas se quiser focar apenas em uma
        cards.forEach((c) => {
          if (c !== card) c.classList.remove('revealed');
        });
        card.classList.toggle('revealed');
      });

      // Suporte para foco via teclado (Tab)
      card.addEventListener('focus', () => {
        card.classList.add('revealed');
      });
      card.addEventListener('blur', () => {
        card.classList.remove('revealed');
      });

      // Tratamento de falha no carregamento da imagem (fallback automático)
      const img = card.querySelector('.card-image');
      if (img) {
        img.addEventListener('error', () => {
          console.warn(`Imagem falhou ao carregar: ${img.src}. Aplicando placeholder reserva.`);
          img.src = 'assets/placeholders/default-card.svg';
        });
      }
    });
  }

  createCardHTML(char, index) {
    const raritySlug = window.apiService.getRaritySlug(char.rarity);
    const formattedPrice = window.apiService.formatPrice(char.price);
    const releaseYear = window.apiService.extractYear(char.releaseDate);
    const imageUrl = window.apiService.resolveImageUrl(char.imageUrl);

    return `
      <article
        class="game-card rarity-${raritySlug}"
        tabindex="0"
        role="region"
        aria-label="Carta do personagem ${this.escapeHtml(char.name)}, do jogo ${this.escapeHtml(char.game)}"
        data-index="${index}"
      >
        <!-- Badge de Raridade Superior -->
        <span class="card-rarity-badge">${this.escapeHtml(char.rarity)}</span>

        <!-- Wrapper de Mídia com Imagem Desfocada -->
        <div class="card-media-wrapper">
          <img
            class="card-image"
            src="${this.escapeHtml(imageUrl)}"
            alt="Arte conceitual de ${this.escapeHtml(char.name)}"
            loading="lazy"
          />

          <!-- Overlay de Carta Misteriosa que some no hover/foco -->
          <div class="card-mystery-overlay" aria-hidden="true">
            <div class="mystery-icon">✨</div>
            <span class="mystery-text">Passe o mouse ou toque</span>
          </div>
        </div>

        <!-- Área de Conteúdo da Carta -->
        <div class="card-content">
          <h3 class="card-title" title="${this.escapeHtml(char.name)}">${this.escapeHtml(char.name)}</h3>
          <p class="card-game" title="${this.escapeHtml(char.game)}">${this.escapeHtml(char.game)}</p>

          <div class="card-meta-row">
            <span class="card-release-year">LANÇAMENTO: ${this.escapeHtml(releaseYear)}</span>
            <span class="card-price" aria-label="Preço: ${this.escapeHtml(formattedPrice)}">${this.escapeHtml(formattedPrice)}</span>
          </div>
        </div>
      </article>
    `;
  }

  renderDots() {
    if (!this.dotsContainer) return;
    this.dotsContainer.innerHTML = '';

    const maxIndex = this.getMaxIndex();
    for (let i = 0; i <= maxIndex; i++) {
      const dot = document.createElement('button');
      dot.className = `slider-dot ${i === this.currentIndex ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Ir para a posição ${i + 1}`);
      dot.addEventListener('click', () => this.goTo(i));
      this.dotsContainer.appendChild(dot);
    }
  }

  getMaxIndex() {
    if (!this.viewport || this.characters.length === 0) return 0;
    const viewportWidth = this.viewport.offsetWidth;
    const totalWidth = this.characters.length * (this.cardWidth + this.cardGap) - this.cardGap;
    const scrollableDistance = Math.max(0, totalWidth - viewportWidth);
    const cardStep = this.cardWidth + this.cardGap;
    return Math.ceil(scrollableDistance / cardStep);
  }

  goTo(index) {
    const maxIndex = this.getMaxIndex();
    this.currentIndex = Math.max(0, Math.min(index, maxIndex));
    this.updatePosition();
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updatePosition();
    }
  }

  next() {
    const maxIndex = this.getMaxIndex();
    if (this.currentIndex < maxIndex) {
      this.currentIndex++;
      this.updatePosition();
    }
  }

  updatePosition() {
    this.updateCardDimensions();
    const maxIndex = this.getMaxIndex();

    // Atualiza estado dos botões
    if (this.prevBtn) this.prevBtn.disabled = this.currentIndex <= 0;
    if (this.nextBtn) this.nextBtn.disabled = this.currentIndex >= maxIndex;

    // Atualiza dots
    if (this.dotsContainer) {
      const dots = this.dotsContainer.querySelectorAll('.slider-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === this.currentIndex);
      });
    }

    // Calcula deslocamento
    const offset = -(this.currentIndex * (this.cardWidth + this.cardGap));
    this.track.style.transform = `translateX(${offset}px)`;
    this.currentTranslate = offset;
    this.prevTranslate = offset;
  }

  // --- Handlers de Toque / Touch ---
  touchStart(e) {
    this.startX = e.touches[0].clientX;
    this.isDragging = true;
  }

  touchMove(e) {
    if (!this.isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - this.startX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        this.prev();
      } else {
        this.next();
      }
      this.isDragging = false;
    }
  }

  touchEnd() {
    this.isDragging = false;
  }

  // --- Handlers de Drag com Mouse ---
  dragStart(e) {
    this.startX = e.clientX;
    this.isDragging = true;
    if (this.viewport) this.viewport.classList.add('grabbing');
  }

  dragMove(e) {
    if (!this.isDragging) return;
    const currentX = e.clientX;
    const diff = currentX - this.startX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        this.prev();
      } else {
        this.next();
      }
      this.isDragging = false;
      if (this.viewport) this.viewport.classList.remove('grabbing');
    }
  }

  dragEnd() {
    this.isDragging = false;
    if (this.viewport) this.viewport.classList.remove('grabbing');
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.cardSlider = new CardSlider();
});
