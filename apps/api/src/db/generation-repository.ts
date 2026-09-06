import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlValue } from "sql.js";
import { GENERATION_HISTORY_LIMIT } from "@mc/shared";

export interface GenerationRow {
  id: string;
  brandName: string;
  productName: string;
  description: string;
  price: number;
  status: string;
  posterPath: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    brandName TEXT NOT NULL,
    productName TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    status TEXT NOT NULL,
    posterPath TEXT,
    error TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`;

export class GenerationRepository {
  private constructor(
    private readonly databasePath: string,
    private readonly db: Database,
  ) {}

  static async create(databasePath: string): Promise<GenerationRepository> {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    const SQL = await initSqlJs();
    const existing = fs.existsSync(databasePath)
      ? new Uint8Array(fs.readFileSync(databasePath))
      : undefined;
    const db = new SQL.Database(existing);
    db.exec(TABLE_SQL);
    return new GenerationRepository(databasePath, db);
  }

  private persist(): void {
    fs.writeFileSync(this.databasePath, Buffer.from(this.db.export()));
  }

  private run(sql: string, params: SqlValue[]): void {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(params);
      statement.step();
    } finally {
      statement.free();
    }
    this.persist();
  }

  private queryAll(sql: string, params: SqlValue[]): GenerationRow[] {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(params);
      const rows: GenerationRow[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject() as unknown as GenerationRow);
      }
      return rows;
    } finally {
      statement.free();
    }
  }

  insert(row: GenerationRow): GenerationRow {
    this.run(
      `INSERT INTO generations (id, brandName, productName, description, price, status, posterPath, error, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.brandName,
        row.productName,
        row.description,
        row.price,
        row.status,
        row.posterPath,
        row.error,
        row.createdAt,
        row.updatedAt,
      ],
    );
    return row;
  }

  findById(id: string): GenerationRow | undefined {
    return this.queryAll("SELECT * FROM generations WHERE id = ?", [id])[0];
  }

  update(row: GenerationRow): GenerationRow {
    this.run(
      `UPDATE generations
       SET status = ?, posterPath = ?, error = ?, updatedAt = ?
       WHERE id = ?`,
      [row.status, row.posterPath, row.error, row.updatedAt, row.id],
    );
    return row;
  }

  listRecent(limit: number = GENERATION_HISTORY_LIMIT): GenerationRow[] {
    return this.queryAll("SELECT * FROM generations ORDER BY createdAt DESC LIMIT ?", [limit]);
  }

  close(): void {
    this.db.close();
  }
}
