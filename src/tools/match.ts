import { RIOT_API_BASE } from "../constants.js";
import { CURRENT_PUUID, fetchWithErrorHandling } from "../utils.js";

// queue_id: 1100 = Ranked TFT (公式 queues.json)
const RANKED_QUEUE_ID = 1100;

interface TftParticipant {
  puuid: string;
  placement: number;
  [key: string]: unknown;
}

interface TftMatchInfo {
  queue_id: number;
  participants: TftParticipant[];
  [key: string]: unknown;
}

interface TftMatchResponse {
  metadata?: { match_id: string };
  info: TftMatchInfo;
}

// Tool handlers
export async function handleTftMatchHistory(params: any) {
  const { count = 20, start = 0 } = params;
  const url = `${RIOT_API_BASE}/tft/match/v1/matches/by-puuid/${CURRENT_PUUID}/ids?start=${start}&count=${count}`;

  try {
    const response = await fetchWithErrorHandling(url);
    const matchIds = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ matchIds }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  }
}

export async function handleTftMatchDetails(params: any) {
  const { matchId } = params;
  const url = `${RIOT_API_BASE}/tft/match/v1/matches/${matchId}`;

  try {
    const response = await fetchWithErrorHandling(url);
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  }
}

export async function handleTftRankedStats(params: any) {
  const { count = 20 } = params;
  if (!CURRENT_PUUID) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "PUUID not initialized" }, null, 2)
        }
      ],
      isError: true
    };
  }

  try {
    const matchIdsUrl = `${RIOT_API_BASE}/tft/match/v1/matches/by-puuid/${CURRENT_PUUID}/ids?start=0&count=${count}`;
    const matchIdsResponse = await fetchWithErrorHandling(matchIdsUrl);
    const matchIds = (await matchIdsResponse.json()) as string[];

    const placements: number[] = [];

    for (const matchId of matchIds) {
      const detailsUrl = `${RIOT_API_BASE}/tft/match/v1/matches/${matchId}`;
      const detailsResponse = await fetchWithErrorHandling(detailsUrl);
      const match = (await detailsResponse.json()) as TftMatchResponse;

      if (match.info?.queue_id !== RANKED_QUEUE_ID) {
        continue;
      }

      const me = match.info.participants?.find(
        (p: TftParticipant) => p.puuid === CURRENT_PUUID
      );
      if (me?.placement != null) {
        placements.push(me.placement);
      }
    }

    const n = placements.length;
    if (n === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                rankedMatchCount: 0,
                message:
                  `直近${count}試合にランクマッチが含まれていません。`
              },
              null,
              2
            )
          }
        ],
        isError: false
      };
    }

    const avgPlacement = placements.reduce((a, b) => a + b, 0) / n;
    const top4Count = placements.filter((p) => p <= 4).length;
    const winCount = placements.filter((p) => p === 1).length;

    const stats = {
      rankedMatchCount: n,
      averagePlacement: Math.round(avgPlacement * 10) / 10,
      top4Rate: Math.round((top4Count / n) * 1000) / 10,
      winRate: Math.round((winCount / n) * 1000) / 10
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(stats, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  }
}
