// 「예시로 해 보기」 — 지어낸 가상의 공방이다(기획서 2판 11절: 실제 조합 사업은 넣지 않는다).
// 예시 답은 ChatGPT가 돌려주는 모양 그대로 둔다(코드 상자 포함). 붙여 넣기 칸에 그대로 들어간다.

export const SAMPLE_FORM = {
  what: '주말 도자기 원데이 클래스',
  who: '소소공방',
  when: '매주 토요일 오후 2시, 2시간 / 가격 확정 전',
  whom: '친구·연인, 혼자 오는 분',
  must: '만든 그릇은 구워서 집으로 보내 드린다',
};

export const SAMPLE_ANSWER = [
  '```',
  '꼬리표: 소소공방 원데이',
  '1장 머리말: 주말 도자기 클래스',
  '1장 큰제목: 흙을 만지는 / 두 시간.',
  '1장 설명: 물레 앞에 앉아 천천히 / 내 그릇 하나를 빚어요.',
  '2장 큰제목: 빚고. / 다듬고. / 칠하고.',
  '2장 항목1: 빚기 | 물레 위에서 흙의 모양을 잡아요',
  '2장 항목2: 다듬기 | 굽을 깎고 손잡이를 붙여요',
  '2장 항목3: 칠하기 | 좋아하는 유약 색을 골라요',
  '3장 큰제목: 내 손으로 만든 / 그릇이 남아요.',
  '3장 설명: 가마에 구운 뒤 집으로 보내 드려요.',
  '4장 큰제목: 이런 분께 / 권해요.',
  '4장 대상1: 친구·연인 | 둘이 나란히 앉아 같은 걸 만들고 싶다면',
  '4장 대상2: 혼자 오는 분 | 조용히 손에만 집중하는 시간이 필요하다면',
  '5장 큰제목: 이번 주말, / 흙 앞에 앉아 봐요.',
  '5장 설명: 처음이어도 괜찮아요. 강사가 옆에서 도와요.',
  '5장 단추: 클래스 신청하기',
  '5장 안내: 매주 토요일 오후 2시 · 2시간 · 가격은 확정 후 안내',
  '아래안내: 이 이미지는 예시용 가상 공방입니다',
  "사진1: A real unretouched photograph, 35mm f/2, natural window light in a small Korean pottery studio: close-up of two hands shaping wet grey clay on a spinning potter's wheel, slight film grain. No faces, no text, no logos.",
  '사진3: A real unretouched photograph, 50mm f/2, natural daylight: five small handmade ceramic bowls and cups with slightly uneven glazes on a plain light wooden shelf, soft shadows, slight film grain. No text, no logos.',
  '사진5: A real unretouched photograph, 35mm f/2.8, afternoon light: a long worktable in a calm small pottery studio with an empty stool, clay tools, a sponge and a water bucket, slight film grain. No people, no text, no logos.',
  '```',
].join('\n');

// 예시 사진(Codex 이미지 생성으로 만든 AI 사진이라 꼬리표를 켠다)
export const SAMPLE_PHOTOS = {
  1: 'img/sample/photo1.jpg',
  3: 'img/sample/photo3.jpg',
  5: 'img/sample/photo5.jpg',
};
