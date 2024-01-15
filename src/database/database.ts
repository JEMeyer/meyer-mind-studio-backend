import mysql from 'mysql2/promise';
import { env } from 'process';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// Database connection pool configuration
const poolConfig = {
  host: env.MYSQL_HOST,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create a pool of connections
const pool = mysql.createPool(poolConfig);

async function selectQuery(
  sql: string,
  params: any[]
): Promise<RowDataPacket[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(sql, params);
    return rows;
  } finally {
    connection.release();
  }
}

async function modificationQuery(
  sql: string,
  params: any[]
): Promise<ResultSetHeader | any> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader | any>(sql, params);
    return result;
  } finally {
    connection.release();
  }
}

export { selectQuery, modificationQuery };
