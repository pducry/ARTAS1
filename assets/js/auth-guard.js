import { onAuth } from './auth.js';

// Redirect to login if user is not authenticated
export function requireAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuth((user) => {
      unsubscribe();
      if (!user) {
        window.location.href = 'login.html';
      } else {
        resolve(user);
      }
    });
  });
}

// Check if user is logged in (non-blocking)
export function checkAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuth((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
