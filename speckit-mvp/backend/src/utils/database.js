/**
 * 数据库工具模块
 *
 * 功能：
 * - SQLite数据库连接管理
 * - 数据库表初始化和迁移
 * - 数据库操作封装
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DB_PATH || './data/speckit.db';
        this.isInitialized = false;
    }

    /**
     * 初始化数据库连接
     */
    async initialize() {
        try {
            // 确保数据目录存在
            const dataDir = path.dirname(this.dbPath);
            await fs.mkdir(dataDir, { recursive: true });

            // 连接数据库
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('数据库连接失败:', err);
                    throw err;
                }
                console.log('数据库连接成功:', this.dbPath);
            });

            // 启用外键约束
            await this.run('PRAGMA foreign_keys = ON');

            // 创建表
            await this.createTables();

            this.isInitialized = true;
            console.log('数据库初始化完成');
        } catch (error) {
            console.error('数据库初始化失败:', error);
            throw error;
        }
    }

    /**
     * 关闭数据库连接
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('数据库连接已关闭');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * 创建数据表
     */
    async createTables() {
        const tables = [
            // 项目表
            `CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                type TEXT NOT NULL CHECK (type IN ('git', 'local')),
                source_path TEXT NOT NULL,
                branch TEXT,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
                config TEXT, -- JSON格式的配置信息
                stats TEXT,  -- JSON格式的统计信息
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // 文件表
            `CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                relative_path TEXT NOT NULL,
                absolute_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_extension TEXT,
                file_size INTEGER,
                language TEXT,
                encoding TEXT DEFAULT 'utf-8',
                last_modified DATETIME,
                content_hash TEXT,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, relative_path)
            )`,

            // 文档节点表
            `CREATE TABLE IF NOT EXISTS document_nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                file_id INTEGER,
                node_type TEXT NOT NULL CHECK (node_type IN ('file', 'directory', 'function', 'class', 'variable', 'import', 'export')),
                name TEXT NOT NULL,
                relative_path TEXT,
                content TEXT,
                metadata TEXT, -- JSON格式的元数据
                parent_id INTEGER,
                level INTEGER DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES document_nodes(id) ON DELETE CASCADE
            )`,

            // 处理任务表
            `CREATE TABLE IF NOT EXISTS processing_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                task_type TEXT NOT NULL CHECK (task_type IN ('import', 'parse', 'analyze', 'generate_docs', 'index')),
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
                progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
                status_message TEXT,
                result_data TEXT, -- JSON格式的结果数据
                error_message TEXT,
                started_at DATETIME,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )`,

            // 搜索索引表
            `CREATE TABLE IF NOT EXISTS search_index (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                document_node_id INTEGER,
                content_type TEXT NOT NULL CHECK (content_type IN ('code', 'comment', 'docstring', 'description')),
                content TEXT NOT NULL,
                tokens TEXT, -- 预处理的分词结果
                weight REAL DEFAULT 1.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (document_node_id) REFERENCES document_nodes(id) ON DELETE CASCADE
            )`,

            // 创建全文搜索虚拟表
            `CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
                project_id,
                document_node_id,
                content_type,
                content,
                tokens,
                weight,
                content='search_index',
                content_rowid='id'
            )`
        ];

        // 创建索引
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id)',
            'CREATE INDEX IF NOT EXISTS idx_files_status ON files(status)',
            'CREATE INDEX IF NOT EXISTS idx_files_language ON files(language)',
            'CREATE INDEX IF NOT EXISTS idx_document_nodes_project_id ON document_nodes(project_id)',
            'CREATE INDEX IF NOT EXISTS idx_document_nodes_file_id ON document_nodes(file_id)',
            'CREATE INDEX IF NOT EXISTS idx_document_nodes_parent_id ON document_nodes(parent_id)',
            'CREATE INDEX IF NOT EXISTS idx_document_nodes_type ON document_nodes(node_type)',
            'CREATE INDEX IF NOT EXISTS idx_processing_tasks_project_id ON processing_tasks(project_id)',
            'CREATE INDEX IF NOT EXISTS idx_processing_tasks_status ON processing_tasks(status)',
            'CREATE INDEX IF NOT EXISTS idx_search_index_project_id ON search_index(project_id)',
            'CREATE INDEX IF NOT EXISTS idx_search_index_document_node_id ON search_index(document_node_id)'
        ];

        // 创建触发器
        const triggers = [
            // 更新项目updated_at字段
            `CREATE TRIGGER IF NOT EXISTS update_project_timestamp
            AFTER UPDATE ON projects
            BEGIN
                UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END`,

            // 更新文件updated_at字段
            `CREATE TRIGGER IF NOT EXISTS update_file_timestamp
            AFTER UPDATE ON files
            BEGIN
                UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END`,

            // 更新文档节点updated_at字段
            `CREATE TRIGGER IF NOT EXISTS update_document_node_timestamp
            AFTER UPDATE ON document_nodes
            BEGIN
                UPDATE document_nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END`,

            // 更新处理任务updated_at字段
            `CREATE TRIGGER IF NOT EXISTS update_processing_task_timestamp
            AFTER UPDATE ON processing_tasks
            BEGIN
                UPDATE processing_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END`,

            // 同步全文搜索索引
            `CREATE TRIGGER IF NOT EXISTS search_index_insert
            AFTER INSERT ON search_index
            BEGIN
                INSERT INTO search_fts(project_id, document_node_id, content_type, content, tokens, weight)
                VALUES (NEW.project_id, NEW.document_node_id, NEW.content_type, NEW.content, NEW.tokens, NEW.weight);
            END`,

            `CREATE TRIGGER IF NOT EXISTS search_index_delete
            AFTER DELETE ON search_index
            BEGIN
                DELETE FROM search_fts WHERE rowid = OLD.id;
            END`,

            `CREATE TRIGGER IF NOT EXISTS search_index_update
            AFTER UPDATE ON search_index
            BEGIN
                DELETE FROM search_fts WHERE rowid = OLD.id;
                INSERT INTO search_fts(project_id, document_node_id, content_type, content, tokens, weight)
                VALUES (NEW.project_id, NEW.document_node_id, NEW.content_type, NEW.content, NEW.tokens, NEW.weight);
            END`
        ];

        try {
            // 执行建表语句
            for (const sql of tables) {
                await this.run(sql);
            }

            // 执行创建索引语句
            for (const sql of indexes) {
                await this.run(sql);
            }

            // 执行创建触发器语句
            for (const sql of triggers) {
                await this.run(sql);
            }

            console.log('数据库表创建完成');
        } catch (error) {
            console.error('创建数据库表失败:', error);
            throw error;
        }
    }

    /**
     * 执行SQL语句（无返回值）
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * 查询单条记录
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * 查询多条记录
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * 开始事务
     */
    async beginTransaction() {
        await this.run('BEGIN TRANSACTION');
    }

    /**
     * 提交事务
     */
    async commit() {
        await this.run('COMMIT');
    }

    /**
     * 回滚事务
     */
    async rollback() {
        await this.run('ROLLBACK');
    }

    /**
     * 执行事务
     */
    async transaction(callback) {
        await this.beginTransaction();
        try {
            const result = await callback(this);
            await this.commit();
            return result;
        } catch (error) {
            await this.rollback();
            throw error;
        }
    }

    /**
     * 准备语句
     */
    prepare(sql) {
        return this.db.prepare(sql);
    }

    /**
     * 数据库迁移
     */
    async migrate() {
        // 这里可以添加数据库版本管理和迁移逻辑
        console.log('数据库迁移完成');
    }

    /**
     * 数据库重置
     */
    async reset() {
        try {
            await this.close();

            // 删除数据库文件
            await fs.unlink(this.dbPath);
            console.log('数据库文件已删除:', this.dbPath);

            // 重新初始化
            await this.initialize();
            console.log('数据库重置完成');
        } catch (error) {
            console.error('数据库重置失败:', error);
            throw error;
        }
    }

    /**
     * 获取数据库统计信息
     */
    async getStats() {
        const stats = {};

        try {
            // 项目数量
            stats.projects = await this.get('SELECT COUNT(*) as count FROM projects');

            // 文件数量
            stats.files = await this.get('SELECT COUNT(*) as count FROM files');

            // 文档节点数量
            stats.document_nodes = await this.get('SELECT COUNT(*) as count FROM document_nodes');

            // 搜索索引数量
            stats.search_index = await this.get('SELECT COUNT(*) as count FROM search_index');

            // 数据库文件大小
            const fileStats = await fs.stat(this.dbPath);
            stats.database_size = fileStats.size;

            return stats;
        } catch (error) {
            console.error('获取数据库统计信息失败:', error);
            throw error;
        }
    }

    /**
     * 数据库备份
     */
    async backup(backupPath) {
        try {
            const backupDb = new sqlite3.Database(backupPath);

            await new Promise((resolve, reject) => {
                this.db.backup(backupDb, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            await new Promise((resolve, reject) => {
                backupDb.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            console.log('数据库备份完成:', backupPath);
        } catch (error) {
            console.error('数据库备份失败:', error);
            throw error;
        }
    }
}

// 创建单例实例
const database = new Database();

// 数据库操作助手类
class DatabaseHelper {
    static async insert(table, data) {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const result = await database.run(sql, Object.values(data));
        return result;
    }

    static async update(table, data, where, whereParams = []) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
        const result = await database.run(sql, [...Object.values(data), ...whereParams]);
        return result;
    }

    static async delete(table, where, params = []) {
        const sql = `DELETE FROM ${table} WHERE ${where}`;
        const result = await database.run(sql, params);
        return result;
    }

    static async findById(table, id) {
        const sql = `SELECT * FROM ${table} WHERE id = ?`;
        return await database.get(sql, [id]);
    }

    static async find(table, where = '', params = [], orderBy = '', limit = '') {
        let sql = `SELECT * FROM ${table}`;
        if (where) {
            sql += ` WHERE ${where}`;
        }
        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }
        if (limit) {
            sql += ` LIMIT ${limit}`;
        }
        return await database.all(sql, params);
    }
}

module.exports = { Database, database, DatabaseHelper };