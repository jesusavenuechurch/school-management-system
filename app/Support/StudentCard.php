<?php

namespace App\Support;

use App\Models\School;
use App\Models\Student;
use BaconQrCode\Renderer\Color\Rgb;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\Fill;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

/**
 * Everything printed on a student's ID card.
 */
class StudentCard
{
    /**
     * @return array<string, mixed>
     */
    public static function for(Student $student): array
    {
        $enrollment = $student->currentEnrollment;
        $checkUrl = route('cards.check', $student->cardCode());

        return [
            'id' => $student->id,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'full_name' => $student->full_name,
            'photo_url' => $student->photo_url,
            'admission_number' => $student->admission_number,
            'date_of_birth' => $student->date_of_birth?->format('j M Y'),
            'classroom' => $enrollment?->classroom?->name,
            'grade_description' => $enrollment?->classroom?->gradeLevel?->description,
            'year' => $enrollment?->academicYear?->name,
            'qr_svg' => self::qrSvg($checkUrl),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function school(School $school): array
    {
        return [
            'name' => $school->name,
            'logo_url' => $school->logo_url,
            'phone' => $school->phone,
            'email' => $school->email,
            'address' => $school->address,
        ];
    }

    public static function qrSvg(string $text): string
    {
        $svg = (new Writer(new ImageRenderer(
            new RendererStyle(240, 1, null, null, Fill::uniformColor(new Rgb(255, 255, 255), new Rgb(28, 36, 33))),
            new SvgImageBackEnd,
        )))->writeString($text);

        return trim(substr($svg, (int) strpos($svg, "\n") + 1));
    }
}
