-- ============================================================
-- BSA (Bachelor of Science in Accountancy) Subjects
-- ============================================================
INSERT IGNORE INTO subjects (id, code, name, units, course, year_level, semester) VALUES
-- Year 1 - 1st Semester
(UUID(), 'AC101', 'Fundamentals of Accounting 1',        3, 'BSA', 1, '1st'),
(UUID(), 'AC102', 'Business Mathematics',                 3, 'BSA', 1, '1st'),
(UUID(), 'AC103', 'Principles of Management',             3, 'BSA', 1, '1st'),
(UUID(), 'AC104', 'Microeconomics',                       3, 'BSA', 1, '1st'),
(UUID(), 'AC105', 'Law on Obligations and Contracts',     3, 'BSA', 1, '1st'),
-- Year 1 - 2nd Semester
(UUID(), 'AC106', 'Fundamentals of Accounting 2',        3, 'BSA', 1, '2nd'),
(UUID(), 'AC107', 'Macroeconomics',                       3, 'BSA', 1, '2nd'),
(UUID(), 'AC108', 'Business Finance',                     3, 'BSA', 1, '2nd'),
(UUID(), 'AC109', 'Corporation Law',                      3, 'BSA', 1, '2nd'),
(UUID(), 'AC110', 'Business Organization and Management', 3, 'BSA', 1, '2nd'),
-- Year 2 - 1st Semester
(UUID(), 'AC201', 'Intermediate Accounting 1',            3, 'BSA', 2, '1st'),
(UUID(), 'AC202', 'Cost Accounting 1',                    3, 'BSA', 2, '1st'),
(UUID(), 'AC203', 'Income Taxation',                      3, 'BSA', 2, '1st'),
(UUID(), 'AC204', 'Management Information Systems',       3, 'BSA', 2, '1st'),
(UUID(), 'AC205', 'Business Statistics',                  3, 'BSA', 2, '1st'),
-- Year 2 - 2nd Semester
(UUID(), 'AC206', 'Intermediate Accounting 2',            3, 'BSA', 2, '2nd'),
(UUID(), 'AC207', 'Cost Accounting 2',                    3, 'BSA', 2, '2nd'),
(UUID(), 'AC208', 'Business and Transfer Taxes',          3, 'BSA', 2, '2nd'),
(UUID(), 'AC209', 'Operations Management',                3, 'BSA', 2, '2nd'),
(UUID(), 'AC210', 'Auditing Theory and Practice',         3, 'BSA', 2, '2nd'),
-- Year 3 - 1st Semester
(UUID(), 'AC301', 'Advanced Accounting 1',                3, 'BSA', 3, '1st'),
(UUID(), 'AC302', 'Auditing and Assurance Services 1',    3, 'BSA', 3, '1st'),
(UUID(), 'AC303', 'Management Advisory Services',         3, 'BSA', 3, '1st'),
(UUID(), 'AC304', 'Financial Management',                 3, 'BSA', 3, '1st'),
(UUID(), 'AC305', 'Governance, Business Ethics and CSR',  3, 'BSA', 3, '1st'),
-- Year 3 - 2nd Semester
(UUID(), 'AC306', 'Advanced Accounting 2',                3, 'BSA', 3, '2nd'),
(UUID(), 'AC307', 'Auditing and Assurance Services 2',    3, 'BSA', 3, '2nd'),
(UUID(), 'AC308', 'Accounting Information Systems',       3, 'BSA', 3, '2nd'),
(UUID(), 'AC309', 'Strategic Business Analysis',          3, 'BSA', 3, '2nd'),
(UUID(), 'AC310', 'Accounting Research Methods',          3, 'BSA', 3, '2nd'),
-- Year 3 - Summer
(UUID(), 'AC311', 'Accounting Internship',                6, 'BSA', 3, 'summer'),
-- Year 4 - 1st Semester
(UUID(), 'AC401', 'CPA Review - Financial Reporting',     3, 'BSA', 4, '1st'),
(UUID(), 'AC402', 'CPA Review - Taxation',                3, 'BSA', 4, '1st'),
(UUID(), 'AC403', 'CPA Review - Management Services',     3, 'BSA', 4, '1st'),
-- Year 4 - 2nd Semester
(UUID(), 'AC404', 'CPA Review - Auditing',                3, 'BSA', 4, '2nd'),
(UUID(), 'AC405', 'CPA Review - Regulatory Framework',    3, 'BSA', 4, '2nd'),
(UUID(), 'AC406', 'Accounting Thesis / Capstone Project', 3, 'BSA', 4, '2nd');

-- ============================================================
-- BSMT (Bachelor of Science in Marine Transportation) Subjects
-- ============================================================
INSERT IGNORE INTO subjects (id, code, name, units, course, year_level, semester) VALUES
-- Year 1 - 1st Semester
(UUID(), 'MT101', 'Introduction to Maritime Industry',      3, 'BSMT', 1, '1st'),
(UUID(), 'MT102', 'Seamanship 1',                           3, 'BSMT', 1, '1st'),
(UUID(), 'MT103', 'Maritime English',                       3, 'BSMT', 1, '1st'),
(UUID(), 'MT104', 'Basic Safety Training (STCW)',           3, 'BSMT', 1, '1st'),
(UUID(), 'MT105', 'Marine Environmental Awareness',         3, 'BSMT', 1, '1st'),
-- Year 1 - 2nd Semester
(UUID(), 'MT106', 'Seamanship 2',                           3, 'BSMT', 1, '2nd'),
(UUID(), 'MT107', 'Terrestrial Navigation 1',               3, 'BSMT', 1, '2nd'),
(UUID(), 'MT108', 'Meteorology and Oceanography',           3, 'BSMT', 1, '2nd'),
(UUID(), 'MT109', 'Ship Stability 1',                       3, 'BSMT', 1, '2nd'),
(UUID(), 'MT110', 'Cargo Handling and Stowage',             3, 'BSMT', 1, '2nd'),
-- Year 2 - 1st Semester
(UUID(), 'MT201', 'Terrestrial Navigation 2',               3, 'BSMT', 2, '1st'),
(UUID(), 'MT202', 'Electronic Navigation 1',                3, 'BSMT', 2, '1st'),
(UUID(), 'MT203', 'Ship Stability 2',                       3, 'BSMT', 2, '1st'),
(UUID(), 'MT204', 'Maritime Law 1 (SOLAS, MARPOL)',         3, 'BSMT', 2, '1st'),
(UUID(), 'MT205', 'Watch Keeping at Sea',                   3, 'BSMT', 2, '1st'),
-- Year 2 - 2nd Semester
(UUID(), 'MT206', 'Electronic Navigation 2 (ARPA/ECDIS)',   3, 'BSMT', 2, '2nd'),
(UUID(), 'MT207', 'Ship Operations and Management',         3, 'BSMT', 2, '2nd'),
(UUID(), 'MT208', 'Maritime Law 2 (STCW, MLC)',             3, 'BSMT', 2, '2nd'),
(UUID(), 'MT209', 'Advanced Fire Prevention and Fighting',  3, 'BSMT', 2, '2nd'),
(UUID(), 'MT210', 'Survival Craft and Rescue Boats',        3, 'BSMT', 2, '2nd'),
-- Year 3 - 1st Semester
(UUID(), 'MT301', 'Advanced Navigation and Radar Plotting', 3, 'BSMT', 3, '1st'),
(UUID(), 'MT302', 'Bridge Team and Resource Management',    3, 'BSMT', 3, '1st'),
(UUID(), 'MT303', 'Voyage Planning and Navigation',         3, 'BSMT', 3, '1st'),
(UUID(), 'MT304', 'GMDSS and Radio Communications',         3, 'BSMT', 3, '1st'),
(UUID(), 'MT305', 'Port State Control and Inspections',     3, 'BSMT', 3, '1st'),
-- Year 3 - 2nd Semester
(UUID(), 'MT306', 'Maritime Security (ISPS Code)',          3, 'BSMT', 3, '2nd'),
(UUID(), 'MT307', 'Ship Management and Administration',     3, 'BSMT', 3, '2nd'),
(UUID(), 'MT308', 'Marine Pollution Prevention',            3, 'BSMT', 3, '2nd'),
(UUID(), 'MT309', 'Crisis and Crowd Management',            3, 'BSMT', 3, '2nd'),
(UUID(), 'MT310', 'Research Methods in Maritime',           3, 'BSMT', 3, '2nd'),
-- Year 3 - Summer (Shipboard Training)
(UUID(), 'MT311', 'Shipboard Training / Sea-Based Internship', 6, 'BSMT', 3, 'summer'),
-- Year 4 - 1st Semester
(UUID(), 'MT401', 'Offshore and Coastal Navigation',        3, 'BSMT', 4, '1st'),
(UUID(), 'MT402', 'Deck Officer Functions and Duties',      3, 'BSMT', 4, '1st'),
(UUID(), 'MT403', 'Maritime Thesis 1',                      3, 'BSMT', 4, '1st'),
-- Year 4 - 2nd Semester
(UUID(), 'MT404', 'STCW Review and Professional Updates',   3, 'BSMT', 4, '2nd'),
(UUID(), 'MT405', 'Maritime Thesis 2',                      3, 'BSMT', 4, '2nd'),
(UUID(), 'MT406', 'Maritime Safety and Loss Prevention',    3, 'BSMT', 4, '2nd');

-- ============================================================
-- BSME (Bachelor of Science in Mechanical Engineering) Subjects
-- ============================================================
INSERT IGNORE INTO subjects (id, code, name, units, course, year_level, semester) VALUES
-- Year 1 - 1st Semester
(UUID(), 'ME101', 'Engineering Drawing 1',                  3, 'BSME', 1, '1st'),
(UUID(), 'ME102', 'Calculus 1 for Engineers',               3, 'BSME', 1, '1st'),
(UUID(), 'ME103', 'Engineering Chemistry',                  3, 'BSME', 1, '1st'),
(UUID(), 'ME104', 'Engineering Physics 1',                  3, 'BSME', 1, '1st'),
(UUID(), 'ME105', 'Engineering Economics',                  3, 'BSME', 1, '1st'),
-- Year 1 - 2nd Semester
(UUID(), 'ME106', 'Engineering Drawing 2 / CAD',            3, 'BSME', 1, '2nd'),
(UUID(), 'ME107', 'Calculus 2 for Engineers',               3, 'BSME', 1, '2nd'),
(UUID(), 'ME108', 'Engineering Physics 2',                  3, 'BSME', 1, '2nd'),
(UUID(), 'ME109', 'Statics of Rigid Bodies',                3, 'BSME', 1, '2nd'),
(UUID(), 'ME110', 'Engineering Materials',                  3, 'BSME', 1, '2nd'),
-- Year 2 - 1st Semester
(UUID(), 'ME201', 'Differential Equations for Engineers',   3, 'BSME', 2, '1st'),
(UUID(), 'ME202', 'Dynamics of Rigid Bodies',               3, 'BSME', 2, '1st'),
(UUID(), 'ME203', 'Strength of Materials',                  3, 'BSME', 2, '1st'),
(UUID(), 'ME204', 'Engineering Thermodynamics 1',           3, 'BSME', 2, '1st'),
(UUID(), 'ME205', 'Workshop Technology',                    3, 'BSME', 2, '1st'),
-- Year 2 - 2nd Semester
(UUID(), 'ME206', 'Probability and Statistics for Engineers',3, 'BSME', 2, '2nd'),
(UUID(), 'ME207', 'Fluid Mechanics',                        3, 'BSME', 2, '2nd'),
(UUID(), 'ME208', 'Engineering Thermodynamics 2',           3, 'BSME', 2, '2nd'),
(UUID(), 'ME209', 'Theory of Machines',                     3, 'BSME', 2, '2nd'),
(UUID(), 'ME210', 'Electrical Technology for ME',           3, 'BSME', 2, '2nd'),
-- Year 3 - 1st Semester
(UUID(), 'ME301', 'Hydraulics and Fluid Machinery',         3, 'BSME', 3, '1st'),
(UUID(), 'ME302', 'Machine Design 1',                       3, 'BSME', 3, '1st'),
(UUID(), 'ME303', 'Heat Transfer',                          3, 'BSME', 3, '1st'),
(UUID(), 'ME304', 'Manufacturing Processes 1',              3, 'BSME', 3, '1st'),
(UUID(), 'ME305', 'Industrial Plant Engineering',           3, 'BSME', 3, '1st'),
-- Year 3 - 2nd Semester
(UUID(), 'ME306', 'Machine Design 2',                       3, 'BSME', 3, '2nd'),
(UUID(), 'ME307', 'Power Plant Engineering',                3, 'BSME', 3, '2nd'),
(UUID(), 'ME308', 'Manufacturing Processes 2',              3, 'BSME', 3, '2nd'),
(UUID(), 'ME309', 'Refrigeration and Air Conditioning',     3, 'BSME', 3, '2nd'),
(UUID(), 'ME310', 'Engineering Management',                 3, 'BSME', 3, '2nd'),
-- Year 3 - Summer
(UUID(), 'ME311', 'Engineering Internship / OJT',           6, 'BSME', 3, 'summer'),
-- Year 4 - 1st Semester
(UUID(), 'ME401', 'ME Board Exam Review 1',                 3, 'BSME', 4, '1st'),
(UUID(), 'ME402', 'ME Design Project 1 (Capstone 1)',       3, 'BSME', 4, '1st'),
(UUID(), 'ME403', 'Renewable Energy Systems',               3, 'BSME', 4, '1st'),
-- Year 4 - 2nd Semester
(UUID(), 'ME404', 'ME Board Exam Review 2',                 3, 'BSME', 4, '2nd'),
(UUID(), 'ME405', 'ME Design Project 2 (Capstone 2)',       3, 'BSME', 4, '2nd'),
(UUID(), 'ME406', 'Industrial Safety Engineering',          3, 'BSME', 4, '2nd');

-- ============================================================
-- BSCE (Bachelor of Science in Civil Engineering) Subjects
-- ============================================================
INSERT IGNORE INTO subjects (id, code, name, units, course, year_level, semester) VALUES
-- Year 1 - 1st Semester
(UUID(), 'CE101', 'Engineering Drawing and CAD',            3, 'BSCE', 1, '1st'),
(UUID(), 'CE102', 'Calculus 1 for Engineers',               3, 'BSCE', 1, '1st'),
(UUID(), 'CE103', 'Engineering Chemistry',                  3, 'BSCE', 1, '1st'),
(UUID(), 'CE104', 'Engineering Physics 1',                  3, 'BSCE', 1, '1st'),
(UUID(), 'CE105', 'Introduction to Civil Engineering',      3, 'BSCE', 1, '1st'),
-- Year 1 - 2nd Semester
(UUID(), 'CE106', 'Calculus 2 for Engineers',               3, 'BSCE', 1, '2nd'),
(UUID(), 'CE107', 'Engineering Physics 2',                  3, 'BSCE', 1, '2nd'),
(UUID(), 'CE108', 'Statics of Rigid Bodies',                3, 'BSCE', 1, '2nd'),
(UUID(), 'CE109', 'Surveying 1',                            3, 'BSCE', 1, '2nd'),
(UUID(), 'CE110', 'Engineering Materials and Testing',      3, 'BSCE', 1, '2nd'),
-- Year 2 - 1st Semester
(UUID(), 'CE201', 'Differential Equations for Engineers',   3, 'BSCE', 2, '1st'),
(UUID(), 'CE202', 'Dynamics of Rigid Bodies',               3, 'BSCE', 2, '1st'),
(UUID(), 'CE203', 'Strength of Materials',                  3, 'BSCE', 2, '1st'),
(UUID(), 'CE204', 'Surveying 2 and Route Surveying',        3, 'BSCE', 2, '1st'),
(UUID(), 'CE205', 'Fluid Mechanics',                        3, 'BSCE', 2, '1st'),
-- Year 2 - 2nd Semester
(UUID(), 'CE206', 'Numerical Methods for Engineers',        3, 'BSCE', 2, '2nd'),
(UUID(), 'CE207', 'Hydraulics and Hydraulic Machinery',     3, 'BSCE', 2, '2nd'),
(UUID(), 'CE208', 'Structural Theory 1',                    3, 'BSCE', 2, '2nd'),
(UUID(), 'CE209', 'Geotechnical Engineering 1 (Soil Mech)', 3, 'BSCE', 2, '2nd'),
(UUID(), 'CE210', 'Engineering Economics',                  3, 'BSCE', 2, '2nd'),
-- Year 3 - 1st Semester
(UUID(), 'CE301', 'Structural Theory 2',                    3, 'BSCE', 3, '1st'),
(UUID(), 'CE302', 'Geotechnical Engineering 2 (Foundation)',3, 'BSCE', 3, '1st'),
(UUID(), 'CE303', 'Transportation Engineering 1',           3, 'BSCE', 3, '1st'),
(UUID(), 'CE304', 'Reinforced Concrete Design 1',           3, 'BSCE', 3, '1st'),
(UUID(), 'CE305', 'Hydrology and Water Resources',          3, 'BSCE', 3, '1st'),
-- Year 3 - 2nd Semester
(UUID(), 'CE306', 'Structural Steel Design',                3, 'BSCE', 3, '2nd'),
(UUID(), 'CE307', 'Reinforced Concrete Design 2',           3, 'BSCE', 3, '2nd'),
(UUID(), 'CE308', 'Transportation Engineering 2',           3, 'BSCE', 3, '2nd'),
(UUID(), 'CE309', 'Construction Management and Estimating', 3, 'BSCE', 3, '2nd'),
(UUID(), 'CE310', 'Environmental Engineering',              3, 'BSCE', 3, '2nd'),
-- Year 3 - Summer
(UUID(), 'CE311', 'Engineering Internship / OJT',           6, 'BSCE', 3, 'summer'),
-- Year 4 - 1st Semester
(UUID(), 'CE401', 'CE Board Exam Review 1',                 3, 'BSCE', 4, '1st'),
(UUID(), 'CE402', 'CE Design Project 1 (Capstone 1)',       3, 'BSCE', 4, '1st'),
(UUID(), 'CE403', 'Sanitary Engineering',                   3, 'BSCE', 4, '1st'),
-- Year 4 - 2nd Semester
(UUID(), 'CE404', 'CE Board Exam Review 2',                 3, 'BSCE', 4, '2nd'),
(UUID(), 'CE405', 'CE Design Project 2 (Capstone 2)',       3, 'BSCE', 4, '2nd'),
(UUID(), 'CE406', 'Professional Practice in Civil Eng.',    3, 'BSCE', 4, '2nd');

-- ============================================================
-- MINOR SUBJECTS (is_minor = 1)
-- Available as optional minor programs for qualifying students
-- ============================================================

-- Minor: Entrepreneurship (open to all courses)
INSERT IGNORE INTO subjects (id, code, name, units, course, year_level, semester, is_minor) VALUES
(UUID(), 'ENT-M101', 'Entrepreneurship Fundamentals',        3, NULL, NULL, NULL, 1),
(UUID(), 'ENT-M102', 'Business Planning and Feasibility',    3, NULL, NULL, NULL, 1),
(UUID(), 'ENT-M103', 'New Venture Creation and Management',  3, NULL, NULL, NULL, 1),
(UUID(), 'ENT-M104', 'Digital Marketing for Entrepreneurs',  3, NULL, NULL, NULL, 1),
(UUID(), 'ENT-M105', 'Social Entrepreneurship',              3, NULL, NULL, NULL, 1);

-- Minor: Information Technology (open to non-IT courses)
INSERT IGNORE INTO subjects (id, code, name, units, course, year_level, semester, is_minor) VALUES
(UUID(), 'ITM-M101', 'Fundamentals of Computing',            3, NULL, NULL, NULL, 1),
(UUID(), 'ITM-M102', 'Introduction to Web Development',      3, NULL, NULL, NULL, 1),
(UUID(), 'ITM-M103', 'Database Fundamentals',                3, NULL, NULL, NULL, 1),
(UUID(), 'ITM-M104', 'Cybersecurity Awareness',              3, NULL, NULL, NULL, 1),
(UUID(), 'ITM-M105', 'Data Analytics and Visualization',     3, NULL, NULL, NULL, 1);

-- Minor: Business Administration (open to non-BSBA courses)
INSERT IGNORE INTO subjects (id, code, name, units, course, year_level, semester, is_minor) VALUES
(UUID(), 'BAM-M101', 'Principles of Business Organization',  3, NULL, NULL, NULL, 1),
(UUID(), 'BAM-M102', 'Marketing Fundamentals',               3, NULL, NULL, NULL, 1),
(UUID(), 'BAM-M103', 'Financial Literacy and Management',    3, NULL, NULL, NULL, 1),
(UUID(), 'BAM-M104', 'Human Resource Management Basics',     3, NULL, NULL, NULL, 1),
(UUID(), 'BAM-M105', 'Business Law and Ethics',              3, NULL, NULL, NULL, 1);

-- Minor: Environmental Science (open to engineering courses)
INSERT IGNORE INTO subjects (id, code, name, units, course, year_level, semester, is_minor) VALUES
(UUID(), 'ENV-M101', 'Principles of Ecology',                3, NULL, NULL, NULL, 1),
(UUID(), 'ENV-M102', 'Environmental Laws and Policies',      3, NULL, NULL, NULL, 1),
(UUID(), 'ENV-M103', 'Solid Waste and Pollution Management', 3, NULL, NULL, NULL, 1),
(UUID(), 'ENV-M104', 'Climate Change and Sustainability',    3, NULL, NULL, NULL, 1),
(UUID(), 'ENV-M105', 'Environmental Impact Assessment',      3, NULL, NULL, NULL, 1);

-- ============================================================
-- subject_minor_courses: link minor subjects to allowed courses
-- ============================================================

-- Entrepreneurship minor: open to BSIT, BSCS, BSA, BSEd, BSMT, BSME, BSCE, BSCRIM
INSERT IGNORE INTO subject_minor_courses (subject_id, course)
SELECT s.id, c.course FROM subjects s
JOIN (
  SELECT 'ENT-M101' AS code UNION SELECT 'ENT-M102' UNION SELECT 'ENT-M103'
  UNION SELECT 'ENT-M104' UNION SELECT 'ENT-M105'
) codes ON s.code = codes.code
CROSS JOIN (
  SELECT 'BSIT' AS course UNION SELECT 'BSCS' UNION SELECT 'BSA'
  UNION SELECT 'BSEd' UNION SELECT 'BSMT' UNION SELECT 'BSME'
  UNION SELECT 'BSCE' UNION SELECT 'BSCRIM'
) c;

-- IT minor: open to BSA, BSEd, BSBA, BSMT, BSME, BSCE, BSCRIM
INSERT IGNORE INTO subject_minor_courses (subject_id, course)
SELECT s.id, c.course FROM subjects s
JOIN (
  SELECT 'ITM-M101' AS code UNION SELECT 'ITM-M102' UNION SELECT 'ITM-M103'
  UNION SELECT 'ITM-M104' UNION SELECT 'ITM-M105'
) codes ON s.code = codes.code
CROSS JOIN (
  SELECT 'BSA' AS course UNION SELECT 'BSEd' UNION SELECT 'BSBA'
  UNION SELECT 'BSMT' UNION SELECT 'BSME' UNION SELECT 'BSCE' UNION SELECT 'BSCRIM'
) c;

-- Business minor: open to BSIT, BSCS, BSEd, BSMT, BSME, BSCE, BSCRIM
INSERT IGNORE INTO subject_minor_courses (subject_id, course)
SELECT s.id, c.course FROM subjects s
JOIN (
  SELECT 'BAM-M101' AS code UNION SELECT 'BAM-M102' UNION SELECT 'BAM-M103'
  UNION SELECT 'BAM-M104' UNION SELECT 'BAM-M105'
) codes ON s.code = codes.code
CROSS JOIN (
  SELECT 'BSIT' AS course UNION SELECT 'BSCS' UNION SELECT 'BSEd'
  UNION SELECT 'BSMT' UNION SELECT 'BSME' UNION SELECT 'BSCE' UNION SELECT 'BSCRIM'
) c;

-- Environmental Science minor: open to BSME, BSCE, BSMT, BSIT, BSCS
INSERT IGNORE INTO subject_minor_courses (subject_id, course)
SELECT s.id, c.course FROM subjects s
JOIN (
  SELECT 'ENV-M101' AS code UNION SELECT 'ENV-M102' UNION SELECT 'ENV-M103'
  UNION SELECT 'ENV-M104' UNION SELECT 'ENV-M105'
) codes ON s.code = codes.code
CROSS JOIN (
  SELECT 'BSME' AS course UNION SELECT 'BSCE' UNION SELECT 'BSMT'
  UNION SELECT 'BSIT' UNION SELECT 'BSCS'
) c;
