import { IndexedEntity } from "./core-utils";
import type { Game, UserProfile, Friend, Order, Notification, FriendRequest, Achievement, ChatMessage } from "@shared/types";
import { MOCK_GAMES, MOCK_USER_PROFILES, MOCK_FRIENDS, MOCK_NOTIFICATIONS, MOCK_FRIEND_REQUESTS, MOCK_ACHIEVEMENTS, MOCK_ORDERS, MOCK_CHAT_MESSAGES } from "@shared/mock-data";
// GAME ENTITY: one DO instance per game
export class GameEntity extends IndexedEntity<Game> {
  static readonly entityName = "game";
  static readonly indexName = "games";
  static readonly initialState: Game = {
    id: "",
    slug: "",
    title: "",
    description: "",
    price: 0,
    coverImage: "",
    bannerImage: "",
    tags: [],
    screenshots: [],
    videos: [],
    reviews: [],
    requirements: {
      os: "",
      processor: "",
      memory: "",
      graphics: "",
      storage: "",
    },
  };
  static seedData = MOCK_GAMES;
}
// USER ENTITY: one DO instance per user profile
export class UserEntity extends IndexedEntity<UserProfile> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: UserProfile = {
    id: "",
    username: "",
    bio: "",
    avatar: "",
    hoursPlayed: 0,
    achievementsCount: 0,
    friendsCount: 0,
    favoriteGames: [],
    settings: {
      profilePublic: true,
      emailNotifications: true,
    },
  };
  static seedData = MOCK_USER_PROFILES;
}
// FRIEND ENTITY: one DO instance per friend
export class FriendEntity extends IndexedEntity<Friend> {
  static readonly entityName = "friend";
  static readonly indexName = "friends";
  static readonly initialState: Friend = {
    id: "",
    username: "",
    avatar: "",
    status: "Offline",
  };
  static seedData = MOCK_FRIENDS;
}
// ORDER ENTITY: one DO instance per order
export class OrderEntity extends IndexedEntity<Order> {
  static readonly entityName = "order";
  static readonly indexName = "orders";
  static readonly initialState: Order = {
    id: "",
    userId: "",
    items: [],
    total: 0,
    createdAt: 0,
  };
  static seedData = MOCK_ORDERS;
}
// NOTIFICATION ENTITY: one DO instance per notification
export class NotificationEntity extends IndexedEntity<Notification> {
  static readonly entityName = "notification";
  static readonly indexName = "notifications";
  static readonly initialState: Notification = {
    id: "",
    type: "system",
    message: "",
    read: false,
    createdAt: 0,
  };
  static seedData = MOCK_NOTIFICATIONS;
}
// FRIEND REQUEST ENTITY
export class FriendRequestEntity extends IndexedEntity<FriendRequest> {
  static readonly entityName = "friendRequest";
  static readonly indexName = "friendRequests";
  static readonly initialState: FriendRequest = {
    id: "",
    fromUserId: "",
    fromUsername: "",
    fromUserAvatar: "",
    status: "pending",
  };
  static seedData = MOCK_FRIEND_REQUESTS;
}
// ACHIEVEMENT ENTITY
export class AchievementEntity extends IndexedEntity<Achievement> {
    static readonly entityName = "achievement";
    static readonly indexName = "achievements";
    static readonly initialState: Achievement = {
        id: "",
        name: "",
        description: "",
        icon: "",
        rarity: "Common",
        progress: 0,
        unlocked: false,
    };
    static seedData = MOCK_ACHIEVEMENTS;
}
// CHAT MESSAGE ENTITY: one DO instance per message
export class ChatMessageEntity extends IndexedEntity<ChatMessage> {
  static readonly entityName = "chatMessage";
  static readonly indexName = "chatMessages";
  static readonly initialState: ChatMessage = {
    id: "",
    chatId: "",
    userId: "",
    text: "",
    ts: 0,
  };
  static seedData = MOCK_CHAT_MESSAGES;
}