Feature: Stored character data for the dossier tabs

  Scenario: A character saved before the dossier tabs opens unchanged
    Given a character saved before the dossier tabs existed, with text in its notes, experience and weakness fields
    When its sheet is opened and a trait is changed
    Then the sheet shows the character as before
    And the saved notes, experience and weakness text is exactly what it was

  Scenario Outline: A damaged dossier field is reported, not repaired
    Given a saved character whose <field> data is damaged
    And another undamaged saved character
    When the damaged character's sheet is opened
    Then "Character could not be read" is shown in place of the Character sheet tab
    And the damaged record is not changed
    And the roster still lists the other character

    Examples:
      | field   |
      | journal |
      | merits  |
      | havens  |

  Scenario: A character with more than six backgrounds is readable everywhere
    Given a saved character with eight named backgrounds
    When the roster is opened and then the character's sheet
    Then the character is listed and its sheet opens
    And a build of that character in the builder reports progress without error
