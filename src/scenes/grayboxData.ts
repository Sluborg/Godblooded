import type { GameData } from '../sim/api';

// Stand-in content until Lead's rows land in src/data/ (backlog Lead 30).
export const GRAYBOX_DATA: GameData = {
  buildings: [
    { id: 'market', cost: 100 },
    { id: 'temple', cost: 150 },
  ],
  startGold: 300,
  map: { width: 2400, height: 1400 },
  townHall: { x: 1200, y: 700 },
};
