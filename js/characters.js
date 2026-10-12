/**
 * Gerenciamento de Personagens (CRUD, Filtros, Busca, Modais e Notificações)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos da interface
  const searchInput = document.getElementById('searchInput');
  const rarityFilter = document.getElementById('rarityFilter');
  const sortSelect = document.getElementById('sortSelect');
  const gridViewBtn = document.getElementById('gridViewBtn');
  const tableViewBtn = document.getElementById('tableViewBtn');
  const charactersGrid = document.getElementById('charactersGrid');
  const charactersTableWrap = document.getElementById('charactersTableWrap');
  const charactersTableBody = document.getElementById('charactersTableBody');
  const resultsCount = document.getElementById('resultsCount');
  const statusContainer = document.getElementById('manageStatus');

  // Modais
  const characterModal = document.getElementById('characterModal');
  const characterForm = document.getElementById('characterForm');
  const modalTitle = document.getElementById('modalTitle');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const addCharacterBtn = document.getElementById('addCharacterBtn');

  // Campos do formulário
  const charIdInput = document.getElementById('charId');
  const charNameInput = document.getElementById('charName');
  const charGameInput = document.getElementById('charGame');
  const charReleaseDateInput = document.getElementById('charReleaseDate');
  const charImageUrlInput = document.getElementById('charImageUrl');
  const charRarityInput = document.getElementById('charRarity');
  const charPriceInput = document.getElementById('charPrice');
  const charDescriptionInput = document.getElementById('charDescription');

  // Modal de Exclusão
  const deleteModal = document.getElementById('deleteModal');
  const deleteCharName = document.getElementById('deleteCharName');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const deleteCloseBtn = document.getElementById('deleteCloseBtn');

  // Modal de Detalhes
  const detailModal = document.getElementById('detailModal');
  const detailModalClose = document.getElementById('detailModalClose');
  const detailModalBody = document.getElementById('detailModalBody');

  // Modal de Configuração de API
  const configApiModal = document.getElementById('configApiModal');
  const configApiBtn = document.getElementById('configApiBtn');
  const configApiCloseBtn = document.getElementById('configApiCloseBtn');
  const configApiCancelBtn = document.getElementById('configApiCancelBtn');
  const configApiForm = document.getElementById('configApiForm');
  const apiUrlInput = document.getElementById('apiUrlInput');
  const resetApiUrlBtn = document.getElementById('resetApiUrlBtn');

  // Estado local
  let currentCharacters = [];
  let currentView = 'grid'; // 'grid' ou 'table'
  let charToDeleteId = null;
  let searchTimeout = null;

  // Inicialização
  initTheme();
  checkApiHealth();
  loadCharacters();

  // ==========================================
  // FILTROS E BUSCA COM DEBOUNCE
  // ==========================================
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadCharacters();
      }, 350);
    });
  }

  if (rarityFilter) {
    rarityFilter.addEventListener('change', () => loadCharacters());
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => loadCharacters());
  }

  // Alternância de visualização (Grid vs Tabela)
  if (gridViewBtn && tableViewBtn) {
    gridViewBtn.addEventListener('click', () => setView('grid'));
    tableViewBtn.addEventListener('click', () => setView('table'));
  }

  function setView(view) {
    currentView = view;
    if (view === 'grid') {
      gridViewBtn.classList.add('active');
      tableViewBtn.classList.remove('active');
      charactersGrid.style.display = 'grid';
      charactersTableWrap.style.display = 'none';
    } else {
      tableViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
      charactersTableWrap.style.display = 'block';
      charactersGrid.style.display = 'none';
    }
  }

  // ==========================================
  // CARREGAR DADOS DA API
  // ==========================================
  async function loadCharacters() {
    renderLoading();

    try {
      const search = searchInput ? searchInput.value.trim() : '';
      const rarity = rarityFilter ? rarityFilter.value : '';
      const sortValue = sortSelect ? sortSelect.value : 'createdAt_desc';

      const [sortBy, order] = sortValue.split('_');

      const response = await window.apiService.getCharacters({
        search,
        rarity,
        sortBy,
        order,
      });

      currentCharacters = (response && response.data) || [];

      if (resultsCount) {
        resultsCount.textContent = `${currentCharacters.length} personagem(ns) encontrado(s)`;
      }

      if (currentCharacters.length === 0) {
        renderEmpty();
        return;
      }

      renderData();
    } catch (error) {
      renderError(error.message);
    }
  }

  function renderLoading() {
    if (statusContainer) {
      statusContainer.innerHTML = `
        <div class="state-container">
          <div class="spinner"></div>
          <p class="state-title">Carregando personagens...</p>
        </div>
      `;
      statusContainer.style.display = 'block';
    }
    if (charactersGrid) charactersGrid.style.display = 'none';
    if (charactersTableWrap) charactersTableWrap.style.display = 'none';
  }

  function renderEmpty() {
    if (statusContainer) {
      statusContainer.innerHTML = `
        <div class="state-container">
          <div class="state-icon">🔍</div>
          <h3 class="state-title">Nenhum personagem encontrado</h3>
          <p class="state-desc">Nenhum resultado corresponde aos critérios de pesquisa ou o banco de dados está vazio.</p>
          <button class="btn btn-primary" onclick="window.openAddModal()" style="margin-top: 1rem;">
            <span>➕</span> Cadastrar Novo Personagem
          </button>
        </div>
      `;
      statusContainer.style.display = 'block';
    }
    if (charactersGrid) charactersGrid.style.display = 'none';
    if (charactersTableWrap) charactersTableWrap.style.display = 'none';
  }

  function renderError(message) {
    if (statusContainer) {
      statusContainer.innerHTML = `
        <div class="state-container">
          <div class="state-icon">⚠️</div>
          <h3 class="state-title">Falha ao buscar personagens</h3>
          <p class="state-desc">${escapeHtml(message)}</p>
          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="btn btn-primary" onclick="window.loadCharactersRetry()">
              <span>🔄</span> Tentar Novamente
            </button>
            <button class="btn btn-secondary" onclick="window.openConfigApiModal()">
              ⚙️ Configurar URL da API
            </button>
          </div>
        </div>
      `;
      statusContainer.style.display = 'block';
    }
    if (charactersGrid) charactersGrid.style.display = 'none';
    if (charactersTableWrap) charactersTableWrap.style.display = 'none';
  }

  window.loadCharactersRetry = () => loadCharacters();

  function renderData() {
    if (statusContainer) statusContainer.style.display = 'none';

    // Renderiza Grid
    if (charactersGrid) {
      charactersGrid.innerHTML = currentCharacters.map((char) => createCardManageHTML(char)).join('');
    }

    // Renderiza Tabela
    if (charactersTableBody) {
      charactersTableBody.innerHTML = currentCharacters.map((char) => createTableRowHTML(char)).join('');
    }

    // Restaura visualização ativa
    setView(currentView);

    // Adiciona listeners para os botões gerados dinamicamente
    bindActionButtons();
  }

  function createCardManageHTML(char) {
    const raritySlug = window.apiService.getRaritySlug(char.rarity);
    const priceFormatted = window.apiService.formatPrice(char.price);
    const releaseYear = window.apiService.extractYear(char.releaseDate);
    const imgUrl = window.apiService.resolveImageUrl(char.imageUrl);

    return `
      <div class="manage-card" data-id="${char.id || char._id}">
        <div class="manage-card-img-wrap">
          <span class="card-rarity-badge" style="position: absolute; top: 0.75rem; right: 0.75rem;">${escapeHtml(char.rarity)}</span>
          <img
            src="${escapeHtml(imgUrl)}"
            alt="${escapeHtml(char.name)}"
            class="manage-card-img"
            onerror="this.src='assets/placeholders/default-card.svg'"
          />
        </div>
        <div class="manage-card-body">
          <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(char.name)}</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem;">🎮 ${escapeHtml(char.game)}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.85rem;">
            <span style="color: var(--text-muted); font-weight: 600;">Ano: ${escapeHtml(releaseYear)}</span>
            <span style="font-weight: 800; color: var(--primary-accent); font-size: 1.05rem;">${escapeHtml(priceFormatted)}</span>
          </div>
          ${char.description ? `<p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.35rem; line-height: 1.3;">${escapeHtml(char.description.substring(0, 90))}${char.description.length > 90 ? '...' : ''}</p>` : ''}
          <div class="manage-card-actions">
            <button class="btn btn-secondary btn-sm view-char-btn" data-id="${char.id || char._id}" title="Visualizar Detalhes">
              👁️ Ver
            </button>
            <button class="btn btn-secondary btn-sm edit-char-btn" data-id="${char.id || char._id}" title="Editar Personagem">
              ✏️ Editar
            </button>
            <button class="btn btn-danger btn-sm delete-char-btn" data-id="${char.id || char._id}" data-name="${escapeHtml(char.name)}" title="Excluir Personagem" style="margin-left: auto;">
              🗑️ Excluir
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function createTableRowHTML(char) {
    const priceFormatted = window.apiService.formatPrice(char.price);
    const releaseDateBr = window.apiService.formatDateBR(char.releaseDate);
    const imgUrl = window.apiService.resolveImageUrl(char.imageUrl);

    return `
      <tr data-id="${char.id || char._id}">
        <td>
          <img
            src="${escapeHtml(imgUrl)}"
            alt="${escapeHtml(char.name)}"
            class="table-thumbnail"
            onerror="this.src='assets/placeholders/default-card.svg'"
          />
        </td>
        <td><strong>${escapeHtml(char.name)}</strong></td>
        <td>${escapeHtml(char.game)}</td>
        <td><span class="card-rarity-badge" style="position: static; display: inline-block;">${escapeHtml(char.rarity)}</span></td>
        <td>${escapeHtml(releaseDateBr)}</td>
        <td><strong style="color: var(--primary-accent);">${escapeHtml(priceFormatted)}</strong></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm view-char-btn" data-id="${char.id || char._id}">👁️</button>
            <button class="btn btn-secondary btn-sm edit-char-btn" data-id="${char.id || char._id}">✏️</button>
            <button class="btn btn-danger btn-sm delete-char-btn" data-id="${char.id || char._id}" data-name="${escapeHtml(char.name)}">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }

  function bindActionButtons() {
    // Botões de Detalhes
    document.querySelectorAll('.view-char-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openDetailModal(id);
      });
    });

    // Botões de Edição
    document.querySelectorAll('.edit-char-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditModal(id);
      });
    });

    // Botões de Exclusão
    document.querySelectorAll('.delete-char-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        openDeleteModal(id, name);
      });
    });
  }

  // ==========================================
  // MODAL DE CADASTRO / EDIÇÃO
  // ==========================================
  window.openAddModal = () => {
    modalTitle.textContent = 'Cadastrar Novo Personagem';
    characterForm.reset();
    charIdInput.value = '';
    characterModal.classList.add('open');
  };

  if (addCharacterBtn) {
    addCharacterBtn.addEventListener('click', window.openAddModal);
  }

  function closeModal() {
    characterModal.classList.remove('open');
    characterForm.reset();
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

  // Sugestões de Placeholder clicáveis
  document.querySelectorAll('.placeholder-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const path = pill.getAttribute('data-path');
      if (charImageUrlInput) {
        charImageUrlInput.value = path;
      }
    });
  });

  // Submissão do Formulário (POST ou PUT)
  if (characterForm) {
    characterForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = charIdInput.value;
      const isEditing = Boolean(id);

      const characterData = {
        name: charNameInput.value.trim(),
        game: charGameInput.value.trim(),
        releaseDate: charReleaseDateInput.value,
        imageUrl: charImageUrlInput.value.trim(),
        rarity: charRarityInput.value,
        price: parseFloat(charPriceInput.value),
        description: charDescriptionInput.value.trim(),
      };

      // Validação básica frontend
      if (!characterData.name || !characterData.game || !characterData.releaseDate || !characterData.imageUrl || !characterData.rarity || isNaN(characterData.price)) {
        showToast('Preencha todos os campos obrigatórios corretamente.', 'error');
        return;
      }

      if (characterData.price < 0) {
        showToast('O preço deve ser igual ou superior a zero.', 'error');
        return;
      }

      try {
        if (isEditing) {
          await window.apiService.updateCharacter(id, characterData);
          showToast(`Personagem "${characterData.name}" atualizado com sucesso!`, 'success');
        } else {
          await window.apiService.createCharacter(characterData);
          showToast(`Personagem "${characterData.name}" cadastrado com sucesso!`, 'success');
        }

        closeModal();
        await loadCharacters();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  function openEditModal(id) {
    const character = currentCharacters.find((c) => (c.id || c._id) === id);
    if (!character) {
      showToast('Personagem não encontrado.', 'error');
      return;
    }

    modalTitle.textContent = `Editar: ${character.name}`;
    charIdInput.value = character.id || character._id;
    charNameInput.value = character.name || '';
    charGameInput.value = character.game || '';
    charReleaseDateInput.value = window.apiService.formatInputDate(character.releaseDate);
    charImageUrlInput.value = character.imageUrl || '';
    charRarityInput.value = character.rarity || 'Comum';
    charPriceInput.value = character.price !== undefined ? character.price : '';
    charDescriptionInput.value = character.description || '';

    characterModal.classList.add('open');
  }

  // ==========================================
  // MODAL DE EXCLUSÃO COM CONFIRMAÇÃO
  // ==========================================
  function openDeleteModal(id, name) {
    charToDeleteId = id;
    if (deleteCharName) {
      deleteCharName.textContent = name;
    }
    deleteModal.classList.add('open');
  }

  function closeDeleteModal() {
    deleteModal.classList.remove('open');
    charToDeleteId = null;
  }

  if (deleteCloseBtn) deleteCloseBtn.addEventListener('click', closeDeleteModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!charToDeleteId) return;

      try {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = 'Excluindo...';

        await window.apiService.deleteCharacter(charToDeleteId);
        showToast('Personagem excluído com sucesso!', 'success');

        closeDeleteModal();
        await loadCharacters();
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Sim, Excluir';
      }
    });
  }

  // ==========================================
  // MODAL DE DETALHES DO PERSONAGEM
  // ==========================================
  function openDetailModal(id) {
    const char = currentCharacters.find((c) => (c.id || c._id) === id);
    if (!char) return;

    const raritySlug = window.apiService.getRaritySlug(char.rarity);
    const priceFormatted = window.apiService.formatPrice(char.price);
    const releaseDateBr = window.apiService.formatDateBR(char.releaseDate);
    const releaseYear = window.apiService.extractYear(char.releaseDate);
    const imgUrl = window.apiService.resolveImageUrl(char.imageUrl);

    if (detailModalBody) {
      detailModalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="position: relative; width: 100%; height: 320px; border-radius: var(--radius-md); overflow: hidden; background: #050811; border: 2px solid var(--border-color);">
            <span class="card-rarity-badge" style="position: absolute; top: 1rem; right: 1rem;">${escapeHtml(char.rarity)}</span>
            <img
              src="${escapeHtml(imgUrl)}"
              alt="${escapeHtml(char.name)}"
              style="width: 100%; height: 100%; object-fit: cover;"
              onerror="this.src='assets/placeholders/default-card.svg'"
            />
          </div>
          <div>
            <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${escapeHtml(char.name)}</h2>
            <p style="font-size: 1.1rem; color: var(--primary-accent); font-weight: 600;">🎮 ${escapeHtml(char.game)}</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-sm);">
            <div>
              <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Lançamento Original</span>
              <p style="font-weight: 700;">${escapeHtml(releaseDateBr)} (${escapeHtml(releaseYear)})</p>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Preço da Carta</span>
              <p style="font-weight: 800; font-size: 1.2rem; color: var(--primary-accent);">${escapeHtml(priceFormatted)}</p>
            </div>
          </div>
          ${char.description ? `
            <div>
              <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Descrição / Lore</span>
              <p style="margin-top: 0.25rem; line-height: 1.5; color: var(--text-secondary);">${escapeHtml(char.description)}</p>
            </div>
          ` : ''}
        </div>
      `;
    }

    detailModal.classList.add('open');
  }

  if (detailModalClose) {
    detailModalClose.addEventListener('click', () => {
      detailModal.classList.remove('open');
    });
  }

  // ==========================================
  // CONFIGURAÇÃO DA URL DA API
  // ==========================================
  window.openConfigApiModal = () => {
    if (apiUrlInput) {
      apiUrlInput.value = window.apiService.getBaseUrl();
    }
    configApiModal.classList.add('open');
  };

  if (configApiBtn) configApiBtn.addEventListener('click', window.openConfigApiModal);
  if (configApiCloseBtn) configApiCloseBtn.addEventListener('click', () => configApiModal.classList.remove('open'));
  if (configApiCancelBtn) configApiCancelBtn.addEventListener('click', () => configApiModal.classList.remove('open'));

  if (resetApiUrlBtn) {
    resetApiUrlBtn.addEventListener('click', () => {
      window.apiService.setBaseUrl(null);
      if (apiUrlInput) apiUrlInput.value = window.apiService.getBaseUrl();
      showToast('URL da API restaurada para o padrão local.', 'info');
      checkApiHealth();
      loadCharacters();
      configApiModal.classList.remove('open');
    });
  }

  if (configApiForm) {
    configApiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newUrl = apiUrlInput.value.trim();
      if (!newUrl) {
        showToast('Informe uma URL válida.', 'error');
        return;
      }
      window.apiService.setBaseUrl(newUrl);
      showToast('URL da API atualizada com sucesso!', 'success');
      configApiModal.classList.remove('open');
      checkApiHealth();
      loadCharacters();
    });
  }

  // ==========================================
  // HEALTH CHECK PERIÓDICO DO BACKEND
  // ==========================================
  async function checkApiHealth() {
    const dot = document.getElementById('apiStatusDot');
    const text = document.getElementById('apiStatusText');
    if (!dot || !text) return;

    try {
      const res = await window.apiService.healthCheck();
      if (res && res.status === 'healthy') {
        dot.className = 'api-status-dot online';
        text.textContent = 'API Online';
      } else {
        dot.className = 'api-status-dot offline';
        text.textContent = 'API Degrada';
      }
    } catch {
      dot.className = 'api-status-dot offline';
      text.textContent = 'API Offline';
    }
  }

  setInterval(checkApiHealth, 20000);

  // ==========================================
  // TEMA CLARO / ESCURO
  // ==========================================
  function initTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const savedTheme = localStorage.getItem('GAME_CARDS_THEME') || 'dark';

    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      if (themeBtn) themeBtn.textContent = '🌙';
    } else {
      document.body.classList.remove('light-theme');
      if (themeBtn) themeBtn.textContent = '☀️';
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('GAME_CARDS_THEME', isLight ? 'light' : 'dark');
        themeBtn.textContent = isLight ? '🌙' : '☀️';
      });
    }
  }

  // ==========================================
  // NOTIFICAÇÕES TOAST
  // ==========================================
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
