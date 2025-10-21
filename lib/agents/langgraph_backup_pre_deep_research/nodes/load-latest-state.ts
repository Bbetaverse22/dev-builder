import type { ResearchState } from "../research-agent";
import { skillGapStoragePrisma } from "@/lib/storage/skill-gap-storage-prisma";

/**
 * Load the latest stored research state seed for the current user.
 */
export async function loadLatestStateNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const userId = state.userId ?? "user_123";
  const iterationCount = state.iterationCount ?? 0;

  try {
    const seed = await skillGapStoragePrisma.getResearchStateSeed(userId);

    if (seed) {
      return {
        ...seed,
        loadedFromStorage: true,
        iterationCount,
      };
    }

    console.warn(
      `[loadLatestStateNode] No stored research seed found for user ${userId}`
    );
  } catch (error) {
    console.error(
      `[loadLatestStateNode] Failed to load research seed for user ${userId}:`,
      error
    );
  }

  return {
    loadedFromStorage: false,
    iterationCount,
  };
}
