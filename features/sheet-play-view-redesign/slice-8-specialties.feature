Feature: Specialties

  Scenario: A specialty is written in while editing and marked in play
    Given the player is editing a saved character
    When they enter "Art history" as the specialty of Intelligence
    And they reload the sheet
    Then Intelligence is marked as having a specialty
    And Strength is not marked as having a specialty
    And the Intelligence button is described as "1 of 5, specialty Art history"

  Scenario: Every attribute and ability can have a specialty, and nothing else can
    Given the player is editing a saved character
    Then a specialty field is offered for each of the 9 attributes and 30 abilities
    And no specialty field is offered for a Virtue or a Discipline

  Scenario: The Selected pool names the specialty of a chosen trait
    Given a saved character with Intelligence 4, Investigation 3 and the Intelligence specialty "Art history"
    And the player has that character's sheet open in play mode
    When they select Intelligence and Investigation
    Then the Selected pool card shows "Intelligence 4 + Investigation 3"
    And the Selected pool card names the specialty "Intelligence · Art history"

  Scenario: A pool of traits without a specialty names none
    Given a saved character with Intelligence 4, Investigation 3 and the Intelligence specialty "Art history"
    And the player has that character's sheet open in play mode
    When they select Strength and Investigation
    Then the Selected pool card names no specialty

  Scenario: Clearing a specialty removes its mark
    Given a saved character with Intelligence 4, Investigation 3 and the Intelligence specialty "Art history"
    And the player has that character's sheet open in play mode
    When they activate "Edit character"
    And they enter "" as the specialty of Intelligence
    And they activate "Done editing"
    Then Intelligence is not marked as having a specialty
    And the Intelligence button is described as "4 of 5"

  Scenario: Specialties cannot be changed in play mode
    Given a saved character with Intelligence 4, Investigation 3 and the Intelligence specialty "Art history"
    And the player has that character's sheet open in play mode
    Then no specialty field is offered

  Scenario: A character saved before specialties existed still opens
    Given a character that was saved before specialties existed
    When the player opens that character from the roster
    Then the identity shows the name "Lucita"
    And Intelligence is not marked as having a specialty
