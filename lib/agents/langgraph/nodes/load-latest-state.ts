import type { ResearchState } from "../research-agent";
import { skillGapStoragePrisma } from "@/lib/storage/skill-gap-storage-prisma";
import { skillGapStorage } from "@/lib/storage/skill-gap-storage";

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
      `[loadLatestStateNode] No Prisma-backed research seed found for user ${userId}, falling back to legacy storage`
    );
  } catch (error) {
    console.error(
      `[loadLatestStateNode] Failed to load Prisma research seed for user ${userId}:`,
      error
    );
  }

  try {
    const legacySeed = skillGapStorage.getResearchStateSeed(userId);
    if (legacySeed) {
      return {
        ...legacySeed,
        loadedFromStorage: true,
        iterationCount,
      };
    }
  } catch (legacyError) {
    console.error(
      `[loadLatestStateNode] Legacy storage fallback failed for user ${userId}:`,
      legacyError
    );
  }

  return {
    loadedFromStorage: false,
    iterationCount,
  };
}
