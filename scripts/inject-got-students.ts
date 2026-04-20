import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../app/db/schema";
import { UserRole } from "../app/db/schema";

const sqlite = new Database("data.db");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

const students = [
  { name: "Arya Stark", email: "arya.stark@ralph.dev" },
  { name: "Jon Snow", email: "jon.snow@ralph.dev" },
  { name: "Tyrion Lannister", email: "tyrion.lannister@ralph.dev" },
  { name: "Daenerys Targaryen", email: "daenerys.targaryen@ralph.dev" },
  { name: "Samwell Tarly", email: "samwell.tarly@ralph.dev" },
];

const inserted = db
  .insert(schema.users)
  .values(students.map((s) => ({ ...s, role: UserRole.Student })))
  .onConflictDoNothing({ target: schema.users.email })
  .returning()
  .all();

console.log(`Inserted ${inserted.length} of ${students.length} students:`);
for (const u of inserted) console.log(`  #${u.id}  ${u.name}  <${u.email}>`);
if (inserted.length < students.length) {
  console.log("(others already existed — emails are unique)");
}
