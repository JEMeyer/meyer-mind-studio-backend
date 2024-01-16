import { modificationQuery, selectQuery } from '../database/database';
import { RequestContext } from '../middleware/context';
import { IDType } from '../types/types';

export const voteOnItem = async (
  userId: string,
  idValue: string,
  idType: IDType,
  value: number
) => {
  const query = `
    INSERT INTO votes (user_id, id_value, id_type, value, last_modified)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE value = VALUES(value), last_modified = NOW();
  `;

  try {
    const result = await modificationQuery(query, [
      userId,
      idValue,
      idType,
      value,
    ]);
    console.log('Query executed successfully', result);
  } catch (error) {
    throw new Error(`An error occurred while adding vote: ${error}`);
  }
};

export const getItemsWithUpvotes = async (
  pageNumber: number,
  order: string,
  userId: string | undefined,
  timeframe: string,
  filterByUser: boolean,
  likedContentOnly: boolean,
  idType: IDType | null
) => {
  const timeFrameFilter = (timeframe: string) => {
    switch (timeframe) {
      case 'day':
        return 'AND i.created_at >= (NOW() - INTERVAL 1 DAY)';
      case 'week':
        return 'AND i.created_at >= (NOW() - INTERVAL 1 WEEK)';
      case 'month':
        return 'AND i.created_at >= (NOW() - INTERVAL 1 MONTH)';
      case 'all-time':
      default:
        return '';
    }
  };

  const orderBy =
    order === 'new'
      ? 'i.created_at DESC'
      : `CASE WHEN vs.total_votes IS NULL THEN 0 ELSE vs.total_votes END DESC, i.created_at DESC`;

  const orderByVoteTime = likedContentOnly ? 'uv.last_modified DESC' : orderBy;

  const timeFrameCondition = timeFrameFilter(timeframe || '');

  const userFilterCondition =
    filterByUser && userId ? `AND i.created_by = '${userId}'` : '';

  const likedItemsOnlyCondition =
    likedContentOnly && userId
      ? `AND uv.user_id = '${userId}' AND uv.value = 1`
      : '';

  const offset = (pageNumber - 1) * 10;

  let itemTable;

  switch (idType) {
    case IDType.VIDEO:
      itemTable = 'videos';
      break;
    case IDType.PICTURE:
      itemTable = 'pictures';
      break;
  }

  const query = `
    WITH vote_summary AS (
      SELECT id_value, SUM(value) as total_votes
      FROM votes
      WHERE id_type = ${idType}
      GROUP BY id_value
    )
    SELECT i.*, vs.total_votes, uv.value as user_vote
    FROM ${itemTable} i
    LEFT JOIN vote_summary vs ON i.id = vs.id_value
    LEFT JOIN votes uv ON i.id = uv.id_value ${`AND uv.user_id = ${
      userId ?? '""'
    }`}
    WHERE 1=1 ${timeFrameCondition} ${userFilterCondition} ${likedItemsOnlyCondition}
    ORDER BY ${orderByVoteTime}
    LIMIT 10 OFFSET ${offset};
    `;

  try {
    return await selectQuery(query, []);
  } catch (error) {
    RequestContext.getStore()?.logger.error(
      `Error fetching items with query: "${query}". Error: ${error}`
    );
    throw new Error(`An error occurred while fetching items: ${error}`);
  }
};
