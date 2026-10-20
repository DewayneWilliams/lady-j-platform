import { db, check } from "./client";
import type { ReportRecords } from "./ownerReports";

/** Recheck owner authorization and page every source at export time; never use a cached public catalog. */
export async function loadOwnerReportRecords(): Promise<ReportRecords> {
  if (check(await db().rpc("lj_is_owner")) !== true)
    throw new Error("Owner access is required to download live reports.");
  const tables = [
    "lj_calendar",
    "lj_transactions",
    "lj_products",
    "lj_client_records",
    "lj_purchases",
    "lj_services",
    "lj_expenses",
  ] as const;
  const result = await Promise.all(
    tables.map(async (table) => {
      const rows: unknown[] = [];
      const columns =
        table === "lj_client_records"
          ? "id,customer_id,full_name,first_name,last_name,email,phone,deleted_at"
          : "*";
      for (let offset = 0; ; offset += 1000) {
        let query = db()
          .from(table)
          .select(columns)
          .order("id")
          .range(offset, offset + 999);
        if (["lj_client_records", "lj_products"].includes(table))
          query = query.is("deleted_at", null);
        const page = check(await query) as unknown[];
        rows.push(...page);
        if (page.length < 1000) break;
      }
      return rows;
    }),
  );
  return {
    appointments: result[0],
    transactions: result[1],
    products: result[2],
    clients: result[3],
    purchases: result[4],
    services: result[5],
    expenses: result[6],
    demo: false,
  } as ReportRecords;
}
