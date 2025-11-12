// ui/static/app.js

console.log('[app.js] loaded');

window.addEventListener('error', (e) => {
  console.error('[app.js] window error:', e.message, e.filename, e.lineno);
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('[app.js] DOMContentLoaded');

  // Sanity-check that key elements exist
  const searchForm = document.getElementById('searchForm');
  const geoBtn = document.getElementById('geoBtn');
  const nowCard = document.getElementById('nowCard');
  const outfitCard = document.getElementById('outfitCard');
  const tempCanvas = document.getElementById('tempChart');
  console.log('[app.js] elements', { searchForm, geoBtn, nowCard, outfitCard, tempCanvas });

  async function load(lat, lon) {
    console.log('[app.js] load()', lat, lon);
    try {
      hideError();
      const res = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[app.js] /api/weather response', data);

      try { renderNow(data.current, data.location); } catch (e) { console.error('[app.js] renderNow error', e); }
      try { renderOutfit(data.outfit); } catch (e) { console.error('[app.js] renderOutfit error', e); }
      try { renderChart(data.hourly); } catch (e) { console.error('[app.js] renderChart error', e); }

      const state = (data.location.split(',')[1] || '').trim();
      if (state.length === 2) renderAlerts(state);
    } catch (e) {
      console.error('[app.js] load() error', e);
      showError('Could not fetch weather. Check coordinates and try again.');
    }
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const lat = (document.getElementById('lat').value || '33.6846').trim();
      const lon = (document.getElementById('lon').value || '-117.8265').trim();
      console.log('[app.js] submit clicked', { lat, lon });
      load(lat, lon);
    });
  }

  if (geoBtn) {
    geoBtn.addEventListener('click', async () => {
      console.log('[app.js] geoBtn clicked');

      if (!('geolocation' in navigator)) {
        return showError('Geolocation not supported in this browser.');
      }

      // Optional: preflight permission state for clearer UX
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const p = await navigator.permissions.query({ name: 'geolocation' });
          console.log('[app.js] geolocation permission:', p.state);
          if (p.state === 'denied') {
            return showError('Location permission is blocked. Enable it in browser settings for 127.0.0.1 and try again.');
          }
        }
      } catch (_) { /* ignore permission probing errors */ }

      const opts = { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 };

      function requestPosition(retry = false) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            console.log('[app.js] geolocation success', { latitude, longitude });
            const latEl = document.getElementById('lat');
            const lonEl = document.getElementById('lon');
            if (latEl) latEl.value = latitude.toFixed(4);
            if (lonEl) lonEl.value = longitude.toFixed(4);
            load(latitude, longitude);
          },
          (err) => {
            console.warn('[app.js] geolocation error', err);
            // Retry once for transient CoreLocation kCLErrorLocationUnknown / POSITION_UNAVAILABLE
            if (!retry && err && (err.code === err.POSITION_UNAVAILABLE)) {
              setTimeout(() => requestPosition(true), 1500);
            } else {
              showError('Unable to get location from the OS. Enter coordinates manually or check Location Services.');
            }
          },
          opts
        );
      }

      requestPosition(false);
    });
  }

  function renderNow(now, loc) {
    const el = document.getElementById('nowCard');
    if (!el) return;
    el.innerHTML = `
      <h2>${loc}</h2>
      <div class="grid">
        <div><span class="label">Conditions</span><div>${now.shortForecast}</div></div>
        <div><span class="label">Temperature</span><div>${now.temperature}°F</div></div>
        <div><span class="label">Wind</span><div>${now.windSpeed || '—'} ${now.windDirection || ''}</div></div>
        <div><span class="label">Period</span><div>${now.name}</div></div>
      </div>
    `;
  }

  function renderOutfit(o) {
    const el = document.getElementById('outfitCard');
    if (!el) return;
    const items = o.items.map((i) => `<li>${i}</li>`).join('');
    const tips = o.tips.map((t) => `<li>${t}</li>`).join('');
    el.innerHTML = `
      <h3>${o.headline}</h3>
      <div class="split">
        <div>
          <h4>Suggested items</h4>
          <ul class="list">${items}</ul>
        </div>
        ${tips ? `<div><h4>Tips</h4><ul class="list tips">${tips}</ul></div>` : ''}
      </div>
    `;
  }

  function renderChart(hourly) {
    const ctx = document.getElementById('tempChart')?.getContext('2d');
    if (!ctx) return;
    const labels = hourly.map((h) => new Date(h.startTime).toLocaleTimeString([], { hour: 'numeric' }));
    const temps = hourly.map((h) => h.temperature);

    if (window.tempChartInstance) window.tempChartInstance.destroy();
    window.tempChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Temp (°F)', data: temps, tension: 0.3 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (v) => `${v}°` } } },
      },
    });
  }

  async function renderAlerts(state) {
    try {
      const res = await fetch(`/api/alerts?state=${encodeURIComponent(state)}`);
      if (!res.ok) return;
      const data = await res.json();
      const list = data.alerts || [];
      const el = document.getElementById('alerts');
      if (!el) return;
      if (!list.length) {
        el.classList.add('hidden');
        el.innerHTML = '';
        return;
      }
      el.classList.remove('hidden');
      el.innerHTML = `
        <h3>Active Alerts (${state})</h3>
        <ul class="alerts">
          ${list
            .slice(0, 5)
            .map(
              (a) => `
            <li>
              <strong>${a.event || 'Alert'}</strong>
              ${a.severity ? `— <em>${a.severity}</em>` : ''}
              ${a.headline ? `<div class="muted">${a.headline}</div>` : ''}
            </li>`
            )
            .join('')}
        </ul>
      `;
    } catch (e) {
      console.warn('[app.js] alerts fetch failed', e);
    }
  }

  function showError(msg) {
    const e = document.getElementById('error');
    if (!e) return;
    e.textContent = msg;
    e.classList.remove('hidden');
  }

  function hideError() {
    const e = document.getElementById('error');
    if (!e) return;
    e.classList.add('hidden');
  }

  // Initial load (Irvine, CA)
  load(33.6846, -117.8265);
});