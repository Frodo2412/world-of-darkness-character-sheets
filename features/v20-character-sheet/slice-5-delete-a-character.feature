Feature: Delete a character

  Scenario: Confirmed deletion
    Given saved characters "Lucita" and "Fatima"
    When the player deletes "Lucita" and confirms
    Then the roster lists only "Fatima"
    And opening Lucita's former sheet address shows "character not found"

  Scenario: Cancelled deletion
    Given saved characters "Lucita" and "Fatima"
    When the player starts deleting "Lucita" and cancels
    Then the roster still lists both characters with their details unchanged

  Scenario: The confirmation names the character
    Given a saved character "Lucita"
    When the player starts deleting it
    Then the confirmation asks about "Lucita" by name

  Scenario: Deleting the last character
    Given "Lucita" is the only saved character
    When the player deletes it and confirms
    Then the roster shows the empty state
