"""Unit tests for the pure payload assembly."""
from custom_components.oig_cloud.ai_eval import payload as P


def _label(i):
    return f"09:{i:02d}:00"


def test_system_prompt_is_english_directive_czech_output():
    sp = P.SYSTEM_PROMPT
    assert "WRITE THE ENTIRE OUTPUT IN CZECH" in sp
    assert "added value only" in sp
    assert "NEVER narrate normal operation" in sp
    assert "FAKTA:" in sp and "LIDSKY:" in sp
    # domain terms preserved in Czech
    assert "záloha" in sp and "nezáloha" in sp


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


def test_assemble_orders_ledger_detail_plan():
    out = P.assemble("(prázdný)", "t,zal\n09:00,1900", "PLÁN A CENY:\n- ...",
                     "09:00", "10:00")
    assert out.index("REJSTŘÍK") < out.index("DETAIL") < out.index("PLÁN A CENY")
