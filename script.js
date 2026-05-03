/**
 * PokéFila — script.js
 * Simulador de Fila (FIFO) com Busca Otimizada e Arena Boss
 */

// ============================================================
// 1. ESTRUTURA DE DADOS: CLASSE FILA (FIFO)
// ============================================================
class Fila {
  constructor() { this._dados = []; }
  
  // Enfileirar (Entrar no final)
  enqueue(item) { this._dados.push(item); }
  
  // Desenfileirar (Sair pela frente)
  dequeue() { return this.isEmpty() ? null : this._dados.shift(); }
  
  // Observar o primeiro
  peek() { return this.isEmpty() ? null : this._dados[0]; }
  
  isEmpty() { return this._dados.length === 0; }
  size() { return this._dados.length; }
  toArray() { return [...this._dados]; }
  clear() { this._dados = []; }
  rear() { return this.isEmpty() ? null : this._dados[this._dados.length - 1]; }
}

// ============================================================
// 2. ESTADO DA APLICAÇÃO
// ============================================================
const filaBatalha = new Fila();
let pokemonPreview = null;
let pokemonBoss = null;
let listaTodosPokemons = []; // Banco de dados local para busca por "contém"

// ============================================================
// 3. REFERÊNCIAS DO DOM
// ============================================================
const pokeInput = document.getElementById('poke-input'),
      btnSearch = document.getElementById('btn-search'),
      previewCard = document.getElementById('preview-card'),
      previewImg = document.getElementById('preview-img'),
      previewName = document.getElementById('preview-name'),
      previewId = document.getElementById('preview-id'),
      previewTypes = document.getElementById('preview-types'),
      previewStats = document.getElementById('preview-stats'),
      btnEnqueue = document.getElementById('btn-enqueue'),
      loadingEl = document.getElementById('loading'),
      btnDequeue = document.getElementById('btn-dequeue'),
      btnPeek = document.getElementById('btn-peek'),
      btnClear = document.getElementById('btn-clear'),
      queueVisual = document.getElementById('queue-visual'),
      queueEmpty = document.getElementById('queue-empty'),
      queueSizeEl = document.getElementById('queue-size'),
      queueFrontEl = document.getElementById('queue-front'),
      queueRearEl = document.getElementById('queue-rear'),
      peekInfo = document.getElementById('peek-info'),
      peekName = document.getElementById('peek-name'),
      battleArena = document.getElementById('battle-arena'),
      operationLog = document.getElementById('operation-log'),
      initTime = document.getElementById('init-time');

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
    id: dados.id,
    nome: dados.name,
    sprite: dados.sprites.front_default || dados.sprites.other?.['official-artwork']?.front_default || '',
    tipos: dados.types.map(t => t.type.name),
    stats: {
      hp: dados.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
      ataque: dados.stats.find(s => s.stat.name === 'attack')?.base_stat || 0,
      defesa: dados.stats.find(s => s.stat.name === 'defense')?.base_stat || 0,
      speed: dados.stats.find(s => s.stat.name === 'speed')?.base_stat || 0,
    }
  };
}

// ============================================================
// 5. LÓGICA DE BUSCA E BOSS
// ============================================================

// Carrega os nomes de 1000 pokémons para permitir busca por "contém" 
// embora possa haver confusão devido aos nomes na pokeapi e de fato o seus nomes corretos.
async function carregarListaNomes() {
  try {
    const resposta = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
    const dados = await resposta.json();
    listaTodosPokemons = dados.results;
  } catch (error) {
    console.error("Erro ao carregar lista de nomes:", error);
  }
}

async function carregarBoss(nome) {
  try {
    pokemonBoss = await buscarPokemon(nome);
    adicionarLog(`👾 BOSS: ${capitalizarNome(pokemonBoss.nome)} pronto na arena!`, 'enqueue');
    renderizarBossArena();
  } catch (error) {
    console.error("Erro ao carregar o Boss:", error);
  }
}

function renderizarBossArena() {
  if (!pokemonBoss) return;
  battleArena.innerHTML = `
    <div class="arena-idle">
      <div class="battle-vs-text">BOSS AGUARDANDO</div>
      <img src="${pokemonBoss.sprite}" class="boss-img-idle" style="filter: drop-shadow(0 0 10px red); width: 120px;" />
      <p style="color: var(--neon-yellow); font-family: var(--font-pixel); font-size: 10px;">
        ${capitalizarNome(pokemonBoss.nome)}
      </p>
      <small>Envie um desafiante para lutar!</small>
    </div>
  `;
}

// ============================================================
// 6. ATUALIZAÇÃO DA INTERFACE
// ============================================================

function exibirPreview(pokemon) {
  pokemonPreview = pokemon;
  previewImg.src = pokemon.sprite;
  previewName.textContent = capitalizarNome(pokemon.nome);
  previewId.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
  
  previewTypes.innerHTML = '';
  pokemon.tipos.forEach(tipo => {
    const badge = document.createElement('span');
    badge.className = `type-badge type-${tipo}`;
    badge.textContent = tipo;
    previewTypes.appendChild(badge);
  });

  previewStats.innerHTML = '';
  const statsMap = [
    { label: 'HP', val: pokemon.stats.hp, color: '#00ff88' },
    { label: 'ATK', val: pokemon.stats.ataque, color: '#ff2d55' },
    { label: 'DEF', val: pokemon.stats.defesa, color: '#00cfff' },
    { label: 'SPD', val: pokemon.stats.speed, color: '#f7e000' },
  ];

  statsMap.forEach(({ label, val, color }) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const pct = Math.min(100, (val / 200) * 100);
    row.innerHTML = `<span class="stat-label">${label}</span><div class="stat-bar-bg"><div class="stat-bar" style="width:0%;background:${color}"></div></div><span class="stat-val">${val}</span>`;
    previewStats.appendChild(row);
    setTimeout(() => { row.querySelector('.stat-bar').style.width = pct + '%'; }, 100);
  });
  previewCard.classList.remove('hidden');
}

function exibirBatalha(desafiante) {
  if (!pokemonBoss) return;
  battleArena.innerHTML = '';

  const p1 = desafiante.stats.hp + desafiante.stats.ataque + desafiante.stats.defesa;
  const p2 = pokemonBoss.stats.hp + pokemonBoss.stats.ataque + pokemonBoss.stats.defesa;
  
  // Sorteio de vitória com base no poder + fator sorte
  const venceu = p1 + Math.random() * 40 > p2 + Math.random() * 40;

  battleArena.innerHTML = `
    <div class="battle-result">
      <div class="battle-vs-text">⚔️ CONFRONTO ⚔️</div>
      <div class="battle-flex">
         <div class="poke-fighter">
           <img src="${desafiante.sprite}" />
           <div style="font-size: 11px;">${capitalizarNome(desafiante.nome)}</div>
         </div>
         <div class="vs-label">VS</div>
         <div class="poke-fighter boss">
           <img src="${pokemonBoss.sprite}" />
           <div style="font-size: 11px;">${capitalizarNome(pokemonBoss.nome)}</div>
         </div>
      </div>
      <div class="${venceu ? 'battle-result-msg win' : 'battle-result-msg lose'}">
        ${venceu ? 'VITÓRIA DO DESAFIANTE!' : 'O BOSS VENCEU!'}
      </div>
    </div>
  `;
  adicionarLog(`🥊 ${desafiante.nome} vs ${pokemonBoss.nome}: ${venceu ? 'Ganhou' : 'Perdeu'}`, venceu ? 'enqueue' : 'dequeue');
}

function atualizarFilaVisual() {
  const itens = filaBatalha.toArray();
  queueVisual.innerHTML = '';
  
  if (filaBatalha.isEmpty()) {
    queueVisual.appendChild(queueEmpty);
    queueEmpty.classList.remove('hidden');
    ['btn-dequeue', 'btn-peek', 'btn-clear'].forEach(id => document.getElementById(id).disabled = true);
    queueFrontEl.textContent = '—';
    queueRearEl.textContent = '—';
    queueSizeEl.textContent = '0';
    return;
  }

  queueEmpty.classList.add('hidden');
  ['btn-dequeue', 'btn-peek', 'btn-clear'].forEach(id => document.getElementById(id).disabled = false);
  
  queueSizeEl.textContent = filaBatalha.size();
  queueFrontEl.textContent = capitalizarNome(filaBatalha.peek().nome);
  queueRearEl.textContent = capitalizarNome(filaBatalha.rear().nome);

  itens.forEach((poke, index) => {
    const card = document.createElement('div');
    card.className = `queue-item entering ${index === 0 ? 'first' : ''}`;
    card.innerHTML = `
      <div class="queue-item-pos">${index + 1}</div>
      <img src="${poke.sprite}" />
      <div class="queue-item-name">${capitalizarNome(poke.nome)}</div>
      ${index === 0 ? '<span class="tag-first">PRÓXIMO</span>' : ''}
    `;
    queueVisual.appendChild(card);
  });
}

// ============================================================
// 7. UTILITÁRIOS, LOGS E TOASTS
// ============================================================
function agora() { return new Date().toLocaleTimeString('pt-BR'); }
function capitalizarNome(n) { return n.charAt(0).toUpperCase() + n.slice(1).replace(/-/g, ' '); }

function adicionarLog(m, t) {
  const li = document.createElement('li');
  li.className = `log-${t}`;
  li.innerHTML = `<span>${m}</span><span class="log-time">${agora()}</span>`;
  operationLog.insertBefore(li, operationLog.firstChild);
}

function mostrarToast(m, t = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = m; toast.className = `toast toast-${t}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function setLoading(a) { 
  loadingEl.classList.toggle('hidden', !a); 
  btnSearch.disabled = a; 
}

// ============================================================
// 8. HANDLERS (Ações dos Botões)
// ============================================================
async function handleBuscar() {
  const v = pokeInput.value.trim().toLowerCase();
  if (!v) return mostrarToast('Digite algo!', 'error');
  
  setLoading(true);
  try {
    // 1. Busca Exata primeiro (ex: "mew")
    let match = listaTodosPokemons.find(p => p.name === v);
    
    // 2. Se não achar exato, busca por "Contém" (ex: "char")
    if (!match) {
      match = listaTodosPokemons.find(p => p.name.includes(v));
    }
    
    if (match) {
      const p = await buscarPokemon(match.name);
      exibirPreview(p);
      adicionarLog(`🔍 Encontrado: ${capitalizarNome(p.nome)}`, 'peek');
    } else {
      throw new Error();
    }
  } catch (e) { 
    mostrarToast('Nenhum Pokémon encontrado!', 'error'); 
  } finally { 
    setLoading(false); 
  }
}

function handleEnqueue() {
  if (!pokemonPreview) return;
  filaBatalha.enqueue(pokemonPreview);
  adicionarLog(`[ENFILEIRAR] ${capitalizarNome(pokemonPreview.nome)} entrou na fila.`, 'enqueue');
  atualizarFilaVisual();
  previewCard.classList.add('hidden');
  pokemonPreview = null;
  pokeInput.value = '';
}

function handleDequeue() {
  if (filaBatalha.isEmpty()) return;
  const p = filaBatalha.dequeue();
  adicionarLog(`[DESENFILEIRAR] ${capitalizarNome(p.nome)} saiu para lutar!`, 'dequeue');
  exibirBatalha(p);
  atualizarFilaVisual();
  peekInfo.classList.add('hidden');
}

function handlePeek() {
  if (filaBatalha.isEmpty()) return;
  const p = filaBatalha.peek();
  peekName.textContent = capitalizarNome(p.nome);
  peekInfo.classList.remove('hidden');
  mostrarToast(`Próximo desafiante: ${capitalizarNome(p.nome)}`);
}

function handleClear() {
  if (filaBatalha.isEmpty()) return;
  filaBatalha.clear();
  adicionarLog(`[LIMPAR] A fila foi esvaziada.`, 'clear');
  atualizarFilaVisual();
  peekInfo.classList.add('hidden');
  renderizarBossArena();
}

// ============================================================
// 9. EVENTOS E INIT
// ============================================================
btnSearch.addEventListener('click', handleBuscar);
pokeInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleBuscar());
btnEnqueue.addEventListener('click', handleEnqueue);
btnDequeue.addEventListener('click', handleDequeue);
btnPeek.addEventListener('click', handlePeek);
btnClear.addEventListener('click', handleClear);

(function init() {
  initTime.textContent = agora();
  carregarListaNomes(); // Banco de dados local para o filtro "Contém"
  carregarBoss('mewtwo'); // Define o BOSS fixo
  atualizarFilaVisual();
})();