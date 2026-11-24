const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const githubUser = 'Vador634';
const projectsGrid = $('#projects-grid');
const filterButtons = $$('.filter-button');
let repositories = [];

const excludedNames = new Set(['vador634', 'readme', 'configuration', 'config', 'setup', 'settings']);
const excludedTerms = ['.github', 'configuration', 'config', 'setup', 'settings', 'initialisation', 'initialization'];

const preferredProjects = ['helpdesk_spring', 'gestion-de-collection_projet-1', 'cas_rosse', 'gps_web_projet3', 'patrimoine_projet_py', 'demineur_python'];

const projectPresentation = {
    'helpdesk_spring': {
        title: "Helpdesk — tickets d'incidents",
        description: "API REST Java Spring Boot et interface web : déclaration d'incidents, affectation automatique au technicien le moins chargé, rôles, tableau de bord, 16 tests et intégration continue.",
        category: 'Application Web'
    },
    'gestion-de-collection_projet-1': {
        title: 'Gestion de collection',
        description: 'Application web PHP 8 en MVC/DAO pour gérer des collections de jeux vidéo : comptes, catalogue, référentiels, protection CSRF et requêtes préparées.',
        category: 'Application Web'
    },
    'cas_rosse': {
        title: 'ROSSE — bornes de recharge',
        description: 'Application PHP MVC/DAO de maintenance de bornes : stations, techniciens, planning des visites et affectation automatique au technicien le moins chargé.',
        category: 'Application Web'
    },
    'gps_web_projet3': {
        title: 'GPS Web',
        description: 'Suivi de trajets GPS en JavaScript : carte Leaflet, mode simulation, véhicules, péages, statistiques et rapport PDF.',
        category: 'Application Web'
    },
    'patrimoine_projet_py': {
        title: 'PyAsset — patrimoine informatique',
        description: 'Inventaire du parc informatique en Python (Tkinter + SQLite) : recherche, filtre, tri, export CSV pour Excel et tests unitaires.',
        category: 'Python & données'
    },
    'demineur_python': {
        title: 'Démineur.py',
        description: 'Démineur codé en Python, jouable en console ou dans le navigateur grâce à Pyodide (WebAssembly). C\'est aussi l\'easter egg de ce site.',
        category: 'Python & données',
        demo: 'https://vador634.github.io/Demineur_Python/'
    },
    'portefolio': {
        title: 'Ce portfolio',
        description: "Le code source de ce site : HTML, CSS et JavaScript sans framework, thème Windows XP, Démineur en Python via Pyodide, déploiement continu sur Netlify.",
        category: 'Site Web'
    }
};

function cleanText(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
}

function isApplicationProject(repository) {
    const name = repository.name.toLowerCase();
    const description = (repository.description || '').toLowerCase();

    const hasCode = Boolean(repository.language) || repository.size > 0;
    const isExcluded = excludedNames.has(name) || excludedTerms.some((term) => name.includes(term) || description.includes(term));
    return !repository.fork && !isExcluded && hasCode;
}

function getPresentation(repository) {
    return projectPresentation[repository.name.toLowerCase()] || {
        title: repository.name.replaceAll('_', ' ').replaceAll('-', ' '),
        description: repository.description || 'Projet personnel de développement réalisé dans le cadre de mon parcours.',
        category: repository.categories.includes('data') ? 'Python & données' : (repository.language || 'Code')
    };
}

function classifyRepository(repository) {
    const name = repository.name.toLowerCase();
    const description = (repository.description || '').toLowerCase();
    const languages = repository.languages.map((language) => language.toLowerCase());
    const mentionsData = ['sql', 'sqlite', 'mysql', 'database', 'base de donnée', 'python']
        .some((term) => `${name} ${description} ${languages.join(' ')}`.includes(term));
    const isWeb = ['javascript', 'php', 'html', 'css', 'react'].some((language) => languages.includes(language));
    return { categories: ['applications', ...(mentionsData ? ['data'] : []), ...(isWeb ? ['web'] : [])] };
}

function demoUrl(repository, info) {
    const url = info.demo || repository.homepage || '';
    return /^https:\/\//.test(url) ? url : '';
}

function renderProjects(filter = 'all') {
    const visible = repositories.filter((repository) => filter === 'all'
        || repository.categories.includes(filter.toLowerCase())
        || repository.languages.some((language) => language.toLowerCase() === filter.toLowerCase()));

    $('#projects-count').textContent = `${visible.length} objet(s)`;
    if (!visible.length) {
        projectsGrid.innerHTML = '<p class="empty-state">Aucun projet ne correspond à ce filtre.</p>';
        return;
    }
    projectsGrid.innerHTML = visible.map((repository) => {
        const info = getPresentation(repository);
        return `
        <article class="project-card">
            <svg aria-hidden="true"><use href="#i-folder"/></svg>
            <div>
                <h3>${cleanText(info.title)}</h3>
                <span class="project-type">${cleanText(info.category)} · ★ ${repository.stargazers_count}</span>
                <p>${cleanText(info.description)}</p>
                <div class="chips">${repository.languages.slice(0, 4).map((language) => `<span>${cleanText(language)}</span>`).join('')}</div>
                <div class="project-links">
                    <a href="${cleanText(repository.html_url)}" target="_blank" rel="noopener">Consulter sur GitHub ↗</a>
                    ${demoUrl(repository, info) ? `<a class="xp-button primary small" href="${cleanText(demoUrl(repository, info))}" target="_blank" rel="noopener">Jouer en ligne ▶</a>` : ''}
                </div>
            </div>
        </article>`;
    }).join('');
}

async function getRepositoryLanguages(repository) {
    try {
        const response = await fetch(repository.languages_url);
        const languageData = await response.json();
        return Object.keys(languageData).length ? Object.keys(languageData) : [repository.language || 'Code'];
    } catch {
        return [repository.language || 'Code'];
    }
}

async function getAllRepositories() {
    const all = [];
    let page = 1;
    let responseData = [];
    do {
        const response = await fetch(`https://api.github.com/users/${githubUser}/repos?sort=updated&per_page=100&page=${page}`);
        if (!response.ok) throw new Error('GitHub indisponible');
        responseData = await response.json();
        all.push(...responseData);
        page += 1;
    } while (responseData.length === 100);
    return all;
}

async function loadProjects() {
    try {
        const candidates = (await getAllRepositories())
            .filter(isApplicationProject)
            .sort((first, second) => {

                const rang = (repo) => {
                    const index = preferredProjects.indexOf(repo.name.toLowerCase());
                    return index === -1 ? preferredProjects.length : index;
                };
                return rang(first) - rang(second)
                    || second.size - first.size
                    || new Date(second.updated_at) - new Date(first.updated_at);
            });
        repositories = await Promise.all(candidates.map(async (repository) => {
            const enriched = { ...repository, languages: await getRepositoryLanguages(repository) };
            return { ...enriched, ...classifyRepository(enriched) };
        }));
        renderProjects();
    } catch {
        $('#projects-count').textContent = 'Hors ligne';
        projectsGrid.innerHTML = `<p class="empty-state">Impossible de charger GitHub pour le moment. <a href="https://github.com/${githubUser}?tab=repositories" target="_blank" rel="noopener">Voir mes dépôts directement</a>.</p>`;
    }
}

filterButtons.forEach((button) => button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    renderProjects(button.dataset.filter);
}));

const menuButton = $('.menu-toggle');
const mainNav = $('#main-nav');

menuButton.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
});
$$('a', mainNav).forEach((link) => link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
}));

function tick() {
    const clock = $('#clock');
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = now.toISOString();
}
tick();
setInterval(tick, 15000);

const navLinks = $$('a', mainNav);
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main > section[id]').forEach((section) => observer.observe(section));

$$('.xp-controls .min').forEach((button) => button.addEventListener('click', () => {
    const win = button.closest('.xp-window');
    const collapsed = win.classList.toggle('collapsed');
    button.setAttribute('aria-label', collapsed ? 'Restaurer la fenêtre' : 'Réduire la fenêtre');
}));

const mines = $('#demineur');

function toast(title, text) {
    $('#toast-title').textContent = title;
    $('#toast-text').textContent = text;
    $('#toast').hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { $('#toast').hidden = true; }, 7000);
}
$('#toast').addEventListener('click', () => { $('#toast').hidden = true; });

function openMines() {
    if (!mines.hidden) return;
    mines.hidden = false;
    mines.classList.remove('dragged');
    mines.style.left = '';
    mines.style.top = '';
    mines.dispatchEvent(new CustomEvent('win:open'));
}
function closeMines() {
    mines.hidden = true;
    mines.dispatchEvent(new CustomEvent('win:close'));
}
$('#secret-mine').addEventListener('click', openMines);
$('#mines-close').addEventListener('click', closeMines);
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !mines.hidden) closeMines(); });

const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;
window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    konamiIndex = key === konami[konamiIndex] ? konamiIndex + 1 : (key === konami[0] ? 1 : 0);
    if (konamiIndex === konami.length) {
        konamiIndex = 0;
        openMines();
        toast('Code Konami activé 🎮', 'Démineur.py est lancé : il tourne en Python, directement dans ton navigateur.');
    }
});

(() => {
    const handle = $('#mines-drag');
    let startX, startY, originX, originY, dragging = false;
    handle.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.xp-controls') || window.innerWidth <= 760) return;
        const box = mines.getBoundingClientRect();
        mines.classList.add('dragged');
        mines.style.left = `${box.left}px`;
        mines.style.top = `${box.top}px`;
        dragging = true;
        startX = event.clientX; startY = event.clientY;
        originX = box.left; originY = box.top;
        handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const x = Math.min(Math.max(originX + event.clientX - startX, 60 - mines.offsetWidth), window.innerWidth - 60);
        const y = Math.min(Math.max(originY + event.clientY - startY, 0), window.innerHeight - 40);
        mines.style.left = `${x}px`;
        mines.style.top = `${y}px`;
    });
    const stop = () => { dragging = false; };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
})();

const sound = {
    context: null,
    play(notes, type = 'triangle', volume = 0.05) {
        try {
            this.context ||= new (window.AudioContext || window.webkitAudioContext)();
            const now = this.context.currentTime;
            notes.forEach(([frequency, start, length]) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                osc.type = type;
                osc.frequency.value = frequency;
                gain.gain.setValueAtTime(0, now + start);
                gain.gain.linearRampToValueAtTime(volume, now + start + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
                osc.connect(gain).connect(this.context.destination);
                osc.start(now + start);
                osc.stop(now + start + length + 0.05);
            });
        } catch {   }
    },
    boom() { this.play([[110, 0, 0.6], [80, 0.05, 0.8]], 'sawtooth', 0.04); },
    win() { this.play([[523, 0, 0.25], [659, 0.12, 0.25], [784, 0.24, 0.25], [1047, 0.36, 0.7]]); }
};

window.kxp = { sound, showBalloon: toast };

console.log('%cPsst… ↑ ↑ ↓ ↓ ← → ← → B A', 'color:#0053ee;font:bold 14px Tahoma');

loadProjects();
