const mysql = require('mysql2/promise');

let pool = null;

function getDbConfig() {
    return {
        host: process.env.DB_HOST || '172.18.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USERNAME || 'u2_znjjkkuc',
        password: process.env.DB_PASSWORD || 'XJaSbSu6acuH2OZkUAXr91Eo',
        database: process.env.DB_DATABASE || 'srv2_cinammon',
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
    };
}

function getPool() {
    if (!pool) {
        pool = mysql.createPool(getDbConfig());
    }
    return pool;
}

async function query(sql, params = []) {
    const p = getPool();
    const [rows] = await p.execute(sql, params);
    return rows;
}

module.exports = {
    getPool,
    query,
};
