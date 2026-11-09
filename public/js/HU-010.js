document.addEventListener("DOMContentLoaded", () => {
    let spaces = [];
    let selectedSpace = null;
    let pendingStatus = 'available';

    const parkingMap = document.getElementById("parkingMap");
    const occupancyEl = document.getElementById("occupancy");
    const availableCountEl = document.getElementById("availableCount");
    const spaceNameEl = document.getElementById("spaceName");
    const spaceStatusEl = document.getElementById("spaceStatus");
    const vehicleNumberEl = document.getElementById("vehicleNumber");
    const ownerNameEl = document.getElementById("ownerName");
    const entryTimeEl = document.getElementById("entryTime");
    const descriptionEl = document.getElementById("description");
    const zoneNameEl = document.getElementById("zoneName");
    const messageEl = document.getElementById("message");

    const availableBtn = document.querySelector(".available-button, .btn-status-available");
    const occupiedBtn = document.querySelector(".occupied-button, .btn-status-occupied");
    const confirmBtn = document.getElementById("confirmChanges");
    const resizeBtn = document.getElementById("resizeBtn");

    // ==========================================
    // LÓGICA MODO OSCURO (DARK MODE)
    // ==========================================
    const darkModeBtn = Array.from(document.querySelectorAll('.top-buttons button'))
        .find(btn => btn.textContent.toLowerCase().includes('dark mode')) || document.getElementById("darkModeBtn");

    // Restaurar tema guardado en localStorage
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    if (darkModeBtn) {
        darkModeBtn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };
    }

    // 1. Fetch data from backend
    async function fetchParkingSpaces() {
        try {
            const response = await fetch('/api/parking-spaces');
            if (!response.ok) throw new Error('Error fetching spaces');
            
            spaces = await response.json();
            renderParking();
            updateStatistics();
            
            if (selectedSpace) {
                const updated = spaces.find(s => s.id === selectedSpace.id);
                if (updated) selectSpace(updated);
            }
        } catch (error) {
            console.error("Error:", error);
            showMessage("Server connection error.", "error");
        }
    }

    // 2. Render map grid
    function renderParking() {
        if (!parkingMap) return;
        parkingMap.innerHTML = "";

        spaces.forEach(space => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `space-btn ${space.status}`;
            if (selectedSpace && selectedSpace.id === space.id) {
                btn.classList.add("selected");
            }
            btn.innerHTML = `<span>${space.id}</span>`;
            btn.onclick = () => selectSpace(space);
            parkingMap.appendChild(btn);
        });
    }

    // 3. Select space
    function selectSpace(space) {
        selectedSpace = space;
        pendingStatus = space.status;

        if (spaceNameEl) spaceNameEl.textContent = space.id;
        if (spaceStatusEl) {
            spaceStatusEl.textContent = space.status.toUpperCase();
            spaceStatusEl.className = `badge-status ${space.status}`;
        }

        if (vehicleNumberEl) vehicleNumberEl.textContent = space.vehicle || "---";
        if (ownerNameEl) ownerNameEl.textContent = space.owner || "---";
        if (entryTimeEl) entryTimeEl.textContent = space.entry || "---";
        if (descriptionEl) descriptionEl.textContent = space.description || "---";
        if (zoneNameEl) zoneNameEl.textContent = `Zone ${space.zone || 'A'}`;

        updateStatusButtonsUI(pendingStatus);
        renderParking();
    }

    // 4. Update status toggle UI
    function updateStatusButtonsUI(status) {
        if (availableBtn) {
            if (status === 'available') availableBtn.classList.add('active');
            else availableBtn.classList.remove('active');
        }
        if (occupiedBtn) {
            if (status === 'occupied') occupiedBtn.classList.add('active');
            else occupiedBtn.classList.remove('active');
        }
    }

    if (availableBtn) {
        availableBtn.onclick = () => {
            pendingStatus = 'available';
            updateStatusButtonsUI('available');
        };
    }

    if (occupiedBtn) {
        occupiedBtn.onclick = () => {
            pendingStatus = 'occupied';
            updateStatusButtonsUI('occupied');
        };
    }

    // 5. Confirm Status Changes
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            if (!selectedSpace) {
                showMessage("Please select a space first", "error");
                return;
            }

            try {
                const response = await fetch(`/api/parking-spaces/${selectedSpace.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: pendingStatus,
                        description: pendingStatus === 'available' ? 'Space available' : 'Vehicle parked'
                    })
                });

                if (response.ok) {
                    await fetchParkingSpaces();
                    showMessage(`Space ${selectedSpace.id} updated successfully!`, "success");
                } else {
                    showMessage("Failed to update space", "error");
                }
            } catch (err) {
                console.error(err);
                showMessage("API connection error", "error");
            }
        };
    }

    // 6. Resize layout
    if (resizeBtn) {
        resizeBtn.onclick = async () => {
            const spacesPerZoneInput = document.getElementById("spacesPerZone");
            const zonesListInput = document.getElementById("zonesList");

            if (!spacesPerZoneInput || !zonesListInput) return;

            const spacesPerZone = parseInt(spacesPerZoneInput.value);
            const zones = zonesListInput.value.split(",");

            try {
                const response = await fetch('/api/parking-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ spacesPerZone, zones })
                });

                if (response.ok) {
                    selectedSpace = null;
                    if (spaceNameEl) spaceNameEl.textContent = "None";
                    await fetchParkingSpaces();
                    showMessage("Parking layout reconfigured", "success");
                }
            } catch (err) {
                console.error(err);
                showMessage("Error reconfiguring layout", "error");
            }
        };
    }

    // Stats calculation
    function updateStatistics() {
        const total = spaces.length;
        if (total === 0) return;

        const occupied = spaces.filter(s => s.status === 'occupied').length;
        const available = total - occupied;
        const percentage = Math.round((occupied / total) * 100);

        if (occupancyEl) occupancyEl.textContent = `${percentage}%`;
        if (availableCountEl) availableCountEl.textContent = available;
    }

    function showMessage(msg, type) {
        if (!messageEl) return;
        messageEl.textContent = msg;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3500);
    }

    fetchParkingSpaces();
});