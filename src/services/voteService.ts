import db from '../database/database';

export const voteOnVideo = async (userId: string, videoId: string, value: number) => {
  try {
     await db.result(`INSERT INTO votes (user_id, video_id, value, last_modified) VALUES ($1, $2, $3, NOW())
                        ON CONFLICT (user_id, video_id) DO UPDATE SET value = EXCLUDED.value, last_modified = NOW();`, [userId, videoId,  value]);
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw new Error('An error occurred while fetching videos');
  }
};