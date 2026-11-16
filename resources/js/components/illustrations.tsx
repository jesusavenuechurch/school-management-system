import type { SVGAttributes } from 'react';

/*
 * Platform illustrations. Flat shapes coloured with theme tokens, so they
 * follow light and dark mode. Younger learners are represented by blocks,
 * crayons and paper planes; older students by books, the mortarboard and
 * science. Purely decorative: hidden from screen readers.
 */

type ArtProps = SVGAttributes<SVGSVGElement>;

function Block({
    x,
    y,
    size = 56,
    fill,
    letter,
}: {
    x: number;
    y: number;
    size?: number;
    fill: string;
    letter: string;
}) {
    const d = size / 4;

    return (
        <g>
            <polygon
                points={`${x},${y} ${x + d},${y - d} ${x + size + d},${y - d} ${x + size},${y}`}
                fill={fill}
            />
            <polygon
                points={`${x},${y} ${x + d},${y - d} ${x + size + d},${y - d} ${x + size},${y}`}
                fill="white"
                opacity="0.35"
            />
            <polygon
                points={`${x + size},${y} ${x + size + d},${y - d} ${x + size + d},${y + size - d} ${x + size},${y + size}`}
                fill={fill}
            />
            <polygon
                points={`${x + size},${y} ${x + size + d},${y - d} ${x + size + d},${y + size - d} ${x + size},${y + size}`}
                fill="black"
                opacity="0.18"
            />
            <rect x={x} y={y} width={size} height={size} fill={fill} />
            <text
                x={x + size / 2}
                y={y + size / 2 + size * 0.17}
                textAnchor="middle"
                fontFamily="Fraunces, Georgia, serif"
                fontWeight="700"
                fontSize={size * 0.5}
                fill="white"
            >
                {letter}
            </text>
        </g>
    );
}

function Sparkle({
    x,
    y,
    r = 8,
    fill = 'var(--sun)',
}: {
    x: number;
    y: number;
    r?: number;
    fill?: string;
}) {
    const k = r * 0.28;

    return (
        <path
            d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z`}
            fill={fill}
        />
    );
}

function BookStack({ x, y }: { x: number; y: number }) {
    return (
        <g>
            <rect
                x={x}
                y={y + 60}
                width="120"
                height="30"
                rx="4"
                fill="var(--ink)"
            />
            <rect
                x={x + 6}
                y={y + 66}
                width="108"
                height="4"
                rx="2"
                fill="white"
                opacity="0.35"
            />
            <rect
                x={x + 10}
                y={y + 30}
                width="104"
                height="30"
                rx="4"
                fill="var(--sky)"
            />
            <rect
                x={x + 16}
                y={y + 36}
                width="92"
                height="4"
                rx="2"
                fill="white"
                opacity="0.5"
            />
            <rect
                x={x - 4}
                y={y}
                width="116"
                height="30"
                rx="4"
                fill="var(--leaf)"
            />
            <rect
                x={x + 2}
                y={y + 6}
                width="104"
                height="4"
                rx="2"
                fill="white"
                opacity="0.5"
            />
        </g>
    );
}

function Mortarboard({ x, y }: { x: number; y: number }) {
    return (
        <g>
            <path
                d={`M${x - 34} ${y + 14} v16 c0 10 68 10 68 0 v-16 z`}
                fill="var(--ink)"
                opacity="0.85"
            />
            <polygon
                points={`${x},${y - 16} ${x + 62},${y + 6} ${x},${y + 28} ${x - 62},${y + 6}`}
                fill="var(--ink)"
            />
            <path
                d={`M${x} ${y + 6} L${x + 44} ${y + 16} L${x + 44} ${y + 40}`}
                fill="none"
                stroke="var(--sun)"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <circle cx={x + 44} cy={y + 44} r="5" fill="var(--sun)" />
        </g>
    );
}

function Atom({ x, y, r = 30 }: { x: number; y: number; r?: number }) {
    return (
        <g fill="none" stroke="var(--ink)" strokeWidth="3" opacity="0.9">
            <ellipse cx={x} cy={y} rx={r} ry={r * 0.38} />
            <ellipse
                cx={x}
                cy={y}
                rx={r}
                ry={r * 0.38}
                transform={`rotate(60 ${x} ${y})`}
            />
            <ellipse
                cx={x}
                cy={y}
                rx={r}
                ry={r * 0.38}
                transform={`rotate(-60 ${x} ${y})`}
            />
            <circle
                cx={x}
                cy={y}
                r={r * 0.17}
                fill="var(--coral)"
                stroke="none"
            />
        </g>
    );
}

function Crayon({
    x,
    y,
    rotate = 0,
    fill = 'var(--coral)',
}: {
    x: number;
    y: number;
    rotate?: number;
    fill?: string;
}) {
    return (
        <g transform={`rotate(${rotate} ${x} ${y})`}>
            <rect x={x} y={y} width="86" height="18" rx="3" fill={fill} />
            <rect
                x={x + 12}
                y={y}
                width="8"
                height="18"
                fill="black"
                opacity="0.15"
            />
            <rect
                x={x + 64}
                y={y}
                width="8"
                height="18"
                fill="black"
                opacity="0.15"
            />
            <polygon
                points={`${x + 86},${y} ${x + 106},${y + 9} ${x + 86},${y + 18}`}
                fill={fill}
            />
            <polygon
                points={`${x + 98},${y + 5.4} ${x + 106},${y + 9} ${x + 98},${y + 12.6}`}
                fill="var(--ink)"
            />
        </g>
    );
}

function PaperPlane({ x, y }: { x: number; y: number }) {
    return (
        <g>
            <path
                d={`M${x - 120} ${y + 70} C${x - 80} ${y + 90} ${x - 60} ${y + 20} ${x - 8} ${y + 22}`}
                fill="none"
                stroke="var(--ink)"
                strokeWidth="2.5"
                strokeDasharray="6 8"
                strokeLinecap="round"
                opacity="0.45"
            />
            <polygon
                points={`${x},${y + 20} ${x + 62},${y} ${x + 26},${y + 42}`}
                fill="var(--card)"
                stroke="var(--ink)"
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <polygon
                points={`${x + 62},${y} ${x + 20},${y + 26} ${x + 26},${y + 42}`}
                fill="var(--sky-soft)"
                stroke="var(--ink)"
                strokeWidth="3"
                strokeLinejoin="round"
            />
        </g>
    );
}

const chalkText = {
    fontFamily: 'Caveat, "Comic Sans MS", cursive',
    fill: 'var(--chalk)',
};

/**
 * A chalkboard on an A-frame easel, with today's checklist written in
 * chalk. (x, y) is the board's top-left corner; it is 220 wide, and the
 * legs reach about 315 below.
 */
export function EaselBoard({
    x,
    y,
    items = ['Morning register', 'Term 1 fees', 'Report cards'],
    done = 2,
}: {
    x: number;
    y: number;
    items?: string[];
    done?: number;
}) {
    const w = 220;
    const h = 160;

    return (
        <g>
            {/* Back leg, then front legs */}
            <line
                x1={x + w / 2}
                y1={y - 8}
                x2={x + w / 2 + 6}
                y2={y + 314}
                stroke="var(--board-frame)"
                strokeWidth="9"
                strokeLinecap="round"
                opacity="0.7"
            />
            <line
                x1={x + 34}
                y1={y + 6}
                x2={x - 6}
                y2={y + 314}
                stroke="var(--board-frame)"
                strokeWidth="10"
                strokeLinecap="round"
            />
            <line
                x1={x + w - 34}
                y1={y + 6}
                x2={x + w + 6}
                y2={y + 314}
                stroke="var(--board-frame)"
                strokeWidth="10"
                strokeLinecap="round"
            />
            <line
                x1={x + 8}
                y1={y + 250}
                x2={x + w - 8}
                y2={y + 250}
                stroke="var(--board-frame)"
                strokeWidth="6"
                strokeLinecap="round"
            />
            <rect
                x={x + w / 2 - 10}
                y={y - 14}
                width="20"
                height="14"
                rx="3"
                fill="var(--board-frame)"
            />

            {/* Board */}
            <rect
                x={x - 8}
                y={y - 8}
                width={w + 16}
                height={h + 16}
                rx="6"
                fill="var(--board-frame)"
            />
            <rect x={x} y={y} width={w} height={h} rx="2" fill="var(--board)" />
            <path
                d={`M${x + 14} ${y + h - 18} q40 -6 70 2`}
                stroke="var(--chalk)"
                strokeWidth="6"
                opacity="0.06"
                fill="none"
                strokeLinecap="round"
            />

            <text
                x={x + 20}
                y={y + 34}
                fontSize="26"
                fontWeight="700"
                style={chalkText}
            >
                Today
            </text>
            <path
                d={`M${x + 20} ${y + 42} q30 4 64 0`}
                stroke="var(--chalk-yellow)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
            />

            {items.map((item, i) => {
                const rowY = y + 66 + i * 30;
                const ticked = i < done;

                return (
                    <g key={item}>
                        <rect
                            x={x + 22}
                            y={rowY - 13}
                            width="15"
                            height="15"
                            rx="2"
                            fill="none"
                            stroke="var(--chalk)"
                            strokeWidth="2"
                        />
                        {ticked && (
                            <path
                                d={`M${x + 24} ${rowY - 6} l5 6 l11 -16`}
                                stroke="var(--chalk-yellow)"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}
                        <text
                            x={x + 48}
                            y={rowY}
                            fontSize="21"
                            fontWeight="500"
                            style={chalkText}
                            opacity={ticked ? 0.75 : 1}
                        >
                            {item}
                        </text>
                    </g>
                );
            })}

            {/* Doodles: one for the little ones, one for the seniors */}
            <text
                x={x + w - 58}
                y={y + 36}
                fontSize="22"
                fontWeight="700"
                style={{ ...chalkText, fill: 'var(--chalk-yellow)' }}
            >
                A+
            </text>
            <text
                x={x + w - 74}
                y={y + h - 14}
                fontSize="17"
                style={chalkText}
                opacity="0.8"
            >
                2 + 3 = 5
            </text>

            {/* Chalk tray */}
            <rect
                x={x - 14}
                y={y + h + 6}
                width={w + 28}
                height="9"
                rx="2"
                fill="var(--board-frame)"
            />
            <rect
                x={x + 24}
                y={y + h + 1}
                width="24"
                height="6"
                rx="2"
                fill="var(--chalk)"
            />
            <rect
                x={x + 56}
                y={y + h + 1}
                width="14"
                height="6"
                rx="2"
                fill="var(--chalk-yellow)"
            />
            <rect
                x={x + w - 46}
                y={y + h}
                width="30"
                height="7"
                rx="2"
                fill="var(--ink)"
                opacity="0.75"
            />
        </g>
    );
}

/** Large homepage scene: little learners on the left, seniors on the right. */
export function HeroIllustration(props: ArtProps) {
    return (
        <svg viewBox="0 0 560 440" aria-hidden="true" {...props}>
            <ellipse
                cx="280"
                cy="404"
                rx="262"
                ry="20"
                fill="var(--ink)"
                opacity="0.07"
            />
            <circle cx="290" cy="210" r="172" fill="var(--sky-soft)" />
            <circle cx="458" cy="86" r="30" fill="var(--sun)" />
            <g stroke="var(--sun)" strokeWidth="4" strokeLinecap="round">
                <line x1="458" y1="38" x2="458" y2="26" />
                <line x1="506" y1="86" x2="518" y2="86" />
                <line x1="492" y1="52" x2="501" y2="43" />
                <line x1="492" y1="120" x2="501" y2="129" />
            </g>

            {/* The board on its easel: the platform's signature object */}
            <EaselBoard x={170} y={86} />

            {/* Younger learners */}
            <PaperPlane x={92} y={92} />
            <Crayon x={24} y={300} rotate={-28} fill="var(--sky)" />
            <Block x={56} y={334} fill="var(--coral)" letter="A" />
            <Block x={114} y={334} fill="var(--sun)" letter="B" />
            <Block x={84} y={264} fill="var(--leaf)" letter="C" />

            {/* Older students */}
            <BookStack x={414} y={300} />
            <Mortarboard x={468} y={262} />
            <Atom x={500} y={190} r={28} />

            <Sparkle x={162} y={96} r={10} />
            <Sparkle x={370} y={62} r={7} fill="var(--coral)" />
            <Sparkle x={36} y={214} r={8} fill="var(--leaf)" />
            <Sparkle x={540} y={250} r={7} fill="var(--sky)" />
        </svg>
    );
}

export function LittleLearnersArt(props: ArtProps) {
    return (
        <svg viewBox="0 0 200 140" aria-hidden="true" {...props}>
            <circle cx="104" cy="74" r="58" fill="var(--sun-soft)" />
            <Crayon x={18} y={110} rotate={-12} fill="var(--coral)" />
            <Block x={56} y={70} size={44} fill="var(--sky)" letter="1" />
            <Block x={104} y={70} size={44} fill="var(--leaf)" letter="2" />
            <Block x={80} y={18} size={44} fill="var(--coral)" letter="3" />
            <Sparkle x={168} y={30} r={9} />
            <Sparkle x={30} y={40} r={6} fill="var(--sky)" />
        </svg>
    );
}

export function SeniorStudentsArt(props: ArtProps) {
    return (
        <svg viewBox="0 0 200 140" aria-hidden="true" {...props}>
            <circle cx="100" cy="74" r="58" fill="var(--sky-soft)" />
            <BookStack x={44} y={46} />
            <Mortarboard x={98} y={26} />
            <Atom x={170} y={40} r={18} />
            <Sparkle x={26} y={36} r={8} />
        </svg>
    );
}

/** Shown when a list is still empty. */
export function EmptyNotebookArt(props: ArtProps) {
    return (
        <svg viewBox="0 0 160 120" aria-hidden="true" {...props}>
            <circle cx="80" cy="62" r="50" fill="var(--sun-soft)" />
            <g stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round">
                <rect
                    x="42"
                    y="24"
                    width="72"
                    height="84"
                    rx="6"
                    fill="var(--card)"
                />
                <line x1="58" y1="24" x2="58" y2="108" stroke="var(--coral)" />
            </g>
            <g stroke="var(--sky)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="66" y1="46" x2="104" y2="46" />
                <line x1="66" y1="60" x2="104" y2="60" />
                <line x1="66" y1="74" x2="92" y2="74" />
            </g>
            <g transform="rotate(-40 118 86)">
                <rect
                    x="96"
                    y="80"
                    width="54"
                    height="12"
                    rx="2"
                    fill="var(--sun)"
                />
                <polygon
                    points="150,80 162,86 150,92"
                    fill="var(--card)"
                    stroke="var(--ink)"
                    strokeWidth="2"
                />
            </g>
            <Sparkle x={128} y={24} r={7} fill="var(--leaf)" />
        </svg>
    );
}

/** The easel on its own with a custom checklist, for onboarding panels. */
export function EaselScene({
    items,
    done,
    ...props
}: ArtProps & { items: string[]; done: number }) {
    return (
        <svg viewBox="0 0 420 420" aria-hidden="true" {...props}>
            <ellipse
                cx="210"
                cy="400"
                rx="190"
                ry="14"
                fill="var(--ink)"
                opacity="0.07"
            />
            <circle cx="214" cy="190" r="150" fill="var(--sun-soft)" />
            <EaselBoard x={100} y={70} items={items} done={done} />
            <Block x={20} y={344} size={40} fill="var(--coral)" letter="A" />
            <Block x={62} y={344} size={40} fill="var(--sky)" letter="B" />
            <g transform="translate(-60 40) scale(0.75)">
                <BookStack x={460} y={386} />
            </g>
            <Sparkle x={360} y={60} r={9} />
            <Sparkle x={52} y={120} r={7} fill="var(--leaf)" />
        </svg>
    );
}
