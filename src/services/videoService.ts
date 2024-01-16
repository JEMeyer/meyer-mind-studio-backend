import { modificationQuery, selectQuery } from '../database/database';
import { PrimaryStoryboardResponse } from '../types/types';

export const addVideo = async (
  publicPath: string,
  prompt: string,
  data: PrimaryStoryboardResponse,
  name: string,
  userId: string
) => {
  const sql =
    'INSERT INTO videos (public_path, prompt, data, name, created_by) VALUES (?, ?, ?, ?, ?);';
  const params = [publicPath, prompt, JSON.stringify(data), name, userId];

  try {
    const result = await modificationQuery(sql, params);
    return result;
  } catch (error) {
    throw new Error(`An error occurred while adding video: ${error}`);
  }
};

export const getVideoById = async (videoId: string, userId?: string) => {
  const sql = `
      WITH vote_summary AS (
          SELECT id_value, SUM(value) as total_votes
          FROM votes
          WHERE id_type = 1
          GROUP BY id_value
      )
      SELECT v.id, v.public_path, v.prompt, v.created_at, v.name, v.type, vs.total_votes, uv.value as user_vote
      FROM videos v
      LEFT JOIN vote_summary vs ON v.id = vs.id_value
      LEFT JOIN votes uv ON v.id = uv.id_value AND uv.id_type = 1 AND uv.user_id = ${userId}
      WHERE v.id = ${videoId};
    `;

  try {
    const result = await selectQuery(sql, []);
    return result[0] || null;
  } catch (error) {
    throw new Error(`An error occurred while getting the video: ${error}`);
  }
};
