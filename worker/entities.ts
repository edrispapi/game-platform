import { IndexedEntity } from "./core-utils";
import type { Game, UserProfile, Friend } from "@shared/types";
import { MOCK_GAMES, MOCK_USER_PROFILES, MOCK_FRIENDS } from "@shared/mock-data";
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