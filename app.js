// ============================================
// Main Application - Event RSVP System
// ============================================

import {
    fetchEvents,
    fetchEventDetails,
    fetchEventStats,
    fetchAttendees,
    submitRsvp,
    createEventCard,
    displayEventDetails,
    displayAttendees,
    updateEventSelect
} from './events.js';

import {
    showMessage,
    isValidEmail,
    getElement,
    setActive
} from './utils.js';

// ============================================
// State & Selectors
// ============================================
const state = {
    events: [],
    currentEvent: null,
    attendees: [],
    currentFilter: 'all'
};

const selectors = {
    navBtns: '.nav-btn',
    views: '.view',
    filterBtns: '.filter-btn',
    eventCards: '.event-card.card-clickable',
    eventSelect: '#event-select',
    rsvpForm: '#rsvp-form',
    submitBtn: '#rsvp-form button[type="submit"]',
    eventDetails: '#event-details',
    attendeesList: '#attendees-list',
    messageContainer: '#message-container',
    eventsContainer: '#events-container'
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Event RSVP System');
    setupEventListeners();
    loadEvents();
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    // Navigation
    const navBtns = document.querySelectorAll(selectors.navBtns);
    console.log('Found nav buttons:', navBtns.length);
    navBtns.forEach(btn => {
        console.log('Adding listener to button:', btn.textContent, btn.dataset.view);
        btn.addEventListener('click', (e) => {
            console.log('NAV BUTTON CLICKED:', e.target.dataset.view);
            const view = e.target.dataset.view;
            showView(view);
            if (view === 'events') {
                console.log('Loading events...');
                loadEvents();
            }
            setActive(document.querySelectorAll(selectors.navBtns), e.target);
        });
    });
    console.log('Event listeners setup complete');

    // Event selection & form submission
    getElement(selectors.eventSelect).addEventListener('change', handleEventSelection);
    getElement(selectors.rsvpForm).addEventListener('submit', handleRsvpSubmit);

    // Filter buttons
    document.querySelectorAll(selectors.filterBtns).forEach(btn => {
        btn.addEventListener('click', (e) => {
            state.currentFilter = e.target.dataset.filter;
            setActive(document.querySelectorAll(selectors.filterBtns), e.target);
            updateAttendeesList();
        });
    });

    // Event card clicks
    document.addEventListener('click', (e) => {
        const card = e.target.closest(selectors.eventCards);
        if (card) selectEventAndNavigate(card.dataset.eventId);
    });
}

// ============================================
// View Management
// ============================================
function showView(viewName) {
    console.log('showView called with:', viewName);
    document.querySelectorAll(selectors.views).forEach(view => {
        view.classList.remove('active');
    });
    getElement(`${viewName}-view`).classList.add('active');
}

function selectEventAndNavigate(eventId) {
    showView('rsvp');
    getElement(selectors.eventSelect).value = eventId;
    handleEventSelection({ target: { value: eventId } });
    setActive(document.querySelectorAll(selectors.navBtns), 
              document.querySelector('[data-view="rsvp"]'));
}

// ============================================
// Events View
// ============================================
async function loadEvents() {
    console.log('loadEvents function called');
    const container = getElement(selectors.eventsContainer);
    container.innerHTML = '<div class="loading">Loading events...</div>';

    state.events = await fetchEvents();
    console.log('Fetched events:', state.events.length);
    
    if (!state.events.length) {
        container.innerHTML = '<div class="empty-state">No events found</div>';
        return;
    }

    container.innerHTML = '';
    for (const event of state.events) {
        const stats = await fetchEventStats(event.event_id);
        container.appendChild(createEventCard(event, stats));
    }
    
    updateEventSelect(state.events);
}

// ============================================
// RSVP Form Handlers
// ============================================
async function handleEventSelection(e) {
    const eventId = e.target.value;
    const detailsDiv = getElement(selectors.eventDetails);

    if (!eventId) {
        detailsDiv.classList.add('hidden');
        getElement(selectors.attendeesList).innerHTML = 
            '<p class="empty-state">Select an event to see attendees</p>';
        state.currentEvent = null;
        state.attendees = [];
        return;
    }

    state.currentEvent = state.events.find(e => e.event_id === eventId);
    
    const [eventDetails, stats] = await Promise.all([
        fetchEventDetails(eventId),
        fetchEventStats(eventId)
    ]);

    if (eventDetails) displayEventDetails(eventDetails, stats);
    await loadAttendees(eventId);
}

async function handleRsvpSubmit(e) {
    e.preventDefault();

    const eventId = getElement(selectors.eventSelect).value;
    const fullName = getElement('#full-name').value.trim();
    const email = getElement('#email').value.trim();
    const response = document.querySelector('input[name="response"]:checked')?.value;

    if (!eventId || !fullName || !email || !response) {
        showMessage('Please fill in all required fields', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'warning');
        return;
    }

    const button = getElement(selectors.submitBtn);
    button.disabled = true;

    try {
        await submitRsvp(eventId, fullName, email, response);
        showMessage('✓ RSVP submitted successfully!', 'success');
        getElement(selectors.rsvpForm).reset();
        await loadAttendees(eventId);
        await loadEvents();
        
        setTimeout(() => {
            getElement(selectors.eventDetails).classList.add('hidden');
            getElement(selectors.eventSelect).value = '';
        }, 2000);
    } catch (error) {
        console.log('RSVP Error caught:', error);
        console.log('Error message:', error.message);
        console.log('Error type:', typeof error.message);

        let message = 'Failed to submit RSVP';
        let type = 'error';

        const errorMsg = error.message || '';

        if (errorMsg.includes('already RSVP') || errorMsg.includes('DUPLICATE_RSVP')) {
            message = `❌ This email address has already been used to RSVP for this event. Each email can only RSVP once.`;
            type = 'warning';
        } else if (errorMsg.includes('Missing fields')) {
            message = 'Please fill in all required fields';
            type = 'warning';
        } else if (errorMsg) {
            message = errorMsg;
        }

        showMessage(message, type);
    } finally {
        button.disabled = false;
    }
}

// ============================================
// Attendees Management
// ============================================
async function loadAttendees(eventId) {
    getElement(selectors.attendeesList).innerHTML = 
        '<div class="loading" style="padding: 1rem;">Loading attendees...</div>';

    state.attendees = await fetchAttendees(eventId);
    state.currentFilter = 'all';
    setActive(document.querySelectorAll(selectors.filterBtns), 
              document.querySelector('.filter-btn[data-filter="all"]'));
    
    updateAttendeesList();
}

function updateAttendeesList() {
    const filtered = state.currentFilter === 'all' 
        ? state.attendees 
        : state.attendees.filter(a => a.response === state.currentFilter);
    
    displayAttendees(filtered);
}

