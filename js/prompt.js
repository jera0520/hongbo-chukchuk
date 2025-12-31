// 질문지 만들기 — 기획서 2판 6절. 사용자가 ChatGPT에 그대로 붙여 넣는 글이다.
import { FIELDS, SLOTS, limitHint } from './fields.js';

const NOT_YET = '확정 전';

export function buildPrompt(form, filledSlots = []) {
  const v = (s) => (s || '').trim() || NOT_YET;
  const slots = SLOTS.filter((s) => !filledSlots.includes(s.n));

  const info = [
    `[알리는 것] ${v(form.what)}`,
    `[하는 곳] ${v(form.who)}`,
    `[날짜·장소·가격] ${v(form.when)}`,
    `[누구에게] ${v(form.whom)}`,
  ];
  if ((form.must || '').trim()) info.push(`[꼭 넣을 말] ${form.must.trim()}`);

  const rules = [
    '1. 정보에 없는 날짜·가격·혜택은 지어내지 마세요. 모르는 것은 "5장 안내"에만 "확정 후 안내"라고 한 번 쓰세요.',
    '2. 과장 표현(최고, 유일, 100%)은 쓰지 마세요.',
    '   큰제목은 문장보다 짧은 말 묶음으로 쓰고 "~해요"로 끝내지 마세요(마침표로 끝내도 좋아요).',
    '   설명·항목·안내는 "~해요" 말투로, 5장 단추는 "클래스 신청하기"처럼 "~하기"로 끝내세요.',
    '3. 글자 수 한도를 꼭 지키세요. 줄을 바꿀 곳에는 / 를 넣으세요.',
    '4. 장마다 하는 일: 1장 멈추게 하기, 2장 무엇을 하나, 3장 무엇이 남나, 4장 누구에게, 5장 신청하기.',
    '5. 2장 항목 3개는 참가자가 실제로 하는 일을 순서대로 쓰세요(이름은 "빚기"처럼 하는 일).',
    '   시간·가격·준비물은 2장에 넣지 말고 5장 안내에 쓰세요.',
  ];
  let no = 6;
  if ((form.must || '').trim()) {
    rules.push(`${no++}. [꼭 넣을 말]은 뜻을 살려 어울리는 칸에 넣되, 말투는 위에 맞춰 다듬으세요.`);
  }
  if (slots.length) {
    rules.push(
      `${no}. 사진 칸마다 사진 만드는 영어 프롬프트를 한 줄씩 써 주세요.`,
      '   사진 칸은 모두 가로로 긴 칸이라 "landscape 3:2"를 넣으세요.',
      '   실제로 찍은 사진처럼, 보정 없는 피부결, 자연광, 글자·로고 없음을 꼭 넣으세요.',
    );
  }

  const format = FIELDS.map((f) => `${f.label}: ${limitHint(f)}`);
  for (const s of slots) format.push(`${s.label}: (${s.what} 프롬프트)`);

  return [
    '당신은 행사·체험 홍보 문구를 쓰는 마케터입니다.',
    '아래 정보로 세로 홍보 이미지 5장에 들어갈 문구를 써 주세요.',
    '',
    ...info,
    '',
    '[지킬 것]',
    ...rules,
    '',
    '[답 형식] 아래 형식 그대로, 코드 상자 하나에만 담아 주세요. 다른 설명은 쓰지 마세요.',
    '',
    ...format,
  ].join('\n');
}
