
2026-04-15: data_source.py alphanumeric device ID fix
- _coerce_box_id_str now uses re.match(r"^\w+$", s) instead of s.isdigit()
- _get_latest_local_entity_update now uses re.match(r"^\w+$", box_id) instead of box_id.isdigit()
- _LOCAL_ENTITY_RE now uses ([a-zA-Z0-9]+) instead of (\d+) to match alphanumeric IDs like dev01
- Full test suite passes (3375 passed, 27 skipped)
