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

eg record = 

 id | contextid |     name     |   idnumber   | description | descriptionformat | visible | component | timecreated | timemodified | theme 
----+-----------+--------------+--------------+-------------+-------------------+---------+-----------+-------------+--------------+-------
  1 |         1 | BCA 2025     | BCA 2025     |             |                 1 |       1 |           |  1763135552 |   1763135552 | 
  2 |         1 | BCA 2024     | BCA 2024     |             |                 1 |       1 |           |  1763135552 |   1763135552 | 
  3 |         1 | BCA 2023     | BCA 2023     |             |                 1 |       1 |           |  1763135552 |   1763135552 | 
  4 |         1 | BSc Elc 2025 | BSc Elc 2025 |             |                 1 |       1 |           |  1763135553 |   1763135553 | 
  5 |         1 | BSc Elc 2024 | BSc Elc 2024 |             |                 1 |       1 |           |  1763135553 |   1763135553 | 
  6 |         1 | BSc Elc 2023 | BSc Elc 2023 |             |                 1 |       1 |           |  1763135553 |   1763135553 | 
  7 |         1 | BCom 2025    | BCom 2025    |             |                 1 |       1 |           |  1763135553 |   1763135553 | 
  8 |         1 | BCom 2024    | BCom 2024    |             |                 1 |       1 |           |  1763135553 |   1763135553 | 
  9 |         1 | BCom 2023    | BCom 2023    |             |                 1 |       1 |           |  1763135553 |   1763135553 | 
(9 rows)


table name = mdl_cohort_members

 \d mdl_cohort_members;
                             Table "public.mdl_cohort_members"
  Column   |  Type  | Collation | Nullable |                    Default                     
-----------+--------+-----------+----------+------------------------------------------------
 id        | bigint |           | not null | nextval('mdl_cohort_members_id_seq'::regclass)
 cohortid  | bigint |           | not null | 0
 userid    | bigint |           | not null | 0
 timeadded | bigint |           | not null | 0
Indexes:
    "mdl_cohomemb_id_pk" PRIMARY KEY, btree (id)
    "mdl_cohomemb_coh_ix" btree (cohortid)
    "mdl_cohomemb_cohuse_uix" UNIQUE, btree (cohortid, userid)
    "mdl_cohomemb_use_ix" btree (userid)


eg record: 


 id | cohortid | userid | timeadded  
----+----------+--------+------------
  1 |        1 |      6 | 1763135552
  2 |        1 |      7 | 1763135552
  3 |        1 |      8 | 1763135552
  4 |        1 |      9 | 1763135552
  5 |        1 |     10 | 1763135552
  6 |        1 |     11 | 1763135552
  7 |        2 |     12 | 1763135552
  8 |        2 |     13 | 1763135552
  9 |        2 |     14 | 1763135552
 10 |        2 |     15 | 1763135552
 11 |        2 |     16 | 1763135552
 12 |        2 |     17 | 1763135552
 13 |        3 |     18 | 1763135552
 14 |        3 |     19 | 1763135552
 15 |        3 |     20 | 1763135552
 16 |        3 |     21 | 1763135552
 17 |        3 |     22 | 1763135552
 18 |        3 |     23 | 1763135552
 19 |        1 |     24 | 1763135552
 20 |        1 |     25 | 1763135552
 21 |        2 |     26 | 1763135552
 22 |        2 |     27 | 1763135552
 23 |        3 |     28 | 1763135552
 24 |        3 |     29 | 1763135552
 25 |        1 |     30 | 1763135553
 26 |        4 |     31 | 1763135553
 27 |        4 |     32 | 1763135553
 28 |        4 |     33 | 1763135553
 29 |        4 |     34 | 1763135553
 30 |        4 |     35 | 1763135553
 31 |        4 |     36 | 1763135553
 32 |        5 |     37 | 1763135553
