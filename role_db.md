Table "public.mdl_role"
   Column    |          Type          | Collation | Nullable |               Default                
-------------+------------------------+-----------+----------+--------------------------------------
 id          | bigint                 |           | not null | nextval('mdl_role_id_seq'::regclass)
 name        | character varying(255) |           | not null | ''::character varying
 shortname   | character varying(100) |           | not null | ''::character varying
 description | text                   |           | not null | 
 sortorder   | bigint                 |           | not null | 0
 archetype   | character varying(30)  |           | not null | ''::character varying
Indexes:
    "mdl_role_id_pk" PRIMARY KEY, btree (id)
    "mdl_role_sho_uix" UNIQUE, btree (shortname)
    "mdl_role_sor_uix" UNIQUE, btree (sortorder)



eg record:

 id | name |   shortname    | description | sortorder |   archetype    
----+------+----------------+-------------+-----------+----------------
  1 |      | manager        |             |         1 | manager
  2 |      | coursecreator  |             |         2 | coursecreator
  3 |      | editingteacher |             |         3 | editingteacher
  4 |      | teacher        |             |         4 | teacher
  5 |      | student        |             |         5 | student
  6 |      | guest          |             |         6 | guest
  7 |      | user           |             |         7 | user
  8 |      | frontpage      |             |         8 | frontpage
(8 rows)


 public | mdl_role_allow_assign            | table | moodleuser
 public | mdl_role_allow_override          | table | moodleuser
 public | mdl_role_allow_switch            | table | moodleuser
 public | mdl_role_allow_view              | table | moodleuser
  Table "public.mdl_role_allow_view"
  Column   |  Type  | Collation | Nullable |                     Default                     
-----------+--------+-----------+----------+-------------------------------------------------
 id        | bigint |           | not null | nextval('mdl_role_allow_view_id_seq'::regclass)
 roleid    | bigint |           | not null | 
 allowview | bigint |           | not null | 
Indexes:
    "mdl_rolealloview_id_pk" PRIMARY KEY, btree (id)
    "mdl_rolealloview_all_ix" btree (allowview)
    "mdl_rolealloview_rol_ix" btree (roleid)
    "mdl_rolealloview_rolall_uix" UNIQUE, btree (roleid, allowview)

id | roleid | allowview 
----+--------+-----------
  1 |      1 |         1
  2 |      1 |         2
  3 |      1 |         3
  4 |      1 |         4
  5 |      1 |         5
  6 |      1 |         6
  7 |      1 |         7
  8 |      1 |         8
  9 |      2 |         2
 10 |      2 |         3
 11 |      2 |         4
 12 |      2 |         5
 13 |      3 |         2
 14 |      3 |         3
 15 |      3 |         4
 16 |      3 |         5
 17 |      4 |         2
 18 |      4 |         3
 19 |      4 |         4
 20 |      4 |         5
 21 |      5 |         2


 public | mdl_role_assignments             | table | moodleuser
 Table "public.mdl_role_assignments"
    Column    |          Type          | Collation | Nullable |                     Default                      
--------------+------------------------+-----------+----------+--------------------------------------------------
 id           | bigint                 |           | not null | nextval('mdl_role_assignments_id_seq'::regclass)
 roleid       | bigint                 |           | not null | 0
 contextid    | bigint                 |           | not null | 0
 userid       | bigint                 |           | not null | 0
 timemodified | bigint                 |           | not null | 0
 modifierid   | bigint                 |           | not null | 0
 component    | character varying(100) |           | not null | ''::character varying
 itemid       | bigint                 |           | not null | 0
 sortorder    | bigint                 |           | not null | 0
Indexes:
    "mdl_roleassi_id_pk" PRIMARY KEY, btree (id)
    "mdl_roleassi_comiteuse_ix" btree (component, itemid, userid)
    "mdl_roleassi_con_ix" btree (contextid)
    "mdl_roleassi_rol_ix" btree (roleid)
    "mdl_roleassi_rolcon_ix" btree (roleid, contextid)
    "mdl_roleassi_sor_ix" btree (sortorder)
    "mdl_roleassi_use_ix" btree (userid)


    id | roleid | contextid | userid | timemodified | modifierid | component | itemid | sortorder 
----+--------+-----------+--------+--------------+------------+-----------+--------+-----------
  1 |      3 |        17 |      2 |   1762661974 |          2 |           |      0 |         0
  2 |      5 |        17 |      3 |   1762661998 |          2 |           |      0 |         0
  3 |      5 |        17 |      5 |   1762661998 |          2 |           |      0 |         0
  4 |      5 |        17 |      4 |   1762661998 |          2 |           |      0 |         0
  5 |      3 |       101 |      2 |   1763135627 |          2 |           |      0 |         0
  6 |      5 |       101 |     37 |   1763135654 |          2 |           |      0 |         0
  7 |      5 |       101 |     38 |   1763135654 |          2 |           |      0 |         0
  8 |      5 |       101 |     39 |   1763135654 |          2 |           |      0 |         0
  9 |      5 |       101 |     40 |   1763135654 |          2 |           |      0 |         0
 10 |      5 |       101 |     41 |   1763135654 |          2 |           |      0 |         0
 11 |      5 |       101 |     42 |   1763135654 |          2 |           |      0 |         0
 12 |      5 |       101 |     51 |   1763135654 |          2 |           |      0 |         0
 13 |      5 |       101 |     52 |   1763135654 |          2 |           |      0 |         0
 14 |      5 |       101 |     83 |   1763135654 |          2 |           |      0 |         0
 15 |      3 |       104 |      2 |   1763136042 |          2 |           |      0 |         0
 16 |      5 |       104 |     12 |   1763136063 |          2 |           |      0 |         0
 17 |      5 |       104 |     13 |   1763136063 |          2 |           |      0 |         0
 18 |      5 |       104 |     14 |   1763136063 |          2 |           |      0 |         0
 19 |      5 |       104 |     15 |   1763136063 |          2 |           |      0 |         0
 20 |      5 |       104 |     16 |   1763136063 |          2 |           |      0 |         0
 21 |      5 |       104 |     17 |   1763136063 |          2 |           |      0 |         0
 22 |      5 |       104 |     26 |   1763136063 |          2 |           |      0 |         0
 23 |      5 |       104 |     27 |   1763136063 |          2 |           |      0 |         0
 24 |      5 |       104 |     82 |   1763136063 |          2 |           |      0 |         0
 25 |      5 |       104 |     62 |   1763136063 |          2 |           |      0 |         0
 26 |      5 |       104 |     63 |   1763136063 |          2 |           |      0 |         0
 27 |      5 |       104 |     64 |   1763136063 |          2 |           |      0 |         0
 28 |      5 |       104 |     65 |   1763136063 |          2 |           |      0 |         0
 29 |      5 |       104 |     66 |   1763136063 |          2 |           |      0 |         0
 30 |      5 |       104 |     67 |   1763136063 |          2 |           |      0 |         0
 31 |      5 |       104 |     76 |   1763136063 |          2 |           |      0 |         0
 32 |      5 |       104 |     77 |   1763136063 |          2 |           |      0 |         0
 33

 public | mdl_role_capabilities            | table | moodleuser
 public | mdl_role_context_levels          | table | moodleuser
 public | mdl_role_names                   | table | moodleuser
