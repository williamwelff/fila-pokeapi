/**
 * PokéFila — script.js
 * Simulador de Estrutura de Dados: Fila (FIFO)
 * API: PokéAPI (https://pokeapi.co/)
 *
 * Implementação da Classe Fila (Queue FIFO):
 *   - enqueue(item)  → adiciona ao final
 *   - dequeue()      → remove do início
 *   - peek()         → retorna o primeiro sem remover
 *   - isEmpty()      → verifica se está vazia
 *   - size()         → retorna o tamanho
 *   - clear()        → esvazia a fila
 */

// ============================================================
// 1. ESTRUTURA DE DADOS: CLASSE FILA (FIFO)
// ============================================================

class Fila {
  constructor() {
    this._dados = [];  // Array interno que armazena os elementos
  }

  /** Enqueue: adiciona um elemento ao FINAL da fila */
  enqueue(item) {
    this._dados.push(item);
  }

  /** Dequeue: remove e retorna o elemento do INÍCIO da fila */
  dequeue() {
    if (this.isEmpty()) return null;
    return this._dados.shift();
  }

  /** Peek: retorna o elemento do INÍCIO sem remover */
  peek() {
    if (this.isEmpty()) return null;
    return this._dados[0];
  }

  /** Verifica se a fila está vazia */
  isEmpty() {
    return this._dados.length === 0;
  }

  /** Retorna o número de elementos na fila */
  size() {
    return this._dados.length;
  }

  /** Retorna todos os elementos (para visualização) */
  toArray() {
    return [...this._dados];
  }

  /** Limpa todos os elementos da fila */
  clear() {
    this._dados = [];
  }

  /** Retorna o elemento do FUNDO da fila (último) */
  rear() {
    if (this.isEmpty()) return null;
    return this._dados[this._dados.length - 1];
  }
}

// ============================================================
// 2. ESTADO DA APLICAÇÃO
// ============================================================

const filaBatalha = new Fila();       // Nossa fila principal
let pokemonPreview = null;            // Pokémon carregado no preview

// ============================================================
// 3. REFERÊNCIAS DO DOM
// ============================================================

const pokeInput     = document.getElementById('poke-input');
const btnSearch     = document.getElementById('btn-search');
const previewCard   = document.getElementById('preview-card');
const previewImg    = document.getElementById('preview-img');
const previewName   = document.getElementById('preview-name');
const previewId     = document.getElementById('preview-id');
const previewTypes  = document.getElementById('preview-types');
const previewStats  = document.getElementById('preview-stats');
const btnEnqueue    = document.getElementById('btn-enqueue');
const searchError   = document.getElementById('search-error');
const loadingEl     = document.getElementById('loading');

const btnDequeue    = document.getElementById('btn-dequeue');
const btnPeek       = document.getElementById('btn-peek');
const btnClear      = document.getElementById('btn-clear');
const queueVisual   = document.getElementById('queue-visual');
const queueEmpty    = document.getElementById('queue-empty');
const queueSizeEl   = document.getElementById('queue-size');
const queueFrontEl  = document.getElementById('queue-front');
const queueRearEl   = document.getElementById('queue-rear');
const peekInfo      = document.getElementById('peek-info');
const peekName      = document.getElementById('peek-name');

const battleArena   = document.getElementById('battle-arena');
const operationLog  = document.getElementById('operation-log');
const initTime      = document.getElementById('init-time');

// ============================================================
// 4. CONSUMO DA POKEAPI
// ============================================================

const POKEAPI_BASE = 'https://pokeapi.co/api/v2/pokemon/';

async function buscarPokemon(nomeouid) {
  const query = String(nomeouid).toLowerCase().trim();
  if (!query) return null;

  const resposta = await fetch(POKEAPI_BASE + query);
  if (!resposta.ok) throw new Error('Pokémon não encontrado');

  const dados = await resposta.json();

  return {
    id:      dados.id,
    nome:    dados.name,
    sprite:  dados.sprites.front_default ||
             dados.sprites.other?.['official-artwork']?.front_default ||
             '',
    tipos:   dados.types.map(t => t.type.name),
    stats: {
      hp:      dados.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
      ataque:  dados.stats.find(s => s.stat.name === 'attack')?.base_stat || 0,
      defesa:  dados.stats.find(s => s.stat.name === 'defense')?.base_stat || 0,
      speed:   dados.stats.find(s => s.stat.name === 'speed')?.base_stat || 0,
    }
  };
}

// ============================================================
// 5. ATUALIZAÇÃO DA INTERFACE
// ============================================================

function atualizarFilaVisual() {
  const itens = filaBatalha.toArray();

  // Limpa conteúdo atual (mantém o placeholder)
  while (queueVisual.firstChild) {
    queueVisual.removeChild(queueVisual.firstChild);
  }

  if (filaBatalha.isEmpty()) {
    queueVisual.appendChild(queueEmpty);
    queueEmpty.classList.remove('hidden');
    btnDequeue.disabled = true;
    btnPeek.disabled    = true;
    btnClear.disabled   = true;
    queueFrontEl.textContent = '—';
    queueRearEl.textContent  = '—';
    queueSizeEl.textContent  = '0';
    peekInfo.classList.add('hidden');
    return;
  }

  queueEmpty.classList.add('hidden');
  btnDequeue.disabled = false;
  btnPeek.disabled    = false;
  btnClear.disabled   = false;

  // Atualiza meta
  queueSizeEl.textContent  = filaBatalha.size();
  queueFrontEl.textContent = capitalizarNome(filaBatalha.peek().nome);
  queueRearEl.textContent  = capitalizarNome(filaBatalha.rear().nome);

  // Renderiza cada item da fila
  itens.forEach((poke, index) => {
    // Seta entre itens
    if (index > 0) {
      const arrow = document.createElement('div');
      arrow.className = 'queue-arrow';
      arrow.textContent = '←';
      queueVisual.appendChild(arrow);
    }

    const card = document.createElement('div');
    card.className = 'queue-item entering';
    if (index === 0) card.classList.add('first');
    if (index === itens.length - 1) card.classList.add('last');

    const posLabel = document.createElement('div');
    posLabel.className = 'queue-item-pos';
    posLabel.textContent = index + 1;

    const img = document.createElement('img');
    img.src = poke.sprite;
    img.alt = poke.nome;
    img.title = capitalizarNome(poke.nome);

    const nome = document.createElement('div');
    nome.className = 'queue-item-name';
    nome.textContent = capitalizarNome(poke.nome);

    // Tag FIRST no primeiro
    if (index === 0) {
      const tag = document.createElement('span');
      tag.className = 'tag-first';
      tag.textContent = 'NEXT';
      card.appendChild(posLabel);
      card.appendChild(img);
      card.appendChild(nome);
      card.appendChild(tag);
    } else {
      card.appendChild(posLabel);
      card.appendChild(img);
      card.appendChild(nome);
    }

    queueVisual.appendChild(card);
  });
}

function exibirPreview(pokemon) {
  pokemonPreview = pokemon;

  previewImg.src  = pokemon.sprite;
  previewImg.alt  = pokemon.nome;
  previewName.textContent = capitalizarNome(pokemon.nome);
  previewId.textContent   = `#${String(pokemon.id).padStart(3, '0')}`;

  // Tipos
  previewTypes.innerHTML = '';
  pokemon.tipos.forEach(tipo => {
    const badge = document.createElement('span');
    badge.className = `type-badge type-${tipo}`;
    badge.textContent = tipo;
    previewTypes.appendChild(badge);
  });

  // Stats
  previewStats.innerHTML = '';
  const statsMap = [
    { label: 'HP',  val: pokemon.stats.hp,     color: '#00ff88' },
    { label: 'ATK', val: pokemon.stats.ataque,  color: '#ff2d55' },
    { label: 'DEF', val: pokemon.stats.defesa,  color: '#00cfff' },
    { label: 'SPD', val: pokemon.stats.speed,   color: '#f7e000' },
  ];

  statsMap.forEach(({ label, val, color }) => {
    const row = document.createElement('div');
    row.className = 'stat-row';

    const pct = Math.min(100, (val / 200) * 100);

    row.innerHTML = `
      <span class="stat-label">${label}</span>
      <div class="stat-bar-bg">
        <div class="stat-bar" style="width:0%;background:${color}" data-pct="${pct}"></div>
      </div>
      <span class="stat-val">${val}</span>
    `;
    previewStats.appendChild(row);

    // Anima a barra
    requestAnimationFrame(() => {
      setTimeout(() => {
        row.querySelector('.stat-bar').style.width = pct + '%';
      }, 50);
    });
  });

  previewCard.classList.remove('hidden');
}

function exibirBatalha(pokemon) {
  battleArena.innerHTML = '';

  const resultado = document.createElement('div');
  resultado.className = 'battle-result';

  // Power rating simulado
  const poder = pokemon.stats.hp + pokemon.stats.ataque + pokemon.stats.defesa + pokemon.stats.speed;
  const estrelas = Math.max(1, Math.min(5, Math.round(poder / 60)));
  const starsStr = '⭐'.repeat(estrelas) + '☆'.repeat(5 - estrelas);

  resultado.innerHTML = `
    <div class="battle-vs-text">⚔ BATALHA ⚔</div>
    <img src="${pokemon.sprite}" alt="${pokemon.nome}" />
    <div class="battle-result-name">${capitalizarNome(pokemon.nome)}</div>
    <div class="battle-result-msg">Power: ${poder} pts</div>
    <div class="battle-stars">${starsStr}</div>
  `;

  battleArena.appendChild(resultado);
}

function atualizarMeta() {
  queueSizeEl.textContent = filaBatalha.size();
  if (!filaBatalha.isEmpty()) {
    queueFrontEl.textContent = capitalizarNome(filaBatalha.peek().nome);
    queueRearEl.textContent  = capitalizarNome(filaBatalha.rear().nome);
  }
}

// ============================================================
// 6. LOG DE OPERAÇÕES
// ============================================================

function agora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function adicionarLog(mensagem, tipo) {
  const li = document.createElement('li');
  li.className = `log-${tipo}`;
  li.innerHTML = `<span>${mensagem}</span><span class="log-time">${agora()}</span>`;
  operationLog.insertBefore(li, operationLog.firstChild);

  // Limita o log a 50 entradas
  while (operationLog.children.length > 50) {
    operationLog.removeChild(operationLog.lastChild);
  }
}

// ============================================================
// 7. TOAST
// ============================================================

let toastTimeout = null;

function mostrarToast(mensagem, tipo = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `toast toast-${tipo}`;
  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// ============================================================
// 8. UTILITÁRIOS
// ============================================================

function capitalizarNome(nome) {
  return nome.charAt(0).toUpperCase() + nome.slice(1).replace(/-/g, ' ');
}

function setLoading(ativo) {
  loadingEl.classList.toggle('hidden', !ativo);
  btnSearch.disabled = ativo;
  pokeInput.disabled = ativo;
}

// ============================================================
// 9. HANDLERS / EVENT LISTENERS
// ============================================================

// Buscar Pokémon na PokéAPI
async function handleBuscar() {
  const valor = pokeInput.value.trim();
  if (!valor) {
    mostrarToast('Digite um nome ou número!', 'error');
    return;
  }

  // Esconde elementos anteriores
  previewCard.classList.add('hidden');
  searchError.classList.add('hidden');
  setLoading(true);

  try {
    const pokemon = await buscarPokemon(valor);
    exibirPreview(pokemon);
    adicionarLog(`🔍 Buscado: ${capitalizarNome(pokemon.nome)} (#${pokemon.id})`, 'peek');
  } catch (erro) {
    searchError.classList.remove('hidden');
    adicionarLog(`❌ Busca falhou: "${valor}" não encontrado`, 'error');
    mostrarToast('Pokémon não encontrado!', 'error');
  } finally {
    setLoading(false);
  }
}

// Enqueue: adicionar à fila
function handleEnqueue() {
  if (!pokemonPreview) return;

  filaBatalha.enqueue(pokemonPreview);

  adicionarLog(
    `[ENQUEUE] ${capitalizarNome(pokemonPreview.nome)} adicionado à fila. Tamanho: ${filaBatalha.size()}`,
    'enqueue'
  );
  mostrarToast(`${capitalizarNome(pokemonPreview.nome)} entrou na fila! 🟢`, 'success');

  atualizarFilaVisual();

  // Limpa o preview
  previewCard.classList.add('hidden');
  pokemonPreview = null;
  pokeInput.value = '';
}

// Dequeue: remover do início e mandar para a arena
function handleDequeue() {
  if (filaBatalha.isEmpty()) return;

  const pokemon = filaBatalha.dequeue();

  adicionarLog(
    `[DEQUEUE] ${capitalizarNome(pokemon.nome)} removido da frente. Restam: ${filaBatalha.size()}`,
    'dequeue'
  );
  mostrarToast(`${capitalizarNome(pokemon.nome)} foi para a batalha! ⚔️`, 'info');

  exibirBatalha(pokemon);
  atualizarFilaVisual();
  peekInfo.classList.add('hidden');
}

// Peek: ver o próximo sem remover
function handlePeek() {
  if (filaBatalha.isEmpty()) return;

  const proximo = filaBatalha.peek();
  peekName.textContent = capitalizarNome(proximo.nome);
  peekInfo.classList.remove('hidden');

  adicionarLog(
    `[PEEK] Próximo na fila: ${capitalizarNome(proximo.nome)} (#${proximo.id})`,
    'peek'
  );
  mostrarToast(`Próximo: ${capitalizarNome(proximo.nome)} 👁`, 'info');
}

// Clear: limpar a fila
function handleClear() {
  if (filaBatalha.isEmpty()) return;

  const tamanhoAntes = filaBatalha.size();
  filaBatalha.clear();

  adicionarLog(`[CLEAR] Fila limpa. ${tamanhoAntes} Pokémon removidos.`, 'clear');
  mostrarToast('Fila limpa! 🗑', 'info');

  atualizarFilaVisual();
  peekInfo.classList.add('hidden');

  // Reset arena
  battleArena.innerHTML = `
    <div class="arena-idle">
      <div class="arena-idle-icon">⚔️</div>
      <p>Aguardando batalha...</p>
      <small>Use DEQUEUE para enviar o próximo Pokémon para batalhar!</small>
    </div>
  `;
}

// ============================================================
// 10. REGISTRO DE EVENTOS
// ============================================================

btnSearch.addEventListener('click', handleBuscar);

pokeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleBuscar();
});

btnEnqueue.addEventListener('click', handleEnqueue);
btnDequeue.addEventListener('click', handleDequeue);
btnPeek.addEventListener('click', handlePeek);
btnClear.addEventListener('click', handleClear);

// ============================================================
// 11. INICIALIZAÇÃO
// ============================================================

(function init() {
  initTime.textContent = agora();
  atualizarFilaVisual();

  // Pré-carrega um Pokémon aleatório para demonstração
  const pokemonsDemo = ['pikachu', 'charmander', 'bulbasaur', 'squirtle', 'mewtwo', 'eevee'];
  const randomPoke   = pokemonsDemo[Math.floor(Math.random() * pokemonsDemo.length)];
  pokeInput.value    = randomPoke;
  pokeInput.focus();

  console.log('%c PokéFila — Estrutura de Dados: Fila (FIFO) ', 'background:#f7e000;color:#000;font-weight:bold;font-size:14px;padding:6px');
  console.log('%c API: PokéAPI (https://pokeapi.co/) ', 'color:#00cfff');
  console.log('%c Operações disponíveis: enqueue(), dequeue(), peek(), isEmpty(), size(), clear() ', 'color:#00ff88');
})();
