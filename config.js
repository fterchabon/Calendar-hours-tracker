// ===============================================
// CONFIGURACIÓN DE GOOGLE CALENDAR API
// ===============================================

// 🔑 PASO IMPORTANTE: Reemplaza 'TU_CLIENT_ID_AQUI' con tu Client ID real
const GOOGLE_CONFIG = {
    // Obtén este ID desde Google Cloud Console > Credenciales
    CLIENT_ID: '488453995791-2mm0t820unpr6gdscsr88on401qat6mj.apps.googleusercontent.com',
    
    // API Key (opcional, pero recomendado para mejor rendimiento)
    API_KEY: 'AIzaSyBnbdjuC_qDPIW5dsUSxHg8jJXyeKDWamY',
    
    // Scopes: permisos que necesitamos
    SCOPES: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ],
    
    // URLs de descubrimiento de la API
    DISCOVERY_DOCS: [
        'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
    ]
};

// ===============================================
// CONFIGURACIÓN DE LA APLICACIÓN
// ===============================================

const APP_CONFIG = {
    // Nombre de la aplicación
    APP_NAME: 'Calendar Hours Tracker',
    
    // Versión
    VERSION: '1.0.0',
    
    // Configuración de almacenamiento local
    STORAGE_PREFIX: 'calendarHours_',
    
    // Configuración de caché (en milisegundos)
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
    
    // Límites
    MAX_EVENTS_PER_REQUEST: 2500,
    DEFAULT_DAYS_RANGE: 30,
    
    // Colores para gráficos
    CHART_COLORS: [
        '#4285f4', // Azul Google
        '#34a853', // Verde Google
        '#ea4335', // Rojo Google
        '#fbbc04', // Amarillo Google
        '#9c27b0', // Púrpura
        '#ff9800', // Naranja
        '#795548', // Marrón
        '#607d8b'  // Azul grisáceo
    ],
    
    // Configuración de tags
    TAG_CONFIG: {
        // Patrones para detectar tags en eventos
        PATTERNS: [
            /\[([^\]]+)\]/g,           // [tag]
            /#(\w+)/g,                 // #hashtag
            /tags?:\s*([^,\n]+)/gi     // tags: trabajo, cliente
        ],
        
        // Tags por defecto si no se encuentra ninguno
        DEFAULT_TAG: 'sin-categoría',
        
        // Mapeo de colores por tag (opcional)
    COLORS: {
            'trabajo': '#F4511E',   // Tangerine (colorId 6 de Google Calendar)
            'personal': '#34a853',  // Verde
            'formacion': '#ea4335', // Rojo
            'reuniones': '#fbbc04', // Amarillo
            'proyecto': '#9c27b0',  // Púrpura
            'sin-categoría': '#607d8b' // Gris por defecto
        }

    },
    
    // Configuración de detección de horas
    HOURS_CONFIG: {
        // Patrones para detectar duración en texto
        DURATION_PATTERNS: [
            /(\d+(?:\.\d+)?)\s*h(?:oras?)?/i,
            /(\d+(?:\.\d+)?)\s*hrs?/i,
            /(\d+)\s*:\s*(\d+)/,  // HH:MM
            /duración:\s*(\d+(?:\.\d+)?)/i
        ],
        
        // Duración por defecto para eventos de día completo (en horas)
        DEFAULT_FULL_DAY_HOURS: 8,
        
        // Duración mínima a considerar (en minutos)
        MIN_DURATION_MINUTES: 15
    }
};

// ===============================================
// MAPEO AUTOMÁTICO DE COLORID → TAGS
// ===============================================

const COLOR_TAG_MAP = {
'6': 'trabajo', // Naranja → trabajo
'2': 'personal', // Verde → personal
'3': 'formacion', // Violeta → formación
'5': 'reuniones', // Amarillo → reuniones
'4': 'proyecto', // Rojo coral → proyecto
'6': 'trabajo' // Tangerine → trabajo (prioridad)
};

// ===============================================
// CONFIGURACIÓN DE INTERFAZ
// ===============================================

const UI_CONFIG = {
    // Mensajes de la aplicación
    MESSAGES: {
        LOADING: 'Cargando eventos...',
        NO_EVENTS: 'No se encontraron eventos en el rango seleccionado',
        AUTH_REQUIRED: 'Necesitas autenticarte para continuar',
        ERROR_LOADING: 'Error al cargar los eventos',
        SUCCESS_AUTH: 'Autenticación exitosa',
        PROCESSING: 'Procesando datos...'
    },
    
    // Configuración de animaciones
    ANIMATIONS: {
        FADE_DURATION: 300,
        SLIDE_DURATION: 400,
        CHART_ANIMATION_DURATION: 1000
    },
    
    // Configuración de paginación
    PAGINATION: {
        EVENTS_PER_PAGE: 20,
        MAX_VISIBLE_PAGES: 5
    }
};

// ===============================================
// FUNCIONES DE VALIDACIÓN
// ===============================================

function validateConfig() {
    const errors = [];
    
    // Verificar Client ID
    if (!GOOGLE_CONFIG.CLIENT_ID || GOOGLE_CONFIG.CLIENT_ID === '488453995791-2mm0t820unpr6gdscsr88on401qat6mj.apps.googleusercontent.com') {
        errors.push('❌ Debes configurar tu CLIENT_ID en config.js');
    }
    
    // Verificar formato del Client ID
    if (GOOGLE_CONFIG.CLIENT_ID && !GOOGLE_CONFIG.CLIENT_ID.includes('.apps.googleusercontent.com')) {
        errors.push('❌ El formato del CLIENT_ID no es válido');
    }
    
    return errors;
}

// ===============================================
// FUNCIONES AUXILIARES
// ===============================================

function getStorageKey(key) {
    return APP_CONFIG.STORAGE_PREFIX + key;
}

function getChartColor(index) {
    return APP_CONFIG.CHART_COLORS[index % APP_CONFIG.CHART_COLORS.length];
}

function getTagColor(tag) {
    return APP_CONFIG.TAG_CONFIG.COLORS[tag] || getChartColor(0);
}

// ===============================================
// EXPORTAR CONFIGURACIÓN (para uso en script.js)
// ===============================================

// Hacer la configuración disponible globalmente
window.CONFIG = {
    GOOGLE: GOOGLE_CONFIG,
    APP: APP_CONFIG,
    UI: UI_CONFIG,
    validateConfig,
    getStorageKey,
    getChartColor,
    getTagColor,
    COLOR_TAG_MAP
};

console.log('📋 Configuración cargada correctamente');
console.log('🔧 Versión de la app:', APP_CONFIG.VERSION);
