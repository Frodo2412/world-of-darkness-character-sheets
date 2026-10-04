Feature: Sheet header

  Scenario: Header fields are available
    Given a player viewing a new character's sheet
    Then they can enter Name, Player, Chronicle, Nature, Demeanor, Concept, Clan, Generation and Sire

  Scenario: Header entries are saved without a save action
    Given a player viewing a new character's sheet
    When they enter "Lucita" as Name and "Lasombra" as Clan
    And they reload the sheet
    Then Name shows "Lucita" and Clan shows "Lasombra"

  Scenario: Any text is accepted
    Given a player viewing a character's sheet
    When they enter "banana" as Generation and "Not A Real Clan" as Clan
    Then both entries are kept exactly as typed and nothing is flagged

  Scenario: Edits stay with their character
    Given two saved characters
    When the player names the first one "Lucita"
    Then the second character's Name is still empty

  Scenario: Unknown character
    Given no saved character has the id in the sheet address
    When the player opens that address
    Then they see a "character not found" message with a link to the roster
    And the roster still lists no additional character

  Scenario: Sheet address without an id
    When the player opens the sheet address with no character id
    Then they see a "character not found" message with a link to the roster
