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
        'other' => 'Other',
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
