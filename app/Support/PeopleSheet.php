<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

/**
 * Reads people (name, WhatsApp number, role) from a pasted list or an
 * uploaded spreadsheet. Columns are found by their heading ("name",
 * "phone"/"whatsapp", "role"); without headings the order is
 * name, phone, role.
 */
class PeopleSheet
{
    public const MAX_ROWS = 300;

    /**
     * @return list<array{name: string|null, phone: string, role: string|null}>
     */
    public static function fromUpload(UploadedFile $file): array
    {
        $reader = strtolower($file->getClientOriginalExtension()) === 'xlsx' ? new XlsxReader : new CsvReader;
        $reader->open($file->getRealPath() ?: $file->getPathname());

        $rows = [];

        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $rows[] = array_values(array_map(fn ($cell) => is_scalar($cell) ? trim((string) $cell) : '', $row->toArray()));

                if (count($rows) > self::MAX_ROWS + 1) {
                    break 2;
                }
            }

            break; // first sheet only
        }

        $reader->close();

        return self::fromRows($rows);
    }

    /**
     * One person per line: "Thabo Nthunya, 58123456" or just "58123456".
     *
     * @return list<array{name: string|null, phone: string, role: string|null}>
     */
    public static function fromText(string $text): array
    {
        $rows = [];

        foreach (preg_split('/\R/', $text) ?: [] as $line) {
            $parts = array_values(array_filter(array_map('trim', preg_split('/[,;\t]/', $line) ?: []), fn ($p) => $p !== ''));

            if ($parts === []) {
                continue;
            }

            $phone = null;
            $others = [];

            foreach ($parts as $part) {
                if ($phone === null && PhoneNumber::looksLikePhone($part)) {
                    $phone = $part;
                } else {
                    $others[] = $part;
                }
            }

            $rows[] = ['name' => $others[0] ?? null, 'phone' => $phone ?? implode(' ', $parts), 'role' => $others[1] ?? null];
        }

        return array_slice($rows, 0, self::MAX_ROWS);
    }

    /**
     * @param  list<list<string>>  $rows
     * @return list<array{name: string|null, phone: string, role: string|null}>
     */
    private static function fromRows(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $columns = ['name' => 0, 'phone' => 1, 'role' => 2];
        $header = array_map('strtolower', $rows[0]);
        $phoneColumn = self::findColumn($header, ['phone', 'whatsapp', 'number', 'cell', 'mobile']);

        if ($phoneColumn !== null) {
            $columns = [
                'name' => self::findColumn($header, ['name', 'full name']) ?? -1,
                'phone' => $phoneColumn,
                'role' => self::findColumn($header, ['role', 'job', 'position']) ?? -1,
            ];
            array_shift($rows);
        }

        $people = [];

        foreach ($rows as $row) {
            $phone = $row[$columns['phone']] ?? '';

            if ($phone === '') {
                continue;
            }

            $people[] = [
                'name' => ($row[$columns['name']] ?? '') ?: null,
                'phone' => $phone,
                'role' => ($row[$columns['role']] ?? '') ?: null,
            ];
        }

        return array_slice($people, 0, self::MAX_ROWS);
    }

    /**
     * @param  list<string>  $header
     * @param  list<string>  $names
     */
    private static function findColumn(array $header, array $names): ?int
    {
        foreach ($header as $index => $heading) {
            foreach ($names as $name) {
                if (str_contains($heading, $name)) {
                    return $index;
                }
            }
        }

        return null;
    }
}
