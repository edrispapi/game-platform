// Game avatar icons derived from the provided PDF:
// "Game Icon URLs (256×256, Square and Text-Free).pdf"
// Each URL is a 256x256 clean square icon from the Steam CDN.

export const GAME_AVATAR_ICONS: string[] = [
  "http://media.steampowered.com/steamcommunity/public/images/apps/1245620/2e048bfc2073ca30804ed5b8c454a9ca0e2f98de.jpg", // Elden Ring
  "http://media.steampowered.com/steamcommunity/public/images/apps/1145360/c2af83dde08c0636a1cd511abd0f9290913e6249.jpg", // Hades
  "http://media.steampowered.com/steamcommunity/public/images/apps/292030/0c2b6de9fa0936f7d9803b8c8370d5503e922b9d.jpg", // The Witcher 3
  "http://media.steampowered.com/steamcommunity/public/images/apps/367520/29492c0a65a3d03943a8f4ab786c93a95a150a56.jpg", // Hollow Knight
  "http://media.steampowered.com/steamcommunity/public/images/apps/413150/913064b27b4b25e2c03cbd261a8b03fd67da693c.jpg", // Stardew Valley
  "http://media.steampowered.com/steamcommunity/public/images/apps/945360/409663714339956c1a690a28b96c7a020f99ad28.jpg", // Among Us
  "http://media.steampowered.com/steamcommunity/public/images/apps/1174180/5bf6edd7efb1110b457da905e7ac696c6c619ed1.jpg", // Red Dead Redemption 2
  "http://media.steampowered.com/steamcommunity/public/images/apps/1091500/e8cbb253f929cb6a67dcb4f03a60dc4328ea65f2.jpg", // Cyberpunk 2077
  "http://media.steampowered.com/steamcommunity/public/images/apps/1593500/13a56d5a2f9248b14f6d2cc0486e2b05b19d9554.jpg", // God of War
  "http://media.steampowered.com/steamcommunity/public/images/apps/782330/0d52c94c2396e04da4375a1cff50db9fe18da66f.jpg", // DOOM Eternal
  "http://media.steampowered.com/steamcommunity/public/images/apps/72850/e15fa6de9b0120058a1876db6c3a22ccc6dac9d5.jpg", // Skyrim
  "http://media.steampowered.com/steamcommunity/public/images/apps/620/25a5a16b2423bf7487ac5340b5b0948cef48c5f8.jpg", // Portal 2
  "http://media.steampowered.com/steamcommunity/public/images/apps/220/85c721efacb1b0903fa11e993291c33da8f643d1.jpg", // Half-Life 2
  "http://media.steampowered.com/steamcommunity/public/images/apps/271590/9e213490c40bc36bff8264f4f4684b2e28d2447c.jpg", // GTA V
  "http://media.steampowered.com/steamcommunity/public/images/apps/374320/e9bb44e88f49a1491db1664ec765e90e7debc3ea.jpg", // Dark Souls III
  "http://media.steampowered.com/steamcommunity/public/images/apps/268910/a93a66a6089ceb8e34243335ac1222f23df5f5f5.jpg", // Cuphead
  "http://media.steampowered.com/steamcommunity/public/images/apps/377160/4779b4257a79b821717aaec10e6ddd5074bb5680.jpg", // Fallout 4
  "http://media.steampowered.com/steamcommunity/public/images/apps/2357570/c05905cbf26020ffefcae9b39038d9ad523e2d68.jpg", // Overwatch 2
  "http://media.steampowered.com/steamcommunity/public/images/apps/1086940/ea19a7ce2af83c0240e775d79d3b690751a062c1.jpg", // Baldur's Gate 3
  "http://media.steampowered.com/steamcommunity/public/images/apps/814380/06f5400c9d524f8f6434b7b81ff1e780a691b297.jpg", // Sekiro
];

export function getDefaultAvatarForUsername(username: string): string {
  if (!GAME_AVATAR_ICONS.length) return "";
  const sum = Array.from(username).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GAME_AVATAR_ICONS[sum % GAME_AVATAR_ICONS.length];
}



