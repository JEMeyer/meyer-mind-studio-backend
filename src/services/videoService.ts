import db from '../database/database';
import { PrimaryStoryboardResponse } from '../types/types';

export const addVideo = async (publicPath: string, prompt: string, data: PrimaryStoryboardResponse, name: string) => {
  try {
     await db.result('INSERT INTO videos (public_path, prompt, data, name) VALUES ($1, $2, $3, $4);', [publicPath, prompt, data, name]);
  } catch (error) {
    throw new Error(`An error occurred while adding video: ${error}`);
  }
};

export const getVideosWithUpvotes = async (pageNumber: number, order?: string) => {
    // Default to top
    const orderBy = (order === 'new') ? 'v.created_at DESC': 'vs.votes_total DESC, v.created_at DESC';

    try {
        return await db.any(`
        WITH vote_summary AS (
            SELECT video_id, SUM(value) as total_votes
            FROM votes
            GROUP BY video_id
          )
          SELECT v.id, v.public_path, v.prompt, v.created_at, v.name, vs.total_votes
          FROM videos v
          LEFT JOIN vote_summary vs ON v.id = vs.video_id
          ORDER BY ${orderBy}
          LIMIT 10 OFFSET (${pageNumber || 1} - 1) * 10;
        `);
    } catch (error) {
        throw new Error(`An error occurred while fetching videos: ${error}`);
    }
}

/* Sample based on time
SELECT v.filepath, SUM(va.value) AS votes_total
FROM videos v
JOIN votes va ON va.video_id = v.id
WHERE va.last_modified >= (NOW() - INTERVAL '1 month')
GROUP BY v.id
ORDER BY votes_total DESC

*/
