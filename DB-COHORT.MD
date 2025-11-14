TABLE name = mdl_cohort

 Table "public.mdl_cohort"
      Column       |          Type          | Collation | Nullable |                Default                 
-------------------+------------------------+-----------+----------+----------------------------------------
 id                | bigint                 |           | not null | nextval('mdl_cohort_id_seq'::regclass)
 contextid         | bigint                 |           | not null | 
 name              | character varying(254) |           | not null | ''::character varying
 idnumber          | character varying(100) |           |          | 
 description       | text                   |           |          | 
 descriptionformat | smallint               |           | not null | 
 visible           | smallint               |           | not null | 1
 component         | character varying(100) |           | not null | ''::character varying
 timecreated       | bigint                 |           | not null | 
 timemodified      | bigint                 |           | not null | 
 theme             | character varying(50)  |           |          | 
Indexes:
    "mdl_coho_id_pk" PRIMARY KEY, btree (id)
    "mdl_coho_con_ix" btree (contextid)


