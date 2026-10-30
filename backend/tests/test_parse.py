from app.pharmacies import parse_pack_qty, parse_pharmeasy

R = "\u20b9"
SAMPLE = (
    "Same Composition\n\n"
    "# Vildamac M 50/500Mg Strip Of 15 Tablets\n\nBy MACLEODS\n\n15 Tablet(s) in Strip\n\n"
    f"{R}142.24\\*\n\n{R}187.16\n\n24% OFF\n\n"
    "# Eltroxin 50Mcg Bottle Of 120 Tablets\n\nBy GSK\n\n120 Tablet(s) in Bottle\n\n"
    f"{R}84.93\\*\n\n{R}114.77\n"
)


def test_parse_pharmeasy():
    ps = parse_pharmeasy(SAMPLE)
    assert len(ps) == 2
    assert ps[0]["name"] == "Vildamac M 50/500Mg Strip Of 15 Tablets"
    assert ps[0]["pack_qty"] == 15
    assert ps[0]["price"] == 142.24
    assert ps[0]["mrp"] == 187.16
    assert ps[1]["pack_qty"] == 120
    assert ps[1]["price"] == 84.93


def test_pack_qty():
    assert parse_pack_qty("strip of 15 tablets") == 15
    assert parse_pack_qty("15 Tablet Strip") == 15
    assert parse_pack_qty(None, "Jalra-M 50 mg/500 mg Tablet 15's") == 15
    assert parse_pack_qty("") is None
