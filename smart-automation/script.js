/* ========================================
   Smart Room Energy Automation - JavaScript
   ======================================== */

// Device configuration with wattage
const DEVICES = {
    light: { name: 'Light', watt: 60 },
    fan: { name: 'Fan', watt: 75 },
    ac: { name: 'AC', watt: 1200 },
    computer: { name: 'Computer', watt: 200 },
    charger: { name: 'Charger', watt: 25 }
};

// Room names mapping
const ROOMS = {
    'living-room': 'Living Room',
    'bedroom': 'Bedroom',
    'kitchen': 'Kitchen',
    'office': 'Office'
};

// Current state variables
let currentUser = null;
let currentRoom = 'living-room';
let deviceTimers = {}; // Store running time for each device
let usageHistory = []; // Store usage patterns for AI prediction
let updateInterval = null;

// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================

/**
 * Switch between login and register forms
 * @param {string} type - 'login' or 'register'
 */
function showAuth(type) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.tab-btn');
    
    if (type === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

/**
 * Register new user with username and password
 */
function register() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const errorMsg = document.getElementById('register-error');
    
    // Validation
    if (!username || !password) {
        errorMsg.textContent = 'Please fill in all fields';
        return;
    }
    
    if (password.length < 4) {
        errorMsg.textContent = 'Password must be at least 4 characters';
        return;
    }
    
    // Get existing users from localStorage
    const users = JSON.parse(localStorage.getItem('smartEnergyUsers')) || {};
    
    // Check if username already exists
    if (users[username]) {
        errorMsg.textContent = 'Username already exists!';
        return;
    }
    
    // Save new user
    users[username] = { password: password, rooms: {} };
    localStorage.setItem('smartEnergyUsers', JSON.stringify(users));
    
    // Initialize default room data for new user
    initializeUserRooms(username);
    
    // Clear form
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    errorMsg.textContent = '';
    
    // Show success and switch to login
    alert('Registration successful! Please login.');
    showAuth('login');
}

/**
 * Login with existing credentials
 */
function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    
    // Validation
    if (!username || !password) {
        errorMsg.textContent = 'Please fill in all fields';
        return;
    }
    
    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('smartEnergyUsers')) || {};
    
    // Check credentials
    if (!users[username]) {
        errorMsg.textContent = 'Username not found!';
        return;
    }
    
    if (users[username].password !== password) {
        errorMsg.textContent = 'Wrong password!';
        return;
    }
    
    // Login successful
    currentUser = username;
    localStorage.setItem('smartEnergyCurrentUser', username);
    
    // Clear form
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    errorMsg.textContent = '';
    
    // Show dashboard
    showDashboard();
}

/**
 * Logout current user
 */
function logout() {
    // Stop the update interval
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Save current state before logout
    saveRoomData();
    
    // Clear current user
    currentUser = null;
    localStorage.removeItem('smartEnergyCurrentUser');
    
    // Show auth section
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
}

/**
 * Initialize user rooms with default device states
 */
function initializeUserRooms(username) {
    const users = JSON.parse(localStorage.getItem('smartEnergyUsers'));
    
    // Initialize each room with default device states
    Object.keys(ROOMS).forEach(roomId => {
        if (!users[username].rooms[roomId]) {
            users[username].rooms[roomId] = {
                devices: {
                    light: { on: false, time: 0 },
                    fan: { on: false, time: 0 },
                    ac: { on: false, time: 0 },
                    computer: { on: false, time: 0 },
                    charger: { on: false, time: 0 }
                },
                usageHistory: []
            };
        }
    });
    
    localStorage.setItem('smartEnergyUsers', JSON.stringify(users));
}

// ========================================
// DASHBOARD FUNCTIONS
// ========================================

/**
 * Show dashboard after successful login
 */
function showDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    
    // Update user greeting
    document.getElementById('user-greeting').textContent = `Hello, ${currentUser}!`;
    
    // Load saved theme
    loadTheme();
    
    // Load saved room preference
    const savedRoom = localStorage.getItem(`smartEnergyRoom_${currentUser}`);
    if (savedRoom) {
        currentRoom = savedRoom;
        document.getElementById('room-select').value = savedRoom;
    }
    
    // Initialize user rooms if needed
    initializeUserRooms(currentUser);
    
    // Load room data
    loadRoomData();
    
    // Load usage history for AI prediction
    loadUsageHistory();
    
    // Start the update interval (runs every minute)
    startUpdateInterval();
    
    // Update display
    updateDashboardDisplay();
}

/**
 * Load room data from localStorage
 */
function loadRoomData() {
    const users = JSON.parse(localStorage.getItem('smartEnergyUsers'));
    const roomData = users[currentUser].rooms[currentRoom];
    
    if (roomData) {
        // Update device toggles
        Object.keys(roomData.devices).forEach(deviceId => {
            const device = roomData.devices[deviceId];
            document.getElementById(`toggle-${deviceId}`).checked = device.on;
            deviceTimers[deviceId] = device.time;
            updateDeviceCard(deviceId, device.on);
        });
    }
}

/**
 * Save room data to localStorage
 */
function saveRoomData() {
    const users = JSON.parse(localStorage.getItem('smartEnergyUsers'));
    
    if (!users[currentUser].rooms[currentRoom]) {
        users[currentUser].rooms[currentRoom] = {
            devices: {},
            usageHistory: []
        };
    }
    
    // Save device states
    Object.keys(DEVICES).forEach(deviceId => {
        const isOn = document.getElementById(`toggle-${deviceId}`).checked;
        users[currentUser].rooms[currentRoom].devices[deviceId] = {
            on: isOn,
            time: deviceTimers[deviceId] || 0
        };
    });
    
    // Save usage history
    users[currentUser].rooms[currentRoom].usageHistory = usageHistory;
    
    localStorage.setItem('smartEnergyUsers', JSON.stringify(users));
}

/**
 * Change selected room
 */
function changeRoom() {
    // Save current room data before switching
    saveRoomData();
    
    // Get new room
    currentRoom = document.getElementById('room-select').value;
    localStorage.setItem(`smartEnergyRoom_${currentUser}`, currentRoom);
    
    // Reset device timers for new room
    Object.keys(DEVICES).forEach(deviceId => {
        deviceTimers[deviceId] = 0;
    });
    
    // Load new room data
    loadRoomData();
    
    // Load usage history for new room
    loadUsageHistory();
    
    // Update dashboard
    updateDashboardDisplay();
}

/**
 * Start interval to update energy usage every minute
 */
function startUpdateInterval() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Update every minute (60000 milliseconds)
    updateInterval = setInterval(() => {
        updateDeviceTimers();
        updateDashboardDisplay();
    }, 60000); // Every 60 seconds
}

/**
 * Update device running times
 */
function updateDeviceTimers() {
    Object.keys(DEVICES).forEach(deviceId => {
        const isOn = document.getElementById(`toggle-${deviceId}`).checked;
        
        if (isOn) {
            // Increment timer by 1 minute
            deviceTimers[deviceId] = (deviceTimers[deviceId] || 0) + 1;
            
            // Record usage for AI prediction (every 5 minutes)
            if (deviceTimers[deviceId] % 5 === 0) {
                recordUsage(deviceId);
            }
            
            // Update timer display
            document.getElementById(`timer-${deviceId}`).textContent = 
                formatTime(deviceTimers[deviceId]);
            
            // Save data
            saveRoomData();
        }
    });
}

/**
 * Record device usage for AI prediction
 */
function recordUsage(deviceId) {
    const now = new Date();
    const usageRecord = {
        deviceId: deviceId,
        hour: now.getHours(),
        day: now.getDay(),
        timestamp: now.toISOString()
    };
    
    usageHistory.push(usageRecord);
    
    // Keep only last 100 records
    if (usageHistory.length > 100) {
        usageHistory = usageHistory.slice(-100);
    }
    
    // Save to localStorage
    saveRoomData();
}

/**
 * Load usage history for current room
 */
function loadUsageHistory() {
    const users = JSON.parse(localStorage.getItem('smartEnergyUsers'));
    if (users[currentUser].rooms[currentRoom]) {
        usageHistory = users[currentUser].rooms[currentRoom].usageHistory || [];
    }
}

// ========================================
// DEVICE CONTROL FUNCTIONS
// ========================================

/**
 * Toggle device on/off
 */
function toggleDevice(deviceId) {
    const toggle = document.getElementById(`toggle-${deviceId}`);
    const isOn = toggle.checked;
    
    // Update device card styling
    updateDeviceCard(deviceId, isOn);
    
    // Initialize timer if needed
    if (!deviceTimers[deviceId]) {
        deviceTimers[deviceId] = 0;
    }
    
    // If turning on, record usage
    if (isOn) {
        recordUsage(deviceId);
    }
    
    // Update dashboard
    updateDashboardDisplay();
    
    // Save state
    saveRoomData();
}

/**
 * Update device card appearance
 */
function updateDeviceCard(deviceId, isOn) {
    const card = document.getElementById(`device-${deviceId}`);
    const status = document.getElementById(`status-${deviceId}`);
    
    if (isOn) {
        card.classList.add('active');
        status.textContent = 'ON';
        status.className = 'device-status on';
    } else {
        card.classList.remove('active');
        status.textContent = 'OFF';
        status.className = 'device-status off';
    }
}

// ========================================
// DASHBOARD UPDATE FUNCTIONS
// ========================================

/**
 * Update all dashboard displays
 */
function updateDashboardDisplay() {
    updateEnergyStats();
    checkWarnings();
    runAIPrediction();
}

/**
 * Update energy statistics
 */
function updateEnergyStats() {
    let totalPower = 0;
    let activeCount = 0;
    
    Object.keys(DEVICES).forEach(deviceId => {
        const isOn = document.getElementById(`toggle-${deviceId}`).checked;
        
        if (isOn) {
            totalPower += DEVICES[deviceId].watt;
            activeCount++;
        }
    });
    
    // Calculate energy usage (Wh) - assuming power has been running for the accumulated time
    let totalEnergy = 0;
    Object.keys(DEVICES).forEach(deviceId => {
        const time = deviceTimers[deviceId] || 0; // in minutes
        const isOn = document.getElementById(`toggle-${deviceId}`).checked;
        
        if (isOn || time > 0) {
            // Energy = Power (W) × Time (hours)
            const hours = time / 60;
            totalEnergy += DEVICES[deviceId].watt * hours;
        }
    });
    
    // Update displays
    document.getElementById('total-power').textContent = totalPower;
    document.getElementById('energy-usage').textContent = totalEnergy.toFixed(1);
    document.getElementById('active-devices').textContent = activeCount;
}

/**
 * Check for devices running more than 2 hours
 */
function checkWarnings() {
    const warningCard = document.getElementById('warning-card');
    const warningMsg = document.getElementById('warning-msg');
    let hasWarning = false;
    let warningDevices = [];
    
    Object.keys(DEVICES).forEach(deviceId => {
        const time = deviceTimers[deviceId] || 0;
        const isOn = document.getElementById(`toggle-${deviceId}`).checked;
        
        // Check if device has been running for more than 2 hours (120 minutes)
        if (isOn && time > 120) {
            hasWarning = true;
            warningDevices.push(DEVICES[deviceId].name);
        }
    });
    
    if (hasWarning) {
        warningCard.style.display = 'block';
        warningMsg.textContent = `${warningDevices.join(', ')} running > 2 hours!`;
    } else {
        warningCard.style.display = 'none';
    }
}

// ========================================
// AI PREDICTION FUNCTIONS (Rule-based)
// ========================================

/**
 * Run AI prediction based on usage history
 * This uses rule-based logic to analyze usage patterns
 */
function runAIPrediction() {
    const predictionContainer = document.getElementById('prediction-container');
    const predictionMsg = document.getElementById('prediction-msg');
    
    // Need at least 5 records to make predictions
    if (usageHistory.length < 5) {
        predictionContainer.style.display = 'none';
        return;
    }
    
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Analyze usage patterns - count usage by hour
    const hourlyUsage = {};
    
    usageHistory.forEach(record => {
        const hourKey = record.hour;
        hourlyUsage[hourKey] = (hourlyUsage[hourKey] || 0) + 1;
    });
    
    // Find most common usage hour
    let maxHourCount = 0;
    let commonHour = null;
    
    Object.keys(hourlyUsage).forEach(hour => {
        if (hourlyUsage[hour] > maxHourCount) {
            maxHourCount = hourlyUsage[hour];
            commonHour = parseInt(hour);
        }
    });
    
    // Generate prediction message based on patterns
    let prediction = '';
    
    if (commonHour !== null && maxHourCount >= 3) {
        const hourDiff = commonHour - currentHour;
        
        // If the common usage hour is within 2 hours from now
        if (hourDiff > 0 && hourDiff <= 2) {
            prediction = `Based on your habits, devices are typically used around ${formatHour(commonHour)}. Consider turning them on early!`;
        } else if (hourDiff < 0 && hourDiff >= -2) {
            prediction = `You often use devices around this time (${formatHour(commonHour)}). Current usage pattern detected!`;
        } else if (maxHourCount >= 5) {
            prediction = `Strong usage pattern detected: You regularly use devices at ${formatHour(commonHour)}.`;
        }
    }
    
    // Check for weekend vs weekday patterns
    const weekendUsage = usageHistory.filter(r => r.day === 0 || r.day === 6).length;
    const weekdayUsage = usageHistory.length - weekendUsage;
    
    if (weekendUsage > weekdayUsage && (currentDay === 0 || currentDay === 6)) {
        prediction = prediction ? prediction + ' Weekend usage pattern detected!' : 'Higher weekend usage detected!';
    }
    
    // Display prediction if we have one
    if (prediction) {
        predictionContainer.style.display = 'block';
        predictionMsg.textContent = prediction;
    } else {
        predictionContainer.style.display = 'none';
    }
}

/**
 * Format hour for display
 */
function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour > 12) return `${hour - 12} PM`;
    return `${hour} AM`;
}

/**
 * Format minutes to readable time
 */
function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
        return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
}

// ========================================
// THEME FUNCTIONS
// ========================================

/**
 * Toggle between dark and light theme
 */
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const currentTheme = body.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        body.setAttribute('data-theme', 'light');
        themeIcon.textContent = '🌙';
        localStorage.setItem(`smartEnergyTheme_${currentUser}`, 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        localStorage.setItem(`smartEnergyTheme_${currentUser}`, 'dark');
    }
}

/**
 * Load saved theme preference
 */
function loadTheme() {
    const savedTheme = localStorage.getItem(`smartEnergyTheme_${currentUser}`);
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    } else {
        body.setAttribute('data-theme', 'light');
        themeIcon.textContent = '🌙';
    }
}

// ========================================
// PDF EXPORT FUNCTIONS
// ========================================

/**
 * Export energy report as PDF
 * Uses jsPDF library to generate PDF
 */
function exportPDF() {
    // Import jsPDF
    const { jsPDF } = window.jspdf;
    
    // Create new PDF document
    const doc = new jsPDF();
    
    // Get current data
    const roomName = ROOMS[currentRoom];
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    
    // Get energy stats
    let totalPower = 0;
    let totalEnergy = 0;
    let activeDevices = [];
    
    Object.keys(DEVICES).forEach(deviceId => {
        const isOn = document.getElementById(`toggle-${deviceId}`).checked;
        const time = deviceTimers[deviceId] || 0;
        
        if (isOn) {
            totalPower += DEVICES[deviceId].watt;
            activeDevices.push(DEVICES[deviceId].name);
        }
        
        const hours = time / 60;
        totalEnergy += DEVICES[deviceId].watt * hours;
    });
    
    // Add title
    doc.setFontSize(22);
    doc.setTextColor(52, 152, 219);
    doc.text('Smart Energy Report', 105, 25, { align: 'center' });
    
    // Add room and date info
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Room: ${roomName}`, 20, 45);
    doc.text(`Date: ${dateStr}`, 20, 55);
    doc.text(`Time: ${timeStr}`, 20, 65);
    
    // Add summary section
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Energy Summary', 20, 85);
    
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(`Total Power Consumption: ${totalPower} W`, 25, 100);
    doc.text(`Total Energy Used: ${totalEnergy.toFixed(2)} Wh`, 25, 110);
    doc.text(`Active Devices: ${activeDevices.length}`, 25, 120);
    
    if (activeDevices.length > 0) {
        doc.text(`Currently On: ${activeDevices.join(', ')}`, 25, 130);
    }
    
    // Add device details table
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Device Details', 20, 150);
    
    let yPos = 165;
    doc.setFontSize(11);
    doc.setTextColor(80);
    
    // Table header
    doc.setFillColor(52, 152, 219);
    doc.rect(20, yPos - 5, 170, 10, 'F');
    doc.setTextColor(255);
    doc.text('Device', 25, yPos + 2);
    doc.text('Power (W)', 80, yPos + 2);
    doc.text('Status', 120, yPos + 2);
    doc.text('Runtime', 155, yPos + 2);
    
    yPos += 15;
    
    // Device rows
    Object.keys(DEVICES).forEach(deviceId => {
        const device = DEVICES[deviceId];
        const isOn = document.getElementById(`toggle-${deviceId}`).checked;
        const time = deviceTimers[deviceId] || 0;
        
        // Alternate row colors
        if (yPos % 25 === 10) {
            doc.setFillColor(245, 247, 250);
            doc.rect(20, yPos - 5, 170, 12, 'F');
        }
        
        doc.setTextColor(80);
        doc.text(device.name, 25, yPos);
        doc.text(device.watt.toString(), 80, yPos);
        doc.text(isOn ? 'ON' : 'OFF', 120, yPos);
        doc.text(formatTime(time), 155, yPos);
        
        yPos += 12;
    });
    
    // Add footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Generated by Smart Room Energy Automation', 105, 285, { align: 'center' });
    
    // Save the PDF
    const filename = `energy_report_${currentRoom}_${dateStr.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
}

// ========================================
// INITIALIZATION
// ========================================

// Check if user is already logged in on page load
window.onload = function() {
    const savedUser = localStorage.getItem('smartEnergyCurrentUser');
    
    if (savedUser) {
        // Check if user still exists in localStorage
        const users = JSON.parse(localStorage.getItem('smartEnergyUsers'));
        if (users && users[savedUser]) {
            currentUser = savedUser;
            showDashboard();
        } else {
            // User no longer exists, show auth
            showAuth('login');
        }
    } else {
        showAuth('login');
    }
};
