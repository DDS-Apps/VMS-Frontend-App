import { User } from '../types';
import { InMemoryStorage } from '../utils/storage';

class UserService {
  private storage = new InMemoryStorage<User>();
  private currentUserId: string | null = null;

  setCurrentUser(user: User): void {
    this.storage.set(user.id, user);
    this.currentUserId = user.id;
  }

  getCurrentUser(): User | undefined {
    if (!this.currentUserId) return undefined;
    return this.storage.get(this.currentUserId);
  }

  updateUser(userId: string, updates: Partial<User>): User | undefined {
    const user = this.storage.get(userId);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.storage.set(userId, updatedUser);
    return updatedUser;
  }

  logout(): void {
    this.currentUserId = null;
  }
}

export const userService = new UserService();
