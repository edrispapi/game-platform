import { IndexedEntity } from "./core-utils";
import type { Game } from "@shared/types";
import { MOCK_GAMES } from "@shared/mock-data";
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