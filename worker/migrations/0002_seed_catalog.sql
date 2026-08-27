INSERT INTO professionals (id, name, active) VALUES
  ('professional-elohim', 'Elohim', 1),
  ('professional-victor', 'Victor', 1),
  ('professional-lucas', 'Lucas', 1),
  ('professional-carlos-eduardo', 'Carlos Eduardo', 1)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  active = excluded.active;

INSERT INTO catalog_tests (id, name, domain, unit, configuration_json) VALUES
  ('back-scratch', 'Back Scratch (MMSS)', 'Flexibilidade', 'cm', '{"bilateral":true,"validAttempts":2,"familiarizationAttempts":2,"bestDirection":"highest"}'),
  ('chair-sit-reach', 'Chair Sit-and-Reach (MMII)', 'Flexibilidade', 'cm', '{"bilateral":true,"validAttempts":2,"familiarizationAttempts":2,"bestDirection":"highest"}'),
  ('sppb', 'SPPB', 'Multicomponente', 'score', '{"bundle":true,"children":["sppb-gait-4m","sppb-chair-stand-5x","sppb-static-balance"]}'),
  ('step-2min', '2-Minute Step Test', 'Aptidão cardiorrespiratória', 'contagem', '{"validAttempts":1,"bestDirection":"highest"}'),
  ('knee-extension-isometric', 'Extensão isométrica de joelho', 'Força', 'kgf', '{"bilateral":true,"validAttempts":2,"bestDirection":"highest","protocolStatus":"pendente-clinico"}'),
  ('rowing-isometric', 'Remada isométrica', 'Força', 'kgf', '{"bilateral":true,"validAttempts":2,"bestDirection":"highest","protocolStatus":"pendente-clinico"}')
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  domain = excluded.domain,
  unit = excluded.unit,
  configuration_json = excluded.configuration_json;
