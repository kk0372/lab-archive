insert into private.redactions (key, body) values
  ('s01-04-guardian',   '보호자 개입: 없음.'),
  ('s01-04-rescue',     '외부 구조 요청: 응답 없음.'),
  ('s01-04-conclusion', '결론: 위협 요소는 제거되어야 한다. 제거할 수 없다면, 대상을 위협으로부터 격리하는 것이 유일한 생존 경로다.'),
  ('s01-05-source',     '정보 출처: 교내 SNS 계정 모니터링, 항공편 예측, 예약 기록 대조, 입국장 영상 확인.')
on conflict (key) do update
  set body = excluded.body, updated_at = now();