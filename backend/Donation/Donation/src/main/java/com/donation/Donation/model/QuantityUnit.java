package com.donation.Donation.model;

public enum QuantityUnit {
    KILOGRAMS("kgs"),
    GRAMS("g"),
    POUNDS("lbs"),
    OUNCES("oz"),
    LITERS("L"),
    MILLILITERS("ml"),
    GALLONS("gal"),
    FLUID_OUNCES("fl oz"),
    PIECES("pcs"),
    UNITS("units"),
    SERVINGS("servings"),
    CANS("cans"),
    BOTTLES("bottles"),
    PACKS("packs"),
    BOXES("boxes"),
    BAGS("bags"),
    LOAVES("loaves"),
    DOZENS("dozens"),
    TRAYS("trays"),
    CONTAINERS("containers");

    private final String abbreviation;

    QuantityUnit(String abbreviation) {
        this.abbreviation = abbreviation;
    }

    public String getAbbreviation() {
        return abbreviation;
    }

    @Override
    public String toString() {
        return name(); // returns enum name like "KILOGRAMS"
    }
}
