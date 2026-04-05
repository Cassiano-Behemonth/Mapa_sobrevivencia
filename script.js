// ========================================================================
// CONFIGURAÇÃO DA ESTRUTURA DE MAPAS E ANDARES
// ========================================================================

const mapHierarchy = {
    general: {
        id: 'general',
        name: 'SALA DE MONITORES - CENTRAL OMEGA',
        imgBase: 'bunker_geral',
        imgExt: '.png',
        hasDayNight: false,
        isMonitorRoom: true,
        icon: '📟',
        description: 'Central de controle com acesso em tempo real a todas as câmeras do complexo.'
    },
    setor_1: {
        id: 'setor_1',
        name: 'Entrada',
        imgBase: 'setor1',
        imgExt: '.png',
        hasDayNight: true, // Sistema de Luzes (E)
        icon: '🚪',
        description: 'Ponto de acesso principal ao complexo subterrâneo.',
        hotspots: [
            {
                id: 'terminal_pc',
                title: '💻 Acessar Terminal de Segurança',
                position: { top: '44%', left: '74%' },
                action: 'openTerminalMinigame',
                isSecret: true,
                hint: 'o primeiro a m######'
            }
        ]
    },
    setor_2: {
        id: 'setor_2',
        name: 'Garagem',
        imgBase: 'setor2',
        imgExt: '.png',
        hasDayNight: true,
        icon: '🏎️',
        description: 'Espaço para manutenção e armazenamento de veículos.'
    },
    setor_3: {
        id: 'setor_3',
        name: 'Enfermaria',
        imgBase: 'setor3',
        imgExt: '.png',
        hasDayNight: true,
        icon: '🏥',
        description: 'Unidade médica para tratamentos de emergência.',
        hotspots: [
            {
                id: 'terminal_setor3',
                title: '💻 Acessar Terminal Auxiliar',
                position: { top: '16%', right: '24%' },
                action: 'openTerminalSetor3',
                dayOnly: true,
                isSecret: true,
                hint: '#s #lh#s d# cr#ad#r'
            },
            {
                id: 'maintenance_panel',
                title: '⚙️ Painel de Manutenção de Energia',
                position: { bottom: '30%', left: '10%' },
                action: 'openTimingMinigame',
                isOneTime: true,
                nightOnly: true, // Só aparece no escuro
                hideIf: 'isSector3EnergyRestored'
            }
        ]
    },
    setor_4: {
        id: 'setor_4',
        name: 'Laboratório',
        imgBase: 'setor4',
        imgExt: '.png',
        hasDayNight: true,
        icon: '🧪',
        description: 'Laboratório de pesquisa biológica. Classificado: Ultrassecreto.',
        hotspots: [
            {
                id: 'terminal_setor4',
                title: '💻 Acessar Terminal do Laboratório',
                position: { top: '36%', left: '64%' },
                action: 'openTerminalSetor4',
                isSecret: true,
                hint: 'traidor=30'
            }
        ]
    },
    setor_5: {
        id: 'setor_5',
        name: 'Setor 05 - Área de Habitação',
        imgBase: 'setor5',
        imgExt: '.png',
        hasDayNight: true,
        icon: '🛏️',
        description: 'Acomodações para o pessoal de longo prazo.'
    },
    setor_6: {
        id: 'setor_6',
        name: 'Setor 06 - Reator e Energia',
        imgBase: 'setor6',
        imgExt: '.png',
        hasDayNight: true,
        icon: '☢️',
        description: 'Núcleo energético que sustenta todo o bunker.'
    }
};

// ========================================================================
// ESTADO DA APLICAÇÃO
// ========================================================================

let characters = [];
let nextCharId = 1;
let placingCharacter = null;
let locationsVisible = true;
let selectedCharacters = new Set();
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let isDraggingGroup = false;
let dragGroupElements = { characters: [], tokens: [] };
let dragGroupStart = { x: 0, y: 0 };
let cachedMapRect = null;
let dragLatestDelta = { x: 0, y: 0 };
let dragIsDirty = false;
let dragLoopActive = false; // Flag para controlar o loop de drag

// Navigation state
let navigationPath = ['general']; // Stack de navegação
let charactersByLocation = {}; // Personagens por localização
let monstersByLocation = {}; // Monstros por localização
let monsters = []; // Monstros do setor atual

let lastMouseX = 0;
let lastMouseY = 0;

// Condition systems
let isLightsOn = true; // false = desligado, true = ligado
let isBlackoutActive = false; // Tecla B
let cctvEnabled = false; // Tecla F2

// Inline name input
let pendingCharacterPosition = null;

// Copy/Paste system
let copiedCharacters = [];

// Token system
let placingToken = null;
let tokens = [];

// Flashlight System State
let flashlightActive = false;
let flashlightState = {
    angle: 0,
    width: 45, // Graus do cone
    intensity: 0.98, // Escuridão do overlay
    radius: 400 // Raio original restaurado
};

// Minigame State
let terminalSequence = [];
let userSequence = [];
let terminalActive = false;
let isTerminalAuthorizedKain = localStorage.getItem('terminalAuthorizedMalak_kain') === 'true';
let isTerminalAuthorizedAdam = localStorage.getItem('terminalAuthorizedMalak_adam') === 'true';
let isTerminalAuthorizedJudas = localStorage.getItem('terminalAuthorizedMalak_judas') === 'true';
let isTerminalBlockedKain = localStorage.getItem('terminalBlockedMalak_kain') === 'true';
let isTerminalBlockedAdam = localStorage.getItem('terminalBlockedMalak_adam') === 'true';
let isTerminalBlockedJudas = localStorage.getItem('terminalBlockedMalak_judas') === 'true';
let isSector3EnergyRestored = localStorage.getItem('sector3EnergyRestored') === 'true';

let currentTerminalContext = 'GENERAL'; // 'GENERAL' (kain) ou 'MEDICAL' (adam)

// Flashlight Flicker Timer (10 minutes)
setInterval(() => {
    if (flashlightActive) {
        flickerFlashlight();
    }
}, 600000);

function flickerFlashlight() {
    const originalIntensity = flashlightState.intensity;
    // Sequência de piscadas rápidas
    const flickerSteps = [0.4, 0.98, 0.3, 0.98, 0.5, 0.98];
    let step = 0;

    const interval = setInterval(() => {
        flashlightState.intensity = flickerSteps[step];
        drawFlashlight(); // Redesenhar o canvas
        step++;
        if (step >= flickerSteps.length) {
            clearInterval(interval);
            flashlightState.intensity = originalIntensity;
            drawFlashlight();
        }
    }, 50);
}

// ========================================================================
// FUNÇÕES DE NAVEGAÇÃO
// ========================================================================

function getCurrentLocation() {
    return navigationPath[navigationPath.length - 1];
}

function getLocationData(locationId) {
    return mapHierarchy[locationId];
}

function navigateToLocation(locationId) {
    if (!mapHierarchy[locationId]) {
        console.error('Location not found:', locationId);
        return;
    }

    // Check if location has redirect
    const locationData = mapHierarchy[locationId];
    if (locationData.redirectTo) {
        locationId = locationData.redirectTo;
    }

    // Save current characters
    saveCurrentLocationCharacters();

    // Clear selection
    deselectAll();

    // Add to navigation path
    navigationPath.push(locationId);

    // Load location
    loadLocation(locationId);

    // Save to storage
    saveNavigationState();
}

function goBackOneLevel() {
    if (navigationPath.length <= 1) return;

    // Save current characters
    saveCurrentLocationCharacters();

    // Clear selection
    deselectAll();

    // Remove last from path
    navigationPath.pop();

    // Load previous location
    const locationId = getCurrentLocation();
    loadLocation(locationId);

    // Save to storage
    saveNavigationState();
}

function navigateToBreadcrumb(index) {
    if (index < 0 || index >= navigationPath.length) return;
    if (index === navigationPath.length - 1) return; // Already here

    // Save current characters
    saveCurrentLocationCharacters();

    // Clear selection
    deselectAll();

    // Cut path at index
    navigationPath = navigationPath.slice(0, index + 1);

    // Load location
    const locationId = getCurrentLocation();
    loadLocation(locationId);

    // Save to storage
    saveNavigationState();
}

function loadLocation(locationId) {
    const locationData = getLocationData(locationId);
    if (!locationData) return;

    // Update map image or render monitor room
    const mapImage = document.getElementById('mapImage');
    const mapContainer = document.getElementById('mapContainer');

    if (locationData.isMonitorRoom) {
        mapImage.style.display = 'none';
        mapContainer.classList.add('monitor-view');
        renderMonitorRoom();
    } else {
        mapImage.style.display = 'block';
        mapContainer.classList.remove('monitor-view');

        // Hide monitor room if it exists
        const monitorRoom = document.getElementById('monitorRoom');
        if (monitorRoom) monitorRoom.style.display = 'none';

        // Verificar se o mapa tem versão luz ligada/desligada
        if (locationData.hasDayNight === false) {
            // Mapa sem versão de luz - usar só a base
            mapImage.src = locationData.imgBase + locationData.imgExt;
        } else {
            // Mapa com versão de luz (ligado/desligado)
            const suffix = isLightsOn ? '_ligado' : '_desligado';
            mapImage.src = locationData.imgBase + suffix + locationData.imgExt;
        }

        mapImage.onerror = function () {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect fill="%230a0c0d" width="800" height="600"/><text x="50%" y="50%" font-family="Courier New" font-size="20" fill="%2322c55e" text-anchor="middle">ERRO DE CONEXÃO: SETOR ' + locationId.toUpperCase() + ' NÃO ENCONTRADO</text></svg>';
        };
    }

    // Update title
    document.getElementById('currentMapTitle').textContent = locationData.icon + " " + locationData.name;

    // Update breadcrumb
    updateBreadcrumb();

    // Show/hide back button
    const backButton = document.getElementById('backButton');
    backButton.classList.toggle('visible', navigationPath.length > 1);

    // Clear and update hotspots
    clearHotspots();
    if (locationData.hotspots) {
        // Filtrar hotspots baseados em condições
        const visibleHotspots = locationData.hotspots.filter(h => {
            // Regra geral de visibilidade por iluminação
            if (h.dayOnly && !isLightsOn) return false;
            if (h.nightOnly && isLightsOn) return false;

            // Regras específicas herdadas
            if (h.id === 'terminal_pc') {
                return !isLightsOn || isBlackoutActive;
            }
            return true;
        });
        createHotspots(visibleHotspots);
    }

    // Adicionar hotspot secreto se estiver no B3 da montanha
    if (locationId === 'montanha_subsolo_3') {
        const secretHotspot = {
            id: 'caminho_secreto',
            title: '🔐 Passagem Secreta para o Pântano',
            position: { top: '50%', left: '70%' }
        };
        createHotspots([secretHotspot]);
    }

    // Show/hide floor selector
    updateFloorSelector(locationData);

    // Update locations toggle button
    const toggleBtn = document.getElementById('toggleLocationsBtn');
    if (locationId === 'general' && locationData.hotspots) {
        toggleBtn.style.display = 'block';
    } else {
        toggleBtn.style.display = 'none';
    }

    // Load characters for this location
    if (!locationData.isMonitorRoom) {
        loadCharactersForLocation(locationId);
    } else {
        // Clear characters in monitor room
        document.querySelectorAll('.character-marker').forEach(m => m.remove());
        document.querySelectorAll('.token-marker').forEach(m => m.remove());
    }
}

function renderMonitorRoom() {
    const mapWrapper = document.getElementById('mapWrapper');

    // Clear elements except image, scanlines etc (the image is hidden anyway)
    // We'll add the monitor room div
    let monitorRoom = document.getElementById('monitorRoom');
    if (!monitorRoom) {
        monitorRoom = document.createElement('div');
        monitorRoom.id = 'monitorRoom';
        monitorRoom.className = 'monitor-room';
        mapWrapper.appendChild(monitorRoom);
    }

    monitorRoom.style.display = 'grid';
    monitorRoom.innerHTML = '';

    // Show monitors for sectors 1 to 6
    const sectors = ['setor_1', 'setor_2', 'setor_3', 'setor_4', 'setor_5', 'setor_6'];

    sectors.forEach(sectorId => {
        const data = mapHierarchy[sectorId];
        if (!data) return;
        const monitor = document.createElement('div');
        monitor.className = 'monitor';
        monitor.id = 'monitor-' + sectorId;
        if (isBlackoutActive) monitor.classList.add('no-signal');
        monitor.onclick = () => navigateToLocation(sectorId);

        const imgSrc = data.imgBase + (data.hasDayNight ? (isLightsOn ? '_ligado' : '_desligado') : '') + data.imgExt;

        const statusText = isBlackoutActive ? 'NO SIGNAL' : 'LIVE';
        const screenStyle = isBlackoutActive ? '' : `style="background-image: url('${imgSrc}'), url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22%23111%22/><text x=%2250%%22 y=%2250%%22 font-family=%22monospace%22 font-size=%2210%22 fill=%22%2322c55e%22 text-anchor=%22middle%22>LOST SIGNAL</text></svg>');"`;

        monitor.innerHTML = `
            <div class="monitor-screen" ${screenStyle}></div>
            <div class="monitor-glass"></div>
            <div class="monitor-flicker"></div>
            <div class="monitor-status ${isBlackoutActive ? 'offline' : 'live'}">${statusText}</div>
            <div class="monitor-label">${data.icon} ${data.name}</div>
        `;

        monitorRoom.appendChild(monitor);
    });
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';

    // Mostrar apenas o local atual (último item do path)
    const currentLocationId = navigationPath[navigationPath.length - 1];
    const locationData = getLocationData(currentLocationId);

    if (!locationData) return;

    const item = document.createElement('div');
    item.className = 'breadcrumb-item';
    item.innerHTML = `<span class="breadcrumb-current">${locationData.icon} ${locationData.name}</span>`;

    breadcrumb.appendChild(item);

    // Update container class for darkness/blackout
    const mapContainer = document.getElementById('mapContainer');
    if (isBlackoutActive) { // remover o || !isLightsOn daqui
        mapContainer.classList.add('night-mode');
        setTimeout(initFlashlight, 100);
    } else {
        mapContainer.classList.remove('night-mode');
    }
}

function updateFloorSelector(locationData) {
    // Floor selector desabilitado - navegação apenas por hotspots
    const floorSelector = document.getElementById('floorSelector');
    floorSelector.innerHTML = '';
    floorSelector.classList.remove('visible');
    return;
}

function navigateToFloor(floorId) {
    // Save current characters
    saveCurrentLocationCharacters();

    // Clear selection
    deselectAll();

    // Get current location to check if we need to update navigation path
    const currentLocationId = getCurrentLocation();
    const currentLocationData = getLocationData(currentLocationId);
    const targetLocationData = getLocationData(floorId);

    // Se estamos em um sistema de andares e mudando de andar, substitui o último na pilha
    if (currentLocationData.parentFloorSystem &&
        targetLocationData.parentFloorSystem === currentLocationData.parentFloorSystem) {
        // Substituir último andar
        navigationPath[navigationPath.length - 1] = floorId;
    } else if (currentLocationData.hasFloors) {
        // Entrando em um andar pela primeira vez
        navigationPath.push(floorId);
    } else {
        // Navegação normal
        navigationPath.push(floorId);
    }

    // Load new floor
    loadLocation(floorId);

    // Save to storage
    saveNavigationState();
}

function clearHotspots() {
    document.querySelectorAll('.hotspot').forEach(h => h.remove());
}

function createHotspots(hotspots) {
    const mapContainer = document.getElementById('mapContainer');

    hotspots.forEach(hotspot => {
        // Verificar lógica de ocultação (ex: após completar manutenção)
        if (hotspot.hideIf && window[hotspot.hideIf]) {
            return;
        }

        // Verificar se é só nas luzes acesas
        if (hotspot.dayOnly && !isLightsOn) {
            return;
        }

        // Verificar se é segredo de blackout
        if (hotspot.tideOnly && !isBlackoutActive) {
            return;
        }

        const hotspotEl = document.createElement('div');
        hotspotEl.className = 'hotspot location-hotspot';
        hotspotEl.title = hotspot.title;
        hotspotEl.dataset.location = hotspot.id;

        // Set position
        Object.entries(hotspot.position).forEach(([key, value]) => {
            hotspotEl.style[key] = value;
        });

        // Create marker with appropriate class
        let markerClass = 'hotspot-marker';
        if (hotspot.isSecret) {
            markerClass += ' secret';
        } else if (hotspot.isHidden) {
            markerClass += ' hidden';
        }
        hotspotEl.innerHTML = `<div class="${markerClass}"></div>`;

        // Add events
        hotspotEl.addEventListener('click', (e) => {
            e.stopPropagation();
            hideHotspotTooltip();

            // Check if it's a function call
            if (hotspot.action && typeof window[hotspot.action] === 'function') {
                window[hotspot.action]();
            } else {
                navigateToLocation(hotspot.id);
            }
        });

        hotspotEl.addEventListener('mouseenter', showHotspotTooltip);
        hotspotEl.addEventListener('mousemove', moveHotspotTooltip);
        hotspotEl.addEventListener('mouseleave', hideHotspotTooltip);

        mapContainer.appendChild(hotspotEl);
    });
}

function showHotspotTooltip(e) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = e.currentTarget.title;
    tooltip.style.opacity = '1';
}

function moveHotspotTooltip(e) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.left = (e.pageX + 15) + 'px';
    tooltip.style.top = (e.pageY + 15) + 'px';
}

function hideHotspotTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.opacity = '0';
}

// ========================================================================
// COPY/PASTE SYSTEM
// ========================================================================

function copySelectedCharacters() {
    if (selectedCharacters.size === 0) {
        alert('⚠️ Selecione personagens primeiro para copiar!');
        return;
    }

    // Copiar dados dos personagens selecionados
    copiedCharacters = [];
    selectedCharacters.forEach(charId => {
        const char = characters.find(c => c.id === charId);
        if (char) {
            // Copiar sem o ID para criar novos IDs ao colar
            copiedCharacters.push({
                name: char.name,
                type: char.type,
                icon: char.icon,
                x: char.x,
                y: char.y
            });
        }
    });

    // Habilitar botão de colar
    const pasteBtn = document.getElementById('pasteBtn');
    pasteBtn.disabled = false;
    pasteBtn.classList.add('active');

    // Feedback visual
    const copyBtn = document.getElementById('copyBtn');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = `✓ ${copiedCharacters.length} Copiado(s)`;
    copyBtn.style.background = '#4d6446';

    setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = '';
    }, 2000);
}

function pasteCharacters() {
    if (copiedCharacters.length === 0) {
        alert('⚠️ Nenhum personagem copiado!');
        return;
    }

    // Colar personagens com novos IDs
    copiedCharacters.forEach(charData => {
        const newChar = {
            id: nextCharId++,
            name: charData.name,
            type: charData.type,
            icon: charData.icon,
            x: charData.x,
            y: charData.y
        };

        characters.push(newChar);
        renderCharacter(newChar);
    });

    saveCurrentLocationCharacters();

    // Feedback visual
    const pasteBtn = document.getElementById('pasteBtn');
    const originalText = pasteBtn.innerHTML;
    pasteBtn.innerHTML = `✓ ${copiedCharacters.length} Colado(s)`;
    pasteBtn.style.background = '#4d6446';

    setTimeout(() => {
        pasteBtn.innerHTML = originalText;
        pasteBtn.style.background = '';
    }, 2000);
}

// Atalhos de teclado para copiar/colar e spawn
document.addEventListener('keydown', (e) => {
    // Tecla [ - Spawn Monster
    if (e.key === '[' && !e.target.matches('input, textarea') && !terminalActive) {
        e.preventDefault();
        spawnMonster();
    }

    // Tecla Delete - Remover Monstro Hovered
    if (e.key === 'Delete' && window.hoveredMonster && !e.target.matches('input, textarea')) {
        e.preventDefault();
        monsters = monsters.filter(m => m.id !== window.hoveredMonster);
        document.getElementById(window.hoveredMonster)?.remove();
        window.hoveredMonster = null;
        saveCurrentLocationCharacters();
        drawFlashlight();
    }

    // Tecla F - Inverter (Flip) Monstro Hovered
    if ((e.key === 'f' || e.key === 'F') && window.hoveredMonster && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const mInfo = monsters.find(m => m.id === window.hoveredMonster);
        if (mInfo) {
            mInfo.flipped = !mInfo.flipped;
            const el = document.getElementById(mInfo.id);
            if (el) {
                el.style.transform = `translate(-50%, -50%) rotate(${mInfo.rotation || 0}deg) scaleX(${mInfo.flipped ? -1 : 1})`;
            }
            saveCurrentLocationCharacters();
        }
    }

    // Ctrl+C / Cmd+C - Copiar
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.target.matches('input, textarea')) {
        if (selectedCharacters.size > 0) {
            e.preventDefault();
            copySelectedCharacters();
        }
    }

    // Ctrl+V / Cmd+V - Colar
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.target.matches('input, textarea')) {
        if (copiedCharacters.length > 0) {
            e.preventDefault();
            pasteCharacters();
        }
    }

    // F2 - Toggle CCTV (Monitoramento)
    if (e.key === 'F2') {
        e.preventDefault();
        toggleCctvMode();
    }

    // ============================================================
    // ATALHOS DE NAVEGAÇÃO ENTRE MAPAS
    // ============================================================

    // Apenas quando NÃO está digitando E o terminal NÃO está ativo
    if (!e.target.matches('input, textarea') && !terminalActive) {

        // Tecla 1 - Setor 1
        if (e.key === '1') {
            e.preventDefault();
            navigateToLocation('setor_1');
        }

        // Tecla 2 - Setor 2
        if (e.key === '2') {
            e.preventDefault();
            navigateToLocation('setor_2');
        }

        // Tecla 3 - Setor 3
        if (e.key === '3') {
            e.preventDefault();
            navigateToLocation('setor_3');
        }

        // Tecla 4 - Setor 4
        if (e.key === '4') {
            e.preventDefault();
            navigateToLocation('setor_4');
        }

        // Tecla 5 - Setor 5
        if (e.key === '5') {
            e.preventDefault();
            navigateToLocation('setor_5');
        }

        // Tecla 6 - Setor 6
        if (e.key === '6') {
            e.preventDefault();
            navigateToLocation('setor_6');
        }

        // Tecla 0 - Voltar para Mapa Geral
        if (e.key === '0') {
            e.preventDefault();
            navigateToLocation('general');
        }

        // Tecla L - Toggle Lanterna
        if (e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            toggleFlashlight();
        }

        // Tecla B - Toggle Blackout (Escuridão Total)
        if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            toggleBlackout();
        }

        // Tecla E - Toggle Luzes da Sala (ligado/desligado)
        if (e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            toggleLights();
        }
    }
});

// ========================================================================
// SIMPLE CHARACTER CREATION
// ========================================================================

function quickAddCharacter() {
    // Ativar modo de colocação imediatamente
    placingCharacter = {
        pending: true // Flag indicando que precisa pedir nome depois
    };

    document.getElementById('mapContainer').classList.add('placing-character');

}

// ========================================================================
// MONSTER SYSTEM - O ENXERTADO
// ========================================================================

function spawnMonster(x, y) {
    const monster = {
        id: 'monster-' + Date.now(),
        x: x || lastMouseX,
        y: y || lastMouseY,
        rotation: 0
    };

    monsters.push(monster);
    renderMonster(monster);
    saveCurrentLocationCharacters(); // Salva estado atual incorporando monstros
}

function renderMonster(monster) {
    const mapContainer = document.getElementById('mapContainer');
    const mapImage = document.getElementById('mapImage');
    const el = document.createElement('div');
    el.className = 'monster-marker';
    el.id = monster.id;
    el.style.left = monster.x + '%';
    el.style.top = monster.y + '%';
    el.style.transform = `translate(-50%, -50%) rotate(${monster.rotation || 0}deg) scaleX(${monster.flipped ? -1 : 1})`;

    const currentLocationId = navigationPath[navigationPath.length - 1];
    if (currentLocationId === 'general') {
        // Na sala de monitores, o monstro físico gigante é escondido para a tela não virar um carnaval.
        // Apenas a bolinha do radar representará ele visualmente.
        el.style.opacity = '0';
    }

    el.innerHTML = `
        <div class="monster-visual">
            <img src="monstro_enxertado.png" alt="O Enxertado" style="pointer-events: auto; user-select: none;" draggable="false">
            <div class="monster-pulse-glow"></div>
        </div>
    `;

    // Prevenir drag nativo da imagem HTML
    el.addEventListener('dragstart', (e) => e.preventDefault());

    // Transformar o monstro em arrastável e interativo
    let isDragging = false;

    el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation(); // Impede o drag da tela principal
        isDragging = true;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const rect = mapImage.getBoundingClientRect();
            monster.x = ((e.clientX - rect.left) / rect.width) * 100;
            monster.y = ((e.clientY - rect.top) / rect.height) * 100;
            el.style.left = monster.x + '%';
            el.style.top = monster.y + '%';
            if (!flashlightActive) drawFlashlight(); // Atualiza sombra ao vivo
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            saveCurrentLocationCharacters();
        }
    });

    // Rotação no Scroll
    el.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 15 : -15;
        monster.rotation = (monster.rotation || 0) + delta;
        el.style.transform = `translate(-50%, -50%) rotate(${monster.rotation}deg) scaleX(${monster.flipped ? -1 : 1})`;
        saveCurrentLocationCharacters();
        if (!flashlightActive) drawFlashlight();
    });

    // Rastrear cursor para atalhos do teclado (Delete / Flip)
    el.addEventListener('mouseenter', () => window.hoveredMonster = monster.id);
    el.addEventListener('mouseleave', () => window.hoveredMonster = null);

    mapContainer.appendChild(el);
}

function saveAllMonstersFromStorage() {
    localStorage.setItem('rpgMapMonstersV1', JSON.stringify(monstersByLocation));
}

function loadAllMonstersFromStorage() {
    const saved = localStorage.getItem('rpgMapMonstersV1');
    if (saved) {
        try {
            monstersByLocation = JSON.parse(saved);
        } catch (e) {
            console.error('Erro ao carregar monstros:', e);
        }
    }
}

// ========================================================================
// CHARACTER MANAGEMENT
// ========================================================================

function saveCurrentLocationCharacters() {
    const locationId = getCurrentLocation();
    charactersByLocation[locationId] = [...characters];
    monstersByLocation[locationId] = [...monsters]; // NOVO: Salvar monstros
    saveAllCharactersToStorage();
    saveAllMonstersFromStorage(); // NOVO: Persistência de monstros
}

function loadCharactersForLocation(locationId) {
    // Clear DOM
    document.querySelectorAll('.character-marker').forEach(m => m.remove());
    document.querySelectorAll('.token-marker').forEach(m => m.remove());
    document.querySelectorAll('.monster-marker').forEach(m => m.remove());

    // Load characters
    characters = charactersByLocation[locationId] || [];
    characters.forEach(char => renderCharacter(char));

    // Load monsters - mas NÃO renderizar no Mapa 0 (Sala de Monitores)
    // Monstros dos setores são rastreados via radar nos monitores, não como sprites
    if (locationId !== 'general') {
        monsters = monstersByLocation[locationId] || [];
        monsters.forEach(m => renderMonster(m));
    } else {
        monsters = []; // Monstros pertencem a setores, não ao mapa geral
    }
}

function placeCharacter(x, y) {
    if (!placingCharacter) return;

    // Guardar a posição onde clicou
    pendingCharacterPosition = { x, y };

    // Calcular posição do input no mapa (em pixels)
    const mapImage = document.getElementById('mapImage');
    const rect = mapImage.getBoundingClientRect();
    const pixelX = (x / 100) * rect.width;
    const pixelY = (y / 100) * rect.height;

    // Posicionar o input inline
    const inlineInput = document.getElementById('inlineNameInput');
    inlineInput.style.left = pixelX + 'px';
    inlineInput.style.top = pixelY + 'px';
    inlineInput.classList.add('active');

    // Focar no campo
    const field = document.getElementById('inlineNameField');
    field.value = '';
    setTimeout(() => field.focus(), 100);

    // Esconder indicador

}

function confirmInlineName() {
    const name = document.getElementById('inlineNameField').value.trim();

    if (!name) {
        alert('Por favor, digite um nome!');
        return;
    }

    // Criar personagem
    const character = {
        id: nextCharId++,
        name: name,
        type: 'player',
        icon: '👤',
        x: pendingCharacterPosition.x,
        y: pendingCharacterPosition.y,
        rotation: 0,
        flashlightOn: false
    };

    characters.push(character);
    renderCharacter(character);
    saveCurrentLocationCharacters();

    // Limpar tudo
    closeInlineNameInput();
}

function cancelInlineName() {
    closeInlineNameInput();
}

function closeInlineNameInput() {
    document.getElementById('inlineNameInput').classList.remove('active');
    document.getElementById('inlineNameField').value = '';
    placingCharacter = null;
    pendingCharacterPosition = null;
    document.getElementById('mapContainer').classList.remove('placing-character');

}

function renderCharacter(char) {
    const mapContainer = document.getElementById('mapContainer');
    const marker = document.createElement('div');
    marker.className = `character-marker character-${char.type}`;
    marker.id = `char-${char.id}`;
    marker.style.left = `${char.x}%`;
    marker.style.top = `${char.y}%`;
    marker.style.transform = `translate(-50%, -50%) rotate(${char.rotation || 0}deg)`;

    marker.innerHTML = `
        <div class="character-icon">${char.icon}</div>
        <div class="character-label">${char.name}</div>
        <div class="character-remove" onclick="removeCharacter(${char.id}); event.stopPropagation();">✕</div>
    `;

    mapContainer.appendChild(marker);
}

function removeCharacter(charId) {
    // Remover direto sem confirmação
    characters = characters.filter(c => c.id !== charId);
    const marker = document.getElementById(`char-${charId}`);
    if (marker) marker.remove();
    saveCurrentLocationCharacters();

    // Remover da seleção se estiver selecionado
    selectedCharacters.delete(charId);
}

function updateCharactersList() {
    const list = document.getElementById('charactersList');

    if (characters.length === 0) {
        list.innerHTML = '<p style="color: #8b7d6b; font-style: italic; text-align: center;">Nenhum personagem adicionado ainda</p>';
        return;
    }

    const typeNames = {
        player: 'Jogador',
        npc: 'NPC Aliado',
        enemy: 'Inimigo',
        mystery: 'Mistério'
    };

    list.innerHTML = characters.map(char => `
        <div class="character-item ${char.type}">
            <div class="character-info">
                <div class="character-name">${char.icon} ${char.name}</div>
                <div class="character-type">${typeNames[char.type]}</div>
            </div>
            <div class="character-actions">
                <button class="action-btn" onclick="focusCharacter(${char.id})">📍</button>
                <button class="action-btn" onclick="removeCharacter(${char.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function focusCharacter(charId) {
    const marker = document.getElementById(`char-${charId}`);
    if (marker) {
        marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
        marker.style.animation = 'none';
        setTimeout(() => {
            marker.style.animation = 'pulse 0.5s ease 3';
        }, 10);
    }
}

// ========================================================================
// MULTI-SELECTION SYSTEM
// ========================================================================

function setupMultiSelection() {
    const mapContainer = document.getElementById('mapContainer');
    const mapImage = document.getElementById('mapImage');
    const selectionBox = document.getElementById('selectionBox');

    // CRUCIAL: Prevenir drag da imagem
    mapImage.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
    });

    // Prevenir seleção de texto
    mapImage.style.userSelect = 'none';
    mapImage.style.webkitUserSelect = 'none';
    mapImage.style.mozUserSelect = 'none';

    mapContainer.addEventListener('mousedown', (e) => {
        // Não fazer nada se está colocando personagem
        if (placingCharacter) {
            // NÃO prevenir default quando está colocando - deixa o click passar
            return;
        }

        // Não fazer nada se clicou em hotspot
        if (e.target.classList.contains('hotspot-marker') || e.target.closest('.hotspot')) return;

        // Prevenir comportamento padrão do navegador
        e.preventDefault();

        const clickedChar = e.target.closest('.character-marker');
        const clickedToken = e.target.closest('.token-marker');

        cachedMapRect = mapImage.getBoundingClientRect(); // Cache inicial

        // Se clicou em um TOKEN
        if (clickedToken && clickedToken.dataset.selected === 'true') {
            // Token selecionado - iniciar drag do grupo (personagens + tokens)
            isDraggingGroup = true;
            isSelecting = false;
            dragGroupStart = { x: e.clientX, y: e.clientY };

            // CACHE para performance
            dragGroupElements.characters = Array.from(selectedCharacters).map(id => ({
                data: characters.find(c => c.id === id),
                el: document.getElementById(`char-${id}`)
            })).filter(item => item.data && item.el);

            dragGroupElements.tokens = Array.from(document.querySelectorAll('.token-marker[data-selected="true"]')).map(el => ({
                data: tokens.find(t => t.id === parseInt(el.id.replace('token-', ''))),
                el: el
            })).filter(item => item.data && item.el);

            mapContainer.style.cursor = 'grabbing';
            return;
        }

        // Se clicou em um personagem
        if (clickedChar) {
            const charId = parseInt(clickedChar.id.replace('char-', ''));

            // Ctrl+Click = adicionar/remover da seleção
            if (e.ctrlKey || e.metaKey) {
                toggleCharacterSelection(charId);
                return;
            }

            // Se já está selecionado, iniciar drag do grupo
            if (selectedCharacters.has(charId)) {
                isDraggingGroup = true;
                isSelecting = false;
                dragGroupStart = { x: e.clientX, y: e.clientY };

                // CACHE para performance
                dragGroupElements.characters = Array.from(selectedCharacters).map(id => ({
                    data: characters.find(c => c.id === id),
                    el: document.getElementById(`char-${id}`)
                })).filter(item => item.data && item.el);

                dragGroupElements.tokens = Array.from(document.querySelectorAll('.token-marker[data-selected="true"]')).map(el => ({
                    data: tokens.find(t => t.id === parseInt(el.id.replace('token-', ''))),
                    el: el
                })).filter(item => item.data && item.el);

                mapContainer.style.cursor = 'grabbing';
                return;
            }

            // Se não está selecionado, selecionar só ele e iniciar drag
            deselectAll();
            selectCharacter(charId);
            isDraggingGroup = true;
            isSelecting = false;
            dragGroupStart = { x: e.clientX, y: e.clientY };

            // CACHE para performance (só o clicado)
            dragGroupElements.characters = [{
                data: characters.find(c => c.id === charId),
                el: clickedChar
            }];
            dragGroupElements.tokens = [];

            mapContainer.style.cursor = 'grabbing';
            return;
        }

        // Se clicou no mapa vazio = iniciar seleção por área
        if (e.target === mapImage || e.target === mapContainer) {
            if (!e.ctrlKey && !e.metaKey) {
                deselectAll();
            }

            // Forçar que não está arrastando
            isDraggingGroup = false;
            isSelecting = true;

            const rect = mapImage.getBoundingClientRect();
            selectionStart.x = e.clientX - rect.left;
            selectionStart.y = e.clientY - rect.top;

            selectionBox.style.left = selectionStart.x + 'px';
            selectionBox.style.top = selectionStart.y + 'px';
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
            selectionBox.classList.add('active');
            mapContainer.classList.add('selecting');
        }
    });

    document.addEventListener('mousemove', (e) => {
        // Se está arrastando personagens
        if (isDraggingGroup && !isSelecting) {
            e.preventDefault();
            const deltaX = e.clientX - dragGroupStart.x;
            const deltaY = e.clientY - dragGroupStart.y;

            // Converter para percentual usando o RECT cacheado
            dragLatestDelta.x = (deltaX / cachedMapRect.width) * 100;
            dragLatestDelta.y = (deltaY / cachedMapRect.height) * 100;
            dragIsDirty = true;

            // Se o loop da lanterna não estiver rodando e o de drag também não, iniciar
            if (!flashlightActive && !dragLoopActive) {
                dragLoopActive = true;
                requestAnimationFrame(updateDragOnly);
            }

            dragGroupStart = { x: e.clientX, y: e.clientY };
            return;
        }

        // Se está selecionando área
        if (isSelecting && !isDraggingGroup) {
            e.preventDefault();
            // Usar o RECT cacheado
            const currentX = e.clientX - cachedMapRect.left;
            const currentY = e.clientY - cachedMapRect.top;

            const width = Math.abs(currentX - selectionStart.x);
            const height = Math.abs(currentY - selectionStart.y);
            const left = Math.min(currentX, selectionStart.x);
            const top = Math.min(currentY, selectionStart.y);

            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';

            updateSelectionInBox(left, top, width, height, cachedMapRect);
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (isDraggingGroup) {
            isDraggingGroup = false;
            dragGroupElements = { characters: [], tokens: [] }; // Limpar cache
            mapContainer.style.cursor = '';
            saveCurrentLocationCharacters();
        }

        if (isSelecting) {
            isSelecting = false;
            selectionBox.classList.remove('active');
            mapContainer.classList.remove('selecting');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if ((selectedCharacters.size > 0 || hasSelectedToken()) && !e.target.matches('input, textarea')) {
                e.preventDefault();
                deleteSelected();
                deleteSelectedToken();
            }
        }

        // Espelhar tokens selecionados com setas
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && hasSelectedToken() && !e.target.matches('input, textarea')) {
            e.preventDefault();
            flipSelectedTokens();
        }

        if (e.key === 'Escape') {
            deselectAll();
            // Cancelar input inline se estiver ativo
            if (document.getElementById('inlineNameInput').classList.contains('active')) {
                cancelInlineName();
            }
            // Cancelar criação de personagem se estiver ativa
            if (placingCharacter) {
                placingCharacter = null;
                document.getElementById('mapContainer').classList.remove('placing-character');
            }
            // Fechar terminal se estiver ativo
            if (terminalActive) {
                closeTerminalMinigame();
            }
        }

        // Suporte para teclado no minijogo do terminal
        if (terminalActive && !e.target.matches('input, textarea')) {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleKeypadInput(parseInt(e.key), null); // null pois não temos o elemento do botão
            }
        }

        // Enter para confirmar nome
        if (e.key === 'Enter' && document.getElementById('inlineNameInput').classList.contains('active')) {
            confirmInlineName();
        }
    });
}

function updateSelectionInBox(left, top, width, height, containerRect) {
    // Selecionar PERSONAGENS na caixa
    characters.forEach(char => {
        const marker = document.getElementById(`char-${char.id}`);
        if (!marker) return;

        const markerRect = marker.getBoundingClientRect();
        const markerX = markerRect.left + markerRect.width / 2 - containerRect.left;
        const markerY = markerRect.top + markerRect.height / 2 - containerRect.top;

        const inBox = markerX >= left && markerX <= left + width &&
            markerY >= top && markerY <= top + height;

        if (inBox) {
            selectCharacter(char.id);
        }
    });

    // Selecionar TOKENS na caixa
    tokens.forEach(token => {
        const marker = document.getElementById(`token-${token.id}`);
        if (!marker) return;

        const markerRect = marker.getBoundingClientRect();
        const markerX = markerRect.left + markerRect.width / 2 - containerRect.left;
        const markerY = markerRect.top + markerRect.height / 2 - containerRect.top;

        const inBox = markerX >= left && markerX <= left + width &&
            markerY >= top && markerY <= top + height;

        if (inBox) {
            selectToken(marker);
        }
    });
}

function selectCharacter(charId) {
    selectedCharacters.add(charId);
    const marker = document.getElementById(`char-${charId}`);
    if (marker) {
        marker.classList.add('selected');
    }
}

function deselectCharacter(charId) {
    selectedCharacters.delete(charId);
    const marker = document.getElementById(`char-${charId}`);
    if (marker) {
        marker.classList.remove('selected');
    }
}

function toggleCharacterSelection(charId) {
    if (selectedCharacters.has(charId)) {
        deselectCharacter(charId);
    } else {
        selectCharacter(charId);
    }
}

function deselectAll() {
    // Deselecionar personagens
    selectedCharacters.forEach(charId => {
        const marker = document.getElementById(`char-${charId}`);
        if (marker) {
            marker.classList.remove('selected');
        }
    });
    selectedCharacters.clear();

    // Deselecionar tokens
    document.querySelectorAll('.token-marker').forEach(t => {
        t.style.border = 'none';
        t.style.boxShadow = 'none';
        t.dataset.selected = 'false';
    });
}

function moveSelectedCharacters(deltaX, deltaY) {
    // Mover PERSONAGENS usando o CACHE
    dragGroupElements.characters.forEach(item => {
        const char = item.data;
        const marker = item.el;

        char.x = Math.max(0, Math.min(100, char.x + deltaX));
        char.y = Math.max(0, Math.min(100, char.y + deltaY));

        marker.style.left = `${char.x}%`;
        marker.style.top = `${char.y}%`;
    });

    // Mover TOKENS usando o CACHE
    dragGroupElements.tokens.forEach(item => {
        const token = item.data;
        const tokenEl = item.el;

        token.x = Math.max(0, Math.min(100, token.x + deltaX));
        token.y = Math.max(0, Math.min(100, token.y + deltaY));

        tokenEl.style.left = `${token.x}%`;
        tokenEl.style.top = `${token.y}%`;
    });

    // Removido drawFlashlight sincronizado pois o loop de requestAnimationFrame é mais suave
}

function deleteSelected() {
    if (selectedCharacters.size === 0) return;

    // Deletar direto sem confirmação
    selectedCharacters.forEach(charId => {
        const marker = document.getElementById(`char-${charId}`);
        if (marker) marker.remove();
        characters = characters.filter(c => c.id !== charId);
    });

    selectedCharacters.clear();
    saveCurrentLocationCharacters();
}

// ========================================================================
// TOKEN SYSTEM
// ========================================================================

function startPlacingToken(imageSrc, name) {
    placingToken = {
        imageSrc: imageSrc,
        name: name
    };
    document.getElementById('mapContainer').style.cursor = 'crosshair';
}

function placeToken(x, y) {
    if (!placingToken) return;

    const token = {
        id: Date.now(),
        imageSrc: placingToken.imageSrc,
        name: placingToken.name,
        x: x,
        y: y
    };

    tokens.push(token);
    renderToken(token);

    // Reset
    placingToken = null;
    document.getElementById('mapContainer').style.cursor = '';
}

function renderToken(token) {
    const mapContainer = document.getElementById('mapContainer');
    const tokenEl = document.createElement('div');
    tokenEl.className = 'token-marker';
    tokenEl.id = `token-${token.id}`;
    tokenEl.style.left = `${token.x}%`;
    tokenEl.style.top = `${token.y}%`;
    tokenEl.style.width = '320px';  // 8x maior que personagens (40px)
    tokenEl.style.height = '320px'; // 8x maior que personagens (40px)
    tokenEl.style.position = 'absolute';
    tokenEl.style.transform = 'translate(-50%, -50%)';
    tokenEl.style.cursor = 'move';
    tokenEl.style.zIndex = '25';
    tokenEl.style.borderRadius = '50%'; // Circular!

    const img = document.createElement('img');
    img.src = token.imageSrc;
    img.alt = token.name;
    img.title = token.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.pointerEvents = 'none';
    img.style.borderRadius = '50%'; // Circular!
    img.style.transition = 'transform 0.2s ease'; // Suavizar flip

    // Inicializar flip
    if (!token.flipped) token.flipped = false;
    img.style.transform = token.flipped ? 'scaleX(-1)' : 'scaleX(1)';

    img.onerror = function () {
        this.style.display = 'none';
        tokenEl.innerHTML = `<div style="width:100%;height:100%;background:rgba(200,0,0,0.5);border:2px solid red;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:2em;">❌</div>`;
    };

    tokenEl.appendChild(img);
    mapContainer.appendChild(tokenEl);

    makeTokenDraggable(tokenEl, token);
}

function makeTokenDraggable(tokenEl, token) {
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, initialLeft, initialTop;

    // Mousedown - Iniciar drag
    tokenEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;

        // Se já está selecionado com outros, não arrastar individualmente
        // Deixa o sistema de grupo lidar com isso
        if (tokenEl.dataset.selected === 'true' && (selectedCharacters.size > 0 || hasMultipleSelectedTokens())) {
            return;
        }

        hasMoved = false;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = tokenEl.getBoundingClientRect();
        const container = document.getElementById('mapContainer').getBoundingClientRect();
        initialLeft = rect.left - container.left;
        initialTop = rect.top - container.top;

        e.preventDefault();
        e.stopPropagation();
    });

    // Click - Selecionar (só se não arrastou)
    tokenEl.addEventListener('click', (e) => {
        if (!hasMoved) {
            e.stopPropagation();
            selectToken(tokenEl);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Se moveu mais de 3 pixels, considera como drag
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
            tokenEl.style.opacity = '0.7';
        }

        const newLeft = initialLeft + dx;
        const newTop = initialTop + dy;

        tokenEl.style.left = newLeft + 'px';
        tokenEl.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            tokenEl.style.opacity = '1';

            if (hasMoved) {
                // Update token position
                const mapImage = document.getElementById('mapImage');
                const rect = mapImage.getBoundingClientRect();
                const tokenRect = tokenEl.getBoundingClientRect();

                token.x = ((tokenRect.left + tokenRect.width / 2 - rect.left) / rect.width) * 100;
                token.y = ((tokenRect.top + tokenRect.height / 2 - rect.top) / rect.height) * 100;

                tokenEl.style.left = `${token.x}%`;
                tokenEl.style.top = `${token.y}%`;
            }

            hasMoved = false;
        }
    });
}

function selectToken(tokenEl) {
    // Deselect all tokens
    document.querySelectorAll('.token-marker').forEach(t => {
        t.style.border = 'none';
        t.style.boxShadow = 'none';
    });

    // Select this token - borda circular dourada
    tokenEl.style.border = '3px solid #FFD700';
    tokenEl.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.6)';
    tokenEl.dataset.selected = 'true';
}

function hasSelectedToken() {
    return document.querySelector('.token-marker[data-selected="true"]') !== null;
}

function hasMultipleSelectedTokens() {
    return document.querySelectorAll('.token-marker[data-selected="true"]').length > 1;
}

function flipSelectedTokens() {
    document.querySelectorAll('.token-marker[data-selected="true"]').forEach(tokenEl => {
        const tokenId = parseInt(tokenEl.id.replace('token-', ''));
        const token = tokens.find(t => t.id === tokenId);
        if (token) {
            // Inverter estado de flip
            token.flipped = !token.flipped;

            // Aplicar espelhamento na imagem
            const img = tokenEl.querySelector('img');
            if (img) {
                img.style.transform = token.flipped ? 'scaleX(-1)' : 'scaleX(1)';
            }
        }
    });
}

function deleteSelectedToken() {
    const selectedToken = document.querySelector('.token-marker[data-selected="true"]');
    if (!selectedToken) return;

    // Get token ID from element
    const tokenId = parseInt(selectedToken.id.replace('token-', ''));

    // Remove from DOM
    selectedToken.remove();

    // Remove from array
    const index = tokens.findIndex(t => t.id === tokenId);
    if (index > -1) {
        tokens.splice(index, 1);
    }
}



// ========================================================================
// BLACKOUT SYSTEM (B)
// ========================================================================

function toggleBlackout() {
    isBlackoutActive = !isBlackoutActive;
    localStorage.setItem('rpgBlackoutMode', isBlackoutActive ? 'on' : 'off');

    const mapContainer = document.getElementById('mapContainer');
    if (isBlackoutActive) {
        mapContainer.classList.add('night-mode');
        initFlashlight();
    } else {
        mapContainer.classList.remove('night-mode');
    }
}

// ========================================================================
// LIGHTS SYSTEM (E)
// ========================================================================

function toggleLights() {
    isLightsOn = !isLightsOn;
    localStorage.setItem('rpgLightsMode', isLightsOn ? 'ligado' : 'desligado');

    // Recarregar imagem do mapa com o novo sufixo
    const locationId = getCurrentLocation();
    loadLocation(locationId);
}

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================

function toggleLocations() {
    const locationId = getCurrentLocation();
    if (locationId !== 'general') return;

    locationsVisible = !locationsVisible;
    document.querySelectorAll('.location-hotspot').forEach(hotspot => {
        hotspot.style.display = locationsVisible ? 'block' : 'none';
    });

    const toggleBtn = document.getElementById('toggleLocationsBtn');
    toggleBtn.textContent = locationsVisible ? '📍 Ocultar Locais' : '📍 Mostrar Locais';
}

// ========================================================================
// STORAGE FUNCTIONS
// ========================================================================

function saveNavigationState() {
    localStorage.setItem('rpgNavigationPath', JSON.stringify(navigationPath));
}

function loadNavigationState() {
    // Sempre iniciar no Mapa Geral (Sala de Monitores) ao recarregar a página
    // conforme solicitação do usuário.
    navigationPath = ['general'];
    saveNavigationState();
}

function saveAllCharactersToStorage() {
    // Save current location first
    const locationId = getCurrentLocation();
    charactersByLocation[locationId] = [...characters];

    // Calculate next ID
    let maxId = 0;
    Object.values(charactersByLocation).forEach(locationChars => {
        locationChars.forEach(char => {
            if (char.id > maxId) maxId = char.id;
        });
    });

    const saveData = {
        charactersByLocation: charactersByLocation,
        nextCharId: maxId + 1
    };

    localStorage.setItem('rpgMapCharactersV3', JSON.stringify(saveData));
}

function loadAllCharactersFromStorage() {
    const saved = localStorage.getItem('rpgMapCharactersV3');
    if (saved) {
        try {
            const saveData = JSON.parse(saved);
            charactersByLocation = saveData.charactersByLocation || {};
            nextCharId = saveData.nextCharId || 1;
        } catch (e) {
            console.error('Error loading characters:', e);
            charactersByLocation = {};
            nextCharId = 1;
        }
    }
}


// ========================================================================
// FLASHLIGHT & ROTATION SYSTEM
// ========================================================================

function initFlashlight() {
    const canvas = document.getElementById('flashlightCanvas');
    if (!canvas) return;

    const mapImage = document.getElementById('mapImage');

    function resizeCanvas() {
        canvas.width = mapImage.naturalWidth || mapImage.clientWidth;
        canvas.height = mapImage.naturalHeight || mapImage.clientHeight;

        // Forçar tamanho visual igual à imagem
        canvas.style.width = mapImage.clientWidth + 'px';
        canvas.style.height = mapImage.clientHeight + 'px';

        drawFlashlight();
    }

    if (mapImage.complete && mapImage.naturalWidth > 0) {
        resizeCanvas();
    } else {
        mapImage.onload = resizeCanvas;
    }

    // Observer para detectar mudança de tamanho quando troca de mapa
    const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
    });
    resizeObserver.observe(mapImage);

    if (!flashlightActive) {
        flashlightActive = true;
        requestAnimationFrame(flashlightLoop);
    }
}

function updateDragOnly() {
    if (isDraggingGroup && !flashlightActive) {
        if (dragIsDirty) {
            moveSelectedCharacters(dragLatestDelta.x, dragLatestDelta.y);
            dragIsDirty = false;
        }
        requestAnimationFrame(updateDragOnly);
    } else {
        dragLoopActive = false;
    }
}

function flashlightLoop() {
    if (isBlackoutActive && flashlightActive) {
        // Se houve movimento, aplica no frame correto
        if (dragIsDirty) {
            moveSelectedCharacters(dragLatestDelta.x, dragLatestDelta.y);
            dragIsDirty = false;
        }

        drawFlashlight();
        requestAnimationFrame(flashlightLoop);
    } else {
        flashlightActive = false;
    }
}

function toggleFlashlight() {
    if (selectedCharacters.size === 0) {
        alert('⚠️ Selecione um personagem para ligar a lanterna!');
        return;
    }

    selectedCharacters.forEach(charId => {
        const char = characters.find(c => c.id === charId);
        if (char) {
            char.flashlightOn = !char.flashlightOn;
        }
    });

    saveCurrentLocationCharacters();
}

function drawFlashlight() {
    const canvas = document.getElementById('flashlightCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Se o ambiente não estiver escuro, limpa e sai
    if (!isBlackoutActive) { // apenas blackout controla o canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    // 1. Limpar e preencher com escuridão total
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Lógica do Flicker a cada 2 minutos (120.000 ms)
    const now = Date.now();
    let flickerOpacity = 1;
    const cycleTime = now % 120000;
    // Janela de terror de 2 segundos a cada ciclo
    if (cycleTime < 2500) {
        // Pisca brutalmente gerando valor aleatório (entre 0.4 e 1.0)
        flickerOpacity = 0.4 + (Math.random() * 0.6);

        // As vezes pisca totalmente para 0
        if (Math.random() > 0.8) flickerOpacity = 0;
    }

    // Ajustar intensidade baseado no modo
    const darknessIntensity = isBlackoutActive ? 0.98 : 0.85;
    ctx.fillStyle = `rgba(0, 0, 5, ${darknessIntensity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. "Cortar" a luz para cada personagem ou token com lanterna ligada
    const allCasters = [...characters, ...tokens];
    allCasters.forEach(caster => {
        if (!caster.flashlightOn) return;

        const x = (caster.x / 100) * canvas.width;
        const y = (caster.y / 100) * canvas.height;
        const angle = (caster.rotation || 0) * (Math.PI / 180);
        const halfWidth = (flashlightState.width / 2) * (Math.PI / 180);

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        // Usar o raio do estado para sincronia perfeita e aplicar flicker
        const lightRadius = flashlightState.radius * flickerOpacity;

        if (lightRadius > 0) {
            // Desenhar o cone com gradiente radial para suavizar
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, lightRadius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${1 * flickerOpacity})`);
            gradient.addColorStop(0.4, `rgba(255, 255, 255, ${1 * flickerOpacity})`);
            gradient.addColorStop(0.75, `rgba(255, 255, 255, ${0.9 * flickerOpacity})`);
            gradient.addColorStop(0.92, `rgba(255, 255, 255, ${0.5 * flickerOpacity})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;

            ctx.beginPath();
            ctx.moveTo(x, y);
            // O arco começa em angle-PI/2 porque 0 radianos no canvas é para a direita
            ctx.arc(x, y, lightRadius, angle - halfWidth - Math.PI / 2, angle + halfWidth - Math.PI / 2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    });

    // 3. Desenhar a aura pulsante dos monstros
    monsters.forEach(m => {
        const mx = (m.x / 100) * canvas.width;
        const my = (m.y / 100) * canvas.height;

        // Efeito de pulso baseado no tempo MAIS LENTO (dividido por 1200)
        const pulse = 1 + 0.15 * Math.sin(Date.now() / 1200);
        const monsterRadius = 180 * pulse;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, monsterRadius);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)'); // Tom verde Penicillium
        gradient.addColorStop(0.3, 'rgba(34, 197, 94, 0.5)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mx, my, monsterRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // 4. Detecção de Iluminação do Monstro (Apenas no Cone e Gradual)
    monsters.forEach(m => {
        const mx = (m.x / 100) * canvas.width;
        const my = (m.y / 100) * canvas.height;

        let maxIllumination = 0;

        allCasters.forEach(caster => {
            if (!caster.flashlightOn) return;
            const cx = (caster.x / 100) * canvas.width;
            const cy = (caster.y / 100) * canvas.height;
            const dist = Math.hypot(mx - cx, my - cy);

            const lightRadius = flashlightState.radius;
            // Se estiver dentro da distância máxima do cone...
            if (dist <= lightRadius) {
                const dx = mx - cx;
                const dy = my - cy;
                const monsterAngle = Math.atan2(dy, dx);

                // O ângulo no canvas (0 graus para cima) precisa subtrair PI/2 para a correta tradução matemática
                const casterAngle = (caster.rotation || 0) * (Math.PI / 180) - (Math.PI / 2);

                let angleDiff = monsterAngle - casterAngle;
                // Normaliza entre -PI e PI
                while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const halfWidth = (flashlightState.width / 2) * (Math.PI / 180);

                // Se cair dentro da abertura do cone da lanterna:
                if (Math.abs(angleDiff) <= halfWidth) {
                    // Revelação gradual: O quão perto ele está do início do cone
                    let intensity = 1.0 - (dist / lightRadius);
                    // Deixa a opacidade preencher mais fácil no começo antes de decair devagar pras bordas
                    intensity = Math.pow(intensity, 0.4);

                    if (intensity > maxIllumination) maxIllumination = intensity;
                }
            }
        });

        // Aplicar Opacidade Exata calculada ao invés da luz cheia
        const el = document.getElementById(m.id);
        if (el) {
            const img = el.querySelector('.monster-visual img');
            if (img) {
                if (isBlackoutActive) {
                    img.style.opacity = maxIllumination; // Gradualidade direta sem delay
                    img.style.transition = 'none'; // Atualiza junto com o Refresh rate da luz
                } else {
                    img.style.opacity = ''; // Retorna ao CSS normal da luz acesa
                    img.style.transition = 'opacity 0.5s ease-in-out';
                }
            }
        }
    });

}


// ========================================================================
// EVENT LISTENERS
// ========================================================================

function setupEventListeners() {
    const mapContainer = document.getElementById('mapContainer');
    const mapImage = document.getElementById('mapImage');

    // contextmenu to open the overlay menu
    mapContainer.addEventListener('contextmenu', (e) => {
        // Se o terminal estiver aberto, deixe o comportamento padrão (ou nada)
        if (terminalActive) return;

        e.preventDefault();
        openContextMenu(e); // Passar o evento para posicionar
    });

    // Click to place character or token
    mapContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('map-image') || e.target === mapContainer) {
            const rect = mapImage.getBoundingClientRect();
            lastMouseX = ((e.clientX - rect.left) / rect.width) * 100;
            lastMouseY = ((e.clientY - rect.top) / rect.height) * 100;
        }

        // Fechar menu de contexto se clicar no mapa
        if (document.getElementById('mapOverlayMenu').classList.contains('active')) {
            closeContextMenu();
        }
        // Se está colocando token
        if (placingToken) {
            if (e.target.classList.contains('map-image') || e.target === mapContainer) {
                const rect = mapImage.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                placeToken(x, y);
            }
            return;
        }

        // Se está colocando personagem
        if (placingCharacter) {
            // Aceitar clique na imagem OU no container
            if (e.target.classList.contains('map-image') || e.target === mapContainer) {
                const rect = mapImage.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                placeCharacter(x, y);
            }
        }
    });

    // Mouse Wheel Rotation
    mapContainer.addEventListener('mousemove', (e) => {
        const rect = mapImage.getBoundingClientRect();
        lastMouseX = ((e.clientX - rect.left) / rect.width) * 100;
        lastMouseY = ((e.clientY - rect.top) / rect.height) * 100;
    });

    mapContainer.addEventListener('wheel', (e) => {
        if (selectedCharacters.size > 0 && !e.target.matches('input, textarea')) {
            // Se algum personagem está selecionado, rodar em vez de scrollar no mapa
            e.preventDefault();

            const delta = e.deltaY > 0 ? 5 : -5;

            selectedCharacters.forEach(charId => {
                const char = characters.find(c => c.id === charId);
                if (char) {
                    char.rotation = (char.rotation || 0) + delta;

                    // Atualizar visual
                    const marker = document.getElementById(`char-${charId}`);
                    if (marker) {
                        marker.style.transform = `translate(-50%, -50%) rotate(${char.rotation}deg)`;
                    }
                }
            });

            // Redesenhar lanterna imediatamente para resposta rápida
            drawFlashlight();

            saveCurrentLocationCharacters();
        }
    }, { passive: false });
}

// ========================================================================
// INITIALIZATION
// ========================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupMultiSelection();

    // Close context menu on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeContextMenu();
        }
    });

    // Close context menu on click outside
    document.addEventListener('mousedown', (e) => {
        const menu = document.getElementById('mapOverlayMenu');
        if (menu.classList.contains('active') && !menu.contains(e.target)) {
            closeContextMenu();
        }
    });

    // Load saved data
    loadAllCharactersFromStorage();
    loadAllMonstersFromStorage();
    loadNavigationState();

    // Load saved environmental states
    const savedLights = localStorage.getItem("rpgLightsMode") || "ligado";
    isLightsOn = (savedLights === "ligado");

    const savedBlackout = localStorage.getItem("rpgBlackoutMode") || "off";
    isBlackoutActive = (savedBlackout === "on");

    // Load current location
    const locationId = getCurrentLocation();
    loadLocation(locationId);
});

// ========================================================================
// CCTV INTERFACE LOGIC
// ========================================================================

function updateCctvOverlay() {
    const timestampEl = document.getElementById('cctvTimestamp');
    const camIdEl = document.getElementById('camId');
    const coordsEl = document.getElementById('cctvCoords');

    if (!timestampEl) return;

    // Update Time
    const now = new Date();
    const timeStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');
    timestampEl.textContent = timeStr;

    // Update Cam ID based on location
    const loc = getCurrentLocation();
    const locData = mapHierarchy[loc];
    if (locData) {
        camIdEl.textContent = `CAM-${String(Object.keys(mapHierarchy).indexOf(loc)).padStart(2, '0')} [${locData.name.toUpperCase()}]`;
    }

    // Pseudo-random coords jitter
    if (Math.random() > 0.8) {
        const lat = (55.4211 + (Math.random() - 0.5) * 0.001).toFixed(4);
        const long = (37.1129 + (Math.random() - 0.5) * 0.001).toFixed(4);
        coordsEl.textContent = `LAT: ${lat} LONG: ${long}`;
    }
}

// Start CCTV loop
setInterval(updateCctvOverlay, 1000);

// === RADAR DO MAPA 0 (Sala de Monitores) ===
// Apenas projeta pontos reais onde cada monstro está em cada setor.
// F2 não usa mais radar - apenas estética de câmera.
function globalRadarLoop() {
    const currentLoc = navigationPath[navigationPath.length - 1];

    if (currentLoc === 'general') {
        const sectors = ['setor_1', 'setor_2', 'setor_3', 'setor_4', 'setor_5', 'setor_6'];

        // Se blackout ativo, câmeras estão sem sinal — limpar todos os pontos
        if (isBlackoutActive) {
            sectors.forEach(sid => {
                const mon = document.getElementById('monitor-' + sid);
                if (mon) mon.querySelectorAll('.cctv-blip').forEach(t => t.remove());
            });
            setTimeout(() => requestAnimationFrame(globalRadarLoop), 100);
            return;
        }

        sectors.forEach(sid => {
            const mon = document.getElementById('monitor-' + sid);
            if (!mon) return;
            mon.style.position = 'relative';
            mon.style.overflow = 'hidden';

            const secMonsters = monstersByLocation[sid] || [];

            // Remover trackers já deletados
            mon.querySelectorAll('.cctv-blip.real').forEach(t => {
                const mId = t.dataset.monsterId;
                if (!secMonsters.find(m => m.id === mId)) t.remove();
            });

            // Criar ou atualizar tracker por monstro presente no setor
            secMonsters.forEach(m => {
                const tid = 'radar-mon-' + sid + '-' + m.id;
                let tracker = document.getElementById(tid);
                if (!tracker) {
                    tracker = document.createElement('div');
                    tracker.id = tid;
                    tracker.className = 'cctv-blip real';
                    tracker.dataset.monsterId = m.id;
                    tracker.style.animation = 'none';
                    tracker.style.opacity = '0';
                    mon.appendChild(tracker);
                }
                tracker.style.left = m.x + '%';
                tracker.style.top = m.y + '%';
                tracker.style.opacity = 0.7 + Math.sin(Date.now() / 400) * 0.3;
            });
        });
    }

    setTimeout(() => requestAnimationFrame(globalRadarLoop), 100);
}

// Inicializa o loop de radar
globalRadarLoop();


function toggleCctvMode() {
    cctvEnabled = !cctvEnabled;
    const noise = document.querySelector('.noise-overlay');
    const scanlines = document.querySelector('.cctv-scanlines');
    const camera = document.querySelector('.camera-overlay');

    if (noise) noise.style.display = cctvEnabled ? 'block' : 'none';
    if (scanlines) scanlines.style.display = cctvEnabled ? 'block' : 'none';
    if (camera) camera.style.display = cctvEnabled ? 'flex' : 'none';
    // cctvRadarLayer não é mais usado no F2 - apenas estética de câmera
}


// ========================================================================
// TERMINAL LOGIC - PROTOCOLO JERUSALÉM
// ========================================================================

function openTerminalMinigame() {
    currentTerminalContext = 'GENERAL';
    terminalActive = true;
    const modal = document.getElementById('terminalMinigame');
    modal.style.display = 'flex';

    // Mostrar opção de ligar luzes no terminal geral
    document.getElementById('terminalBtnLights').style.display = 'block';

    switchTerminalScreen('MENU');
}

function openTerminalSetor3() {
    currentTerminalContext = 'MEDICAL';
    terminalActive = true;
    const modal = document.getElementById('terminalMinigame');
    modal.style.display = 'flex';

    // Esconder opção de ligar luzes no terminal do setor 3
    document.getElementById('terminalBtnLights').style.display = 'none';

    switchTerminalScreen('MENU');
}

function openTerminalSetor4() {
    currentTerminalContext = 'LAB';
    terminalActive = true;
    const modal = document.getElementById('terminalMinigame');
    modal.style.display = 'flex';

    // Terminal do laboratório não controla luzes
    document.getElementById('terminalBtnLights').style.display = 'none';

    switchTerminalScreen('MENU');
}

let timingInterval = null;
let timingDirection = 1;
let needlePos = 0;
let timingScore = 0;
let timingLevel = 1; // 1, 2, 3
let timingTargetScore = 6; // 1 + 2 + 3
let currentLevelHits = 0;

function openTimingMinigame() {
    terminalActive = true;
    const modal = document.getElementById('terminalMinigame');
    modal.style.display = 'flex';
    switchTerminalScreen('TIMING');
}

/**
 * Troca entre as visualizações do terminal
 * @param {string} screenKey - MENU, LOGIN, CHALLENGE, CAMERAS, TIMING, FILES, FILEVIEW
 */
function switchTerminalScreen(screenKey) {
    if (timingInterval) {
        clearInterval(timingInterval);
        timingInterval = null;
    }

    document.querySelectorAll('.terminal-view').forEach(view => {
        view.classList.remove('active');
    });

    const targetId = `terminalScreen${screenKey.charAt(0) + screenKey.slice(1).toLowerCase()}`;
    const targetView = document.getElementById(targetId);

    if (targetView) {
        targetView.classList.add('active');

        if (screenKey === 'CHALLENGE') {
            startLightsChallenge();
        } else if (screenKey === 'LOGIN') {
            const isBlocked = currentTerminalContext === 'GENERAL' ? isTerminalBlockedKain
                : currentTerminalContext === 'LAB' ? isTerminalBlockedJudas
                    : isTerminalBlockedAdam;
            const isAuth = currentTerminalContext === 'GENERAL' ? isTerminalAuthorizedKain
                : currentTerminalContext === 'LAB' ? isTerminalAuthorizedJudas
                    : isTerminalAuthorizedAdam;

            if (isBlocked) {
                document.getElementById('loginStatus').textContent = 'SISTEMA BLOQUEADO - ACESSO NEGADO';
                document.getElementById('loginStatus').className = 'terminal-status error';
                document.getElementById('terminalLoginInput').style.display = 'none';
                return;
            }
            if (isAuth) {
                // GENERAL vai para a tela de câmeras, os demais para o MENU
                switchTerminalScreen(currentTerminalContext === 'GENERAL' ? 'CAMERAS' : 'MENU');
                return;
            }
            const input = document.getElementById('terminalLoginInput');
            input.style.display = 'block';
            input.value = '';
            input.focus();
            document.getElementById('loginStatus').textContent = `AUTENTICAÇÃO: ${currentTerminalContext}`;
            document.getElementById('loginStatus').className = 'terminal-status';
            
            // Exibir dica de senha abaixo do campo de login
            const hints = {
                'GENERAL': 'o primeiro a m######',
                'MEDICAL': '#s #lh#s d# cr#ad#r',
                'LAB': 'traidor=30'
            };
            let hintEl = document.getElementById('loginHint');
            if (!hintEl) {
                hintEl = document.createElement('div');
                hintEl.id = 'loginHint';
                hintEl.style.cssText = 'margin-top:15px; font-family:monospace; font-size:1.4em; color:rgba(34,197,94,0.9); font-weight:bold; letter-spacing:3px; text-align:center; text-shadow: 0 0 10px rgba(34,197,94,0.4);';
                input.parentNode.insertBefore(hintEl, input.nextSibling);
            }
            hintEl.textContent = hints[currentTerminalContext] || '';
        } else if (screenKey === 'CAMERAS') {
            renderTerminalCameras();
        } else if (screenKey === 'TIMING') {
            timingScore = 0;
            timingLevel = 1;
            currentLevelHits = 0;
            startTimingChallenge();
        } else if (screenKey === 'FILES') {
            renderTerminalFiles();
        } else if (screenKey === 'MENU') {
            // Mostrar botão de arquivos se autorizado e NÃO for o terminal Geral
            // (Para evitar mostrar documentos de lore indesejados no primeiro terminal)
            const isAuth = currentTerminalContext === 'GENERAL' ? isTerminalAuthorizedKain
                : currentTerminalContext === 'LAB' ? isTerminalAuthorizedJudas
                    : isTerminalAuthorizedAdam;
            
            if (currentTerminalContext === 'GENERAL') {
                document.getElementById('terminalBtnFiles').style.display = 'none';
            } else {
                document.getElementById('terminalBtnFiles').style.display = isAuth ? 'block' : 'none';
                document.getElementById('terminalBtnFiles').textContent = '> ARQUIVOS';
                document.getElementById('terminalBtnFiles').onclick = () => switchTerminalScreen('FILES');
            }
        }
    }
}

// --- LOGIN SYSTEM ---
function handleTerminalLogin() {
    const input = document.getElementById('terminalLoginInput');
    const status = document.getElementById('loginStatus');
    const val = input.value.trim().toLowerCase();

    const expected = currentTerminalContext === 'GENERAL' ? 'kain'
        : currentTerminalContext === 'LAB' ? 'judas'
            : 'adam';

    if (val === expected) {
        if (currentTerminalContext === 'GENERAL') {
            isTerminalAuthorizedKain = true;
            localStorage.setItem('terminalAuthorizedMalak_kain', 'true');
        } else if (currentTerminalContext === 'LAB') {
            isTerminalAuthorizedJudas = true;
            localStorage.setItem('terminalAuthorizedMalak_judas', 'true');
        } else {
            isTerminalAuthorizedAdam = true;
            localStorage.setItem('terminalAuthorizedMalak_adam', 'true');
        }

        status.textContent = `ACESSO CONCEDIDO. BEM-VINDO, ${expected.toUpperCase()}.`;
        status.className = 'terminal-status success';
        setTimeout(() => {
            switchTerminalScreen(currentTerminalContext === 'GENERAL' ? 'CAMERAS' : 'MENU');
        }, 1000);
    } else {
        if (currentTerminalContext === 'GENERAL') {
            isTerminalBlockedKain = true;
            localStorage.setItem('terminalBlockedMalak_kain', 'true');
        } else if (currentTerminalContext === 'LAB') {
            isTerminalBlockedJudas = true;
            localStorage.setItem('terminalBlockedMalak_judas', 'true');
        } else {
            isTerminalBlockedAdam = true;
            localStorage.setItem('terminalBlockedMalak_adam', 'true');
        }
        status.textContent = 'LOGIN INVÁLIDO. ACESSO BLOQUEADO PERMANENTEMENTE.';
        status.className = 'terminal-status error';
        input.style.display = 'none';
    }
}

// Adicionar suporte a Enter no login
document.addEventListener('keydown', (e) => {
    if (terminalActive && document.getElementById('terminalScreenLogin').classList.contains('active')) {
        if (e.key === 'Enter') {
            handleTerminalLogin();
        }
    }
});

// --- CAMERA STATUS DASHBOARD ---
// --- ENERGY STATUS (Terminal GENERAL) ---

function renderTerminalCameras() {
    const grid = document.getElementById('cameraStatusGrid');
    grid.innerHTML = '';

    Object.keys(mapHierarchy).forEach(key => {
        const sector = mapHierarchy[key];
        const item = document.createElement('div');
        item.className = 'camera-item';

        // Simulando status: Geral sempre online, outros podem variar ou ser offline se luz apagar? 
        // Vamos manter simples: Setor 1-6 online, mas sinal varia.
        const isOnline = true;
        const signal = Math.floor(Math.random() * 30) + 70; // 70-99%

        item.innerHTML = `
            <div class="cam-info">
                <span class="cam-icon">${sector.icon}</span>
                <span class="cam-name">${sector.name}</span>
            </div>
            <div class="cam-meta">
                <span class="cam-signal">${signal}% SIG</span>
                <span class="status-tag online">LIVE</span>
            </div>
        `;
        grid.appendChild(item);
    });
}

// --- LIGHTS CHALLENGE (REFACTORED) ---
function startLightsChallenge() {
    userSequence = [];
    // Gerar sequência de 5 números aleatórios
    terminalSequence = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));

    const sequenceDisplay = document.getElementById('terminalSequence');
    const status = document.getElementById('terminalStatus');
    const output = document.getElementById('terminalOutput');

    // Mostrar a sequência inicialmente para o jogador memorizar
    sequenceDisplay.textContent = terminalSequence.join(' ');
    output.textContent = 'PROTOCOLO DE REINICIALIZAÇÃO';
    status.textContent = 'MEMORIZE EM 5 SEGUNDOS...';
    status.className = 'terminal-status success';

    // Desabilitar o teclado durante a memorização
    const keypad = document.getElementById('terminalKeypad');
    keypad.style.pointerEvents = 'none';
    keypad.style.opacity = '0.5';

    setTimeout(() => {
        // Verificar se ainda estamos na tela de desafio
        const challengeScreen = document.getElementById('terminalScreenChallenge');
        if (!terminalActive || !challengeScreen.classList.contains('active')) return;

        sequenceDisplay.textContent = '_ _ _ _ _';
        output.textContent = 'AGUARDANDO SEQUÊNCIA';
        status.textContent = 'INSIRA O CÓDIGO AGORA';
        status.className = 'terminal-status';

        keypad.style.pointerEvents = 'auto';
        keypad.style.opacity = '1';
    }, 5000);

    renderTerminalKeypad();
}

function renderTerminalKeypad() {
    const keypad = document.getElementById('terminalKeypad');
    keypad.innerHTML = '';

    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    nums.forEach(n => {
        const btn = document.createElement('button');
        btn.className = 'key-btn';
        btn.textContent = n;
        btn.onclick = (e) => {
            e.stopPropagation();
            handleKeypadInput(n, btn);
        };
        keypad.appendChild(btn);
    });
}

function handleKeypadInput(num, btn) {
    if (!terminalActive) return;

    const nextExpected = terminalSequence[userSequence.length];

    if (!btn) {
        const buttons = document.querySelectorAll('.key-btn');
        btn = Array.from(buttons).find(b => parseInt(b.textContent) === num);
    }

    if (num === nextExpected) {
        userSequence.push(num);
        btn.classList.add('correct');

        const display = terminalSequence.map((n, i) => i < userSequence.length ? n : '_').join(' ');
        document.getElementById('terminalSequence').textContent = display;

        if (userSequence.length === terminalSequence.length) {
            handleTerminalSuccess();
        }
    } else {
        handleTerminalError(btn);
    }
}

function handleTerminalSuccess() {
    const output = document.getElementById('terminalOutput');
    const status = document.getElementById('terminalStatus');

    output.textContent = 'SEQUÊNCIA CORRETA';
    status.textContent = 'RESTAURANDO ENERGIA...';
    status.className = 'terminal-status success';

    setTimeout(() => {
        if (!isLightsOn) {
            toggleLights();
        }
        switchTerminalScreen('MENU');
    }, 1500);
}

// --- TIMING GAME LOGIC ---
// --- TIMING GAME LOGIC ---
function startTimingChallenge() {
    const container = document.getElementById('timingMeterContainer');
    const needle = document.getElementById('timingNeedle');
    const status = document.getElementById('timingStatus');
    status.textContent = `NIVEL ${timingLevel}/3 | ALVOS: ${currentLevelHits}/${timingLevel}`;
    status.className = 'terminal-status';

    // Limpar zonas antigas se for novo nível ou início
    if (currentLevelHits === 0) {
        container.querySelectorAll('.timing-target-zone').forEach(z => z.remove());

        // Gerar barras conforme o nível atual sem sobreposição
        const usedPositions = [];
        const zoneWidth = 50;
        const minGap = 10; // Espaço mínimo entre barras

        for (let i = 0; i < timingLevel; i++) {
            let randomLeft;
            let overlapping = true;
            let attempts = 0;

            while (overlapping && attempts < 50) {
                randomLeft = Math.floor(Math.random() * (300 - zoneWidth));
                overlapping = usedPositions.some(pos =>
                    Math.abs(pos - randomLeft) < (zoneWidth + minGap)
                );
                attempts++;
            }

            usedPositions.push(randomLeft);
            const zone = document.createElement('div');
            zone.className = 'timing-target-zone';
            zone.style.left = randomLeft + 'px';
            zone.dataset.hit = "false";
            container.appendChild(zone);
        }
    }

    needlePos = 0;
    timingDirection = 1;
    const baseSpeed = 4;
    const speed = baseSpeed + (timingLevel * 1.5);

    if (timingInterval) clearInterval(timingInterval);

    timingInterval = setInterval(() => {
        needlePos += (speed * timingDirection);
        if (needlePos >= 292) { needlePos = 292; timingDirection = -1; }
        else if (needlePos <= 0) { needlePos = 0; timingDirection = 1; }
        needle.style.left = needlePos + 'px';
    }, 20);
}

function checkTiming() {
    if (!timingInterval) return;

    const needleMid = needlePos + 4;
    const zones = Array.from(document.querySelectorAll('.timing-target-zone')).filter(z => z.dataset.hit === "false");

    let hitZone = null;
    zones.forEach(zone => {
        const zLeft = parseInt(zone.style.left);
        if (needleMid >= zLeft && needleMid <= (zLeft + 50)) {
            hitZone = zone;
        }
    });

    if (hitZone) {
        // Marcar zona como atingida
        hitZone.dataset.hit = "true";
        hitZone.style.opacity = "0.2";
        hitZone.style.boxShadow = "none";
        hitZone.style.background = "#fff";

        currentLevelHits++;
        timingScore++;

        const status = document.getElementById('timingStatus');

        if (currentLevelHits >= timingLevel) {
            // Nível Concluído
            if (timingLevel >= 3) { // Vitória Final
                clearInterval(timingInterval);
                timingInterval = null;
                status.textContent = 'MANUTENÇÃO CONCLUÍDA. ENERGIA RESTAURADA.';
                status.className = 'terminal-status success';

                isLightsOn = true;
                isSector3EnergyRestored = true;
                localStorage.setItem('sector3EnergyRestored', 'true');

                setTimeout(() => {
                    loadLocation(getCurrentLocation());
                    closeTerminalMinigame();
                }, 1500);
            } else {
                // Ir para próximo nível
                timingLevel++;
                currentLevelHits = 0;
                status.textContent = 'FREQUÊNCIA ALINHADA! PRÓXIMO NÍVEL...';
                status.className = 'terminal-status success';
                setTimeout(() => {
                    startTimingChallenge();
                }, 800);
            }
        } else {
            // Acertou um, mas faltam outros no mesmo nível
            status.textContent = `VIBRAÇÃO DETECTADA! (${currentLevelHits}/${timingLevel})`;
        }
    } else {
        // ERRO: Reiniciar do Nível 1
        clearInterval(timingInterval);
        timingInterval = null;
        timingScore = 0;
        timingLevel = 1;
        currentLevelHits = 0;

        const status = document.getElementById('timingStatus');
        status.textContent = 'SINCRONISMO PERDIDO! REINICIANDO SISTEMAS...';
        status.className = 'terminal-status error';

        setTimeout(() => {
            startTimingChallenge();
        }, 1500);
    }
}

// --- LORE SYSTEM ---
const terminalLore = [
    {
        id: 'file1',
        title: 'DOC_458-1: ADÃO_INIT',
        content: `CODINOME: ADÃO
EXPERIMENTO Nº: 04
PESQUISADORA CHEFE: Dra. Eva

DESCRIÇÃO:
Sujeito encontrado em estado catatônico na região periférica da floresta. Sem sinais de identificação civil. Resgate realizado pela Dra. Eva em regime de urgência. Início dos protocolos de quarentena imediata.`
    },
    {
        id: 'file2',
        title: 'DOC_458-2: PATOLOGIA_PEND',
        content: `RELATÓRIO MÉDICO - INFECÇÃO VIRAis
AGENTE: Vírus Penicillium (V-P)
ESTADO: Crítico / Instável

OBSERVAÇÕES:
O paciente apresentou exposição direta ao agente. Surpreendentemente, os tecidos biológicos demonstram uma regeneração celular 400% acima da média humana. Os sinais vitais estão se estabilizando, sugerindo uma adaptação biológica sem precedentes.`
    },
    {
        id: 'file3',
        title: 'DOC_458-3: PSIC_RECAL',
        content: `AVALIAÇÃO PSICOLÓGICA PÓS-ADAPTAÇÃO

DIAGNÓSTICO: Amnésia Anterógrada e Retrógrada Severa.
O sujeito não possui memória de sua vida anterior à floresta. Observa-se um fenômeno de reinicialização constante. O paciente acredita que cada encontro com a Dra. Eva é o primeiro contato. Onde ele está? O que ele é? Ele ainda não faz ideia.`
    },
    {
        id: 'file4',
        title: 'DOC_501-A: PROJETO_MALAK',
        content: `CLASSIFICADO: PROTOCOLO MALAK
ASSUNTO: O ENXERTADO (Espécime 05)

RELATÓRIO DE FALHA CRÍTICA:
O Espécime 05 resultou em uma mutação aberrante. A fusão entre o DNA humano do paciente, o material genético cervídeo e o Vírus Penicillium não estabilizou. O resultado é uma quimera de hostilidade extrema.

STATUS: FUGITIVO.
O Enxertado rompeu a contenção durante o último blackout. Evidências indicam que ele se desloca pelos dutos de ventilação do Setor 3 e níveis inferiores. Se ouvir sons de cascos no metal... não olhe para cima.`
    }
];

// === ARQUIVOS DO LABORATÓRIO (Contexto: JUDAS / LAB) ===
const labLore = [
    {
        id: 'lab_file1',
        title: 'AUDIO_LOG-01: Última Mensagem',
        content: `[TRANSCRIÇÃO AUTOMÁTICA - ARQUIVO DE VOZ]
[DATA: CORROMPIDA] [ORIGEM: LABORATÓRIO DE PESQUISA]

"...Nesses arquivos deve conter informações sobre o Paciente Zero.
Conhecido como Yehudah.

O Paciente Zero. Aquele que estávamos buscando uma cura...
mas no final, acabou com tudo.
O maior culpado nisso tudo.

Ele simplesmente ficou muito... maluco.
Eu nem sei mais onde ele está.

A gente está todo mundo se escondendo aqui.

Essa é a última mensagem que eu vou mandar pra vocês.

A Doutora Eva -- ela fugiu com o Adão.
Não sabíamos para onde foram.
Eu sei que ela tem uma filha...
mas eu acho que ela não está perto.

Bom...
É minha última mensagem.

Ele... ele acabou de quebrar a câmera dele.

Que Deus tenha piedáde de nós."

[FIM DA TRANSMISSÃO]
[NENHUM SINAL DETECTADO APÓS ESTE PONTO]`
    },
    {
        id: 'lab_file2',
        title: 'AUDIO_LOG-02: Registro de Pesquisa',
        content: `[TRANSCRIÇÃO AUTOMÁTICA - ARQUIVO DE VOZ]
[DATA: CORROMPIDA] [ORIGEM: LABORATÓRIO DE PESQUISA]

"...Mais uma vez tentamos fazer a cura com o Experimento Zero.
Ele não conseguiu reagir a nenhum tipo de tratamento que fizemos.

Bom... a gente usou quase tudo que tínhamos.
E estamos com problemas sérios se uma leva de suprimentos não chegar.

O pessoal da enfermaria deve ter alguma coisa ainda.
Mas a gente não gosta de subir lá em cima.

Bom, mas para baixo também...
eu não gosto de falar com aqueles caras de lá.
Ele sempre parece estar aguardando alguma coisa muito importante.
Como se a gente não fosse os cientistas desse lugar, né?

Bom... enfim.

Vou terminar de fazer os experimentos aqui.
Isto é tudo... logo logo eu vou poder ver minha filha.

Eu acho...

Estou cansada de tudo isso."

[FIM DA TRANSMISSÃO]`
    },
    {
        id: 'lab_file3',
        title: 'PACIENTES: 1-3',
        content: `[DIÁRIO DE PESQUISA - LABORATÓRIO B-4]
[AUTOR: NÃO IDENTIFICADO]
[STATUS DO ARQUIVO: PARCIALMENTE CORROMPIDO]

━━━━━━━━━━━━━━━━━━━━━━━━
DIA 01
━━━━━━━━━━━━━━━━━━━━━━━━
Hoje começamos com cruzamento de DNA.
Simplesmente pegaram um de elefante.
Quem seria estúpido o suficiente para
conseguir fazer isso com um humano?

...

Eu.

━━━━━━━━━━━━━━━━━━━━━━━━
DIA 02
━━━━━━━━━━━━━━━━━━━━━━━━
Não é que o cruzamento deu certo.
Aparentemente o paciente voltou a escutar.

Bom que no pensamento eu que projetei isso...
Mas enfim.
Realmente seria no paciente 3.
Vamos ver o que acontece.

━━━━━━━━━━━━━━━━━━━━━━━━
DIA 03
━━━━━━━━━━━━━━━━━━━━━━━━
Hoje chegaram mais enzimas daquele fungo que eu encontrei.

Bom... eu acho que não tem problema misturar.
Afinal nem sabemos se o paciente vai sobreviver
igual o 01.

Mas bom, eu vou tentar.
Eu estou aqui mesmo.
Quem pode me impedir?

━━━━━━━━━━━━━━━━━━━━━━━━
DIA 04
━━━━━━━━━━━━━━━━━━━━━━━━
Me desculpe.
Por favor, me desculpe, Doutora.

Eu... eu não sabia o que estava fazendo.

Ele... ele quebrou o tanque.
Eu estou escondido aqui mas eu o vejo.
Ele... pulsa. Brilha.

Eu misturei coisa que não devia.

Eu acho que ele está me escutando.

Não... não... desculpa...
não... não... não...

[ARQUIVO ENCERRADO ABRUPTAMENTE]
[DADOS SUBSEQUENTES: IRRECUPERÁVEIS]`
    }
];

function renderTerminalFiles() {
    const list = document.getElementById('fileList');
    list.innerHTML = '';

    const files = currentTerminalContext === 'LAB' ? labLore : terminalLore;

    files.forEach(file => {
        const btn = document.createElement('button');
        btn.className = 'terminal-btn file-btn';
        btn.innerHTML = `<span class="btn-prompt">></span> ${file.title}`;
        btn.onclick = () => openFileView(file);
        list.appendChild(btn);
    });
}

function openFileView(file) {
    document.getElementById('fileTitle').textContent = file.title;
    document.getElementById('fileContent').textContent = file.content;
    switchTerminalScreen('FILEVIEW');
}

// Suporte a Espaço para o minijogo
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && terminalActive && document.getElementById('terminalScreenTiming').classList.contains('active')) {
        e.preventDefault();
        checkTiming();
    }
});


function handleTerminalError(btn) {
    userSequence = [];
    const status = document.getElementById('terminalStatus');

    status.textContent = 'ERRO NA SEQUÊNCIA';
    status.className = 'terminal-status error';

    if (btn) btn.classList.add('wrong');

    setTimeout(() => {
        if (btn) btn.classList.remove('wrong');
        document.querySelectorAll('.key-btn').forEach(b => b.classList.remove('correct'));
        document.getElementById('terminalSequence').textContent = '_ _ _ _ _';
        status.textContent = 'TENTE NOVAMENTE';
        status.className = 'terminal-status';
    }, 600);
}

function closeTerminalMinigame() {
    terminalActive = false;
    document.getElementById('terminalMinigame').style.display = 'none';
}

// ========================================================================
// CONTEXT MENU LOGIC
// ========================================================================

function openContextMenu(e) {
    const menu = document.getElementById('mapOverlayMenu');

    // Posicionamento inicial
    let x = e.clientX;
    let y = e.clientY;

    // Ajuste para não sair da tela (boundary check)
    const menuWidth = 250; // Definido no CSS
    const menuHeight = 300; // Estimativa segura baseada nos botões

    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('active');
}

function closeContextMenu() {
    const menu = document.getElementById('mapOverlayMenu');
    if (menu) menu.classList.remove('active');
}
