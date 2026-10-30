from app.salts import check, validate

VM = ("vildagliptin+metformin", "50mg/500mg")
RO = ("rosuvastatin", "10mg")
LV = ("levothyroxine", "50mcg")


def v(name, salt_strength, composition=None):
    return validate({"name": name, "composition": composition}, *salt_strength)[0]


def test_vildagliptin():
    assert v("Jalra M 50Mg/1Gm Strip Of 15 Tablets", VM) is False
    assert v("Jalra M 50Mg/850Mg Strip Of 15 Tablets", VM) is False
    assert v("Vildamac M 50/500Mg Strip Of 15 Tablets", VM) is True
    assert v("Vilcrown Met 50 mg/500 mg Tablet 15's", VM, "Vildagliptin 50mg + Metformin 500mg") is True
    assert v("Jalra 50Mg Strip Of 15 Tablets", VM) is False
    assert v("Galvus Met", VM) is True


def test_rosuvastatin():
    assert v("Novastat Cv 10Mg Strip Of 15 Capsules", RO) is False
    assert v("Novastat Tg 10 Strip Of 15 Tablets", RO) is False
    assert v("Novastat Ez 20 Strip Of 10 Tablets", RO) is False
    assert v("Novastat Cv 20Mg Strip Of 10 Capsules", RO) is False
    assert v("Rozat 10Mg Strip Of 15 Tablets", RO) is True
    assert v("Rosuvas 20Mg Strip Of 10 Tablets", RO) is False


def test_levothyroxine():
    assert v("Eltroxin 50Mcg Bottle Of 120 Tablets", LV) is True
    assert v("Thyronorm 100Mcg Bottle Of 120 Tablets", LV) is False


def test_check_per_unit():
    p = check({"name": "Rozat 10Mg Strip Of 15 Tablets", "pack_qty": 15, "price": 202.03,
               "mrp": 273.02, "composition": None}, *RO)
    assert p["per_unit"] == 13.47
    assert p["salt_match"] is True


def test_new_cases():
    from app.salts import pharmeasy_queries
    assert v("Roseday A 10Mg Strip Of 10 Capsules", RO) is False
    assert v("Novastat 10Mg Strip Of 15 Tablets", RO) is True
    assert v("Somglip M 50/500Mg Strip Of 10 Tablets", VM) is True
    assert v("Intaglip M Strip Of 10 Tablets", VM) is False
    qs = pharmeasy_queries("Novastat 10", "rosuvastatin", "10mg")
    assert len(qs) <= 10 and "Rosuvas 10mg" in qs


def test_extended_combos():
    assert validate({"name": "Azulix Mf 1Mg Strip Of 15 Tablets"}, "glimepiride", "1mg")[0] is False
    assert validate({"name": "Glimestar 1Mg Strip Of 10 Tablets"}, "glimepiride", "1mg")[0] is True
    assert validate({"name": "Telma Amh 40Mg Strip Of 15 Tablets"}, "telmisartan", "40mg")[0] is False
    assert validate({"name": "Telvas 40Mg Strip Of 15 Tablets"}, "telmisartan", "40mg")[0] is True
    assert validate({"name": "Stamlo 5Mg Strip Of 30 Tablets"}, "amlodipine", "5mg")[0] is True
