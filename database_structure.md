db_connection="postgresql://postgres:235245@localhost:5432/moodle"
 
 
 
 table name = mdl_attendance
 
 Table "public.mdl_attendance"
        Column        |          Type          | Collation | Nullable |                  Default                   
----------------------+------------------------+-----------+----------+--------------------------------------------
 id                   | bigint                 |           | not null | nextval('mdl_attendance_id_seq'::regclass)
 course               | bigint                 |           | not null | 0
 name                 | character varying(255) |           |          | 
 grade                | bigint                 |           | not null | 100
 timemodified         | bigint                 |           | not null | 0
 intro                | text                   |           |          | 
 introformat          | smallint               |           | not null | 0
 subnet               | character varying(255) |           |          | 
 sessiondetailspos    | character varying(5)   |           | not null | 'left'::character varying
 showsessiondetails   | smallint               |           | not null | 1
 showextrauserdetails | smallint               |           | not null | 1
Indexes:
    "mdl_atte_id_pk" PRIMARY KEY, btree (id)
    "mdl_atte_cou_ix" btree (course)


eg records:-

id | course |        name         | grade | timemodified | intro | introformat | subnet | sessiondetailspos | showsessiondetails | showextrauserdetails 
----+--------+---------------------+-------+--------------+-------+-------------+--------+-------------------+--------------------+----------------------
  1 |      2 | Attendance          |   100 |   1762662196 |       |           1 |        | left              |                  1 |                    1
  2 |      3 | Attendance          |   100 |   1763135797 |       |           1 |        | left              |                  1 |                    1
  3 |      4 | eng 2024 attendence |   100 |   1763136092 |       |           1 |        | left              |                  1 |                    1
  4 |      5 | c attendance 2024   |   100 |   1763136393 |       |           1 |        | left              |                  1 |                    1
  5 |      6 | dbms attendance     |   100 |   1763136612 |       |           1 |        | left              |                  1 |                    1
(5 rows)

table name= mdl_attendance_log

   Table "public.mdl_attendance_log"
  Column   |          Type           | Collation | Nullable |                    Default                     
-----------+-------------------------+-----------+----------+------------------------------------------------
 id        | bigint                  |           | not null | nextval('mdl_attendance_log_id_seq'::regclass)
 sessionid | bigint                  |           | not null | 0
 studentid | bigint                  |           | not null | 0
 statusid  | bigint                  |           | not null | 0
 statusset | character varying(1333) |           |          | 
 timetaken | bigint                  |           | not null | 0
 takenby   | bigint                  |           | not null | 0
 remarks   | character varying(1333) |           |          | 
 ipaddress | character varying(45)   |           |          | ''::character varying
Indexes:
    "mdl_attelog_id_pk" PRIMARY KEY, btree (id)
    "mdl_attelog_ses_ix" btree (sessionid)
    "mdl_attelog_sta_ix" btree (statusid)
    "mdl_attelog_stu_ix" btree (studentid)


eg records:-
id  | sessionid | studentid | statusid |  statusset  | timetaken  | takenby | remarks | ipadd
ress 
-----+-----------+-----------+----------+-------------+------------+---------+---------+------
-----
   1 |         1 |         3 |        5 | 5,7,8,6     | 1762662246 |       2 |         | 
   2 |         1 |         5 |        5 | 5,7,8,6     | 1762662246 |       2 |         | 
   3 |         1 |         4 |        5 | 5,7,8,6     | 1762662246 |       2 |         | 
   4 |         2 |         3 |        5 | 5,7,8,6     | 1762662257 |       2 |         | 
   5 |         2 |         5 |        7 | 5,7,8,6     | 1762662257 |       2 |         | 
   6 |         2 |         4 |        6 | 5,7,8,6     | 1762662257 |       2 |         | 
   7 |         3 |         3 |        6 | 5,7,8,6     | 1762662266 |       2 |         | 
   8 |         3 |         5 |        7 | 5,7,8,6     | 1762662266 |       2 |         | 
   9 |         3 |         4 |        5 | 5,7,8,6     | 1762662266 |       2 |         | 
  10 |         4 |        51 |        9 | 9,11,12,10  | 1763135887 |       2 |         | 
  11 |         4 |        39 |       10 | 9,11,12,10  | 1763135887 |       2 |         | 
  12 |         4 |        41 |        9 | 9,11,12,10  | 1763135887 |       2 |         | 
  13 |         4 |        83 |       11 | 9,11,12,10  | 1763135887 |       2 |         | 
  14 |         4 |        37 |       12 | 9,11,12,10  | 1763135887 |       2 |         | 
  15 |         4 |        52 |        9 | 9,11,12,10  | 1763135887 |       2 |         | 
  16 |         4 |        38 |       10 | 9,11,12,10  | 1763135887 |       2 |         | 
  17 |         4 |        40 |       11 | 9,11,12,10  | 1763135887 |       2 |         | 
  18 |         4 |        42 |        9 | 9,11,12,10  | 1763135887 |       2 |         | 
  19 |         5 |        51 |        9 | 9,11,12,10  | 1763135899 |       2 |         | 
  20 |         5 |        39 |       12 | 9,11,12,10  | 1763135899 |       2 |         | 
  21 |         5 |        41 |        9 | 9,11,12,10  | 1763135899 |       2 |         | 
  22 |         5 |        83 |        9 | 9,11,12,10  | 1763135899 |       2 |         | 
  23 |         5 |        37 |        9 | 9,11,12,10  | 1763135899 |       2 |         | 
  24 |         5 |        52 |        9 | 9,11,12,10  | 1763135899 |       2 |         | 
  25 |         5 |        38 |       10 | 9,11,12,10  | 1763135899 |       2 |         | 
  26 |         5 |        40 |        9 | 9,11,12,10  | 1763135899 |       2 |         | 
  27 |         5 |        42 |        9 | 9,11,12,10  | 1763135899 |       2 |         | 
  28 |         6 |        51 |       10 | 9,11,12,10  | 1763135913 |       2 |         | 
  29 |         6 |        39 |       10 | 9,11,12,10  | 1763135913 |       2 |         | 
  30 |         6 |        41 |        9 | 9,11,12,10  | 1763135913 |       2 |         | 
  31 |         6 |        83 |       10 | 9,11,12,10  | 1763135913 |       2 |         | 
  32 |         6 |        37 |        9 | 9,11,12,10  | 1763135913 |       2 |         | 
  33 |         6 |        52 |       10 | 9,11,12,10  | 1763135913 |       2 |         | 
  34 |         6 |        38 |       10 | 9,11,12,10  | 1763135913 |       2 |         | 

  table name = mdl_attendance_sessions

Table "public.mdl_attendance_sessions"
        Column         |          Type          | Collation | Nullable |                       Default                       
-----------------------+------------------------+-----------+----------+-----------------------------------------------------
 id                    | bigint                 |           | not null | nextval('mdl_attendance_sessions_id_seq'::regclass)
 attendanceid          | bigint                 |           | not null | 0
 groupid               | bigint                 |           | not null | 0
 sessdate              | bigint                 |           | not null | 0
 duration              | bigint                 |           | not null | 0
 lasttaken             | bigint                 |           |          | 
 lasttakenby           | bigint                 |           | not null | 0
 timemodified          | bigint                 |           |          | 
 description           | text                   |           | not null | 
 descriptionformat     | smallint               |           | not null | 0
 studentscanmark       | smallint               |           | not null | 0
 allowupdatestatus     | smallint               |           | not null | 0
 studentsearlyopentime | bigint                 |           | not null | 0
 autoassignstatus      | smallint               |           | not null | 0
 studentpassword       | character varying(50)  |           |          | ''::character varying
 subnet                | character varying(255) |           |          | 
 automark              | smallint               |           | not null | 0
 automarkcompleted     | smallint               |           | not null | 0
 statusset             | integer                |           | not null | 0
 absenteereport        | smallint               |           | not null | 1
 preventsharedip       | smallint               |           | not null | 0
 preventsharediptime   | bigint                 |           |          | 
 caleventid            | bigint                 |           | not null | 0
 calendarevent         | smallint               |           | not null | 1
 includeqrcode         | smallint               |           | not null | 0
 rotateqrcode          | smallint               |           | not null | 0
 rotateqrcodesecret    | character varying(10)  |           |          | 
 automarkcmid          | bigint                 |           |          | 0
Indexes:
    "mdl_attesess_id_pk" PRIMARY KEY, btree (id)
    "mdl_attesess_att_ix" btree (attendanceid)
    "mdl_attesess_cal_ix" btree (caleventid)
    "mdl_attesess_gro_ix" btree (groupid)
        "mdl_attesess_ses_ix" btree (sessdate)


eg record 

id  | attendanceid | groupid |  sessdate  | duration | lasttaken  | lasttakenby | timemodified |      description      | descriptionformat | studentscanmark | allowupdatestatus | studentsearlyopentime | autoassignstatus | studentpassword | subnet | automark | automarkcompleted | statusset | absenteereport | preventsharedip | preventsharediptime | caleventid | calendarevent | includeqrcode | rotateqrcode | rotateqrcodesecret | automarkcmid 
-----+--------------+---------+------------+----------+------------+-------------+--------------+-----------------------+-------------------+-----------------+-------------------+-----------------------+------------------+-----------------+--------+----------+-------------------+-----------+----------------+-----------------+---------------------+------------+---------------+---------------+--------------+--------------------+--------------
   5 |            2 |       0 | 1763526600 |     3600 | 1763135899 |           2 |   1763135848 | Regular class session |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |          5 |             1 |             0 |            0 |                    |            0
  15 |            2 |       0 | 1765513800 |     3600 |            |           0 |   1763135848 |                       |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |         15 |             1 |             0 |            0 |                    |            0
   6 |            2 |       0 | 1763699400 |     3600 | 1763135913 |           2 |   1763135848 | Regular class session |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |          6 |             1 |             0 |            0 |                    |            0
   8 |            2 |       0 | 1764131400 |     3600 | 1763135946 |           2 |   1763135848 | Regular class session |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |          8 |             1 |             0 |            0 |                    |            0
   9 |            2 |       0 | 1764304200 |     3600 | 1763135963 |           2 |   1763135848 | Regular class session |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |          9 |             1 |             0 |            0 |                    |            0
  37 |            2 |       0 | 1770006600 |     3600 |            |           0 |   1763135848 |                       |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |         37 |             1 |             0 |            0 |                    |            0
   1 |            1 |       0 | 1762713600 |    39000 | 1762662246 |           2 |   1762662233 | Regular class session |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |          1 |             1 |             0 |            0 |                    |            0
   2 |            1 |       0 | 1762800000 |    39000 | 1762662257 |           2 |   1762662233 | Regular class session |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |          2 |             1 |             0 |            0 |                    |            0
   3 |            1 |       0 | 1762886400 |    39000 | 1762662266 |           2 |   1762662233 | Regular class session |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |          3 |             1 |             0 |            0 |                    |            0
  10 |            2 |       0 | 1764563400 |     3600 | 1763135977 |           2 |   1763135848 | Regular class session |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |         10 |             1 |             0 |            0 |                    |            0
  16 |            2 |       0 | 1765773000 |     3600 |            |           0 |   1763135848 |                       |                 1 |               0 |                 0 |                     0 |                0 |                 |        |        0 |                 0 |         0 |              1 |               0 |                   0 |         16 |             1 |             0 |            0 |                    |            0
:


table name = mdl_attendance_statuses

 Table "public.mdl_attendance_statuses"
         Column         |         Type          | Collation | Nullable |                       Default                       
------------------------+-----------------------+-----------+----------+-----------------------------------------------------
 id                     | bigint                |           | not null | nextval('mdl_attendance_statuses_id_seq'::regclass)
 attendanceid           | bigint                |           | not null | 0
 acronym                | character varying(2)  |           | not null | ''::character varying
 description            | character varying(30) |           | not null | ''::character varying
 grade                  | numeric(5,2)          |           | not null | 0
 studentavailability    | bigint                |           |          | 
 availablebeforesession | smallint              |           |          | 
 setunmarked            | smallint              |           |          | 
 visible                | smallint              |           | not null | 1
 deleted                | smallint              |           | not null | 0
 setnumber              | integer               |           | not null | 0
Indexes:
    "mdl_attestat_id_pk" PRIMARY KEY, btree (id)
    "mdl_attestat_att_ix" btree (attendanceid)
    "mdl_attestat_del_ix" btree (deleted)
    "mdl_attestat_vis_ix" btree (visible)


eg records:-

 id | attendanceid | acronym | description | grade | studentavailability | availablebeforesession | setunmarked | visible | deleted | setnumber 
----+--------------+---------+-------------+-------+---------------------+------------------------+-------------+---------+---------+-----------
  1 |            0 | P       | Present     |  2.00 |                     |                        |             |       1 |       0 |         0
  2 |            0 | A       | Absent      |  0.00 |                     |                        |             |       1 |       0 |         0
  3 |            0 | L       | Late        |  1.00 |                     |                        |             |       1 |       0 |         0
  4 |            0 | E       | Excused     |  1.00 |                     |                        |             |       1 |       0 |         0
  5 |            1 | P       | Present     |  2.00 |                     |                        |             |       1 |       0 |         0
  6 |            1 | A       | Absent      |  0.00 |                     |                        |             |       1 |       0 |         0
  7 |            1 | L       | Late        |  1.00 |                     |                        |             |       1 |       0 |         0
  8 |            1 | E       | Excused     |  1.00 |                     |                        |             |       1 |       0 |         0
  9 |            2 | P       | Present     |  2.00 |                     |                        |             |       1 |       0 |         0
 10 |            2 | A       | Absent      |  0.00 |                     |                        |             |       1 |       0 |         0
 11 |            2 | L       | Late        |  1.00 |                     |                        |             |       1 |       0 |         0
 12 |            2 | E       | Excused     |  1.00 |                     |                        |             |       1 |       0 |         0
 13 |            3 | P       | Present     |  2.00 |                     |                        |             |       1 |       0 |         0
 14 |            3 | A       | Absent      |  0.00 |                     |                        |             |       1 |       0 |         0
 15 |            3 | L       | Late        |  1.00 |                     |                        |             |       1 |       0 |         0
 16 |            3 | E       | Excused     |  1.00 |                     |                        |             |       1 |       0 |         0
 17 |            4 | P       | Present     |  2.00 |                     |                        |             |       1 |       0 |         0
 18 |            4 | A       | Absent      |  0.00 |                     |                        |             |       1 |       0 |         0
 19 |            4 | L       | Late        |  1.00 |                     |                        |             |       1 |       0 |         0
 20 |            4 | E       | Excused     |  1.00 |                     |                        |             |       1 |       0 |         0
 21 |            5 | P       | Present     |  2.00 |                     |                        |             |       1 |       0 |         0
 22 |            5 | A       | Absent      |  0.00 |                     |                        |             |       1 |       0 |         0
 23 |            5 | L       | Late        |  1.00 |                     |                        |             |       1 |       0 |         0
 24 |            5 | E       | Excused     |  1.00 |                     |                        |             |       1 |       0 |         0
(24 rows)

table name: mdl_user

 Table "public.mdl_user"
      Column       |          Type          | Collation | Nullable |               Default                
-------------------+------------------------+-----------+----------+--------------------------------------
 id                | bigint                 |           | not null | nextval('mdl_user_id_seq'::regclass)
 auth              | character varying(20)  |           | not null | 'manual'::character varying
 confirmed         | smallint               |           | not null | 0
 policyagreed      | smallint               |           | not null | 0
 deleted           | smallint               |           | not null | 0
 suspended         | smallint               |           | not null | 0
 mnethostid        | bigint                 |           | not null | 0
 username          | character varying(100) |           | not null | ''::character varying
 password          | character varying(255) |           | not null | ''::character varying
 idnumber          | character varying(255) |           | not null | ''::character varying
 firstname         | character varying(100) |           | not null | ''::character varying
 lastname          | character varying(100) |           | not null | ''::character varying
 email             | character varying(100) |           | not null | ''::character varying
 emailstop         | smallint               |           | not null | 0
 phone1            | character varying(20)  |           | not null | ''::character varying
 phone2            | character varying(20)  |           | not null | ''::character varying
 institution       | character varying(255) |           | not null | ''::character varying
 department        | character varying(255) |           | not null | ''::character varying
 address           | character varying(255) |           | not null | ''::character varying
 city              | character varying(120) |           | not null | ''::character varying
 country           | character varying(2)   |           | not null | ''::character varying
 lang              | character varying(30)  |           | not null | 'en'::character varying
 calendartype      | character varying(30)  |           | not null | 'gregorian'::character varying
 theme             | character varying(50)  |           | not null | ''::character varying
 timezone          | character varying(100) |           | not null | '99'::character varying
 firstaccess       | bigint                 |           | not null | 0
 lastaccess        | bigint                 |           | not null | 0
 lastlogin         | bigint                 |           | not null | 0
 currentlogin      | bigint                 |           | not null | 0
 lastip            | character varying(45)  |           | not null | ''::character varying
 secret            | character varying(15)  |           | not null | ''::character varying
 picture           | bigint                 |           | not null | 0
 description       | text                   |           |          | 
 descriptionformat | smallint               |           | not null | 1
 mailformat        | smallint               |           | not null | 1
 maildigest        | smallint               |           | not null | 0
maildisplay       | smallint               |           | not null | 2
 autosubscribe     | smallint               |           | not null | 1
 trackforums       | smallint               |           | not null | 0
 timecreated       | bigint                 |           | not null | 0
 timemodified      | bigint                 |           | not null | 0
 trustbitmask      | bigint                 |           | not null | 0
 imagealt          | character varying(255) |           |          | 
 lastnamephonetic  | character varying(255) |           |          | 
 firstnamephonetic | character varying(255) |           |          | 
 middlename        | character varying(255) |           |          | 
 alternatename     | character varying(255) |           |          | 
 moodlenetprofile  | character varying(255) |           |          | 
Indexes:
    "mdl_user_id_pk" PRIMARY KEY, btree (id)
    "mdl_user_alt_ix" btree (alternatename)
    "mdl_user_aut_ix" btree (auth)
    "mdl_user_cit_ix" btree (city)
    "mdl_user_con_ix" btree (confirmed)
    "mdl_user_cou_ix" btree (country)
    "mdl_user_del_ix" btree (deleted)
    "mdl_user_ema_ix" btree (email)
    "mdl_user_fir2_ix" btree (firstnamephonetic)
    "mdl_user_fir_ix" btree (firstname)
    "mdl_user_idn_ix" btree (idnumber)
    "mdl_user_las2_ix" btree (lastaccess)
    "mdl_user_las3_ix" btree (lastnamephonetic)
    "mdl_user_las_ix" btree (lastname)
    "mdl_user_mid_ix" btree (middlename)
    "mdl_user_mneuse_uix" UNIQUE, btree (mnethostid, username)


eg record: 

id |  auth  | confirmed | policyagreed | deleted | suspended | mnethostid |      username      |                                                        password                                                         | idnumber |  firstname   | lastname  |               email               | emailstop | phone1 | phone2 |             institution             |      department      | address |    city    | country | lang | calendartype | theme |   timezone    | firstaccess | lastaccess | lastlogin  | currentlogin |     lastip      | secret | picture |                                description                                | descriptionformat | mailformat | maildigest | maildisplay | autosubscribe | trackforums | timecreated | timemodified | trustbitmask | imagealt | lastnamephonetic | firstnamephonetic | middlename | alternatename | moodlenetprofile 
----+--------+-----------+--------------+---------+-----------+------------+--------------------+-------------------------------------------------------------------------------------------------------------------------+----------+--------------+-----------+-----------------------------------+-----------+--------+--------+-------------------------------------+----------------------+---------+------------+---------+------+--------------+-------+---------------+-------------+------------+------------+--------------+-----------------+--------+---------+---------------------------------------------------------------------------+-------------------+------------+------------+-------------+---------------+-------------+-------------+--------------+--------------+----------+------------------+-------------------+------------+---------------+------------------
  1 | manual |         1 |            0 |       0 |         0 |          1 | guest              | $6$rounds=10000$I1W81Quq2c5zIho1$1.9bgUbvZPxTtr0PxJ2j6mpI1ykRad2u/clYsd/YStUL8hQVzPySQ5bRqJFrYa85HwjRhWX.AD4MzRQLR6fza0 |          | Guest user   |           | root@localhost                    |         0 |        |        |                                     |                      |         |            |         | en   | gregorian    |       | 99            |           0 |          0 |          0 |            0 |                 |        |       0 | This user is a special user that allows read-only access to some courses. |                 1 |          1 |          0 |           2 |             1 |           0 |           0 |   1761748371 |            0 |          |                  |                   |            |               | 
  6 | manual |         1 |            0 |       0 |         0 |          1 | amal.kumar21       | to be generated                                                                                                         |          | Amal         | Kumar     | amal.kumar21@gastanur.ac.in       |         0 |        |        | Govt Arts and Science College Tanur | Computer Application |         | Tanur      | 0       | en   | gregorian    |       | Europe/London |           0 |          0 |          0 |            0 |                 |        |       0 |                                                                           |                 1 |          1 |          0 |           2 |             1 |           0 |  1763135552 |   1763135552 |            0 |          |                  |                   |            |               | 
  7 | manual |         1 |            0 |       0 |         0 |          1 | priya.nair22       | to be generated                                                                                                         |          | Priya        | Nair      | priya.nair22@gastanur.ac.in       |         0 |        |        | Govt Arts and Science College Tanur | Computer Application |         | Tanur      | 0       | en   | gregorian    |       | Europe/London |           0 |          0 |          0 |            0 |                 |        |       0 |                                                                           |                 1 |          1 |          0 |           2 |             1 |           0 |  1763135552 |   1763135552 |            0 |          |                  |                   |            |               | 
  8 | manual |         1 |            0 |       0 |         0 |          1 | rahul.menon23      | to be generated                                                                                                         |          | Rahul        | Menon     | rahul.menon23@gastanur.ac.in      |         0 |        |        | Govt Arts and Science College Tanur | Computer Application |         | Tanur      | 0       | en   | gregorian    |       | Europe/London |           0 |          0 |          0 |            0 |                 |        |       0 |                                                                           |                 1 |          1 |          0 |           2 |             1 |           0 |  1763135552 |   1763135552 |            0 |          |                  |                   |            |               | 
  9 | manual |         1 |            0 |       0 |         0 |          1 | anjali.pillai24    | to be generated                                                                                                         |          | Anjali       | Pillai    | anjali.pillai24@gastanur.ac.in    |         0 |        |        | Govt Arts and Science College Tanur | Computer Application |         | Tanur      | 0       | en   | gregorian    |       | Europe/London |           :

