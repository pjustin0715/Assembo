// Global state
let components = {};
let currentBuild = {
    name: '',
    budget: 2000,
    parts: {
        cpu: null,
        gpu: null,
        motherboard: null,
        ram: null,
        ramQuantity: 0,
        storage: null,
        storageQuantity: 0,
        psu: null,
        case: null,
        cooler: null
    }
};
let motherboardSlots = { ramSlots: 4, storageSlots: 4 };

// Load components from API
async function loadComponents() {
    try {
        const response = await fetch('/api/components');
        components = await response.json();
        populateDropdowns();
        updateSlots();
        
        if (initialBuild && initialBuild.parts) {
            loadExistingBuild(initialBuild);
        }
        
        checkCompatibility();
    } catch (error) {
        console.error('Error loading components:', error);
    }
}

// Populate all dropdowns
function populateDropdowns() {
    // Motherboard
    const moboSelect = document.getElementById('motherboard');
    components.motherboard?.forEach(mobo => {
        const option = document.createElement('option');
        option.value = mobo.id;
        option.textContent = `${mobo.brand} ${mobo.model} - $${mobo.price}`;
        option.dataset.socket = mobo.socket;
        option.dataset.ramType = mobo.ramType;
        option.dataset.ramSlots = mobo.ramSlots;
        option.dataset.storageSlots = mobo.storageSlots;
        moboSelect.appendChild(option);
    });

    // CPU
    const cpuSelect = document.getElementById('cpu');
    components.cpu?.forEach(cpu => {
        const option = document.createElement('option');
        option.value = cpu.id;
        option.textContent = `${cpu.brand} ${cpu.model} - $${cpu.price} (${cpu.socket})`;
        option.dataset.socket = cpu.socket;
        option.dataset.tdp = cpu.tdp;
        cpuSelect.appendChild(option);
    });

    // GPU
    const gpuSelect = document.getElementById('gpu');
    components.gpu?.forEach(gpu => {
        const option = document.createElement('option');
        option.value = gpu.id;
        option.textContent = `${gpu.brand} ${gpu.model} - $${gpu.price} (${gpu.vram}GB)`;
        option.dataset.tdp = gpu.tdp;
        gpuSelect.appendChild(option);
    });

    // RAM
    const ramSelect = document.getElementById('ram');
    components.ram?.forEach(ram => {
        const option = document.createElement('option');
        option.value = ram.id;
        option.textContent = `${ram.brand} ${ram.model} - $${ram.price} (${ram.capacity}GB ${ram.ramType})`;
        option.dataset.ramType = ram.ramType;
        ramSelect.appendChild(option);
    });

    // Storage
    const storageSelect = document.getElementById('storage');
    components.storage?.forEach(storage => {
        const option = document.createElement('option');
        option.value = storage.id;
        option.textContent = `${storage.brand} ${storage.model} - $${storage.price} (${storage.capacity >= 1000 ? storage.capacity/1000 + 'TB' : storage.capacity + 'GB'} ${storage.storageType})`;
        storageSelect.appendChild(option);
    });

    // PSU
    const psuSelect = document.getElementById('psu');
    components.psu?.forEach(psu => {
        const option = document.createElement('option');
        option.value = psu.id;
        option.textContent = `${psu.brand} ${psu.model} - $${psu.price} (${psu.wattage}W ${psu.efficiency})`;
        option.dataset.wattage = psu.wattage;
        psuSelect.appendChild(option);
    });

    // Case
    const caseSelect = document.getElementById('case');
    components.case?.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.brand} ${c.model} - $${c.price} (${c.formFactor})`;
        option.dataset.maxGpuLength = c.maxGpuLength;
        caseSelect.appendChild(option);
    });

    // Cooler
    const coolerSelect = document.getElementById('cooler');
    components.cooler?.forEach(cooler => {
        const option = document.createElement('option');
        option.value = cooler.id;
        option.textContent = `${cooler.brand} ${cooler.model} - $${cooler.price}`;
        coolerSelect.appendChild(option);
    });
}

// Load existing build into form
function loadExistingBuild(build) {
    currentBuild.budget = build.budget || 2000;
    document.getElementById('budgetSlider').value = currentBuild.budget;
    document.getElementById('budgetValue').textContent = currentBuild.budget;

    const parts = build.parts || {};

    if (parts.motherboard) {
        document.getElementById('motherboard').value = parts.motherboard.id;
    }
    if (parts.cpu) {
        document.getElementById('cpu').value = parts.cpu.id;
    }
    if (parts.gpu) {
        document.getElementById('gpu').value = parts.gpu.id;
    }
    if (parts.ram && Array.isArray(parts.ram) && parts.ram.length > 0) {
        document.getElementById('ram').value = parts.ram[0].id;
        document.getElementById('ramQuantity').value = parts.ram.length;
    }
    if (parts.storage && Array.isArray(parts.storage) && parts.storage.length > 0) {
        document.getElementById('storage').value = parts.storage[0].id;
        document.getElementById('storageQuantity').value = parts.storage.length;
    }
    if (parts.psu) {
        document.getElementById('psu').value = parts.psu.id;
    }
    if (parts.case) {
        document.getElementById('case').value = parts.case.id;
    }
    if (parts.cooler) {
        document.getElementById('cooler').value = parts.cooler.id;
    }

    updateSlots();
    checkCompatibility();
}

// Update slot indicators and quantity dropdowns
let previousMoboId = null;

function updateSlots() {
    const moboSelect = document.getElementById('motherboard');
    const selectedOption = moboSelect.options[moboSelect.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        motherboardSlots.ramSlots = parseInt(selectedOption.dataset.ramSlots) || 4;
        motherboardSlots.storageSlots = parseInt(selectedOption.dataset.storageSlots) || 4;
    } else {
        motherboardSlots.ramSlots = 4;
        motherboardSlots.storageSlots = 4;
    }

    // Clear dropdowns if motherboard changed (slot limits may have changed)
    const moboChanged = previousMoboId !== (selectedOption?.value || null);
    if (moboChanged) {
        previousMoboId = selectedOption?.value || null;
        const ramQuantitySelect = document.getElementById('ramQuantity');
        const storageQuantitySelect = document.getElementById('storageQuantity');
        if (ramQuantitySelect) ramQuantitySelect.innerHTML = '';
        if (storageQuantitySelect) storageQuantitySelect.innerHTML = '';
    }

    // RAM quantity
    const ramSelect = document.getElementById('ram');
    const ramQuantitySection = document.getElementById('ramQuantitySection');
    const ramQuantitySelect = document.getElementById('ramQuantity');
    
    if (ramSelect.value) {
        ramQuantitySection.style.setProperty('display', 'flex');
        const currentQty = parseInt(ramQuantitySelect.value) || 1;
        const maxRam = Math.min(motherboardSlots.ramSlots, 8);
        
        if (ramQuantitySelect.options.length === 0 || currentQty > maxRam) {
            ramQuantitySelect.innerHTML = '';
            for (let i = 1; i <= maxRam; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                ramQuantitySelect.appendChild(option);
            }
            ramQuantitySelect.value = Math.min(currentQty, maxRam);
        }
    } else {
        ramQuantitySection.style.setProperty('display', 'none');
    }

    // Storage quantity
    const storageSelect = document.getElementById('storage');
    const storageQuantitySection = document.getElementById('storageQuantitySection');
    const storageQuantitySelect = document.getElementById('storageQuantity');
    
    if (storageSelect.value) {
        storageQuantitySection.style.setProperty('display', 'flex');
        const currentQty = parseInt(storageQuantitySelect.value) || 1;
        const maxStorage = Math.min(motherboardSlots.storageSlots, 8);
        
        if (storageQuantitySelect.options.length === 0 || currentQty > maxStorage) {
            storageQuantitySelect.innerHTML = '';
            for (let i = 1; i <= maxStorage; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                storageQuantitySelect.appendChild(option);
            }
            storageQuantitySelect.value = Math.min(currentQty, maxStorage);
        }
    } else {
        storageQuantitySection.style.setProperty('display', 'none');
    }

    updateSlotDisplay();
}

// Update slot progress bars
function updateSlotDisplay() {
    const ramCount = parseInt(document.getElementById('ramQuantity')?.value) || 0;
    const storageCount = parseInt(document.getElementById('storageQuantity')?.value) || 0;

    const ramFill = document.getElementById('ramFill');
    const ramSlots = document.getElementById('ramSlots');
    const storageFill = document.getElementById('storageFill');
    const storageSlots = document.getElementById('storageSlots');

    if (ramFill) {
        ramFill.style.width = `${(ramCount / motherboardSlots.ramSlots) * 100}%`;
        ramFill.className = 'slot-fill' + (ramCount === motherboardSlots.ramSlots ? ' full' : ramCount > 0 ? ' warning' : '');
    }
    if (ramSlots) ramSlots.textContent = `${ramCount} / ${motherboardSlots.ramSlots}`;

    if (storageFill) {
        storageFill.style.width = `${(storageCount / motherboardSlots.storageSlots) * 100}%`;
        storageFill.className = 'slot-fill' + (storageCount === motherboardSlots.storageSlots ? ' full' : storageCount > 0 ? ' warning' : '');
    }
    if (storageSlots) storageSlots.textContent = `${storageCount} / ${motherboardSlots.storageSlots}`;
}

// Check compatibility
async function checkCompatibility() {
    const parts = getSelectedParts();
    const totalPrice = calculateTotalPrice(parts);
    
    updateBudgetDisplay(totalPrice);
    updateSlotDisplay();

    try {
        const response = await fetch('/api/compatibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parts })
        });
        
        const result = await response.json();
        updateCompatibilityStatus(result);
        updatePartHints(parts, result.issues);
        updateCompleteButton(result, totalPrice);
    } catch (error) {
        console.error('Error checking compatibility:', error);
    }
}

// Get currently selected parts
function getSelectedParts() {
    const parts = {
        cpu: null,
        gpu: null,
        motherboard: null,
        ram: [],
        storage: [],
        psu: null,
        case: null,
        cooler: null
    };

    const cpuSelect = document.getElementById('cpu');
    if (cpuSelect.value) {
        const option = cpuSelect.options[cpuSelect.selectedIndex];
        parts.cpu = {
            id: option.value,
            brand: option.textContent.split(' ')[0],
            model: option.textContent.split(' - ')[0].split(' ').slice(1).join(' '),
            price: parseInt(option.textContent.split('$$')[1]) || 0,
            socket: option.dataset.socket,
            tdp: parseInt(option.dataset.tdp) || 0
        };
    }

    const gpuSelect = document.getElementById('gpu');
    if (gpuSelect.value) {
        const option = gpuSelect.options[gpuSelect.selectedIndex];
        parts.gpu = {
            id: option.value,
            brand: option.textContent.split(' ')[0],
            model: option.textContent.split(' - ')[0].split(' ').slice(1).join(' '),
            price: parseInt(option.textContent.match(/\$\d+/)?.[0]?.slice(1)) || 0,
            tdp: parseInt(option.dataset.tdp) || 0
        };
    }

    const moboSelect = document.getElementById('motherboard');
    if (moboSelect.value) {
        const option = moboSelect.options[moboSelect.selectedIndex];
        parts.motherboard = {
            id: option.value,
            brand: option.textContent.split(' ')[0],
            model: option.textContent.split(' - ')[0].split(' ').slice(1).join(' '),
            price: parseInt(option.textContent.match(/\$\d+/)?.[0]?.slice(1)) || 0,
            socket: option.dataset.socket,
            ramType: option.dataset.ramType,
            ramSlots: parseInt(option.dataset.ramSlots) || 4,
            storageSlots: parseInt(option.dataset.storageSlots) || 4
        };
    }

    const ramSelect = document.getElementById('ram');
    const ramQuantity = parseInt(document.getElementById('ramQuantity')?.value) || 0;
    if (ramSelect.value && ramQuantity > 0) {
        const option = ramSelect.options[ramSelect.selectedIndex];
        for (let i = 0; i < ramQuantity; i++) {
            parts.ram.push({
                id: option.value,
                brand: option.textContent.split(' ')[0],
                model: option.textContent.split(' - ')[0].split(' ').slice(1).join(' '),
                price: parseInt(option.textContent.match(/\$\d+/)?.[0]?.slice(1)) || 0,
                ramType: option.dataset.ramType
            });
        }
    }

    const storageSelect = document.getElementById('storage');
    const storageQuantity = parseInt(document.getElementById('storageQuantity')?.value) || 0;
    if (storageSelect.value && storageQuantity > 0) {
        const option = storageSelect.options[storageSelect.selectedIndex];
        for (let i = 0; i < storageQuantity; i++) {
            parts.storage.push({
                id: option.value,
                brand: option.textContent.split(' ')[0],
                model: option.textContent.split(' - ')[0].split(' ').slice(1).join(' '),
                price: parseInt(option.textContent.match(/\$\d+/)?.[0]?.slice(1)) || 0
            });
        }
    }

    const psuSelect = document.getElementById('psu');
    if (psuSelect.value) {
        const option = psuSelect.options[psuSelect.selectedIndex];
        parts.psu = {
            id: option.value,
            brand: option.textContent.split(' ')[0],
            model: option.textContent.split(' - ')[0].split(' ').slice(1).join(' '),
            price: parseInt(option.textContent.match(/\$\d+/)?.[0]?.slice(1)) || 0,
            wattage: parseInt(option.dataset.wattage) || 0
        };
    }

    const caseSelect = document.getElementById('case');
    if (caseSelect.value) {
        const option = caseSelect.options[caseSelect.selectedIndex];
        parts.case = {
            id: option.value,
            brand: option.textContent.split(' ')[0],
            model: option.textContent.split(' - ')[0].split(' ').slice(1).join(' '),
            price: parseInt(option.textContent.match(/\$\d+/)?.[0]?.slice(1)) || 0
        };
    }

    const coolerSelect = document.getElementById('cooler');
    if (coolerSelect.value) {
        const option = coolerSelect.options[coolerSelect.selectedIndex];
        parts.cooler = {
            id: option.value,
            brand: option.textContent.split(' ')[0],
            model: option.textContent.split(' - ')[0].split(' ').slice(1).join(' '),
            price: parseInt(option.textContent.match(/\$\d+/)?.[0]?.slice(1)) || 0
        };
    }

    return parts;
}

// Calculate total price
function calculateTotalPrice(parts) {
    let total = 0;
    
    ['cpu', 'gpu', 'motherboard', 'psu', 'case', 'cooler'].forEach(type => {
        if (parts[type]) total += parts[type].price || 0;
    });
    
    parts.ram?.forEach(ram => total += ram.price || 0);
    parts.storage?.forEach(storage => total += storage.price || 0);
    
    return total;
}

// Update budget display
function updateBudgetDisplay(totalPrice) {
    const budget = parseInt(document.getElementById('budgetSlider')?.value) || 2000;
    const remaining = budget - totalPrice;
    
    document.getElementById('totalPrice').textContent = totalPrice;
    document.getElementById('remainingBudget').textContent = remaining;
    
    const budgetInfo = document.querySelector('.budget-info');
    if (budgetInfo) {
        budgetInfo.classList.toggle('over-budget', remaining < 0);
    }
}

// Update compatibility status
function updateCompatibilityStatus(result) {
    const statusBadge = document.getElementById('statusBadge');
    const issuesList = document.getElementById('issuesList');
    
    if (result.compatible) {
        statusBadge.className = 'status-badge status-complete';
        statusBadge.textContent = 'All Compatible';
    } else {
        const hasErrors = result.issues?.some(i => i.type === 'error');
        statusBadge.className = `status-badge ${hasErrors ? 'status-error' : 'status-warning'}`;
        statusBadge.textContent = hasErrors ? 'Issues Found' : 'Warnings';
    }
    
    if (issuesList) {
        issuesList.innerHTML = '';
        result.issues?.forEach(issue => {
            const div = document.createElement('div');
            div.className = `issue-item ${issue.type}`;
            div.textContent = issue.message;
            issuesList.appendChild(div);
        });
    }
}

// Update part hints
function updatePartHints(parts, issues) {
    const issueMessages = {};
    issues?.forEach(issue => {
        issueMessages[issue.type] = issue.message;
    });
    
    // CPU hint
    const cpuHint = document.getElementById('cpu-hint');
    if (cpuHint && parts.motherboard && parts.cpu) {
        if (parts.cpu.socket === parts.motherboard.socket) {
            cpuHint.textContent = 'Compatible';
            cpuHint.className = 'part-hint compatible';
        } else {
            cpuHint.textContent = 'Socket mismatch';
            cpuHint.className = 'part-hint incompatible';
        }
    } else if (cpuHint) {
        cpuHint.textContent = '';
        cpuHint.className = 'part-hint';
    }
    
    // RAM hint
    const ramHint = document.getElementById('ram-hint');
    if (ramHint && parts.motherboard && parts.ram.length > 0) {
        const ramType = parts.ram[0].ramType;
        if (ramType === parts.motherboard.ramType) {
            ramHint.textContent = 'Compatible';
            ramHint.className = 'part-hint compatible';
        } else {
            ramHint.textContent = 'RAM type mismatch';
            ramHint.className = 'part-hint incompatible';
        }
    } else if (ramHint) {
        ramHint.textContent = '';
        ramHint.className = 'part-hint';
    }
    
    // PSU hint
    const psuHint = document.getElementById('psu-hint');
    if (psuHint && parts.psu && parts.cpu && parts.gpu) {
        const required = parts.cpu.tdp + parts.gpu.tdp + 100;
        if (parts.psu.wattage >= required) {
            psuHint.textContent = `Sufficient (${parts.psu.wattage}W)`;
            psuHint.className = 'part-hint compatible';
        } else {
            psuHint.textContent = `Insufficient (need ~${required}W)`;
            psuHint.className = 'part-hint incompatible';
        }
    } else if (psuHint) {
        psuHint.textContent = '';
        psuHint.className = 'part-hint';
    }
}

// Update complete build button
function updateCompleteButton(result, totalPrice) {
    const btn = document.getElementById('completeBuildBtn');
    const hint = document.getElementById('buildRequirements');
    const budget = parseInt(document.getElementById('budgetSlider')?.value) || 2000;
    
    const hasAllRequired = 
        document.getElementById('cpu').value &&
        document.getElementById('gpu').value &&
        document.getElementById('motherboard').value &&
        document.getElementById('psu').value &&
        document.getElementById('case').value &&
        document.getElementById('cooler').value;
    
    const hasErrors = result.issues?.some(i => i.type === 'error');
    const overBudget = totalPrice > budget;
    
    btn.disabled = !hasAllRequired || hasErrors || overBudget;
    
    if (!hasAllRequired) {
        hint.textContent = 'Select all required parts';
    } else if (hasErrors) {
        hint.textContent = 'Fix compatibility issues first';
    } else if (overBudget) {
        hint.textContent = 'Reduce total price to complete';
    } else {
        hint.textContent = 'Ready to complete!';
    }
}

// Complete build
async function completeBuild() {
    const parts = getSelectedParts();
    const budget = parseInt(document.getElementById('budgetSlider')?.value) || 2000;
    
    try {
        const response = await fetch('/api/builds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: buildName,
                parts,
                budget
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.location.href = `/summary/${result.name}`;
        } else {
            alert(result.error || 'Failed to save build');
        }
    } catch (error) {
        console.error('Error completing build:', error);
        alert('Failed to save build');
    }
}

// Save progress
async function saveProgress() {
    const parts = getSelectedParts();
    const budget = parseInt(document.getElementById('budgetSlider')?.value) || 2000;
    
    try {
        const response = await fetch(`/api/builds/${buildName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parts,
                budget
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Progress saved!');
        } else {
            alert(result.error || 'Failed to save progress');
        }
    } catch (error) {
        console.error('Error saving progress:', error);
        alert('Failed to save progress');
    }
}

// Budget slider
document.addEventListener('DOMContentLoaded', () => {
    const budgetSlider = document.getElementById('budgetSlider');
    if (budgetSlider) {
        budgetSlider.addEventListener('input', (e) => {
            document.getElementById('budgetValue').textContent = e.target.value;
            checkCompatibility();
        });
    }
    
    // Initialize slot display
    updateSlotDisplay();
});

// Modal functions
function showNewBuildModal() {
    document.getElementById('newBuildModal').style.display = 'flex';
}

function showLoadModal() {
    document.getElementById('loadModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Start new build
async function startNewBuild(event) {
    event.preventDefault();
    const name = document.getElementById('buildName').value.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const response = await fetch('/api/builds');
        const builds = await response.json();
        
        if (builds.some(b => b.name === name)) {
            alert(`Build "${name}" already exists. Use "Load Build" to edit it.`);
            return;
        }
    
    window.location.href = `/builder?name=${name}`;
}

// Load build from file
async function loadBuild(event) {
    event.preventDefault();
    const fileInput = document.getElementById('buildFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    try {
        const text = await file.text();
        const build = JSON.parse(text);
        
        const response = await fetch('/api/builds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: build.name,
                parts: build.parts,
                budget: build.budget
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.location.href = `/summary/${result.name}`;
        } else if (response.status === 400) {
            window.location.href = `/builder?name=${build.name}`;
        } else {
            alert(result.error || 'Failed to load build');
        }
    } catch (error) {
        console.error('Error loading build:', error);
        alert('Invalid build file');
    }
}

// Delete build
async function deleteBuild(name) {
    if (!confirm(`Delete build "${name}"?`)) return;
    
    try {
        const response = await fetch(`/api/builds/${name}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            window.location.reload();
        } else {
            alert('Failed to delete build');
        }
    } catch (error) {
        console.error('Error deleting build:', error);
        alert('Failed to delete build');
    }
}

// Export build
function exportBuild() {
    const dataStr = JSON.stringify(buildData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${buildName}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Close modals on outside click
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}
