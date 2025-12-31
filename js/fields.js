// 칸 정의 — 기획서 2판 5절의 「칸과 글자 수 한도」.
// label은 질문지·답에 쓰는 이름표다. 바꾸면 parse.js가 옛 답을 못 읽으니 함께 고친다.
// pair 칸은 "이름 | 설명" 한 줄로 오고 key.name / key.desc 두 칸으로 나뉜다.

export const FIELDS = [
  { key: 'tag', label: '꼬리표', lines: 1, per: 12 },
  { key: 'c1.kicker', label: '1장 머리말', lines: 1, per: 12 },
  { key: 'c1.title', label: '1장 큰제목', lines: 2, per: 9 },
  { key: 'c1.desc', label: '1장 설명', lines: 2, per: 20 },
  { key: 'c2.title', label: '2장 큰제목', lines: 3, per: 8 },
  { key: 'c2.i1', label: '2장 항목1', pair: [6, 22] },
  { key: 'c2.i2', label: '2장 항목2', pair: [6, 22] },
  { key: 'c2.i3', label: '2장 항목3', pair: [6, 22] },
  { key: 'c3.title', label: '3장 큰제목', lines: 2, per: 10 },
  { key: 'c3.desc', label: '3장 설명', lines: 1, per: 30 },
  { key: 'c4.title', label: '4장 큰제목', lines: 2, per: 9 },
  { key: 'c4.t1', label: '4장 대상1', pair: [10, 24] },
  { key: 'c4.t2', label: '4장 대상2', pair: [10, 24] },
  { key: 'c5.title', label: '5장 큰제목', lines: 2, per: 10 },
  { key: 'c5.desc', label: '5장 설명', lines: 1, per: 30 },
  { key: 'c5.button', label: '5장 단추', lines: 1, per: 10 },
  { key: 'c5.info', label: '5장 안내', lines: 2, per: 32 },
  { key: 'foot', label: '아래안내', lines: 1, per: 30 },
];

// 사진 칸: 몇 장에 있는지와 칸 크기(px). 크기는 cards.css와 같아야 한다.
export const SLOTS = [
  { n: 1, label: '사진1', card: 1, w: 860, h: 540, what: '1장 큰 사진' },
  { n: 3, label: '사진3', card: 3, w: 732, h: 560, what: '3장 사진' },
  { n: 5, label: '사진5', card: 5, w: 860, h: 420, what: '5장 사진' },
];

// 화면에 보이는 칸 이름(확인 표·경고에 씀)
export function fieldNames() {
  const out = {};
  for (const f of FIELDS) {
    if (f.pair) {
      out[f.key + '.name'] = f.label + ' 이름';
      out[f.key + '.desc'] = f.label + ' 설명';
    } else {
      out[f.key] = f.label;
    }
  }
  return out;
}

// 질문지 「답 형식」에 들어가는 한도 안내
export function limitHint(f) {
  if (f.pair) return `이름 | 설명   (이름 ${f.pair[0]}자, 설명 ${f.pair[1]}자)`;
  if (f.lines > 1) return `(${f.lines}줄, 줄당 ${f.per}자)`;
  return `(${f.per}자)`;
}
