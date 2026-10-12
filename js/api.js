/**
 * API Service para comunicação com o backend Game Cards
 * Suporta configuração dinâmica da URL base via localStorage ou window.APP_CONFIG.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

const apiService = {
  /**
   * Obtém a URL base atual da API
   */
  getBaseUrl() {
    return (
      (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('GAME_CARDS_API_URL')) ||
      DEFAULT_API_BASE_URL
    );
  },

  /**
   * Define uma nova URL base no localStorage
   */
  setBaseUrl(url) {
    if (!url) {
      localStorage.removeItem('GAME_CARDS_API_URL');
    } else {
      let cleanUrl = url.trim();
      // Remove barra final se houver
      cleanUrl = cleanUrl.replace(/\/+$/, '');
      // Se não terminar com /api, adiciona
      if (!cleanUrl.endsWith('/api')) {
        cleanUrl += '/api';
      }
      localStorage.setItem('GAME_CARDS_API_URL', cleanUrl);
    }
  },

  /**
   * Executa requisição fetch com tratamento padronizado de erros
   */
  async request(endpoint, options = {}) {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMessage = (data && data.error) || `Erro HTTP ${response.status}: ${response.statusText}`;
        if (data && data.details && Array.isArray(data.details)) {
          const detailMsgs = data.details.map((d) => d.message).join('; ');
          errorMessage += ` (${detailMsgs})`;
        }
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${url}:`, err);
      // Se for falha de rede (ex: servidor offline)
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const netErr = new Error(`Não foi possível conectar ao backend em ${baseUrl}. Verifique se o servidor está rodando.`);
        netErr.status = 0;
        throw netErr;
      }
      throw err;
    }
  },

  /**
   * Health Check da API
   */
  async healthCheck() {
    return this.request('/health');
  },

  /**
   * Listar personagens com parâmetros de busca, filtro e ordenação
   */
  async getCharacters(params = {}) {
    const query = new URLSearchParams();

    if (params.search) query.append('search', params.search);
    if (params.name) query.append('name', params.name);
    if (params.game) query.append('game', params.game);
    if (params.rarity && params.rarity !== 'Todas') query.append('rarity', params.rarity);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.order) query.append('order', params.order);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = queryString ? `/characters?${queryString}` : '/characters';
    return this.request(endpoint);
  },

  /**
   * Buscar personagem por ID
   */
  async getCharacterById(id) {
    return this.request(`/characters/${id}`);
  },

  /**
   * Cadastrar novo personagem
   */
  async createCharacter(characterData) {
    return this.request('/characters', {
      method: 'POST',
      body: JSON.stringify(characterData),
    });
  },

  /**
   * Atualização completa (PUT)
   */
  async updateCharacter(id, characterData) {
    return this.request(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(characterData),
    });
  },

  /**
   * Atualização parcial (PATCH)
   */
  async patchCharacter(id, partialData) {
    return this.request(`/characters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(partialData),
    });
  },

  /**
   * Excluir personagem
   */
  async deleteCharacter(id) {
    return this.request(`/characters/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Formata preço em Real brasileiro (R$ 00,00)
   */
  formatPrice(price) {
    const num = Number(price) || 0;
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  },

  /**
   * Extrai o ano da data de forma consistente sem desvio de fuso horário
   */
  extractYear(dateInput) {
    if (!dateInput) return 'N/D';
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^(\d{4})/);
      if (match) return match[1];
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? 'N/D' : d.getUTCFullYear();
  },

  /**
   * Formata para data brasileira DD/MM/AAAA sem distorção UTC
   */
  formatDateBR(dateInput) {
    if (!dateInput) return 'N/D';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const parts = dateInput.substring(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/D';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  },

  /**
   * Formata para o formato esperado pelo input date (YYYY-MM-DD)
   */
  formatInputDate(dateInput) {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      return dateInput.substring(0, 10);
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Retorna a classe CSS correspondente à raridade
   */
  getRaritySlug(rarity) {
    switch (rarity) {
      case 'Comum':
        return 'comum';
      case 'Incomum':
        return 'incomum';
      case 'Rara':
        return 'rara';
      case 'Épica':
        return 'epica';
      case 'Lendária':
        return 'lendaria';
      case 'Mítica':
        return 'mitica';
      default:
        return 'comum';
    }
  },

  /**
   * Resolve a URL de imagem para garantir exibição correta com fallback
   */
  resolveImageUrl(imageUrl) {
    if (!imageUrl) return 'assets/placeholders/default-card.svg';
    // Se for URL externa http:// ou https://
    if (/^https?:\/\//i.test(imageUrl)) {
      return imageUrl;
    }
    // Se for caminho relativo assets/... ou /assets/...
    let clean = imageUrl.replace(/^\/+/, '');
    return clean;
  },
};

// Exporta globalmente para uso no browser
if (typeof window !== 'undefined') {
  window.apiService = apiService;
}
