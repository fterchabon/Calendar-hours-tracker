// ===============================================
// CALENDAR HOURS TRACKER - SCRIPT PRINCIPAL (GIS VERSION)
// ===============================================

let isAuthenticated = false;
let currentUser = null;
let allEvents = [];
let processedEvents = [];
let charts = {};
let tokenClient = null;

// ===============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ===============================================

function initializeApp() {
    console.log('🚀 Inicializando Calendar Hours Tracker...');
    setDefaultDates();

    const hasRealClientId = CONFIG.GOOGLE.CLIENT_ID &&
        CONFIG.GOOGLE.CLIENT_ID.includes('.apps.googleusercontent.com');

    if (hasRealClientId) {
        console.log('🔐 Inicializando con Google Identity Services...');
        initializeGoogleAuth();
    } else {
        console.log('🎮 Modo demo activado - Cliente ID no configurado');
        showDemoMode();
    }
}

// ===============================================
// AUTENTICACIÓN CON GOOGLE IDENTITY SERVICES (GIS)
// ===============================================

function initializeGoogleAuth() {
    console.log('🔐 Configurando cliente GIS...');

    gapi.load('client', async () => {
        await gapi.client.init({
            apiKey: CONFIG.GOOGLE.API_KEY,
            discoveryDocs: CONFIG.GOOGLE.DISCOVERY_DOCS
        });

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE.CLIENT_ID,
            scope: CONFIG.GOOGLE.SCOPES.join(' '),
            callback: async (response) => {
                if (response.error) {
                    console.error('❌ Error en autenticación:', response);
                    showError('Error al iniciar sesión');
                    return;
                }
                console.log('✅ Token recibido:', response.access_token);

                // 👉 Muy importante: setear token aquí
                gapi.client.setToken({ access_token: response.access_token });

                isAuthenticated = true;
                await loadCalendarEvents();
                showUserInfo();
            }
        });

        updateAuthSection();
    });
}


function updateAuthSection() {
    const authSection = document.getElementById('auth-section');
    authSection.innerHTML = `
        <div class="auth-card">
            <h2>🔐 Conectar con Google Calendar</h2>
            <p>Accede a tus eventos para análisis</p>
            <button onclick="signInWithGoogle()" class="google-btn">
                <span>🔑</span> Conectar con Google Calendar
            </button>
        </div>
    `;
}

function signInWithGoogle() {
    if (tokenClient) {
        console.log('🔐 Solicitando token de acceso...');
        tokenClient.requestAccessToken();
    }
}

function showUserInfo() {
    const userInfo = document.getElementById('user-info');
    userInfo.innerHTML = `
        <img src="https://via.placeholder.com/40x40/4285f4/ffffff?text=U" alt="Usuario" class="user-photo">
        <span>Usuario Conectado</span>
        <button onclick="signOut()" class="sign-out-btn">Cerrar Sesión</button>
    `;
    userInfo.style.display = 'flex';
}

function signOut() {
    console.log('👋 Cerrando sesión...');
    google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {
        isAuthenticated = false;
        currentUser = null;
        allEvents = [];
        processedEvents = [];

        document.getElementById('user-info').style.display = 'none';
        document.getElementById('dashboard').style.display = 'none';
        updateAuthSection();
    });
}

// ===============================================
// CARGA DE EVENTOS DE CALENDAR
// ===============================================

async function loadCalendarEvents() {
    try {
        showLoading('Cargando eventos...');

        const dateStart = document.getElementById('date-start').value;
        const dateEnd = document.getElementById('date-end').value;

        const request = {
            calendarId: 'primary',
            timeMin: new Date(dateStart).toISOString(),
            timeMax: new Date(dateEnd + 'T23:59:59').toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: CONFIG.APP.MAX_EVENTS_PER_REQUEST
        };

        const response = await gapi.client.calendar.events.list(request);
        allEvents = response.result.items || [];

        console.log(`📅 Cargados ${allEvents.length} eventos`);

        processEvents();
        showDashboard();
        hideLoading();

    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        showError('Error al cargar eventos');
        hideLoading();
    }
}
// ===============================================
// PROCESAMIENTO DE EVENTOS
// ===============================================

function processEvents() {
    console.log('⚙️ Procesando eventos...');
    
    processedEvents = allEvents.map(event => {
        const processed = extractEventData(event);
        return processed;
    }).filter(event => event !== null);
    
    console.log(`✅ Procesados ${processedEvents.length} eventos válidos`);
    
    updateStatistics();
    updateCharts();
    updateEventsList();
    updateTagFilter();
}

function extractEventData(event) {
    try {
        const title = event.summary || 'Sin título';
        const description = event.description || '';

        // 1. Buscar tags en título o descripción
        let tags = extractTags(title, description);

        // 2. Si no hay tags manuales, usar el colorId como automático
        if (tags.length === 0 && event.colorId && CONFIG.COLOR_TAG_MAP[event.colorId]) {
            tags.push(CONFIG.COLOR_TAG_MAP[event.colorId]);
        }

        // 3. Si sigue vacío, usar el tag por defecto
        const primaryTag = tags.length > 0 ? tags[0] : CONFIG.APP.TAG_CONFIG.DEFAULT_TAG;

        // Calcular duración
        let hours = 0;
        if (event.start.dateTime && event.end.dateTime) {
            const start = new Date(event.start.dateTime);
            const end = new Date(event.end.dateTime);
            hours = (end - start) / (1000 * 60 * 60);
        } else if (event.start.date && event.end.date) {
            const start = new Date(event.start.date);
            const end = new Date(event.end.date);
            const days = (end - start) / (1000 * 60 * 60 * 24);
            hours = days * CONFIG.APP.HOURS_CONFIG.DEFAULT_FULL_DAY_HOURS;
        }

        // Buscar duración en texto si está presente
        const textDuration = extractDurationFromText(title + ' ' + description);
        if (textDuration > 0) {
            hours = textDuration;
        }

        if (hours < (CONFIG.APP.HOURS_CONFIG.MIN_DURATION_MINUTES / 60)) {
            return null; // descartar eventos muy cortos
        }

        const startDate = event.start.dateTime ?
            new Date(event.start.dateTime) :
            new Date(event.start.date);

        return {
            id: event.id,
            title: title.replace(/\[([^\]]+)\]/g, '').trim(),
            originalTitle: title,
            description: description,
            tags: tags,
            primaryTag: primaryTag,
            hours: Math.round(hours * 100) / 100,
            date: startDate.toISOString().split('T')[0],
            startTime: startDate,
            color: CONFIG.getTagColor(primaryTag)
        };

    } catch (error) {
        console.warn('⚠️ Error procesando evento:', event, error);
        return null;
    }
}


function extractTags(title, description) {
    const tags = new Set();
    const text = title + ' ' + description;
    
    CONFIG.APP.TAG_CONFIG.PATTERNS.forEach(pattern => {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
            const tagText = match[1];
            if (tagText) {
                tagText.split(',').forEach(tag => {
                    tags.add(tag.trim().toLowerCase());
                });
            }
        });
    });
    
    return Array.from(tags);
}

function extractDurationFromText(text) {
    for (const pattern of CONFIG.APP.HOURS_CONFIG.DURATION_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            if (pattern.toString().includes(':')) {
                const hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                return hours + (minutes / 60);
            } else {
                return parseFloat(match[1]);
            }
        }
    }
    return 0;
}

// ===============================================
// ACTUALIZACIÓN DE INTERFAZ
// ===============================================

function updateStatistics() {
    const totalHours = processedEvents.reduce((sum, event) => sum + event.hours, 0);
    const totalEvents = processedEvents.length;
    const uniqueTags = new Set(processedEvents.map(event => event.primaryTag)).size;
    
    const dateRange = getDateRange();
    const daysDiff = Math.max(1, (dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
    const avgHoursPerDay = totalHours / daysDiff;
    
    document.getElementById('total-hours').textContent = Math.round(totalHours * 10) / 10;
    document.getElementById('total-events').textContent = totalEvents;
    document.getElementById('avg-hours').textContent = Math.round(avgHoursPerDay * 10) / 10;
    document.getElementById('total-tags').textContent = uniqueTags;
}

function updateCharts() {
    updateDailyChart();
    updateTagsChart();
}

function updateDailyChart() {
    const ctx = document.getElementById('daily-chart').getContext('2d');
    
    const dailyData = {};
    processedEvents.forEach(event => {
        const date = event.date;
        dailyData[date] = (dailyData[date] || 0) + event.hours;
    });
    
    const sortedDates = Object.keys(dailyData).sort();
    const hours = sortedDates.map(date => dailyData[date]);
    
    if (charts.daily) {
        charts.daily.destroy();
    }
    
    charts.daily = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.map(date => formatDateLabel(date)),
            datasets: [{
                label: 'Horas por día',
                data: hours,
                borderColor: '#4285f4',
                backgroundColor: '#4285f420',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function updateTagsChart() {
    const ctx = document.getElementById('tags-chart').getContext('2d');
    
    const tagData = {};
    processedEvents.forEach(event => {
        const tag = event.primaryTag;
        tagData[tag] = (tagData[tag] || 0) + event.hours;
    });
    
    const labels = Object.keys(tagData);
    const data = Object.values(tagData);
    const colors = labels.map((_, index) => CONFIG.getChartColor(index));
    
    if (charts.tags) {
        charts.tags.destroy();
    }
    
    charts.tags = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function updateEventsList() {
    const container = document.getElementById('events-list');
    const tagFilter = document.getElementById('tag-filter').value;
    
    let filteredEvents = processedEvents;
    if (tagFilter) {
        filteredEvents = processedEvents.filter(event => event.primaryTag === tagFilter);
    }
    
    filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredEvents.length === 0) {
        container.innerHTML = '<div class="text-center"><p>No hay eventos</p></div>';
        return;
    }
    
    container.innerHTML = filteredEvents.map(event => `
        <div class="event-item">
            <div class="event-info">
                <div class="event-title">${event.title}</div>
                <div class="event-details">
                    📅 ${formatDate(event.date)} • ${event.description || 'Sin descripción'}
                </div>
            </div>
            <div class="event-meta">
                <span class="event-tag" style="background-color: ${event.color}">
                    ${event.primaryTag}
                </span>
                <span class="event-hours">${event.hours}h</span>
            </div>
        </div>
    `).join('');
}

function updateTagFilter() {
    const select = document.getElementById('tag-filter');
    const tags = [...new Set(processedEvents.map(event => event.primaryTag))].sort();
    
    select.innerHTML = '<option value="">Todos los tags</option>';
    
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
        select.appendChild(option);
    });
}

// ===============================================
// FUNCIONES DE UTILIDAD
// ===============================================

function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - CONFIG.APP.DEFAULT_DAYS_RANGE);
    
    document.getElementById('date-start').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('date-end').value = today.toISOString().split('T')[0];
}

function getDateRange() {
    const start = new Date(document.getElementById('date-start').value);
    const end = new Date(document.getElementById('date-end').value);
    return { start, end };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateLabel(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
    });
}

function showLoading(message) {
    console.log('⏳', message);
}

function hideLoading() {
    console.log('✅ Carga completada');
}

function showError(message) {
    console.error('❌', message);
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

// ===============================================
// EVENT LISTENERS
// ===============================================

function updateData() {
    if (isAuthenticated) {
        loadCalendarEvents();
    } else {
        processEvents();
    }
}

function refreshData() {
    if (isAuthenticated) {
        loadCalendarEvents();
    } else {
        loadDemoData();
    }
}

function filterEvents() {
    updateEventsList();
}

function sortEvents() {
    const sortBy = document.getElementById('sort-events').value;
    
    switch (sortBy) {
        case 'date':
            processedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'hours':
            processedEvents.sort((a, b) => b.hours - a.hours);
            break;
        case 'title':
            processedEvents.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    updateEventsList();
}

// ===============================================
// INICIALIZACIÓN
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado completamente');
});

console.log('✅ Script principal cargado');