import { modificationQuery } from '../database/database';

export const voteOnVideo = async (
  userId: string,
  videoId: string,
  value: number
) => {
  const query = `
    INSERT INTO votes (user_id, video_id, value, last_modified)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE value = VALUES(value), last_modified = NOW();
  `;

  try {
    const result = await modificationQuery(query, [userId, videoId, value]);
    console.log('Query executed successfully', result);
  } catch (error) {
    throw new Error(`An error occurred while adding video: ${error}`);
  }
};
