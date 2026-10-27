CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY,
	"user_id" integer,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" integer,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"tagline" text DEFAULT 'Simple business finances' NOT NULL,
	"open_cash" bigint DEFAULT 0 NOT NULL,
	"open_momo" bigint DEFAULT 0 NOT NULL,
	"open_bank" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "business_check_0" CHECK ((id = 1))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY,
	"date" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'Other' NOT NULL,
	"supplier_id" integer,
	"amount" bigint NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" integer,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	CONSTRAINT "expenses_check_0" CHECK ((amount > 0))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY,
	"kind" text NOT NULL,
	"sale_id" integer,
	"expense_id" integer,
	"method" text NOT NULL,
	"amount" bigint NOT NULL,
	"date" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	CONSTRAINT "payments_check_0" CHECK ((kind IN ('in','out'))),
	CONSTRAINT "payments_check_1" CHECK ((method IN ('cash','momo','bank'))),
	CONSTRAINT "payments_check_2" CHECK ((amount > 0))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"barcode" text UNIQUE,
	"unit_price" bigint NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	CONSTRAINT "products_check_0" CHECK ((unit_price > 0)),
	CONSTRAINT "products_check_1" CHECK ((stock_quantity >= 0))
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"due_date" text NOT NULL,
	"amount" bigint,
	"note" text DEFAULT '' NOT NULL,
	"done" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"barcode" text,
	"quantity" integer NOT NULL,
	"unit_price" bigint NOT NULL,
	CONSTRAINT "sale_items_check_0" CHECK ((quantity > 0)),
	CONSTRAINT "sale_items_check_1" CHECK ((unit_price > 0))
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY,
	"date" text NOT NULL,
	"item" text NOT NULL,
	"amount" bigint NOT NULL,
	"customer_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_by" integer,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	CONSTRAINT "sales_check_0" CHECK ((amount > 0))
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"quantity_change" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_id" integer,
	"user_id" integer,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	CONSTRAINT "stock_movements_check_0" CHECK ((quantity_change <> 0))
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" serial PRIMARY KEY,
	"date" text NOT NULL,
	"from_method" text NOT NULL,
	"to_method" text NOT NULL,
	"amount" bigint NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	CONSTRAINT "transfers_check_0" CHECK ((from_method IN ('cash','momo','bank'))),
	CONSTRAINT "transfers_check_1" CHECK ((to_method IN ('cash','momo','bank'))),
	CONSTRAINT "transfers_check_2" CHECK ((amount > 0)),
	CONSTRAINT "transfers_check_3" CHECK ((from_method <> to_method))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"role" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"identity_id" text NOT NULL UNIQUE,
	CONSTRAINT "users_check_0" CHECK ((role IN ('owner','staff')))
);
--> statement-breakpoint
CREATE INDEX "idx_expenses_date" ON "expenses" ("date");--> statement-breakpoint
CREATE INDEX "idx_pay_sale" ON "payments" ("sale_id");--> statement-breakpoint
CREATE INDEX "idx_pay_exp" ON "payments" ("expense_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_sale" ON "sale_items" ("sale_id");--> statement-breakpoint
CREATE INDEX "idx_sales_date" ON "sales" ("date");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_product" ON "stock_movements" ("product_id","id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_sales_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_expense_id_expenses_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;