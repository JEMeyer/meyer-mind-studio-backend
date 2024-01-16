import { modificationQuery, selectQuery } from '../database/database';

export const addPicture = async (
  publicPath: string,
  prompt: string,
  userId: string
) => {
  const sql =
    'INSERT INTO pictures (public_path, prompt, created_by) VALUES (?, ?, ?);';
  const params = [publicPath, prompt, userId];

  try {
    const result = await modificationQuery(sql, params);
    return result;
  } catch (error) {
    throw new Error(`An error occurred while adding piacture: ${error}`);
  }
};

export const getPictureById = async (pictureId: string, userId?: string) => {
  const sql = `
      WITH vote_summary AS (
          SELECT id_value, SUM(value) as total_votes
          FROM votes
          WHERE id_type = 2
          GROUP BY id_value
      )
      SELECT p.id, p.public_path, p.prompt, p.created_at, p.type, vs.total_votes, uv.value as user_vote
      FROM pictures p
      LEFT JOIN vote_summary vs ON p.id = vs.id_value
      LEFT JOIN votes uv ON p.id = uv.id_value AND uv.id_type = 1 AND uv.user_id = ${
        userId ?? '""'
      }
      WHERE v.id = ${pictureId};
    `;

  try {
    const result = await selectQuery(sql, []);
    return result[0] || null;
  } catch (error) {
    throw new Error(`An error occurred while getting the picture: ${error}`);
  }
};
