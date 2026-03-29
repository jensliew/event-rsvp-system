// ============================================
// Event-Related API Calls & Functions
// ============================================

import { escapeHtml, formatDate, showMessage, apiFetch } from './utils.js';

const API_BASE_URL = 'https://zywjpx8a33.execute-api.ap-southeast-1.amazonaws.com'; // Update with your API URL

// ============================================
// API Endpoints
// ============================================
const api = {
    events: `${API_BASE_URL}/events`,
    event: (id) => `${API_BASE_URL}/event/${id}`,
    stats: (id) => `${API_BASE_URL}/stats/${id}`,
    attendees: (id, filter) => {
        const url = new URL(`${API_BASE_URL}/attendees/${id}`);
        if (filter && filter !== 'all') url.searchParams.append('response', filter);
        return url.toString();
    },
    rsvp: `${API_BASE_URL}/rsvp`,
    checkout: `${API_BASE_URL}/create-checkout-session`,
    paymentSuccess: `${API_BASE_URL}/payment-success`
};

// ============================================
// API Calls
// ============================================

export async function fetchEvents() {
    const events = await apiFetch(api.events, {}, []);
    if (!events.length) showMessage('Failed to load events. Check your API connection.', 'error');
    return events;
}

export const fetchEventDetails = (eventId) => apiFetch(api.event(eventId), {}, null);

export const fetchEventStats = (eventId) => apiFetch(api.stats(eventId), {}, { Yes: 0, No: 0 });

export const fetchAttendees = (eventId, filter = null) => 
    apiFetch(api.attendees(eventId, filter), {}, []);

/**
 * Redirect user to Stripe Checkout for paid events
 */
export async function createCheckoutSession(eventId, fullName, email, amount, eventTitle) {
    const response = await fetch(api.checkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, full_name: fullName, email, amount, event_title: eventTitle })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create checkout session');
    return data.url; // Stripe hosted checkout URL
}

/**
 * Confirm RSVP after successful Stripe payment
 */
export async function confirmPaymentRsvp(eventId, fullName, email) {
    const response = await fetch(api.paymentSuccess, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, full_name: fullName, email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to confirm RSVP');
    return data;
}

export async function submitRsvp(eventId, fullName, email, response) {
    try {
        console.log('Submitting RSVP to:', api.rsvp);
        console.log('RSVP data:', { event_id: eventId, full_name: fullName, email, response });

        const response_data = await fetch(api.rsvp, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: eventId, full_name: fullName, email, response })
        });

        console.log('Response status:', response_data.status);
        console.log('Response ok:', response_data.ok);

        const result = await response_data.json();
        console.log('Response data:', result);

        if (!response_data.ok) {
            const errorMessage = result?.message || result?.error || `HTTP ${response_data.status}`;
            console.log('Throwing error:', errorMessage);
            throw new Error(errorMessage);
        }

        return result;
    } catch (error) {
        console.error('RSVP submission error:', error);
        throw error;
    }
}

// ============================================
// Event Display Functions
// ============================================

export function createEventCard(event, stats) {
    const card = document.createElement('div');
    card.className = 'event-card card-clickable';
    card.dataset.eventId = event.event_id;

    const eventDate = formatDate(event.start_at, 'short');
    const totalAttendees = (stats.Yes || 0) + (stats.No || 0);

    // Set banner URL as background image
    const bannerDiv = document.createElement('div');
    bannerDiv.className = 'event-banner';
    if (event.banner_url) {
        bannerDiv.classList.add('has-image');
        bannerDiv.style.backgroundImage = `url('${event.banner_url}')`;
    } else {
        bannerDiv.innerHTML = '🎪';
    }

    card.appendChild(bannerDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'event-content';
    contentDiv.innerHTML = `
        <div class="event-title">${escapeHtml(event.title)}</div>
        <div class="event-description">${escapeHtml(event.description || '')}</div>
        <div class="event-meta">
            📅 <strong>${eventDate}</strong>
        </div>
        <div class="event-meta">
            📍 <strong>${escapeHtml(event.venue || 'TBD')}</strong>
        </div>
        ${event.registration_fee > 0
            ? `<div class="event-fee">💳 Registration Fee: <strong>MYR ${parseFloat(event.registration_fee).toFixed(2)}</strong></div>`
            : `<div class="event-fee free">🎟️ Free Event</div>`
        }
        <div class="event-stats">
            <div class="stat">
                <div class="stat-number">${stats.Yes || 0}</div>
                <div class="stat-label">Attending</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.No || 0}</div>
                <div class="stat-label">Not Attending</div>
            </div>
            <div class="stat">
                <div class="stat-number">${totalAttendees}</div>
                <div class="stat-label">Total</div>
            </div>
        </div>
    `;

    card.appendChild(contentDiv);

    return card;
}

/**
 * Display event details in the details section
 * @param {Object} event - Event details
 * @param {Object} stats - Event statistics
 */
export function displayEventDetails(event, stats) {
    const detailsDiv = document.getElementById('event-details');
    const eventDate = formatDate(event.start_at, 'long');

    detailsDiv.innerHTML = `
        <p><strong>📅 Date:</strong> ${eventDate}</p>
        <p><strong>📍 Venue:</strong> ${escapeHtml(event.venue || 'TBD')}</p>
        <p><strong>📝 Description:</strong> ${escapeHtml(event.description || 'No description provided')}</p>
        ${event.registration_fee > 0
            ? `<p class="fee-notice">💳 <strong>Registration Fee: MYR ${parseFloat(event.registration_fee).toFixed(2)}</strong> — payment required to confirm your RSVP.</p>`
            : ''
        }
        <div id="event-stats">
            <div class="stat-box">
                <div class="stat-box-value">${stats.Yes || 0}</div>
                <div class="stat-box-label">Attending</div>
            </div>
            <div class="stat-box">
                <div class="stat-box-value">${stats.No || 0}</div>
                <div class="stat-box-label">Not Attending</div>
            </div>
        </div>
    `;
    detailsDiv.classList.remove('hidden');
}

/**
 * Display attendee list
 * @param {Array} attendees - Array of attendee objects
 */
export function displayAttendees(attendees) {
    const attendeesList = document.getElementById('attendees-list');

    if (!attendees.length) {
        attendeesList.innerHTML = '<p class="empty-state">No attendees with this response</p>';
        return;
    }

    attendeesList.innerHTML = attendees.map(({ full_name, email, response }) => {
        const isAttending = response === 'Yes';
        return `
            <div class="attendee-item">
                <div class="attendee-name">${escapeHtml(full_name)}</div>
                <div class="attendee-email">${escapeHtml(email)}</div>
                <span class="attendee-response ${isAttending ? 'yes' : 'no'}">
                    ${isAttending ? '✓ Attending' : '✗ Not Attending'}
                </span>
            </div>
        `;
    }).join('');
}

/**
 * Update the event select dropdown with events
 * @param {Array} events - Array of events
 * @param {string} currentValue - Current selected value to preserve
 */
export function updateEventSelect(events, currentValue = '') {
    const select = document.getElementById('event-select');

    // Keep the default option
    while (select.options.length > 1) {
        select.remove(1);
    }

    events.forEach(event => {
        const option = document.createElement('option');
        option.value = event.event_id;
        option.textContent = event.title;
        select.appendChild(option);
    });

    if (currentValue) {
        select.value = currentValue;
    }
}
