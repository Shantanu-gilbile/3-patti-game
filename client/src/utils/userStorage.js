/**
 * Helper to manage user guest profile in localStorage
 */

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '👑', '🃏', '🥷', '🚀', '💎'];

export function getStoredUser() {
  const stored = localStorage.getItem('teen_patti_user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      // Daily topup check
      const lastTopup = user.lastTopupDate || 0;
      const today = new Date().toDateString();
      if (lastTopup !== today && user.chips < 5000) {
        user.chips = Math.max(user.chips + 5000, 10000);
        user.lastTopupDate = today;
        localStorage.setItem('teen_patti_user', JSON.stringify(user));
      }
      return user;
    } catch (e) {
      // fallback
    }
  }

  // Create new guest user
  const randomId = 'user_' + Math.random().toString(36).substring(2, 9);
  const randomNum = Math.floor(100 + Math.random() * 900);
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const newUser = {
    id: randomId,
    name: `Player ${randomNum}`,
    avatar,
    chips: 10000,
    lastTopupDate: new Date().toDateString()
  };

  localStorage.setItem('teen_patti_user', JSON.stringify(newUser));
  return newUser;
}

export function saveUser(user) {
  localStorage.setItem('teen_patti_user', JSON.stringify(user));
}

export { AVATARS };
