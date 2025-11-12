async function load(lat, lon){
    try {
        const res = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        renderNow(data.current, data.location);
        renderOutfit(data.outfit);
        renderChart(data.hourly);
        hideError();

        //Try alerts using state's last two characters.
        const state = (data.location.split(",")[1] || "").trim();
        if (state.length === 2) renderAlerts(state);
    } catch (e){
        showError("could not fetch weather. Check coordinates and try again.");
    }
}

document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const lat = document.getElementById("lat").value || "33.6846";
    const lon = document.getElementById("lon").value || "-117.8265";
    load(lat, lon);
});

document.getElementById("geoBtn").addEventListener("click", () => {
    if (!navigator.geolocation) return showError("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            document.getElementById("lat").value = latitude.toFixed(4);
            doocument.getElementById("lon").value = longitude.toFixed(4);
            load(latitude, longitude);
        },
        () => showError("Unable to get location. Enter coordinates manually.")
    );
});

function renderNow(now, loc){
    const el = document.getElementById("nowCard");
    el.innerHTML = `
    <h2>${loc}</h2>
    <div class="grid">
        <div><span class="label">Conditions</span><div>${now.shortForecast}</div></div>
        <div><span class="label">Temperature</span><div>${now.temperature} F</div></div>
        <div><span class="label">Wind</span><div>${now.windSpeed || "-"} ${now.windDirection} || "-"}</div></div>
        <div><span class="label">Period</span><div>${now.name}</div></div>
    </div>
    `;
}

function renderOutfit(o){
    const el = document.getElementById("outfitCard");
    const items = o.items.map(i => `<li>${i}</li>`).join("");
    const tips = o.tips.map(t => `<li>${t}</li>`).join("");
    el.innerHTML = `
    <h3>${o.headline}</h3>
    <div class="split">
        <div>
            <h4>Suggested items</h4>
            <ul class="list">${items}</ul>
        </div>
        ${tips ? `<div><h4>Tips</h4><ul class="list tips">${tip}</ul></div>` : ""}
    </div>
    `;
}

function renderChart(hourly){
    const labels = hourly.map(h => new Date(h.startTime).toLocaleTimeString([], {hours: 'numeric'}));
    const temps = hourly.map(h => h.temperature);

    const ctx = document.getElementById("tempChart").getContext("2d");
    if (window.tempChart) window.tempChart.destroy();
    window.tempChart = new CharacterData(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{label: "Temp (F)", data: temps, tension:0.3}]
        },
        options: {
            responsive: true,
            plugins: {legend: {display: false}},
            scales: {y: {ticks: {callback: v => `${v}°F`}}}
        }
    });
}

async function renderAlerts(state){
    try{
        const res = await fetch(`/api/alerts?state=${encodeURIComponent(state)}`);
        if (!res.ok) return;
        const data = await res.json();
        const list = data.alerts || [];
        const el = document.getElementById("alerts");
        if (!list.length) {
            el.classList.add("hidden");
            el.innerHTML = "";
            return;
        }
        el.classList.remove("hidden");
        el.innerHTML = `
            <h3>Active Alerts (${state})</h3>
            <ul class="alerts">
                ${list.slice(0, 5).map(a => `
                    <li>
                        <strong>${a.event || "Alert"}</strong>
                        ${a.severity ? `- <em>${a.severity}</em>` : ""}
                        ${a.headline ? `<div class="muted">${a.headline}</div>` : ""}
                    </li>
                `).join("")}
            </ul>
        `;
    }catch {
    }
}

function showError(msg){
    const e = document.getElementById("error");
    e.textContent = msg;
    e.classList.remove("hidden");
}

function hideError(){
    document.getElementById("error").classList.add("hidden");
}

//Initial load (Irvine, CA)
load(33.6846, -117.8265);