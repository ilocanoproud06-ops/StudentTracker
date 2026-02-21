// ============================================
// Student Grade Tracker - Data Sharing Configuration
// Works with localStorage, Firebase (optional), and shared data files
// ============================================

// Configuration
const DB_KEY = "academic_grade_system_v1";
const SYNC_STATUS_KEY = "academic_sync_status";
const LAST_SYNC_KEY = "academic_last_sync";
const SHARED_DATA_NEEDS_EXPORT_KEY = "academic_shared_data_needs_export";

// Default shared data URL - admin can host this file on GitHub Pages
// For example: https://yourusername.github.io/RepoName/data.json
// This can be customized per deployment
let SHARED_DATA_URL = "data.json";

// GitHub Pages Configuration - Auto-detect from current location
const GITHUB_PAGES_CONFIG = {
  // Auto-detect GitHub Pages URL from current location
  getBaseUrl: function() {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split("/").filter(p => p);
    // Remove the current file name to get the base path
    const basePath = pathParts.length > 0 
      ? "/" + pathParts.slice(0, -1).join("/") + "/"
      : "/";
    return window.location.origin + basePath;
  },
  
  // Get all navigation URLs for this application
  getNavigationUrls: function() {
    const baseUrl = this.getBaseUrl();
    return {
      // GitHub Pages URLs
      githubPages: {
        base: baseUrl,
        admin: baseUrl + "admin_portal.html",
        student: baseUrl + "student.html",
        login: baseUrl + "login.html",
        data: baseUrl + "data.json",
        welcome: baseUrl + "welcome.html",
        welcomeAdmin: baseUrl + "welcome_admin.html",
        welcomeStudent: baseUrl + "welcome_student.html"
      },
      // Firebase URLs (if configured)
      firebase: {
        console: "https://console.firebase.google.com/project/studentgradetracker-e04c0",
        firestore: "https://console.firebase.google.com/project/studentgradetracker-e04c0/firestore",
        auth: "https://console.firebase.google.com/project/studentgradetracker-e04c0/authentication"
      },
      // Alternative GitHub repository URLs
      alternativeRepos: [
        { name: "Main Repo", url: "https://ilocanoproud06-ops.github.io/StudentGradeTracker/" },
        { name: "Admin Repo", url: "https://ilocanoproud06-ops.github.io/StudentGradeTracker-Admin/" },
        { name: "Student Repo", url: "https://ilocanoproud06-ops.github.io/StudentGradeTracker-Student/" },
        { name: "StudentTracker", url: "https://ilocanoproud06-ops.github.io/StudentTracker/" }
      ]
    };
  },
  
  // Display URLs in console for debugging
  logUrls: function() {
    const urls = this.getNavigationUrls();
    console.log("=== Application Navigation URLs ===");
    console.log("GitHub Pages Base:", urls.githubPages.base);
    console.log("Admin Portal:", urls.githubPages.admin);
    console.log("Student Portal:", urls.githubPages.student);
    console.log("Login:", urls.githubPages.login);
    console.log("Data JSON:", urls.githubPages.data);
    return urls;
  }
};

// Check if Firebase SDK is loaded
const isFirebaseSDKLoaded = typeof firebase !== 'undefined';

// Firebase configuration (optional)
const firebaseConfig = {
  apiKey: "AIzaSyC3T9M61Ryll8scTGVWH5QdZKuAguWTzgw",
  authDomain: "studentgradetracker-e04c0.firebaseapp.com",
  projectId: "studentgradetracker-e04c0",
  storageBucket: "studentgradetracker-e04c0.firebasestorage.app",
  messagingSenderId: "886408200590",
  appId: "1:886408200590:web:c9fbdb028e5dcd442c64df"
};

let firebaseInitialized = false;
let db = null;
let auth = null;

// Try to initialize Firebase
function initializeFirebase() {
  return new Promise((resolve) => {
    if (!isFirebaseSDKLoaded) {
      resolve({ available: false, reason: 'sdk_not_loaded' });
      return;
    }

    try {
      const app = firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      firebaseInitialized = true;
      resolve({ available: true, reason: 'success' });
    } catch (error) {
      resolve({ available: false, reason: error.message });
    }
  });
}

// Set custom shared data URL (call this before init if using GitHub Pages)
function setSharedDataUrl(url) {
  SHARED_DATA_URL = url;
  console.log("Shared data URL set to:", SHARED_DATA_URL);
}

// ============================================
// Sync Manager with Multiple Storage Options
// ============================================

const SyncManager = {
  isOnline: navigator.onLine,
  firebaseAvailable: false,
  firebaseInitResult: null,
  syncInProgress: false,
  lastSyncTime: null,
  storageMode: 'local',
  autoExportEnabled: true, // Enable auto-export by default
  
  async init() {
    // Try to initialize Firebase
    const initResult = await initializeFirebase();
    this.firebaseInitResult = initResult;
    this.firebaseAvailable = initResult.available;
    
    // Determine storage mode
    if (this.firebaseAvailable && this.isOnline) {
      this.storageMode = 'firebase';
    } else {
      this.storageMode = 'local';
    }
    
    // Load last sync time
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (lastSync) {
      this.lastSyncTime = new Date(lastSync);
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateStorageMode();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.storageMode = 'local';
      this.updateStatusIndicator();
    });
    
    console.log("SyncManager initialized. Mode:", this.storageMode);
    this.updateStatusIndicator();
    
    return this;
  },
  
  updateStorageMode() {
    if (this.firebaseAvailable && this.isOnline) {
      this.storageMode = 'firebase';
    } else {
      this.storageMode = 'local';
    }
    this.updateStatusIndicator();
  },
  
  updateStatusIndicator() {
    const indicators = document.querySelectorAll('[data-sync-status]');
    indicators.forEach(el => {
      if (this.storageMode === 'firebase') {
        el.innerHTML = '<span class="badge bg-success"><i class="fas fa-cloud"></i> Cloud Synced</span>';
      } else if (!this.isOnline) {
        el.innerHTML = '<span class="badge bg-warning"><i class="fas fa-wifi"></i> Offline</span>';
      } else {
        el.innerHTML = '<span class="badge bg-info"><i class="fas fa-save"></i> Local Only</span>';
      }
    });
    
    const modeDisplays = document.querySelectorAll('[data-storage-mode]');
    modeDisplays.forEach(el => {
      el.textContent = this.storageMode === 'firebase' ? 'Cloud Mode' : 'Local Mode';
    });
  },
  
  getStatus() {
    return {
      online: this.isOnline,
      firebase: this.firebaseAvailable,
      storageMode: this.storageMode,
      lastSync: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      sharedDataUrl: SHARED_DATA_URL
    };
  },
  
  // Load data from multiple sources
  async loadData() {
    let store = this.getLocalData();
    
    // Priority 1: Try loading from shared data file (GitHub Pages URL)
    try {
      const sharedData = await this.loadFromSharedFile(SHARED_DATA_URL);
      if (sharedData && sharedData.students && sharedData.students.length > 0) {
        console.log("Loading from shared data file:", SHARED_DATA_URL);
        store = sharedData;
        this.saveLocalData(store);
        return this.ensureDefaultStructure(store);
      }
    } catch (error) {
      console.log("Shared data not available from URL:", error.message);
    }
    
    // Priority 2: Try Firebase if available
    if (this.firebaseAvailable && this.isOnline) {
      try {
        const firebaseData = await this.loadFromFirebase();
        if (firebaseData && Object.keys(firebaseData).length > 0) {
          const localTime = store && store._lastModified ? new Date(store._lastModified) : new Date(0);
          const firebaseTime = firebaseData._lastModified ? new Date(firebaseData._lastModified) : new Date(0);
          
          if (firebaseTime > localTime) {
            store = firebaseData;
            this.saveLocalData(store);
          }
        }
      } catch (error) {
        console.error("Firebase load error:", error);
      }
    }
    
    // Priority 3: If no local data, try to load from local data.json in same directory
    if (!store || !store.students || store.students.length === 0) {
      try {
        const sharedData = await this.loadFromSharedFile('data.json');
        if (sharedData && sharedData.students && sharedData.students.length > 0) {
          console.log("Loading from local data.json...");
          store = sharedData;
          this.saveLocalData(store);
        }
      } catch (error) {
        console.log("Local data.json not available:", error.message);
      }
    }
    
    return this.ensureDefaultStructure(store);
  },
  
  // Load from a shared JSON file (for student access)
  async loadFromSharedFile(url) {
    return new Promise((resolve, reject) => {
      // Try to load from the specified URL
      fetch(url + '?t=' + Date.now()) // Add timestamp to prevent caching
        .then(response => {
          if (!response.ok) throw new Error('Data file not found');
          return response.json();
        })
        .then(data => {
          console.log("Loaded shared data from:", url);
          resolve(data);
        })
        .catch(err => {
          reject(err);
        });
    });
  },
  
  async saveData(store) {
    store._lastModified = new Date().toISOString();
    this.saveLocalData(store);
    
    // Mark that shared data needs export
    this.markSharedDataNeedsExport();
    
    if (this.firebaseAvailable && this.isOnline) {
      try {
        await this.saveToFirebase(store);
        this.lastSyncTime = new Date();
        localStorage.setItem(LAST_SYNC_KEY, this.lastSyncTime.toISOString());
      } catch (error) {
        console.error("Firebase save error:", error);
      }
    }
  },
  
  async quickSave(store) {
    store._lastModified = new Date().toISOString();
    this.saveLocalData(store);
    
    // Mark that shared data needs export (for admin portal)
    this.markSharedDataNeedsExport();
    
    if (this.firebaseAvailable && this.isOnline && !this.syncInProgress) {
      this.syncToFirebaseDebounced(store);
    }
  },
  
  // Mark that shared data needs to be exported
  markSharedDataNeedsExport() {
    localStorage.setItem(SHARED_DATA_NEEDS_EXPORT_KEY, 'true');
    this.updateExportIndicator();
  },
  
  // Check if shared data needs export
  needsSharedDataExport() {
    return localStorage.getItem(SHARED_DATA_NEEDS_EXPORT_KEY) === 'true';
  },
  
  // Clear the needs export flag
  clearSharedDataExportFlag() {
    localStorage.removeItem(SHARED_DATA_NEEDS_EXPORT_KEY);
    this.updateExportIndicator();
  },
  
  // Update export indicator in UI
  updateExportIndicator() {
    const indicators = document.querySelectorAll('[data-needs-export]');
    const needsExport = this.needsSharedDataExport();
    indicators.forEach(el => {
      if (needsExport) {
        el.innerHTML = '<span class="badge bg-warning"><i class="fas fa-exclamation-triangle"></i> Export Needed</span>';
        el.style.display = '';
      } else {
        el.innerHTML = '<span class="badge bg-success"><i class="fas fa-check"></i> Up to Date</span>';
      }
    });
  },
  
  getLocalData() {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("Error parsing localStorage:", e);
      }
    }
    return null;
  },
  
  saveLocalData(store) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(store));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  },
  
  async loadFromFirebase() {
    if (!this.firebaseAvailable || !db) return null;
    
    try {
      const store = {};
      
      const collections = ['courses', 'students', 'enrollments', 'assessments', 'groups'];
      for (const col of collections) {
        const snapshot = await db.collection(col).get();
        store[col] = [];
        snapshot.forEach(doc => store[col].push(doc.data()));
      }
      
      const gradesSnapshot = await db.collection('grades').get();
      store.grades = {};
      gradesSnapshot.forEach(doc => {
        const data = doc.data();
        const id = data.id;
        delete data.id;
        store.grades[id] = data;
      });
      
      const hpsDoc = await db.collection('settings').doc('hps').get();
      if (hpsDoc.exists) store.hps = hpsDoc.data();
      
      const weightsDoc = await db.collection('settings').doc('weights').get();
      if (weightsDoc.exists) store.weights = weightsDoc.data();
      
      const gradingScaleDoc = await db.collection('settings').doc('gradingScale').get();
      if (gradingScaleDoc.exists) store.gradingScale = gradingScaleDoc.data().scale;
      
      return store;
    } catch (error) {
      console.error("Error loading from Firebase:", error);
      return null;
    }
  },
  
  async saveToFirebase(store) {
    if (!this.firebaseAvailable || !db) return;
    
    this.syncInProgress = true;
    
    try {
      const collections = ['courses', 'students', 'enrollments', 'assessments', 'groups'];
      
      for (const col of collections) {
        if (store[col] && Array.isArray(store[col])) {
          const snapshot = await db.collection(col).get();
          const deletes = snapshot.docs.map(d => d.ref.delete());
          await Promise.all(deletes);
          
          if (store[col].length > 0) {
            const adds = store[col].map(item => db.collection(col).add(item));
            await Promise.all(adds);
          }
        }
      }
      
      if (store.grades) {
        const snapshot = await db.collection('grades').get();
        const deletes = snapshot.docs.map(d => d.ref.delete());
        await Promise.all(deletes);
        
        const entries = Object.entries(store.grades);
        if (entries.length > 0) {
          const adds = entries.map(([key, value]) => 
            db.collection('grades').add({ id: key, ...value })
          );
          await Promise.all(adds);
        }
      }
      
      if (store.hps) await db.collection('settings').doc('hps').set(store.hps);
      if (store.weights) await db.collection('settings').doc('weights').set(store.weights);
      if (store.gradingScale) await db.collection('settings').doc('gradingScale').set({ scale: store.gradingScale });
      
      console.log("Data synced to Firebase");
    } catch (error) {
      console.error("Error saving to Firebase:", error);
    } finally {
      this.syncInProgress = false;
    }
  },
  
  syncToFirebaseDebounced: (function() {
    let timeout = null;
    return function(store) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => SyncManager.saveToFirebase(store), 2000);
    };
  })(),
  
  exportData() {
    const store = this.getLocalData();
    const dataStr = JSON.stringify(store, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_grade_tracker_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("Data exported");
    return true;
  },
  
  // Export data that can be shared (for students to load)
  exportSharedData() {
    const store = this.getLocalData();
    // Create a version with only essential data for students
    const sharedData = {
      students: store.students || [],
      courses: store.courses || [],
      enrollments: store.enrollments || [],
      grades: store.grades || {},
      assessments: store.assessments || [],
      hps: store.hps || {},
      weights: store.weights || {},
      gradingScale: store.gradingScale || [],
      _lastModified: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(sharedData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.json'; // Named for shared access
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Clear the needs export flag after successful export
    this.clearSharedDataExportFlag();
    
    console.log("Shared data exported as data.json");
    return true;
  },
  
  // Auto-export notification and helper
  notifyDataChanged() {
    // This can be called after any data modification
    this.markSharedDataNeedsExport();
    
    // Show notification if available
    const notificationEl = document.getElementById('exportNotification');
    if (notificationEl) {
      notificationEl.classList.remove('d-none');
      setTimeout(() => {
        notificationEl.classList.add('d-none');
      }, 5000);
    }
  },
  
  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          if (!importedData.courses || !importedData.students) {
            reject(new Error("Invalid backup file"));
            return;
          }
          
          this.saveLocalData(importedData);
          
          // Mark that shared data needs export
          this.markSharedDataNeedsExport();
          
          if (this.firebaseAvailable && this.isOnline) {
            this.saveToFirebase(importedData);
          }
          
          resolve(importedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsText(file);
    });
  },
  
  ensureDefaultStructure(store) {
    return {
      courses: store?.courses || [],
      students: store?.students || [],
      enrollments: store?.enrollments || [],
      grades: store?.grades || {},
      assessments: store?.assessments || [],
      groups: store?.groups || [],
      hps: store?.hps || { quiz: 50, pt: 100, project: 100, exam: 100 },
      weights: store?.weights || { written: 40, quiz: 20, pt: 30, project: 10 },
      gradingScale: store?.gradingScale || [
        { min: 95, max: 100, label: "A" },
        { min: 90, max: 94, label: "A-" },
        { min: 85, max: 89, label: "B+" },
        { min: 80, max: 84, label: "B" },
        { min: 75, max: 79, label: "B-" },
        { min: 70, max: 74, label: "C+" },
        { min: 65, max: 69, label: "C" },
        { min: 60, max: 64, label: "C-" },
        { min: 55, max: 59, label: "D" },
        { min: 0, max: 54, label: "F" },
      ],
      _lastModified: store?._lastModified || new Date().toISOString()
    };
  }
};

window.SyncManager = SyncManager;
window.DB_KEY = DB_KEY;
window.setSharedDataUrl = setSharedDataUrl;

document.addEventListener('DOMContentLoaded', async () => {
  await SyncManager.init();
  // Update export indicator on load
  SyncManager.updateExportIndicator();
});

// Also expose a ready function for pages that need to wait for SyncManager
window.waitForSyncManager = function() {
  return new Promise((resolve) => {
    if (SyncManager.firebaseInitResult !== null) {
      // Already initialized
      resolve(SyncManager);
    } else {
      // Wait for init to complete
      const checkInit = setInterval(() => {
        if (SyncManager.firebaseInitResult !== null) {
          clearInterval(checkInit);
          resolve(SyncManager);
        }
      }, 100);
    }
  });
};

// ============================================
// URL Display Helper Functions
// ============================================

// Get navigation URLs - can be called from any page
window.getNavigationUrls = function() {
  return GITHUB_PAGES_CONFIG.getNavigationUrls();
};

// Display URLs in a formatted way
window.displayNavigationUrls = function(containerId) {
  const urls = GITHUB_PAGES_CONFIG.getNavigationUrls();
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.log("Container not found, logging URLs instead:");
    GITHUB_PAGES_CONFIG.logUrls();
    return;
  }
  
  let html = `
    <div class="url-display-container">
      <h6 class="mb-3"><i class="fas fa-link me-2"></i>Navigation URLs</h6>
      
      <div class="mb-3">
        <label class="form-label fw-bold text-primary">Student Portal (for all networks)</label>
        <div class="input-group">
          <input type="text" class="form-control form-control-sm" value="${urls.githubPages.student}" readonly>
          <button class="btn btn-outline-primary btn-sm" onclick="navigator.clipboard.writeText('${urls.githubPages.student}'); this.innerHTML='<i class=\\'fas fa-check\\'></i>'">
            <i class="fas fa-copy"></i>
          </button>
          <a href="${urls.githubPages.student}" target="_blank" class="btn btn-outline-success btn-sm">
            <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
      </div>
      
      <div class="mb-3">
        <label class="form-label fw-bold">Admin Portal</label>
        <div class="input-group">
          <input type="text" class="form-control form-control-sm" value="${urls.githubPages.admin}" readonly>
          <button class="btn btn-outline-primary btn-sm" onclick="navigator.clipboard.writeText('${urls.githubPages.admin}'); this.innerHTML='<i class=\\'fas fa-check\\'></i>'">
            <i class="fas fa-copy"></i>
          </button>
          <a href="${urls.githubPages.admin}" target="_blank" class="btn btn-outline-success btn-sm">
            <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
      </div>
      
      <div class="mb-3">
        <label class="form-label fw-bold">Data JSON (for updates)</label>
        <div class="input-group">
          <input type="text" class="form-control form-control-sm" value="${urls.githubPages.data}" readonly>
          <button class="btn btn-outline-primary btn-sm" onclick="navigator.clipboard.writeText('${urls.githubPages.data}'); this.innerHTML='<i class=\\'fas fa-check\\'></i>'">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
      
      <hr>
      
      <h6 class="mb-2"><i class="fas fa-server me-2"></i>Alternative Access URLs</h6>
      <div class="list-group list-group-sm">`;
  
  urls.alternativeRepos.forEach(repo => {
    html += `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>${repo.name}</span>
          <div>
            <button class="btn btn-xs btn-outline-primary me-1" onclick="navigator.clipboard.writeText('${repo.url}'); alert('URL copied!')">
              <i class="fas fa-copy"></i>
            </button>
            <a href="${repo.url}" target="_blank" class="btn btn-xs btn-outline-success">
              <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </div>`;
  });
  
  html += `
      </div>
      
      <hr>
      
      <h6 class="mb-2"><i class="fas fa-database me-2"></i>Firebase Console</h6>
      <div class="list-group list-group-sm">
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>Firestore</span>
          <a href="${urls.firebase.firestore}" target="_blank" class="btn btn-xs btn-outline-info">
            <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
};

// Create a modal with all URLs
window.showUrlModal = function() {
  const urls = GITHUB_PAGES_CONFIG.getNavigationUrls();
  
  // Remove existing modal if any
  const existingModal = document.getElementById('urlDisplayModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modalHtml = `
    <div class="modal fade" id="urlDisplayModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-link me-2"></i>Grade Viewer Access URLs
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              <strong>Share these URLs with students!</strong> They can access the grade viewer from any network.
            </div>
            
            <div class="mb-4">
              <label class="form-label fw-bold text-success fs-5">🎓 Student Portal (Main)</label>
              <div class="input-group input-group-lg">
                <input type="text" class="form-control fw-bold" value="${urls.githubPages.student}" id="mainStudentUrl" readonly>
                <button class="btn btn-success" onclick="navigator.clipboard.writeText(document.getElementById('mainStudentUrl').value); this.innerHTML='<i class=\\'fas fa-check\\'></i> Copied!'">
                  <i class="fas fa-copy"></i> Copy
                </button>
                <a href="${urls.githubPages.student}" target="_blank" class="btn btn-primary">
                  <i class="fas fa-external-link-alt"></i> Open
                </a>
              </div>
            </div>
            
            <div class="mb-4">
              <label class="form-label fw-bold">Alternative URLs</label>
              <div class="list-group">`;
  
  urls.alternativeRepos.forEach(repo => {
    modalHtml += `
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-bold">${repo.name}</span>
                    <div class="input-group" style="max-width: 400px;">
                      <input type="text" class="form-control form-control-sm" value="${repo.url}" readonly>
                      <button class="btn btn-outline-primary btn-sm" onclick="navigator.clipboard.writeText('${repo.url}'); alert('Copied!')">
                        <i class="fas fa-copy"></i>
                      </button>
                      <a href="${repo.url}" target="_blank" class="btn btn-outline-success btn-sm">
                        <i class="fas fa-external-link-alt"></i>
                      </a>
                    </div>
                  </div>
                </div>`;
  });
  
  modalHtml += `
              </div>
            </div>
            
            <div class="mb-4">
              <label class="form-label fw-bold">Admin Portal (for teachers)</label>
              <div class="input-group">
                <input type="text" class="form-control" value="${urls.githubPages.admin}" readonly>
                <button class="btn btn-outline-primary" onclick="navigator.clipboard.writeText('${urls.githubPages.admin}'); alert('Copied!')">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
            
            <div class="alert alert-warning">
              <i class="fas fa-sync me-2"></i>
              <strong>Auto-Sync Status:</strong> Changes made in Admin Portal are automatically synced to Firebase. 
              For GitHub Pages, use "Export Shared Data" button to update student data.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('urlDisplayModal'));
  modal.show();
};

// Initialize GitHub Pages URL on load
document.addEventListener('DOMContentLoaded', function() {
  // Auto-detect and set the shared data URL
  const detectedUrl = GITHUB_PAGES_CONFIG.getBaseUrl() + 'data.json';
  setSharedDataUrl(detectedUrl);
  console.log("Auto-detected shared data URL:", detectedUrl);
  
  // Log all URLs for debugging
  GITHUB_PAGES_CONFIG.logUrls();
});

