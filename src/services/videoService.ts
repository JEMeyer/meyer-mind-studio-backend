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
  const params = [publicPath, prompt, data, name, userId];

  try {
    const result = await modificationQuery(sql, params);
    return result;
  } catch (error) {
    throw new Error(`An error occurred while adding video: ${error}`);
  }
};

export const getVideosWithUpvotes = async (
  pageNumber: number,
  order?: string,
  userId?: string,
  timeframe?: string,
  filterByUser = false,
  likedVideosOnly = false
) => {
  const timeFrameFilter = (timeframe: string) => {
    switch (timeframe) {
      case 'day':
        return "AND v.created_at >= (NOW() - INTERVAL '1 day')";
      case 'week':
        return "AND v.created_at >= (NOW() - INTERVAL '1 week')";
      case 'month':
        return "AND v.created_at >= (NOW() - INTERVAL '1 month')";
      case 'all-time':
      default:
        return '';
    }
  };

  const orderBy =
    order === 'new'
      ? 'v.created_at DESC'
      : `CASE WHEN vs.total_votes IS NULL THEN 0 ELSE vs.total_votes END DESC, v.created_at DESC`;

  const orderByVoteTime = likedVideosOnly ? 'uv.last_modified DESC' : orderBy;

  const timeFrameCondition = timeFrameFilter(timeframe || '');

  const userFilterCondition =
    filterByUser && userId ? `AND v.created_by = '${userId}'` : '';

  const likedVideosOnlyCondition =
    likedVideosOnly && userId
      ? `AND uv.user_id = '${userId}' AND uv.value = 1`
      : '';

  const offset = (pageNumber - 1) * 10;

  const query = `
        WITH vote_summary AS (
            SELECT video_id, SUM(value) as total_votes
            FROM votes
            GROUP BY video_id
        )
        SELECT v.id, v.public_path, v.prompt, v.created_at, v.name, vs.total_votes, uv.value as user_vote
        FROM videos v
        LEFT JOIN vote_summary vs ON v.id = vs.video_id
        LEFT JOIN votes uv ON v.id = uv.video_id AND uv.user_id = ${userId}
        WHERE 1=1 ${timeFrameCondition} ${userFilterCondition} ${likedVideosOnlyCondition}
        ORDER BY ${orderByVoteTime}
        LIMIT 10 OFFSET ${offset};
    `;

  try {
    return await selectQuery(query, []);
  } catch (error) {
    throw new Error(`An error occurred while fetching videos: ${error}`);
  }
};

export const getVideoById = async (videoId: string, userId?: string) => {
  const sql = `
      WITH vote_summary AS (
          SELECT video_id, SUM(value) as total_votes
          FROM votes
          GROUP BY video_id
      )
      SELECT v.id, v.public_path, v.prompt, v.created_at, v.name, vs.total_votes, uv.value as user_vote
      FROM videos v
      LEFT JOIN vote_summary vs ON v.id = vs.video_id
      LEFT JOIN votes uv ON v.id = uv.video_id AND uv.user_id = ${userId}
      WHERE v.id = ${videoId};
    `;

  try {
    const result = await selectQuery(sql, []);
    return result[0] || null;
  } catch (error) {
    throw new Error(`An error occurred while getting the video: ${error}`);
  }
};
