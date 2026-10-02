BEGIN;
CREATE SCHEMA IF NOT EXISTS reloaded_meta;
CREATE TABLE IF NOT EXISTS reloaded_meta.counter(scope text PRIMARY KEY, last_value bigint NOT NULL CHECK(last_value>0));
CREATE TABLE IF NOT EXISTS reloaded_meta.identity(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),scope text NOT NULL, code text NOT NULL, kind text NOT NULL CHECK(kind IN ('database','table','field')), display_name text NOT NULL,purpose text NOT NULL,physical_name text NOT NULL,pg_type text,deleted_at timestamptz,revision bigint NOT NULL DEFAULT 1,UNIQUE(scope,code));
CREATE OR REPLACE FUNCTION reloaded_meta.allocate(p_scope text,p_kind text,p_name text,p_purpose text,p_physical text,p_type text DEFAULT NULL) RETURNS reloaded_meta.identity LANGUAGE plpgsql AS $$
DECLARE n bigint; result reloaded_meta.identity;
BEGIN
IF p_kind NOT IN ('database','table','field') THEN RAISE EXCEPTION 'invalid kind'; END IF;
INSERT INTO reloaded_meta.counter(scope,last_value) VALUES(p_scope||':'||p_kind,1) ON CONFLICT(scope) DO UPDATE SET last_value=reloaded_meta.counter.last_value+1 RETURNING last_value INTO n;
INSERT INTO reloaded_meta.identity(scope,code,kind,display_name,purpose,physical_name,pg_type) VALUES(p_scope,CASE p_kind WHEN 'database' THEN 'D' WHEN 'table' THEN 'T' ELSE 'F' END||lpad(n::text,greatest(3,length(n::text)),'0'),p_kind,p_name,p_purpose,p_physical,p_type) RETURNING * INTO result;
RETURN result;
END $$;
CREATE SCHEMA IF NOT EXISTS reloaded_demo;
CREATE TABLE IF NOT EXISTS reloaded_demo.t001(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), f001 text NOT NULL CHECK(length(trim(f001))>0),f002 text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now());
DO $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM reloaded_meta.identity WHERE scope='root' AND code='D001') THEN
PERFORM reloaded_meta.allocate('root','database','고객관리','격리된 예제 데이터베이스','reloaded_dev');
PERFORM reloaded_meta.allocate('D001','table','고객','고객 기본정보','reloaded_demo.t001');
PERFORM reloaded_meta.allocate('D001.T001','field','고객명','고객 표시 이름','f001','text');
PERFORM reloaded_meta.allocate('D001.T001','field','전화번호','고객 연락처','f002','text');
END IF; END $$;
DO $$ DECLARE t record;f record; BEGIN
FOR t IN SELECT * FROM reloaded_meta.identity WHERE kind='table' AND deleted_at IS NULL LOOP
EXECUTE format('COMMENT ON TABLE %I.%I IS %L',split_part(t.physical_name,'.',1),split_part(t.physical_name,'.',2),t.display_name||' — '||t.purpose);
FOR f IN SELECT * FROM reloaded_meta.identity WHERE kind='field' AND scope=t.scope||'.'||t.code AND deleted_at IS NULL LOOP
EXECUTE format('COMMENT ON COLUMN %I.%I.%I IS %L',split_part(t.physical_name,'.',1),split_part(t.physical_name,'.',2),f.physical_name,f.display_name||' — '||f.purpose);
END LOOP;END LOOP;END $$;
COMMIT;
