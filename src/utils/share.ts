import { Share } from 'react-native';

import { DAILY_MAX, dailyNumber, scoreEmoji, sumScores } from '@/src/utils/daily';

export const SHARE_URL = 'huemind.app';

/** "HueMind #12 🎨 412/500\n🟩🟩🟨🟥🟩\nhuemind.app" */
export function dailyShareText(date: string, scores: readonly number[]): string {
  const squares = scores.map(scoreEmoji).join('');
  return `HueMind #${dailyNumber(date)} 🎨 ${sumScores(scores)}/${DAILY_MAX}\n${squares}\n${SHARE_URL}`;
}

/** Opens the native share sheet with the daily result. Never throws. */
export async function shareDaily(date: string, scores: readonly number[]): Promise<void> {
  try {
    await Share.share({ message: dailyShareText(date, scores) });
  } catch (e) {
    console.warn('[share] failed', e);
  }
}
