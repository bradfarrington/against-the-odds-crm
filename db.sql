


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'Draft'::"text",
    "audience" "text" DEFAULT ''::"text",
    "subject" "text" DEFAULT ''::"text",
    "scheduled_date" timestamp with time zone,
    "sent_count" integer DEFAULT 0,
    "open_count" integer DEFAULT 0,
    "click_count" integer DEFAULT 0,
    "description" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coaching_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "seeker_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text" DEFAULT ''::"text",
    "progress_rating" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coaching_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT ''::"text",
    "industry" "text" DEFAULT ''::"text",
    "address" "text" DEFAULT ''::"text",
    "phone" "text" DEFAULT ''::"text",
    "email" "text" DEFAULT ''::"text",
    "website" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'Active'::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "logo_url" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_emails" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "graph_message_id" "text" NOT NULL,
    "conversation_id" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "subject" "text" DEFAULT ''::"text",
    "body_html" "text" DEFAULT ''::"text",
    "sender_address" "text" NOT NULL,
    "recipients" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "has_attachments" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contact_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "text" DEFAULT ''::"text",
    "email" "text" DEFAULT ''::"text",
    "phone" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'Active'::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "linkedin_url" "text" DEFAULT ''::"text",
    "twitter_url" "text" DEFAULT ''::"text",
    "instagram_url" "text" DEFAULT ''::"text",
    "facebook_url" "text" DEFAULT ''::"text",
    "website_url" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "company_id" "uuid",
    "status" "text" DEFAULT 'Active'::"text",
    "value" numeric(12,2) DEFAULT 0,
    "start_date" "date",
    "end_date" "date",
    "renewal_date" "date",
    "type" "text" DEFAULT ''::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_number" "text" NOT NULL,
    "company_id" "uuid",
    "amount" numeric(12,2) DEFAULT 0,
    "status" "text" DEFAULT 'Draft'::"text",
    "category" "text" DEFAULT ''::"text",
    "date_issued" "date",
    "date_due" "date",
    "date_paid" "date",
    "description" "text" DEFAULT ''::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_note_contacts" (
    "meeting_note_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL
);


ALTER TABLE "public"."meeting_note_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_note_staff" (
    "meeting_note_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL
);


ALTER TABLE "public"."meeting_note_staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "meeting_type" "text" DEFAULT ''::"text",
    "date" timestamp with time zone,
    "company_id" "uuid",
    "location" "text" DEFAULT ''::"text",
    "agenda" "text" DEFAULT ''::"text",
    "notes" "text" DEFAULT ''::"text",
    "action_items" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meeting_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prevention_resources" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "workshop_type" "text" DEFAULT ''::"text",
    "file_type" "text" DEFAULT ''::"text",
    "description" "text" DEFAULT ''::"text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "size" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."prevention_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prevention_schedule" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "workshop_type" "text" DEFAULT ''::"text",
    "company_id" "uuid",
    "contact_id" "uuid",
    "facilitator_id" "uuid",
    "date" timestamp with time zone,
    "end_time" timestamp with time zone,
    "location" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'Scheduled'::"text",
    "attendee_count" integer,
    "max_capacity" integer DEFAULT 30,
    "notes" "text" DEFAULT ''::"text",
    "feedback" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "value" numeric
);


ALTER TABLE "public"."prevention_schedule" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'Active'::"text",
    "company_id" "uuid",
    "lead_id" "uuid",
    "description" "text" DEFAULT ''::"text",
    "start_date" "date",
    "end_date" "date",
    "budget" numeric(12,2) DEFAULT 0,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recovery_resources" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT ''::"text",
    "file_type" "text" DEFAULT ''::"text",
    "description" "text" DEFAULT ''::"text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "size" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."recovery_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recovery_seekers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "date_of_birth" "date",
    "email" "text" DEFAULT ''::"text",
    "phone" "text" DEFAULT ''::"text",
    "address" "text" DEFAULT ''::"text",
    "gender" "text" DEFAULT ''::"text",
    "referral_source" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'Active'::"text",
    "risk_level" "text" DEFAULT 'Medium'::"text",
    "gambling_type" "text" DEFAULT ''::"text",
    "gambling_frequency" "text" DEFAULT ''::"text",
    "gambling_duration" "text" DEFAULT ''::"text",
    "gambling_triggers" "text" DEFAULT ''::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recovery_seekers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "text" DEFAULT ''::"text" NOT NULL,
    "dashboard_role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" DEFAULT ''::"text",
    "department" "text" DEFAULT 'Operations'::"text",
    "status" "text" DEFAULT 'Active'::"text",
    "bio" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."substance_use" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "seeker_id" "uuid" NOT NULL,
    "substance" "text" NOT NULL,
    "frequency" "text" DEFAULT ''::"text",
    "duration" "text" DEFAULT ''::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."substance_use" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."targets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT ''::"text",
    "metric" "text" DEFAULT ''::"text",
    "current_value" numeric(12,2) DEFAULT 0,
    "goal_value" numeric(12,2) DEFAULT 0,
    "deadline" "date",
    "description" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'To Do'::"text",
    "priority" "text" DEFAULT 'Medium'::"text",
    "assignee_id" "uuid",
    "project_id" "uuid",
    "due_date" "date",
    "description" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by_id" "uuid",
    "category" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT ''::"text",
    "content" "text" DEFAULT ''::"text",
    "description" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_oauth_connections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "microsoft_email" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_oauth_connections" OWNER TO "postgres";


ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coaching_sessions"
    ADD CONSTRAINT "coaching_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_emails"
    ADD CONSTRAINT "contact_emails_graph_message_id_key" UNIQUE ("graph_message_id");



ALTER TABLE ONLY "public"."contact_emails"
    ADD CONSTRAINT "contact_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_note_contacts"
    ADD CONSTRAINT "meeting_note_contacts_pkey" PRIMARY KEY ("meeting_note_id", "contact_id");



ALTER TABLE ONLY "public"."meeting_note_staff"
    ADD CONSTRAINT "meeting_note_staff_pkey" PRIMARY KEY ("meeting_note_id", "staff_id");



ALTER TABLE ONLY "public"."meeting_notes"
    ADD CONSTRAINT "meeting_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prevention_resources"
    ADD CONSTRAINT "prevention_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prevention_schedule"
    ADD CONSTRAINT "prevention_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recovery_resources"
    ADD CONSTRAINT "recovery_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recovery_seekers"
    ADD CONSTRAINT "recovery_seekers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."substance_use"
    ADD CONSTRAINT "substance_use_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."targets"
    ADD CONSTRAINT "targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_oauth_connections"
    ADD CONSTRAINT "user_oauth_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_oauth_connections"
    ADD CONSTRAINT "user_oauth_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."coaching_sessions"
    ADD CONSTRAINT "coaching_sessions_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "public"."recovery_seekers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_emails"
    ADD CONSTRAINT "contact_emails_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_emails"
    ADD CONSTRAINT "contact_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meeting_note_contacts"
    ADD CONSTRAINT "meeting_note_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_note_contacts"
    ADD CONSTRAINT "meeting_note_contacts_meeting_note_id_fkey" FOREIGN KEY ("meeting_note_id") REFERENCES "public"."meeting_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_note_staff"
    ADD CONSTRAINT "meeting_note_staff_meeting_note_id_fkey" FOREIGN KEY ("meeting_note_id") REFERENCES "public"."meeting_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_note_staff"
    ADD CONSTRAINT "meeting_note_staff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_notes"
    ADD CONSTRAINT "meeting_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prevention_schedule"
    ADD CONSTRAINT "prevention_schedule_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prevention_schedule"
    ADD CONSTRAINT "prevention_schedule_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prevention_schedule"
    ADD CONSTRAINT "prevention_schedule_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."substance_use"
    ADD CONSTRAINT "substance_use_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "public"."recovery_seekers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_oauth_connections"
    ADD CONSTRAINT "user_oauth_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated full access" ON "public"."campaigns" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."coaching_sessions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."companies" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."contact_emails" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."contacts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."contracts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."invoices" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."meeting_note_contacts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."meeting_note_staff" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."meeting_notes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."prevention_resources" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."prevention_schedule" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."projects" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."recovery_resources" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."recovery_seekers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."staff" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."substance_use" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."targets" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."task_categories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."tasks" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access" ON "public"."user_oauth_connections" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can view their own connections" ON "public"."user_oauth_connections" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coaching_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_note_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_note_staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prevention_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prevention_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recovery_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recovery_seekers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."substance_use" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_oauth_connections" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."coaching_sessions" TO "anon";
GRANT ALL ON TABLE "public"."coaching_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."coaching_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."contact_emails" TO "anon";
GRANT ALL ON TABLE "public"."contact_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_emails" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_note_contacts" TO "anon";
GRANT ALL ON TABLE "public"."meeting_note_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_note_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_note_staff" TO "anon";
GRANT ALL ON TABLE "public"."meeting_note_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_note_staff" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_notes" TO "anon";
GRANT ALL ON TABLE "public"."meeting_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_notes" TO "service_role";



GRANT ALL ON TABLE "public"."prevention_resources" TO "anon";
GRANT ALL ON TABLE "public"."prevention_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."prevention_resources" TO "service_role";



GRANT ALL ON TABLE "public"."prevention_schedule" TO "anon";
GRANT ALL ON TABLE "public"."prevention_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."prevention_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."recovery_resources" TO "anon";
GRANT ALL ON TABLE "public"."recovery_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."recovery_resources" TO "service_role";



GRANT ALL ON TABLE "public"."recovery_seekers" TO "anon";
GRANT ALL ON TABLE "public"."recovery_seekers" TO "authenticated";
GRANT ALL ON TABLE "public"."recovery_seekers" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."substance_use" TO "anon";
GRANT ALL ON TABLE "public"."substance_use" TO "authenticated";
GRANT ALL ON TABLE "public"."substance_use" TO "service_role";



GRANT ALL ON TABLE "public"."targets" TO "anon";
GRANT ALL ON TABLE "public"."targets" TO "authenticated";
GRANT ALL ON TABLE "public"."targets" TO "service_role";



GRANT ALL ON TABLE "public"."task_categories" TO "anon";
GRANT ALL ON TABLE "public"."task_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."task_categories" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_oauth_connections" TO "anon";
GRANT ALL ON TABLE "public"."user_oauth_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."user_oauth_connections" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































