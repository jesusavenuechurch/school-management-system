<?php

/*
|--------------------------------------------------------------------------
| Predefined values
|--------------------------------------------------------------------------
|
| Every column that would otherwise be a database enum stores a plain string
| code instead, and the allowed codes live here. The database never checks
| these; validation does (see App\Support\Constants).
|
| Keys are the codes stored in the database, values are what people see.
| Changing a label is free. Renaming a code means updating existing rows.
|
*/

return [

    'default_currency' => 'LSL',

    'default_timezone' => 'Africa/Maseru',

    // Used to turn a local number like 58123456 into +26658123456.
    'default_country_code' => '266',

    // Roles every new school starts with. Schools can add their own later.
    // 'admin' is required: whoever creates the school gets it.
    'default_roles' => [
        'admin' => 'Administrator',
        'teacher' => 'Teacher',
        'accountant' => 'Bursar',
        'registrar' => 'Registrar',
        'parent' => 'Parent',
    ],

    // Kinds of school, chosen at setup (a school can be both). They shape the
    // suggested grades, subjects and how attendance is taken. College later.
    'school_levels' => [
        'primary' => 'Primary school',
        'high_school' => 'High school',
    ],

    // Suggestions offered during setup. Schools tick, untick and rename.
    // Grade name => short description. Lesotho high schools run Grade 8 to
    // Grade 11 (there is no Grade 12; Form A–E and the JC exam were retired).
    'grade_presets' => [
        'primary' => [
            'Grade 1' => null,
            'Grade 2' => null,
            'Grade 3' => null,
            'Grade 4' => null,
            'Grade 5' => null,
            'Grade 6' => null,
            'Grade 7' => null,
        ],
        'high_school' => [
            'Grade 8' => 'Foundation year 1',
            'Grade 9' => 'Building year 2',
            'Grade 10' => 'Core year 3',
            'Grade 11' => 'Pre-final year 4, LGCSE',
        ],
    ],

    'subject_presets' => [
        'primary' => [
            'SES' => 'Sesotho',
            'ENG' => 'English',
            'MATH' => 'Mathematics',
            'SCI' => 'Science',
            'SOC' => 'Social Studies',
            'LIFE' => 'Life Skills',
            'ART' => 'Creative Arts',
            'PE' => 'Physical Education',
        ],
        'high_school' => [
            'SES' => 'Sesotho',
            'ENG' => 'English Language',
            'LIT' => 'English Literature',
            'MATH' => 'Mathematics',
            'PHYS' => 'Physical Science',
            'BIO' => 'Biology',
            'GEO' => 'Geography',
            'HIST' => 'History',
            'ACC' => 'Accounting',
            'BUS' => 'Business Studies',
            'AGRI' => 'Agriculture',
            'COMP' => 'Computer Studies',
            'RE' => 'Religious Studies',
        ],
    ],

    // Starting marking scales: symbol => [from %, remark, counts as a pass].
    // A band runs from its percentage up to the next band. Schools edit the
    // cut-offs; LGCSE boundaries are set per exam, so these are only defaults.
    'grading_scale_presets' => [
        'primary' => [
            'name' => 'Primary',
            'bands' => [
                'A' => [80, 'Excellent', true],
                'B' => [70, 'Very good', true],
                'C' => [55, 'Good', true],
                'D' => [40, 'Fair', true],
                'E' => [0, 'Needs improvement', false],
            ],
        ],
        'high_school' => [
            'name' => 'High school (LGCSE)',
            'bands' => [
                'A*' => [90, 'Distinction', true],
                'A' => [80, 'Distinction', true],
                'B' => [70, 'Good', true],
                'C' => [60, 'Good', true],
                'D' => [50, 'Satisfactory', true],
                'E' => [40, 'Minimum pass', true],
                'F' => [30, 'Minimum pass', true],
                'G' => [20, 'Minimum pass', true],
                'U' => [0, 'Ungraded', false],
            ],
        ],
    ],

    // A test is set by a subject teacher for some of their classes; an exam
    // is set by the school for whole grades. The term mark weighs the two
    // kinds (schools.test_weight), however many of each a class wrote.
    'assessment_kinds' => [
        'test' => 'Test',
        'exam' => 'Exam',
    ],

    'application_status' => [
        'pending' => 'Waiting',
        'accepted' => 'Accepted',
        'declined' => 'Declined',
    ],

    'school_status' => [
        'active' => 'Active',
        'suspended' => 'Suspended',
        'cancelled' => 'Cancelled',
    ],

    'membership_status' => [
        'invited' => 'Invited',
        'active' => 'Active',
        'suspended' => 'Suspended',
    ],

    'gender' => [
        'male' => 'Male',
        'female' => 'Female',
    ],

    'employment_status' => [
        'active' => 'Active',
        'on_leave' => 'On leave',
        'terminated' => 'Terminated',
    ],

    'student_status' => [
        'active' => 'Active',
        'graduated' => 'Graduated',
        'suspended' => 'Suspended',
        'withdrawn' => 'Withdrawn',
        'transferred' => 'Transferred',
    ],

    'guardian_relationship' => [
        'mother' => 'Mother',
        'father' => 'Father',
        'grandparent' => 'Grandparent',
        'guardian' => 'Guardian',
        'other' => 'Other',
    ],

    'enrollment_status' => [
        'active' => 'Active',
        'promoted' => 'Promoted',
        'repeated' => 'Repeated',
        'moved' => 'Moved to another class',
        'withdrawn' => 'Withdrawn',
        'graduated' => 'Graduated',
        'transferred' => 'Transferred',
    ],

    'attendance_status' => [
        'present' => 'Present',
        'absent' => 'Absent',
        'late' => 'Late',
        'excused' => 'Excused',
    ],

    'invoice_status' => [
        'pending' => 'Pending',
        'partial' => 'Partially paid',
        'paid' => 'Paid',
        'overdue' => 'Overdue',
        'cancelled' => 'Cancelled',
    ],

    'payment_method' => [
        'mobile_money' => 'Mobile money',
        'bank_transfer' => 'Bank transfer',
        'card' => 'Card',
        'cash' => 'Cash',
    ],

    'payment_status' => [
        'pending' => 'Pending',
        'successful' => 'Successful',
        'failed' => 'Failed',
        'refunded' => 'Refunded',
    ],

    'payment_gateway' => [
        'ecocash' => 'EcoCash',
        'mpesa' => 'M-Pesa',
        'bank' => 'Bank',
        'card_processor' => 'Card processor',
    ],

    'notification_channel' => [
        'whatsapp' => 'WhatsApp',
        'sms' => 'SMS',
        'email' => 'Email',
    ],

    'notification_status' => [
        'queued' => 'Queued',
        'sent' => 'Sent',
        'delivered' => 'Delivered',
        'read' => 'Read',
        'failed' => 'Failed',
    ],

];
