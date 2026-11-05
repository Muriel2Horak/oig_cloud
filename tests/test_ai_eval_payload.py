"""Unit tests for the pure payload assembly."""
from custom_components.oig_cloud.ai_eval import payload as P


def _label(i):
    return f"09:{i:02d}:00"


def test_format_detail_has_header_and_rows():
    grid = {"grid": [100.0, 4800.0], "zal": [1900.0, 1900.0], "soc": [44.0, 45.0]}
    csv = P.format_detail(grid, [0, 1], _label)
    lines = csv.splitlines()
    assert lines[0].startswith("t,zal,")
    assert lines[1].startswith("09:00:00,1900")
    assert len(lines) == 3


def test_float_columns_keep_one_decimal():
    grid = {"v_r": [241.4], "freq": [50.0], "invT": [40.8]}
    csv = P.format_detail(grid, [0], _label)
    assert "241.4" in csv and "50.0" in csv and "40.8" in csv


def test_advisor_prompt_demands_json_times_numbers_and_czech():
    sp = P.ADVISOR_SYSTEM_PROMPT
    assert "CZECH" in sp
    assert "JSON" in sp
    for key in ("situace", "rizika", "doporuceni", "anomalie", "prinos_kc", "priorita"):
        assert key in sp
    assert "ČHMÚ" in sp
    assert "vše v pořádku" in sp  # named as forbidden filler


def test_assemble_advice_puts_snapshot_first_and_anomaly_optional():
    plain = P.assemble_advice("TEĎ: soc_pct=80")
    assert plain.startswith("SNAPSHOT:\nTEĎ: soc_pct=80")
    assert "ANOMALIE" not in plain
    full = P.assemble_advice("TEĎ: soc_pct=80", "12:19 grid_skok")
    assert full.index("SNAPSHOT") < full.index("ANOMALIE") < full.index("12:19 grid_skok")


def test_advisor_prompt_explains_surplus_and_keeps_texts_short():
    sp = P.ADVISOR_SYSTEM_PROMPT
    assert "export" in sp.lower() and "sell price" in sp
    assert "boiler" in sp
    assert "220 characters" in sp


def test_advisor_prompt_tells_the_model_tagged_charging_is_planned():
    assert "plánované nabíjení" in P.ADVISOR_SYSTEM_PROMPT


def test_advisor_prompt_points_flexible_loads_to_the_precomputed_window():
    assert "PRAČKA, MYČKA, BOJLER" in P.ADVISOR_SYSTEM_PROMPT
