import type { BuildingKey } from "@/lib/types";

type IslandItem = { key: string; name: string; icon: string; position: "shore" | "garden" | "near-homes" };

export function IslandIllustration({ levels, items = [] }: { levels: Record<BuildingKey, number>; items?: IslandItem[] }) {
  const positions = { shore: [230, 305], garden: [490, 333], "near-homes": [780, 296] } as const;
  return (
    <svg className="island-illustration" viewBox="0 0 1000 430" role="img" aria-labelledby="island-title">
      <title id="island-title">جزيرة تكة الصغيرة بين مياه هادئة</title>
      <defs>
        <linearGradient id="sea" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#a9d9d4" />
          <stop offset="1" stopColor="#d8e9df" />
        </linearGradient>
        <linearGradient id="island" x1="0" x2="0.9" y1="0" y2="1">
          <stop offset="0" stopColor="#a8c98e" />
          <stop offset="1" stopColor="#779c70" />
        </linearGradient>
        <linearGradient id="roof" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f3b87d" />
          <stop offset="1" stopColor="#dc8054" />
        </linearGradient>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <rect width="1000" height="430" rx="30" fill="url(#sea)" />
      <path d="M0 115c105-34 178 31 284-1s177-32 278-1 178 35 285 1 120-28 153-18" fill="none" stroke="#fff" strokeOpacity=".42" strokeWidth="9" strokeLinecap="round" />
      <path d="M-8 348c113-34 202 28 310-2s190-31 290 0 174 31 272 0 129-27 144-22" fill="none" stroke="#fff" strokeOpacity=".37" strokeWidth="7" strokeLinecap="round" />
      <path d="M95 205c50-21 91 13 141-2" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="5" strokeLinecap="round" />
      <path d="M770 127c47-19 84 11 133-2" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" />
      <circle cx="833" cy="73" r="29" fill="#f4c77c" opacity=".8" />
      <ellipse cx="502" cy="301" rx="387" ry="108" fill="#355c54" opacity=".17" filter="url(#soft-shadow)" />
      <path d="M136 266c21-89 152-139 349-135 188 4 335 38 374 105 40 69-56 145-228 166-182 23-451 1-493-60-16-23-12-52-2-76Z" fill="#587a60" />
      <path d="M148 252c29-77 157-114 332-112 185 2 333 33 366 94 31 57-61 120-220 139-180 21-424 1-465-51-15-19-20-46-13-70Z" fill="url(#island)" />
      <path d="M220 276c82 23 189 30 286 20 78-8 153-25 215-52" fill="none" stroke="#d7d8a4" strokeWidth="10" strokeOpacity=".55" strokeLinecap="round" />
      <path d="M270 324c91 18 182 18 266 6" fill="none" stroke="#d7d8a4" strokeWidth="8" strokeOpacity=".45" strokeLinecap="round" />

      <g opacity={levels.letters ? 1 : 0.62} transform="translate(255 185)">
        <ellipse cx="47" cy="88" rx="66" ry="15" fill="#425f4d" opacity=".25" />
        <rect x="2" y="40" width="90" height="47" rx="9" fill="#fff2d5" stroke="#e6c999" strokeWidth="3" />
        <path d="M-7 44 46 2l54 42Z" fill="#d78560" />
        <rect x="39" y="57" width="19" height="30" rx="9" fill="#b98462" />
        <rect x="13" y="53" width="17" height="16" rx="4" fill="#a8c9c0" />
        <rect x="65" y="53" width="17" height="16" rx="4" fill="#a8c9c0" />
        <circle cx="46" cy="30" r="11" fill="#f4c77c" />
        <text x="46" y="35" textAnchor="middle" fontSize="14" fontWeight="700" fill="#173f38">ب</text>
      </g>

      <g opacity={levels.numbers ? 1 : 0.44} transform="translate(620 165)">
        <ellipse cx="48" cy="105" rx="70" ry="15" fill="#425f4d" opacity=".22" />
        <rect x="5" y="47" width="86" height="54" rx="10" fill="#f8ebd8" stroke="#e5c69a" strokeWidth="3" />
        <path d="M-5 51 48 8l54 43Z" fill="url(#roof)" />
        <path d="M33 101V69c0-9 7-16 16-16s16 7 16 16v32" fill="#bd916d" />
        <rect x="13" y="62" width="15" height="15" rx="4" fill="#a8c9c0" />
        <rect x="68" y="62" width="15" height="15" rx="4" fill="#a8c9c0" />
        <circle cx="48" cy="34" r="12" fill="#e7bd6f" />
        <text x="48" y="39" textAnchor="middle" fontSize="14" fontWeight="700" fill="#173f38">٤</text>
      </g>

      <g opacity={levels.stories ? 1 : 0.42} transform="translate(446 229)">
        <ellipse cx="45" cy="73" rx="58" ry="13" fill="#425f4d" opacity=".2" />
        <rect x="6" y="34" width="78" height="39" rx="8" fill="#f8eddb" stroke="#e1c89e" strokeWidth="3" />
        <path d="m0 38 45-37 47 37Z" fill="#6f9a82" />
        <rect x="37" y="50" width="17" height="23" rx="8" fill="#a98363" />
        <rect x="13" y="47" width="14" height="12" rx="3" fill="#b3d6cb" />
        <rect x="64" y="47" width="14" height="12" rx="3" fill="#b3d6cb" />
        <path d="M45 9c7 6 11 11 11 16 0 6-5 10-11 10S34 31 34 25c0-5 4-10 11-16Z" fill="#f5d18e" />
      </g>

      <g transform="translate(724 266)">
        <ellipse cx="0" cy="19" rx="34" ry="11" fill="#425f4d" opacity=".18" />
        <path d="M-6-3c-4-15 12-19 18-10 3 5 2 9 1 13" fill="none" stroke="#31594c" strokeWidth="10" strokeLinecap="round" />
        <path d="M-29 12c3-19 18-29 35-25 18 4 26 19 22 34-3 13-16 21-31 18-17-3-28-13-26-27Z" fill="#4e806c" />
        <path d="M-12 9c1-11 12-17 21-12 10 5 11 17 4 24-8 8-23 3-25-12Z" fill="#e99b54" />
        <circle cx="12" cy="-5" r="2.3" fill="#173f38" />
        <path d="M18 2c6-2 8 2 5 5" fill="none" stroke="#173f38" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M-23 8c-10-6-13 1-6 7m26 21c-1 8 6 10 9 3m16-18c9 4 13-2 5-8" fill="none" stroke="#31594c" strokeWidth="5" strokeLinecap="round" />
        <path d="M-20 24c4 9 13 14 22 15" fill="none" stroke="#f4c77c" strokeWidth="4" strokeLinecap="round" />
      </g>

      {items.map((item) => {
        const [x, y] = positions[item.position];
        return <g key={item.key} data-island-item={item.key} data-position={item.position} role="img" aria-label={`${item.name} ${item.position}`} transform={`translate(${x} ${y})`}>
          <ellipse cy="17" rx="23" ry="7" fill="#355c54" opacity=".2" />
          <circle r="19" fill="#fffdf7" stroke="#d9cba9" strokeWidth="2" />
          <text y="8" textAnchor="middle" fontSize="22" fontFamily="" aria-hidden="true">{item.icon}</text>
        </g>;
      })}

      <g fill="#456b53" opacity=".9">
        <path d="M181 272c-4-28 1-45 17-48 18-2 26 17 20 45Z" />
        <circle cx="195" cy="228" r="18" fill="#6f9876" />
        <path d="M821 244c-5-26-2-41 13-44 15-2 23 13 20 40Z" />
        <circle cx="834" cy="207" r="16" fill="#6f9876" />
        <circle cx="386" cy="305" r="4" fill="#f4c77c" />
        <circle cx="590" cy="311" r="4" fill="#f4c77c" />
        <circle cx="351" cy="248" r="3" fill="#fff2d5" />
        <circle cx="762" cy="287" r="3" fill="#fff2d5" />
      </g>
    </svg>
  );
}

export function FatinMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`fatin-mark${small ? " fatin-mark-small" : ""}`} role="img" aria-label="فطين، رفيق تكة">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 31c1-15 13-23 27-20 13 3 19 15 16 27-3 12-14 19-28 17C17 53 12 44 14 31Z" fill="#4e806c" />
        <path d="M23 31c2-9 11-13 19-8 7 5 7 14 1 20-7 7-21 3-20-12Z" fill="#e99b54" />
        <path d="M42 12c-3-11 9-15 14-7 3 4 1 9 0 12" fill="none" stroke="#31594c" strokeWidth="7" strokeLinecap="round" />
        <circle cx="45" cy="22" r="2" fill="#173f38" />
        <path d="M50 28c5-1 7 2 4 5" fill="none" stroke="#173f38" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 39c-8-5-12 0-7 5m20 12c-1 7 5 8 8 3m16-18c7 3 10-2 4-6" fill="none" stroke="#31594c" strokeWidth="5" strokeLinecap="round" />
        <path d="M17 48c4 5 9 8 15 9" fill="none" stroke="#f4c77c" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
