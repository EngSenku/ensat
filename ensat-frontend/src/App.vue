<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { auth, provider } from './firebaseConfig';
import { signInWithPopup, signOut } from 'firebase/auth';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const TOKEN_KEY = 'sanctum_token';

// State Management
const user = ref(null);
const token = ref(localStorage.getItem(TOKEN_KEY));
const students = ref([]);
const isLoading = ref(false);
const error = ref(null);

const form = ref({
  id: null,
  name: '',
  email: '',
  major: ''
});

const isEditing = computed(() => form.value.id !== null);

// Axios Instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: token.value ? `Bearer ${token.value}` : ''
  }
});

// Authentication Functions
const handleGoogleLogin = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const result = await signInWithPopup(auth, provider);
    const googleUser = result.user;

    const response = await axios.post(`${API_BASE_URL}/auth/google`, {
      name: googleUser.displayName,
      email: googleUser.email,
      google_id: googleUser.uid
    });

    token.value = response.data.access_token;
    user.value = response.data.user;
    localStorage.setItem(TOKEN_KEY, token.value);
    
    api.defaults.headers.Authorization = `Bearer ${token.value}`;
    await fetchStudents();
  } catch (err) {
    console.error('Authentication failed:', err);
    error.value = 'Failed to authenticate with Google. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const handleLogout = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    if (token.value) {
      await api.post('/logout');
    }
    await signOut(auth);
    
    token.value = null;
    user.value = null;
    students.value = [];
    localStorage.removeItem(TOKEN_KEY);
    api.defaults.headers.Authorization = '';
  } catch (err) {
    console.error('Logout failed:', err);
    error.value = 'Failed to logout properly. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

// CRUD Operations
const fetchStudents = async () => {
  if (!token.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const response = await api.get('/students');
    students.value = response.data;
  } catch (err) {
    console.error('Failed to fetch students:', err);
    error.value = 'Failed to load students. Please refresh the page.';
  } finally {
    isLoading.value = false;
  }
};

const validateForm = () => {
  if (!form.value.name.trim()) {
    error.value = 'Student name is required.';
    return false;
  }
  if (!form.value.email.trim() || !form.value.email.includes('@')) {
    error.value = 'Valid email address is required.';
    return false;
  }
  if (!form.value.major.trim()) {
    error.value = 'Major is required.';
    return false;
  }
  return true;
};

const saveStudent = async () => {
  if (!validateForm()) return;

  isLoading.value = true;
  error.value = null;

  try {
    if (isEditing.value) {
      await api.put(`/students/${form.value.id}`, {
        name: form.value.name,
        email: form.value.email,
        major: form.value.major
      });
    } else {
      await api.post('/students', {
        name: form.value.name,
        email: form.value.email,
        major: form.value.major
      });
    }
    
    resetForm();
    await fetchStudents();
  } catch (err) {
    console.error('Failed to save student:', err);
    error.value = `Failed to ${isEditing.value ? 'update' : 'create'} student. Please try again.`;
  } finally {
    isLoading.value = false;
  }
};

const deleteStudent = async (id) => {
  if (!confirm('Are you sure you want to delete this student?')) return;

  isLoading.value = true;
  error.value = null;

  try {
    await api.delete(`/students/${id}`);
    await fetchStudents();
  } catch (err) {
    console.error('Failed to delete student:', err);
    error.value = 'Failed to delete student. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const editStudent = (student) => {
  form.value = {
    id: student.id,
    name: student.name,
    email: student.email,
    major: student.major
  };
  error.value = null;
};

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    email: '',
    major: ''
  };
  error.value = null;
};

// Lifecycle Hook
onMounted(async () => {
  if (token.value) {
    await fetchStudents();
  }
});
</script>

<template>
  <div class="container">
    <header class="app-header">
      <h1 class="app-title">ENSAT Student Manager</h1>
    </header>

    <!-- Error Message -->
    <div v-if="error" class="alert alert-error">
      {{ error }}
      <button @click="error = null" class="alert-close">&times;</button>
    </div>

    <!-- Login View -->
    <div v-if="!token" class="login-container">
      <div class="login-card">
        <h2>Welcome</h2>
        <p>Please sign in to manage students</p>
        <button 
          @click="handleGoogleLogin" 
          :disabled="isLoading"
          class="btn btn-google"
        >
          <span v-if="!isLoading">Sign in with Google</span>
          <span v-else>Signing in...</span>
        </button>
      </div>
    </div>

    <!-- Main Application View -->
    <div v-else class="main-content">
      <!-- User Header -->
      <div class="user-header">
        <div class="user-info">
          <span class="welcome-text">Welcome, <strong>{{ user?.name || 'User' }}</strong></span>
        </div>
        <button 
          @click="handleLogout" 
          :disabled="isLoading"
          class="btn btn-secondary"
        >
          Logout
        </button>
      </div>

      <!-- Student Form -->
      <section class="form-section">
        <h2 class="section-title">{{ isEditing ? 'Edit Student' : 'Add New Student' }}</h2>
        <form @submit.prevent="saveStudent" class="student-form">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input 
              id="name"
              v-model="form.name" 
              type="text"
              placeholder="Enter student name"
              :disabled="isLoading"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="email">Email Address</label>
            <input 
              id="email"
              v-model="form.email" 
              type="email"
              placeholder="student@ensat.ac.ma"
              :disabled="isLoading"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="major">Major</label>
            <input 
              id="major"
              v-model="form.major" 
              type="text"
              placeholder="e.g., GI, GC, GM"
              :disabled="isLoading"
              required
            />
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              :disabled="isLoading"
              class="btn btn-primary"
            >
              {{ isEditing ? 'Update Student' : 'Add Student' }}
            </button>
            <button 
              v-if="isEditing" 
              @click="resetForm" 
              type="button"
              :disabled="isLoading"
              class="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      <!-- Students Table -->
      <section class="table-section">
        <h2 class="section-title">Students List</h2>
        
        <div v-if="isLoading" class="loading">Loading students...</div>
        
        <div v-else-if="students.length === 0" class="empty-state">
          <p>No students found. Add your first student above.</p>
        </div>
        
        <div v-else class="table-wrapper">
          <table class="students-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Major</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in students" :key="student.id">
                <td>{{ student.name }}</td>
                <td>{{ student.email }}</td>
                <td><span class="badge">{{ student.major }}</span></td>
                <td class="actions-cell">
                  <button 
                    @click="editStudent(student)" 
                    :disabled="isLoading"
                    class="btn btn-small btn-secondary"
                  >
                    Edit
                  </button>
                  <button 
                    @click="deleteStudent(student.id)" 
                    :disabled="isLoading"
                    class="btn btn-small btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Base Styles */
* {
  box-sizing: border-box;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  color: #333;
}

/* Header */
.app-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.app-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

/* Alert */
.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-error {
  background-color: #fee;
  color: #c00;
  border: 1px solid #fcc;
}

.alert-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: inherit;
  padding: 0;
  width: 24px;
  height: 24px;
}

/* Login */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.login-card h2 {
  margin: 0 0 10px;
  color: #1f2937;
}

.login-card p {
  color: #6b7280;
  margin-bottom: 30px;
}

/* User Header */
.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.welcome-text {
  font-size: 1rem;
  color: #4b5563;
}

/* Sections */
.form-section,
.table-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px;
}

/* Form */
.student-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
}

/* Buttons */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #4b5563;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-google {
  background-color: #db4437;
  color: white;
  padding: 12px 24px;
  font-size: 1.1rem;
}

.btn-google:hover:not(:disabled) {
  background-color: #c23321;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.875rem;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
}

.students-table th,
.students-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.students-table th {
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.students-table tbody tr:hover {
  background-color: #f9fafb;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  background-color: #dbeafe;
  color: #1e40af;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* States */
.loading,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

/* Responsive */
@media (max-width: 768px) {
  .student-form {
    grid-template-columns: 1fr;
  }
  
  .user-header {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .actions-cell {
    flex-direction: column;
  }
}
</style>