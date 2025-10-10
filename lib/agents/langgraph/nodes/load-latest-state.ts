import type { ResearchState } from "../research-agent";
import { skillGapStorage } from "@/lib/storage/skill-gap-storage";

/**
 * Load the latest stored research state seed for the current user.
 */
export async function loadLatestStateNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const userId = state.userId ?? "user_123";

  try {
    const seed = skillGapStorage.getResearchStateSeed(userId);

    if (!seed) {
      console.warn(
        `[loadLatestStateNode] No stored research seed found for user ${userId}`
      );
      return {
        loadedFromStorage: false,
        iterationCount: state.iterationCount ?? 0,
      };
    }

    return {
      ...seed,
      loadedFromStorage: true,
      iterationCount: state.iterationCount ?? 0,
    };
  } catch (error) {
    console.error(
      `[loadLatestStateNode] Failed to load stored research seed for user ${userId}:`,
      error
    );
    return {
      loadedFromStorage: false,
      iterationCount: state.iterationCount ?? 0,
    };
  }
}
